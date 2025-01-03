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
  dob: {
    type: Date,
  },
  doa: {
    type: Date,
  },
  session: {
    type: String,
  },
  fatherName: {
    type: String,
  },
  motherName: {
    type: String,
  },
  parentEmail: {
    type: String,
  },
  address: {
    type: String,
  },
  gender: {
    type: String,
  },
  parentContact: {
    type: String,
  },
  fatherOccupation: {
    type: String,
  },
  motherOccupation: {
    type: String,
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

studentSchema.virtual('submittedAssignmentDetails', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'studentId',
  options: { sort: { submissionDate: -1 } },
  match: function() {
    return { studentId: this._id };
  }
});

studentSchema.index({ schoolCode: 1, studentId: 1 }, { unique: true });


module.exports = mongoose.model('Student', studentSchema);
