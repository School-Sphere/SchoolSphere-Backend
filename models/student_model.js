const mongoose = require('mongoose');
const userSchema = require('./user_model').schema;
const attendanceSchema = require('./attendance_model').schema;
const mongoosePaginate = require('mongoose-paginate-v2');

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
  className: {
    type: String,
  },
  rollNumber: {
    type: String, 
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
  parentEmail: {
    type: String,
  },
  motherName: {
    type: String,
  },
  fatherName: {
    type: String,
  },
  address: {
    type: String, // e.g., Permanent Address
  },
  gender: {
    type: String,
  },
  parentContact: {
    type: String, // Parent contact number
  },
  profilePicture: {
    type: String, // URL or base64 of the profile picture
  },
  attendance: [attendanceSchema],
  payments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  }],
  schoolCode: {
    type: String,
    required: true,
  }
});

studentSchema.plugin(mongoosePaginate);

studentSchema.index({ schoolCode: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
