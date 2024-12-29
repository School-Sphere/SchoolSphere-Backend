const jwt = require("jsonwebtoken");
const Student = require("../models/student_model");
const Teacher = require("../models/teacher_model");
const Room = require("../models/room_model");
const Message = require("../models/message_model");
const { 
    messageSchema,
    formatMessage,
    validateRoomAccess,
    sanitizeContent,
    messageStatus,
    updateMessageStatus,
    createChatError,
    handleChatError
} = require("../utils/chat_helpers");

const JWT_SECRET = process.env.JWT_SECRET;
const { Server } = require("socket.io");
const Room = require("../models/room_model");
const Message = require("../models/message_model");
const createSocketMiddleware = require("../middlewares/socket_middleware");
const { EVENTS, ERRORS } = require("../config/socket_events");
const { 
    messageSchema,
    formatMessage,
    validateRoomAccess,
    sanitizeContent,
    messageStatus,
    updateMessageStatus,
    createChatError,
    handleChatError
} = require("../utils/chat_helpers");

function initSocket(server) {
    const io = new Server(server);
    const { socketAuth, socketRateLimiter, socketErrorHandler, cleanupRateLimiter, checkPermission } = createSocketMiddleware();

    io.use(socketAuth);
    io.use(socketRateLimiter);

    io.on(EVENTS.CONNECTION, async (socket) => {
        try {
            const { role, _id, username, schoolCode } = socket.user;
            
            // Join user's rooms and class chat rooms
            const userRooms = await Room.find({
                'members.user': _id,
                isActive: true
            });
            
            // Join all active rooms
            for (const room of userRooms) {
                socket.join(room._id.toString());
            }
            socket.on(EVENTS.GROUP_MESSAGE, async ({ roomId, content }) => {
                try {
                    await messageSchema.validateAsync({ roomId, content });
                    
                const room = await Room.findById(roomId);
                await validateRoomAccess(room, socket.user._id);
                
                const sanitizedContent = sanitizeContent(content);
                
                const message = await Message.create({
                    sender: socket.user._id,
                    content: sanitizedContent,
                    type: 'group',
                    roomId,
                    status: messageStatus.SENT
                });
                
                await Room.findByIdAndUpdate(roomId, { lastMessageAt: new Date() });
                
                const formattedMessage = formatMessage(message, socket.user);
                io.to(roomId).emit(EVENTS.GROUP_MESSAGE, formattedMessage);
                
                await updateMessageStatus(message, messageStatus.DELIVERED);
            } catch (error) {
                const errorResponse = handleChatError(error);
                socket.emit(EVENTS.ERROR, errorResponse);
            }
        });

        socket.on(EVENTS.PRIVATE_MESSAGE, async ({ recipientId, content }) => {
            try {
                await messageSchema.validateAsync({ recipientId, content });
                
                const recipient = await (role === "student" ? Teacher : Student).findById(recipientId);
                if (!recipient) {
                    throw createChatError(404, "Recipient not found");
                }
                
                let room = await Room.findOne({
                    type: 'private',
                    'members.user': { $all: [socket.user._id, recipientId] }
                });
                
                if (!room) {
                    room = await Room.createPrivateRoom([
                        { userId: socket.user._id, role: socket.user.role },
                        { userId: recipientId, role: recipient.role }
                    ], socket.user.schoolCode);
                }
                
                const sanitizedContent = sanitizeContent(content);
                
                const message = await Message.create({
                    sender: socket.user._id,
                    content: sanitizedContent,
                    type: 'private',
                    roomId: room._id,
                    status: messageStatus.SENT
                });
                
                await Room.findByIdAndUpdate(room._id, { lastMessageAt: new Date() });
                
                const formattedMessage = formatMessage(message, socket.user);
                io.to(room._id.toString()).emit(EVENTS.PRIVATE_MESSAGE, formattedMessage);
                
                await updateMessageStatus(message, messageStatus.DELIVERED);
            } catch (error) {
                const errorResponse = handleChatError(error);
                socket.emit(EVENTS.ERROR, errorResponse);
            }
        });

        socket.on(EVENTS.JOIN_ROOM, async ({ roomId }) => {
            try {
                await messageSchema.validateAsync({ roomId });
                
                const room = await Room.findById(roomId);
                await validateRoomAccess(room, socket.user._id);
                
                socket.join(roomId);
                
                const messages = await Message.getMessagesByRoom(roomId);
                const formattedMessages = messages.map(msg => 
                    formatMessage(msg, msg.sender)
                );
                
                socket.emit(EVENTS.ROOM_HISTORY, { roomId, messages: formattedMessages });
            } catch (error) {
                const errorResponse = handleChatError(error);
                socket.emit(EVENTS.ERROR, errorResponse);
            }
        });

        socket.on(EVENTS.CLASS_CHAT_JOIN, async ({ classId, studentId }) => {
            try {
                const room = await Room.findOne({ type: 'class', 'members.user': classId });
                if (!room) {
                    throw createChatError(404, ERRORS.ROOM.NOT_FOUND);
                }

                await room.addMember(studentId, 'student');
                socket.join(room._id.toString());

                socket.emit(EVENTS.CLASS_CHAT_JOIN, {
                    success: true,
                    roomId: room._id
                });
            } catch (error) {
                const errorResponse = handleChatError(error);
                socket.emit(EVENTS.ERROR, errorResponse);
            }
        });

        socket.on(EVENTS.CLASS_CHAT_LEAVE, async ({ classId, studentId }) => {
            try {
                const room = await Room.findOne({ type: 'class', 'members.user': classId });
                if (!room) {
                    throw createChatError(404, ERRORS.ROOM.NOT_FOUND);
                }

                await room.removeMember(studentId);
                socket.leave(room._id.toString());

                socket.emit(EVENTS.CLASS_CHAT_LEAVE, {
                    success: true
                });
            } catch (error) {
                const errorResponse = handleChatError(error);
                socket.emit(EVENTS.ERROR, errorResponse);
            }
        });

        socket.on(EVENTS.CLASS_CHAT_CREATED, async ({ classId, roomId }) => {
            try {
                const room = await Room.findById(roomId);
                if (!room || room.type !== 'class') {
                    throw createChatError(404, ERRORS.ROOM.NOT_FOUND);
                }

                socket.join(roomId);
                socket.emit(EVENTS.CLASS_CHAT_CREATED, {
                    success: true,
                    room: {
                        _id: room._id,
                        name: room.name,
                        type: room.type,
                        members: room.members
                    }
                });
            } catch (error) {
                const errorResponse = handleChatError(error);
                socket.emit(EVENTS.ERROR, errorResponse);
            }
        });

        socket.on(EVENTS.DISCONNECT, () => {
            cleanupRateLimiter(socket);
            socket.leaveAll();
        });
    } catch (error) {
        socketErrorHandler(error, socket);
        socket.disconnect(true);
    }
});
}

module.exports = { initSocket };
