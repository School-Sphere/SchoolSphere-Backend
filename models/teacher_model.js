const mongoose = require('mongoose');
const userSchema = require('./user_model').schema;
const mongoosePaginate = require('mongoose-paginate-v2');
const Timetable = require('../models/timetable_model');

const teacherSchema = new mongoose.Schema({
  ...userSchema.obj,
  teacherId: {
    type: String,
    required: true,
  },
  assignedClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    validate: {
      validator: function (value) {
        if (!value) return true; // Skip validation if no value
        return this.teachingClasses && this.teachingClasses.some(classId => classId.equals(value));
      },
      message: 'Assigned class must be one of the teaching classes'
    }
  },
  teachingClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
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
  bloodGroup: {
    type: String,
  },
  religion: {
    type: String,
  },
  doj: {
    type: Date,
  },
  profilePicture: {
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
  timetable: {
    type: [Timetable.schema],
  },
  schoolCode: { type: String, required: true },
});

// Allow only one teacher per school with the same teacherId
teacherSchema.index({ schoolCode: 1, teacherId: 1 }, { unique: true });
teacherSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Teacher', teacherSchema);
