const { required } = require('joi');
const mongoose = require('mongoose');
const userSchema = require('./user_model').schema;

const studentSchema = new mongoose.Schema({
  ...userSchema.obj,
  studentId: {
    type: String,
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  attendance: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance'
  }],
  pendingAssignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentAssignment'
  }],
  submittedAssignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentAssignment'
  }],
  payments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  }],
  schoolCode: { type: String, required: true },
});

studentSchema.index({ schoolCode: 1, studentId: 1 }, { unique: true });


module.exports = mongoose.model('Student', studentSchema);
