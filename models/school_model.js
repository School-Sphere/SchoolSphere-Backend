const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
  },
  address: { 
    type: String, 
    required: true 
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  schoolCode: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: {
    type: String,
    required: true
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }]
});

module.exports = mongoose.model('School', schoolSchema);
