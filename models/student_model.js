const mongoose = require('mongoose');
const userSchema = require('./user').schema;

const studentSchema = new mongoose.Schema({
  ...userSchema.obj,
  studentId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  class: { 
    type: String, 
    required: true 
  },
});

module.exports = mongoose.model('Student', studentSchema);
