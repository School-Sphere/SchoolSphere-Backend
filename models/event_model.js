const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  time: {
    type: Date,
    required: true
  },
  venue: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  schoolCode: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
eventSchema.index({ schoolCode: 1, time: 1 });
eventSchema.index({ time: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = {
  Event
};