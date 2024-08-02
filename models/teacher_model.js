const mongoose = require('mongoose');
const userSchema = require('./user_model').schema;

const teacherSchema = new mongoose.Schema({
  ...userSchema.obj,
  teacherId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  assignments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Assignment' 
  }],
});

module.exports = mongoose.model('Teacher', teacherSchema);
