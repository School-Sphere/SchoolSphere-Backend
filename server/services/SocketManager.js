const { Server } = require('socket.io');
const createSocketMiddleware = require('../../middlewares/socket_middleware');
const { EVENTS, ERRORS, SOCKET_CONFIG, RATE_LIMIT_CONFIG } = require('../../config/socket_events');
const mongoose = require('mongoose');

const {
    messageSchema,
    formatMessage,
    validateRoomAccess,
    sanitizeContent,
    createChatError,
    handleChatError
} = require('../../utils/chat_helpers.js');
const Room = require('../../models/room_model');
const Message = require('../../models/message_model');
const User = require('../../models/user_model');

class SocketManager {
    constructor() {
        this.roomCache = new Map();
        this.middleware = createSocketMiddleware({
            rateLimitWindow: RATE_LIMIT_CONFIG.windowMs,
            maxRequests: RATE_LIMIT_CONFIG.maxRequests
        });
    }

    initialize(server) {
        try {
            this.io = new Server(server);

            this.setupMiddleware();

            this.setupEventHandlers();
            return this.io;

        } catch (error) {
            console.error('[Socket] Failed to initialize Socket.IO server:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            throw error; // Re-throw to handle at application level
        }
    }

    setupMiddleware() {
        const { socketAuth, socketRateLimiter } = this.middleware;
        this.io.use(socketAuth);
        this.io.use(socketRateLimiter);
    }

    setupEventHandlers() {
        this.io.on(EVENTS.CONNECTION, (socket) => this.handleConnection(socket));
    }

    async handleConnection(socket) {
        console.log('[Socket] New connection established:', {
            socketId: socket.id,
            user: {
                id: socket.user?._id,
                name: socket.user?.name,
                role: socket.user?.role
            },
            timestamp: new Date().toISOString()
        });

        try {
            const user = socket.user;
            await this.joinUserRooms(socket, user._id);
            this.setupMessageHandlers(socket);
            this.setupRoomHandlers(socket);
            this.setupDisconnectHandler(socket);

            console.log('[Socket] User setup completed:', {
                socketId: socket.id,
                userId: user._id,
                joinedRooms: Array.from(socket.rooms)
            });

        } catch (error) {
            console.error('[Socket] Connection setup failed:', {
                socketId: socket.id,
                error: error.message,
                stack: error.stack
            });
            this.handleError(socket, error);
        }
    }

    async joinUserRooms(socket, userId) {
        const userRooms = await Room.find({
            'members.user': userId,
            isActive: true
        });

        for (const room of userRooms) {
            await socket.join(room._id.toString());
        }
    }

    setupMessageHandlers(socket) {
        socket.on(EVENTS.GROUP_MESSAGE, async (data) => {
            console.log('[Socket] Received group message:', {
                from: {
                    userId: socket.user?._id,
                    name: socket.user?.name,
                    role: socket.user?.role
                },
                content: data.content,
                type: data.type
            });
            try {
                const { roomId, content, type = 'TEXT' } = data;

                const room = await Room.findById(roomId);
                if (!room) throw new Error('Room not found');

                // Verify user is member of the room
                const isMember = room.members.some(member =>
                    member.user.toString() === socket.user._id.toString()
                );
                if (!isMember) throw new Error('Unauthorized access to room');

                const message = await Message.create({
                    roomId,
                    sender: socket.user._id,
                    senderType: socket.user.role,
                    type,
                    content: content.trim()
                });

                await Room.findByIdAndUpdate(roomId, {
                    lastMessage: message._id,
                    lastMessageAt: new Date()
                });

                const populatedMessage = await Message.findById(message._id)
                    .populate('sender', 'name email profileImage');

                socket.to(roomId).emit(EVENTS.GROUP_MESSAGE, {
                    messageId: message._id,
                    roomId,
                    content: message.content,
                    type: message.type,
                    sender: {
                        _id: socket.user._id,
                        name: socket.user.name,
                        type: socket.user.role
                    },
                    timestamp: message.timestamp
                });

            } catch (error) {
                this.handleError(socket, error);
            }
        });

        socket.on(EVENTS.PRIVATE_MESSAGE, async (data) => {
            console.log('[Socket] Received private message:', {
                from: {
                    userId: socket.user?._id,
                    name: socket.user?.name,
                    role: socket.role
                },
                to: data.recipientId,
                content: data.content,
                type: data.type
            });

            try {
                const { recipientId, content, type = 'TEXT' } = data;

                const room = await this.getOrCreatePrivateRoom(socket.user._id, new mongoose.Types.ObjectId(recipientId));

                const message = await Message.create({
                    roomId: room._id,
                    sender: socket.user._id,
                    senderType: socket.user.role,
                    type,
                    content: content.trim()
                });

                await Room.findByIdAndUpdate(room._id, {
                    lastMessage: message._id,
                    lastMessageAt: new Date()
                });

                const populatedMessage = await Message.findById(message._id)
                    .populate('sender', 'name email profileImage');

                console.log("hiiiiiiiiiiiiiiiiiiiiiiiiiiii");
                socket.to(room._id.toString()).emit(EVENTS.PRIVATE_MESSAGE, {
                    messageId: message._id,
                    roomId: room._id,
                    content: message.content,
                    type: message.type,
                    sender: {
                        _id: socket.user._id,
                        name: socket.user.name,
                        type: socket.user.role
                    },
                    timestamp: message.timestamp
                });
                console.log("byeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");

            } catch (error) {
                console.log("error: ", error);
                this.handleError(socket, error);
            }
        });
    }

    setupRoomHandlers(socket) {
        socket.on(EVENTS.JOIN_ROOM, async (data) => {
            console.log('JOIN_ROOM', data);
            try {
                const { roomId } = data;
                await messageSchema.validateAsync({ roomId });

                const room = await Room.findById(roomId);
                await validateRoomAccess(room, socket.user._id);

                socket.join(roomId);
                const messages = await Message.find({ roomId }).sort({ createdAt: -1 }).limit(50);
                const formattedMessages = messages.map(msg => formatMessage(msg, msg.sender));
                socket.emit(EVENTS.ROOM_HISTORY, { roomId, messages: formattedMessages });
            } catch (error) {
                this.handleError(socket, error);
            }
        });

        socket.on(EVENTS.CLASS_CHAT_JOIN, async (data) => {
            try {
                const { classId, studentId } = data;
                const room = await Room.findOne({ type: 'class', 'members.user': classId });
                if (!room) throw createChatError(404, ERRORS.ROOM.NOT_FOUND);

                await room.addMember(studentId, 'student');
                socket.join(room._id.toString());
                socket.emit(EVENTS.CLASS_CHAT_JOIN, { success: true, roomId: room._id });
            } catch (error) {
                this.handleError(socket, error);
            }
        });

        socket.on(EVENTS.CLASS_CHAT_LEAVE, async (data) => {
            try {
                const { classId, studentId } = data;
                const room = await Room.findOne({ type: 'class', 'members.user': classId });
                if (!room) throw createChatError(404, ERRORS.ROOM.NOT_FOUND);

                await room.removeMember(studentId);
                socket.leave(room._id.toString());
                socket.emit(EVENTS.CLASS_CHAT_LEAVE, { success: true });
            } catch (error) {
                this.handleError(socket, error);
            }
        });
    }

    setupDisconnectHandler(socket) {
        socket.on(EVENTS.DISCONNECT, () => {
            console.log('[Socket] User disconnected:', {
                socketId: socket.id,
                userId: socket.user?._id,
                name: socket.user?.name,
                timestamp: new Date().toISOString()
            });

            this.middleware.cleanupRateLimiter(socket);
            socket.leaveAll();
        });
    }

    async createMessage(senderId, content, type, roomId) {
        return Message.create({
            sender: senderId,
            content,
            type,
            roomId,
        });
    }

    async getOrCreatePrivateRoom(userId, recipientId) {
        const roomKey = `${userId}-${recipientId}`;

        if (this.roomCache.has(roomKey)) {
            return this.roomCache.get(roomKey);
        }

        let room = await Room.findOne({
            type: 'DIRECT',
            'members.user': { $all: [userId, recipientId] }
        });

        if (!room) {
            const [user1, user2] = await Promise.all([
                User.findById(userId),
                User.findById(recipientId)
            ]);

            if (!user1 || !user2) {
                throw new Error('One or both users not found');
            }

            room = await Room.create({
                type: 'DIRECT',
                members: [
                    { user: userId, userType: user1.role, role: 'MEMBER' },
                    { user: recipientId, userType: user2.role, role: 'MEMBER' }
                ],
                schoolCode: user1.schoolCode,
                createdBy: userId,
                createdByType: user1.role
            });

            this.roomCache.set(roomKey, room);
        }

        return room;
    }

    // For class/group rooms
    async createClassRoom(name, teacherId, classId, schoolCode) {
        return Room.create({
            name,
            type: 'GROUP',
            members: [
                {
                    user: teacherId,
                    userType: 'Teacher',
                    role: 'ADMIN'
                }
            ],
            classId,
            schoolCode,
            createdBy: teacherId,
            createdByType: 'Teacher'
        });
    }

    handleError(socket, error) {
        const errorResponse = handleChatError(error);
        socket.emit(EVENTS.ERROR, errorResponse);
    }

    clearCache() {
        this.roomCache.clear();
    }
}

module.exports = new SocketManager();