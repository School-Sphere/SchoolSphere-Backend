const Joi = require('joi');

// Socket Event Constants
const EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    GROUP_MESSAGE: 'group_message',
    PRIVATE_MESSAGE: 'private_message',
    JOIN_ROOM: 'join_room',
    ROOM_HISTORY: 'room_history',
    CLASS_CHAT_JOIN: 'class_chat_join',
    CLASS_CHAT_LEAVE: 'class_chat_leave',
    CLASS_CHAT_CREATED: 'class_chat_created'
};

// Authentication Events
const AUTH_EVENTS = {
    AUTHENTICATE: 'authenticate',
    AUTH_SUCCESS: 'auth_success',
    AUTH_ERROR: 'auth_error',
    TOKEN_EXPIRED: 'token_expired',
    TOKEN_REFRESH: 'token_refresh',
    SESSION_EXPIRED: 'session_expired'
};

// Validation Schemas
const authSchema = Joi.object({
    token: Joi.string().required(),
    role: Joi.string().valid('student', 'teacher').required()
});

const messageSchema = Joi.object({
    content: Joi.string().trim().min(1).max(2000).required(),
    roomId: Joi.string().hex().length(24).when('type', {
        is: 'group',
        then: Joi.required()
    }),
    recipientId: Joi.string().hex().length(24).when('type', {
        is: 'private',
        then: Joi.required()
    }),
    type: Joi.string().valid('group', 'private').required(),
    priority: Joi.string().valid('normal', 'high').default('normal')
});

const roomSchema = Joi.object({
    roomId: Joi.string().hex().length(24).required()
});

// Error Codes and Messages
const ERRORS = {
    AUTH: {
            code: 'AUTH_ERROR',
        NO_TOKEN: 'No authentication token provided',
        INVALID_TOKEN: 'Invalid authentication token',
        USER_NOT_FOUND: 'User not found',
        TOKEN_EXPIRED: 'Authentication token has expired',
        RATE_LIMIT_EXCEEDED: 'Rate limit exceeded, please try again later',
        SESSION_EXPIRED: 'Session has expired',
        INVALID_ROLE: 'Invalid user role'
    },
    ROOM: {
        code: 'ROOM_ERROR',
        NOT_FOUND: 'Room not found',
        UNAUTHORIZED: 'Unauthorized access to room',
        INVALID_ID: 'Invalid room ID format',
        ALREADY_EXISTS: 'Room already exists',
        MAX_CAPACITY: 'Room has reached maximum capacity',
        INVALID_TYPE: 'Invalid room type',
        INACTIVE: 'Room is no longer active'
    },
    MESSAGE: {
        code: 'MESSAGE_ERROR',
        INVALID_CONTENT: 'Invalid message content',
        FAILED_DELIVERY: 'Message delivery failed'
    },
    RECIPIENT: {
        code: 'RECIPIENT_ERROR',
        NOT_FOUND: 'Recipient not found',
        INVALID_ID: 'Invalid recipient ID format'
    }
};

// Socket Configuration
const SOCKET_CONFIG = {
    pingTimeout: 60000,
    pingInterval: 25000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 20000,
    authTimeout: 30000,
    tokenRefreshInterval: 3600000,
    sessionTimeout: 1800000
};

// Rate Limiting Configuration
const RATE_LIMIT_CONFIG = {
    windowMs: 30000,
    maxRequests: 150,
    blockDuration: 180000
};

// Event Documentation
const EVENT_DOCS = {
    [AUTH_EVENTS.AUTHENTICATE]: {
        params: {
            token: 'JWT authentication token',
            role: 'User role (student/teacher)'
        },
        response: {
            success: 'Boolean indicating authentication success',
            user: 'User object containing profile information'
        }
    },
    [EVENTS.GROUP_MESSAGE]: {
        params: {
            roomId: 'MongoDB ObjectId of the group room',
            content: 'Text content of the message',
            priority: 'Message priority (normal/high)'
        },
        response: {
            _id: 'MongoDB ObjectId of the created message',
            sender: {
                _id: 'MongoDB ObjectId of the sender',
                username: 'Username of the sender'
            },
            content: 'Text content of the message',
            timestamp: 'ISO timestamp of message creation',
            priority: 'Priority level of the message'
        }
    },
    [EVENTS.PRIVATE_MESSAGE]: {
        params: {
            recipientId: 'MongoDB ObjectId of the message recipient',
            content: 'Text content of the message'
        },
        response: {
            _id: 'MongoDB ObjectId of the created message',
            sender: {
                _id: 'MongoDB ObjectId of the sender',
                username: 'Username of the sender'
            },
            content: 'Text content of the message',
            timestamp: 'ISO timestamp of message creation',
            roomId: 'MongoDB ObjectId of the private room'
        }
    },
    [EVENTS.JOIN_ROOM]: {
        params: {
            roomId: 'MongoDB ObjectId of the room to join'
        },
        response: {
            roomId: 'MongoDB ObjectId of the joined room',
            messages: 'Array of previous room messages'
        }
    },
    [EVENTS.CLASS_CHAT_JOIN]: {
        params: {
            classId: 'MongoDB ObjectId of the class',
            studentId: 'MongoDB ObjectId of the student joining'
        },
        response: {
            success: 'Boolean indicating join success',
            roomId: 'MongoDB ObjectId of the class chat room'
        }
    },
    [EVENTS.CLASS_CHAT_LEAVE]: {
        params: {
            classId: 'MongoDB ObjectId of the class',
            studentId: 'MongoDB ObjectId of the student leaving'
        },
        response: {
            success: 'Boolean indicating leave success'
        }
    },
    [EVENTS.CLASS_CHAT_CREATED]: {
        params: {
            classId: 'MongoDB ObjectId of the class',
            roomId: 'MongoDB ObjectId of the created chat room'
        },
        response: {
            success: 'Boolean indicating creation success',
            room: 'Object containing room details'
        }
    }
};

module.exports = {
    EVENTS,
    AUTH_EVENTS,
    ERRORS,
    SOCKET_CONFIG,
    RATE_LIMIT_CONFIG,
    EVENT_DOCS,
    messageSchema,
    roomSchema,
    authSchema
};