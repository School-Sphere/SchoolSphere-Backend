const mongoose = require('mongoose');


const LectureSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  teacherId: {   
    type: mongoose.Schema.Types.ObjectId, 
    required: true
  },
  lectureNumber: {
    type: String,
    required: true
  },
  isBreak: {
    type: Boolean,
    default: false
  },
});


const TimetableSchema = new mongoose.Schema({
  day: {
    type: String,  
    required: true
  },
  lectures: [LectureSchema]  
});


const Timetable = mongoose.model('Timetable', TimetableSchema);

module.exports = Timetable;
