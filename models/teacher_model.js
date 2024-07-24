const mongoose = require('mongoose');
const userSchema = require('./user').schema;

const teacherSchema = new mongoose.Schema({
  ...userSchema.obj,
  teacherId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  subject: { 
    type: String, 
    required: true 
  },
});

module.exports = mongoose.model('Teacher', teacherSchema);
