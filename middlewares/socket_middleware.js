const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { ErrorHandler } = require('./error');
const Student = require('../models/student_model');
const Teacher = require('../models/teacher_model');
const authConfig = require('../config/auth_config');
const { ERRORS } = require('../config/socket_events');

class SocketErrorHandler extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.event = 'error';
  }
}

// Factory function to create socket middleware
const createSocketMiddleware = (options = {}) => {
  const rateLimiter = new Map();
  const rateLimit = {
    windowMs: options.rateLimitWindow || authConfig.rateLimit.windowMs,
    maxRequests: options.maxRequests || authConfig.rateLimit.maxRequests
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
    return next(new SocketErrorHandler(ERRORS.AUTH.code, authConfig.errors.rateLimiting.tooManyRequests));
  }

  clientData.count++;
  next();
};

const checkPermission = (role, permission) => {
  return authConfig.roles[role] && authConfig.roles[role][permission];
};

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new SocketErrorHandler(ERRORS.AUTH.code, authConfig.errors.auth.noToken));
    }

    const cleanToken = token.replace(/^Bearer\s+/, '');

    jwt.verify(cleanToken, authConfig.jwt.secret, {
      ...authConfig.tokenVerification,
    }, async (err, payload) => {
      if (err) {
        return next(new SocketErrorHandler(ERRORS.AUTH.code, authConfig.errors.auth.invalidToken));
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
          return next(new SocketErrorHandler(ERRORS.AUTH.code, authConfig.errors.auth.userNotFound));
        }

        socket.user = user;
        socket.role = role;
        next();
      } catch (dbError) {
        next(new SocketErrorHandler(ERRORS.AUTH.code, 'Database operation failed'));
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
    socket.emit('error', {
      code: err.code || ERRORS.AUTH.code,
      message: err.message || 'Internal server error'
    });
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