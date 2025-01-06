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
  attendance: [attendanceSchema],
  religion: {
    type: String,
  },
  bloodGroup: {
    type: String
  },
  profilePicture: {
    type: String,
  },
  pendingAssignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentAssignment',
    default: []
  }],
  submittedAssignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentAssignment',
    default: []
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
  match: function () {
    return { studentId: this._id };
  }
});

studentSchema.plugin(mongoosePaginate);

studentSchema.index({ schoolCode: 1, studentId: 1 }, { unique: true });


module.exports = mongoose.model('Student', studentSchema);
