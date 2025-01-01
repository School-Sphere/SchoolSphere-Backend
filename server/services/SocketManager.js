const { Server } = require('socket.io');
const createSocketMiddleware = require('../../middlewares/socket_middleware');
const { EVENTS, ERRORS, SOCKET_CONFIG, RATE_LIMIT_CONFIG } = require('../../config/socket_events');
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
    constructor(io) {
        this.io = io;
        this.roomCache = new Map();
        this.middleware = createSocketMiddleware({
            rateLimitWindow: RATE_LIMIT_CONFIG.windowMs,
            maxRequests: RATE_LIMIT_CONFIG.maxRequests
        });
    }

     initialize(server) {
        this.io = new Server(server);
        this.setupMiddleware();
        this.setupEventHandlers();
        return this.io;
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
        try {
            const { _id, role } = socket.user;
            await this.joinUserRooms(socket, _id);
            this.setupMessageHandlers(socket);
            this.setupRoomHandlers(socket);
            this.setupDisconnectHandler(socket);
        } catch (error) {
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
            try {
                const { roomId, content } = data;
                await messageSchema.validateAsync({ roomId, content });
                
                const room = await Room.findById(roomId);
                await validateRoomAccess(room, socket.user._id);
                
                const sanitizedContent = sanitizeContent(content);
                const message = await this.createMessage(socket.user._id, sanitizedContent, 'group', roomId);
                
                await Room.findByIdAndUpdate(roomId, { lastMessageAt: new Date() });
                const formattedMessage = formatMessage(message, socket.user);
                this.io.to(roomId).emit(EVENTS.GROUP_MESSAGE, formattedMessage);
            } catch (error) {
                if (error.name === 'ValidationError') {
                    const validationError = createChatError(400, ERRORS.VALIDATION.INVALID_MESSAGE);
                    this.handleError(socket, validationError);
                } else if (error.name === 'MongoError') {
                    const dbError = createChatError(500, ERRORS.DATABASE.OPERATION_FAILED);
                    this.handleError(socket, dbError);
                } else {
                    this.handleError(socket, error);
                }
            }
        });

        socket.on(EVENTS.PRIVATE_MESSAGE, async (data) => {
            try {
                const { recipientId, content } = data;
                await messageSchema.validateAsync({ recipientId, content });
                
                const room = await this.getOrCreatePrivateRoom(socket.user._id, recipientId);
                const sanitizedContent = sanitizeContent(content);

                const message = await this.createMessage(socket.user._id, sanitizedContent, 'private', room._id);
                const formattedMessage = formatMessage(message, socket.user);
                
                this.io.to(room._id.toString()).emit(EVENTS.PRIVATE_MESSAGE, formattedMessage);
                
                const updatedRoom = await Room.findByIdAndUpdate(
                    room._id, 
                    { lastMessageAt: new Date().toISOString() }, 
                    { new: true }
                );
                
                this.roomCache.set(`${socket.user._id}-${recipientId}`, updatedRoom);
            } catch (error) {
                this.handleError(socket, error);
            }
        });
    }

    setupRoomHandlers(socket) {
        socket.on(EVENTS.JOIN_ROOM, async (data) => {
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

        // Check cache first
        if (this.roomCache.has(roomKey)) {
            return this.roomCache.get(roomKey);
        }

        // Fetch users in parallel
        const [user, recipient] = await Promise.all([
            User.findById(userId),
            User.findById(recipientId)
        ]);

        if (!user || !recipient) {
            throw createChatError(ERRORS.AUTH.code, ERRORS.USER.NOT_FOUND);
        }

        // Validate school code
        if (!user.schoolCode) {
            throw createChatError(400, 'Invalid school code');
        }

        // Ensure one is a teacher and the other is a student
        if (!((user.role === 'teacher' && recipient.role === 'student') || 
              (user.role === 'student' && recipient.role === 'teacher'))) {
            throw createChatError(ERRORS.ROOM.code, ERRORS.ROOM.UNAUTHORIZED);
        }

        let room = await Room.findOne({
            type: 'private',
            'members.user': { $all: [userId, recipientId] }
        });

        if (!room) {
            room = await Room.createPrivateRoom([
                { id: userId, role: user.role },
                { id: recipientId, role: recipient.role }
            ], user.schoolCode);

            if (!room) {
                throw createChatError(500, 'Failed to create private room');
            }
            
            // Cache the newly created room
            this.roomCache.set(roomKey, room);
        }

        return room;
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