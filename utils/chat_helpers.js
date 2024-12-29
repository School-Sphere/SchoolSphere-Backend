const Joi = require('joi');

// Message validation schema
const messageSchema = Joi.object({
    content: Joi.string().trim().min(1).max(2000).required(),
    roomId: Joi.string().hex().length(24),
    recipientId: Joi.string().hex().length(24)
});

// Pagination schema
const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
});

// Message formatting utilities
const formatMessage = (message, sender) => {
    return {
        _id: message._id,
        sender: {
            _id: sender._id,
            username: sender.username
        },
        content: message.content,
        timestamp: message.timestamp,
        roomId: message.roomId,
        status: message.status || 'sent'
    };
};

// Room access utilities
const validateRoomAccess = async (room, userId) => {
    if (!room) {
        throw new Error('Room not found');
    }
    
    const isMember = room.members.some(member => 
        member.user.toString() === userId.toString()
    );
    
    if (!isMember) {
        throw new Error('Unauthorized access to room');
    }
    
    return true;
};

// Pagination helpers
const getPaginationParams = (query) => {
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;
    return { skip, limit: parseInt(limit), page: parseInt(page) };
};

// Content sanitization
const sanitizeContent = (content) => {
    if (typeof content !== 'string') {
        return '';
    }
    return content.trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .slice(0, 2000);      // Limit length
};

// Message delivery status utilities
const messageStatus = {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed'
};

const updateMessageStatus = (message, status) => {
    if (!Object.values(messageStatus).includes(status)) {
        throw new Error('Invalid message status');
    }
    message.status = status;
    return message;
};

// Class room specific utilities
const validateClassRoomAccess = async (room, userId, userRole) => {
    if (!room || room.type !== 'class') {
        throw new Error('Invalid class room');
    }
    
    const member = room.members.find(m => 
        m.user.toString() === userId.toString()
    );
    
    if (!member) {
        throw new Error('User not a member of this class room');
    }
    
    if (userRole === 'teacher' && member.role !== 'teacher') {
        throw new Error('Unauthorized teacher access');
    }
    
    return true;
};

const handleStudentClassChange = async (studentId, oldRoomId, newRoomId) => {
    if (oldRoomId) {
        const oldRoom = await Room.findById(oldRoomId);
        if (oldRoom) {
            await oldRoom.removeMember(studentId);
        }
    }
    
    if (newRoomId) {
        const newRoom = await Room.findById(newRoomId);
        if (newRoom) {
            await newRoom.addMember(studentId, 'student');
        }
    }
};

const archiveClassRoom = async (roomId) => {
    const room = await Room.findById(roomId);
    if (room) {
        room.isActive = false;
        await room.save();
    }
};

const updateClassRoomTeacher = async (roomId, oldTeacherId, newTeacherId) => {
    const room = await Room.findById(roomId);
    if (room) {
        await room.removeMember(oldTeacherId);
        await room.addMember(newTeacherId, 'teacher');
    }
};

// Error handling utilities
const createChatError = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
};

const handleChatError = (error) => {
    const errorResponse = {
        code: error.code || 500,
        message: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
    };
    return errorResponse;
};

module.exports = {
    messageSchema,
    paginationSchema,
    formatMessage,
    validateRoomAccess,
    validateClassRoomAccess,
    getPaginationParams,
    sanitizeContent,
    messageStatus,
    updateMessageStatus,
    createChatError,
    handleChatError,
    handleStudentClassChange,
    archiveClassRoom,
    updateClassRoomTeacher
};