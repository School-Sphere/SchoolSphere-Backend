// models/roomModel.js
const mongoose = require('mongoose');
const { validateRoomAccess, getPaginationParams } = require('../utils/chat_helpers');
const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['class', 'private']
  },
  description: {
    type: String,
    trim: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['student', 'teacher'],
      required: true
    }
  }],
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  schoolCode: {
    type: String,
    required: true
  }
});

// Indexes
roomSchema.index({ schoolCode: 1, type: 1 });
roomSchema.index({ lastMessageAt: -1 });
roomSchema.index({ 'members.user': 1 });

// Methods for member management
roomSchema.methods.addMember = async function(userId, role) {
  if (!this.members.find(m => m.user.toString() === userId.toString())) {
    this.members.push({ user: userId, role });
    await this.save();
  }
};

roomSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  await this.save();
};

// Access control helpers
roomSchema.methods.canAccess = async function(userId) {
  return validateRoomAccess(this, userId);
};

roomSchema.methods.isTeacher = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member && member.role === 'teacher';
};

// Static methods for room operations
roomSchema.statics.createClassRoom = async function(name, teacherId, schoolCode) {
  return this.create({
    name,
    type: 'class',
    members: [{ user: teacherId, role: 'teacher' }],
    schoolCode
  });
};

//creating private rooms
roomSchema.statics.createPrivateRoom = async function(members, schoolCode) {
  const teacher = members.find(m => m.role === 'teacher');
  const otherUser = members.find(m => m.role !== 'teacher');
  const roomName = `${teacher.userId}-${otherUser.userId}`;

  return this.create({
    name: roomName,
    type: 'private',
    members: members.map(m => ({ user: m.userId, role: m.role })),
    schoolCode
  });
};

roomSchema.statics.getActiveRooms = function(schoolCode, query = {}) {
  const { skip, limit } = getPaginationParams(query);
  return this.find({ schoolCode, isActive: true })
    .sort({ lastMessageAt: -1 })
    .populate('members.user', 'name email role')
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('Room', roomSchema);
