const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { ErrorHandler } = require('./error');
const Student = require('../models/student_model');
const Teacher = require('../models/teacher_model');
const authConfig = require('../config/auth_config');
const { ERRORS, EVENTS, RATE_LIMIT_CONFIG } = require('../config/socket_events');
const { handleChatError, createChatError } = require('../utils/chat_helpers');

class SocketErrorHandler extends Error {
  constructor(code, message, type = 'socket') {
    super(message);
    this.code = code;
    this.event = EVENTS.ERROR;
    this.type = type;
    this.timestamp = new Date().toISOString();
  }
}

// Factory function to create socket middleware
const createSocketMiddleware = (options = {}) => {
  const rateLimiter = new Map();
  const rateLimit = {
    windowMs: options.rateLimitWindow || RATE_LIMIT_CONFIG.windowMs,
    maxRequests: options.maxRequests || RATE_LIMIT_CONFIG.maxRequests,
    blockDuration: RATE_LIMIT_CONFIG.blockDuration
  };

const socketRateLimiter = (socket, next) => {
  const clientId = socket.handshake.auth.token || socket.id;
  const now = Date.now();
  
  if (!rateLimiter.has(clientId)) {
    rateLimiter.set(clientId, {
      count: 1,
      firstRequest: now
    });
    return next();
  }

  const clientData = rateLimiter.get(clientId);
  
  if (now - clientData.firstRequest > rateLimit.windowMs) {
    clientData.count = 1;
    clientData.firstRequest = now;
    return next();
  }

  if (clientData.count >= rateLimit.maxRequests) {
    const error = createChatError(
      ERRORS.AUTH.code,
      ERRORS.AUTH.RATE_LIMIT_EXCEEDED
    );
    return next(error);
  }

  clientData.count++;
  next();
};

const checkPermission = (socket, eventName) => {
  const { role } = socket;
  const event = EVENTS[eventName];
  return authConfig.roles[role] && authConfig.roles[role][event];
};

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      throw createChatError(ERRORS.AUTH.code, ERRORS.AUTH.NO_TOKEN);
    }

    const cleanToken = token.replace(/^Bearer\s+/, '');

    jwt.verify(cleanToken, authConfig.jwt.secret, {
      ...authConfig.tokenVerification,
    }, async (err, payload) => {
      if (err) {
        throw createChatError(ERRORS.AUTH.code, ERRORS.AUTH.INVALID_TOKEN);
      }

      const { id, role } = payload;
      let user;

      try {
        if (role === 'student') {
          user = await Student.findById(id);
        } else if (role === 'teacher') {
          user = await Teacher.findById(id);
        }

        if (!user) {
          throw createChatError(ERRORS.AUTH.code, ERRORS.AUTH.USER_NOT_FOUND);
        }

        socket.user = user;
        socket.role = role;
        next();
      } catch (dbError) {
        throw createChatError(ERRORS.AUTH.code, 'Database operation failed');
      }
    });
  } catch (error) {
    next(new SocketErrorHandler(ERRORS.AUTH.code, authConfig.errors.auth.unauthorized));
  }
};

  const validatePayload = (schema) => (packet, next) => {
    const { error } = schema.validate(packet);
    if (error) {
      return next(new SocketErrorHandler(ERRORS.MESSAGE.code, error.details[0].message));
    }
    next();
  };

  const socketErrorHandler = (err, socket) => {
    const errorResponse = handleChatError(err);
    socket.emit(EVENTS.ERROR, errorResponse);
  };

  // Cleanup rate limiter data for disconnected clients
  const cleanupRateLimiter = (socket) => {
    const clientId = socket.handshake.auth.token || socket.id;
    rateLimiter.delete(clientId);
  };

  return {
    socketAuth,
    socketRateLimiter,
    validatePayload,
    socketErrorHandler,
    cleanupRateLimiter,
    checkPermission
  };
};

module.exports = createSocketMiddleware;