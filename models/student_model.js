const mongoose = require('mongoose');
const userSchema = require('./user_model').schema;

const studentSchema = new mongoose.Schema({
  ...userSchema.obj,
  studentId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  studentClass: { 
    type: String, 
    required: true 
  },
  attendance: { 
    type: Array, 
    default: [] 
  },
});

module.exports = mongoose.model('Student', studentSchema);
