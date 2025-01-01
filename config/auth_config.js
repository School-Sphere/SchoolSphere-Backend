const jwt = require('jsonwebtoken');
require('dotenv').config();

const authConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.USER,
    resetSecret: process.env.RESET,
    tokenExpiration: '24h',
    resetTokenExpiration: 600, // 10 minutes in seconds

  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    standardHeaders: true,
    blockDuration: 300000, // 5 minutes in milliseconds
    skipSuccessfulRequests: false
  },

  // Role-based Permissions
  roles: {
    student: {
      canJoinClass: true,
      canViewAssignments: true,
      canSubmitAssignments: true,
      canParticipateInDiscussion: true,
      canViewGrades: true
    },
    teacher: {
      canCreateClass: true,
      canManageStudents: true,
      canCreateAssignments: true,
      canGradeAssignments: true,
      canModerateDiscussions: true,
      canViewAnalytics: true
    }
  },

  // Token Verification Options
  tokenVerification: {
    ignoreExpiration: false,
    clockTolerance: 30, // seconds
    maxAge: '24h',
    clockTimestamp: Math.floor(Date.now() / 1000)
  },

  // Session Management
  session: {
    cookieName: 'schoolsphere.sid',
    rolling: true,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 86400000, // 24 hours in milliseconds
      sameSite: 'strict'
    }
  },

  // Error Messages
  errors: {
    auth: {
      invalidToken: 'Invalid authentication token provided',
      tokenExpired: 'Authentication token has expired',
      noToken: 'No authentication token provided',
      invalidCredentials: 'Invalid email or password',
      userNotFound: 'User not found',
      unauthorized: 'Unauthorized access attempt',
      sessionExpired: 'Session has expired'
    },
    rateLimiting: {
      tooManyRequests: 'Too many requests, please try again later',
      blocked: 'Your access has been temporarily blocked'
    }
  },

  // Authentication Timeouts
  timeouts: {
    loginAttempt: 30000, // 30 seconds
    otpValidation: 300000, // 5 minutes
    passwordReset: 600000, // 10 minutes
    sessionInactivity: 1800000, // 30 minutes
    tokenRefresh: 3600000 // 1 hour
  }
};

module.exports = authConfig;