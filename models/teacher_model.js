const mongoose = require('mongoose');
const userSchema = require('./user_model').schema;

const teacherSchema = new mongoose.Schema({
  ...userSchema.obj,
  teacherId: {
    type: String,
    required: true,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  assignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  }],
  submissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  }],
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
});

// Allow only one teacher per school with the same teacherId
teacherSchema.index({ schoolCode: 1, teacherId: 1 }, { unique: true });

module.exports = mongoose.model('Teacher', teacherSchema);
