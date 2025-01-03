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
  dob: {
    type: Date,
  },
  designation: {
    type: String,
  },
  contactNumber: {
    type: String,
  },
  address: {
    type: String,
  },
  gender: {
    type: String,
  },
  qualifications: {
    type: String,
  },
  assignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  }],
  submissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  }],
  courseMaterials: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseMaterial'
  }],
  schoolCode: { type: String, required: true },
});

// Allow only one teacher per school with the same teacherId
teacherSchema.index({ schoolCode: 1, teacherId: 1 }, { unique: true });

module.exports = mongoose.model('Teacher', teacherSchema);
