const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderType: {
    type: String,
    required: true,
    enum: ['Student', 'Teacher']
  },
  type: {
    type: String,
    required: true,
    enum: ['TEXT', 'IMAGE', 'FILE'],
    default: 'TEXT'
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Message content cannot be empty'],
    maxlength: [2000, 'Message content cannot exceed 2000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create indexes for efficient querying
messageSchema.index({ roomId: 1, timestamp: 1 });
messageSchema.index({ sender: 1 });

// Static methods for message retrieval
messageSchema.statics.getMessagesByRoom = function (roomId, limit = 50) {
  return this.find({ roomId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('sender', 'name role')
    .exec();
};

messageSchema.statics.getMessagesBetweenDates = function (roomId, startDate, endDate) {
  return this.find({
    roomId,
    timestamp: { $gte: startDate, $lte: endDate }
  })
    .sort({ timestamp: -1 })
    .populate('sender', 'name role')
    .exec();
};

messageSchema.statics.getLatestMessages = function (roomIds, limit = 1) {
  return this.aggregate([
    { $match: { roomId: { $in: roomIds } } },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$roomId',
        message: { $first: '$$ROOT' }
      }
    },
    { $replaceRoot: { newRoot: '$message' } }
  ]);
};

module.exports = mongoose.model('Message', messageSchema);