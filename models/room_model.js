// models/roomModel.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    default: [],
  }],
});

module.exports = mongoose.model('Room', roomSchema);
