const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
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
  date: {
    type: Date,
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

eventSchema.plugin(mongoosePaginate);
const Event = mongoose.model('Event', eventSchema);

module.exports = {
  Event
};