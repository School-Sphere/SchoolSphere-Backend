const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  address: { 
    type: String, 
    required: true 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true 
  },
});

module.exports = mongoose.model('School', schoolSchema);
