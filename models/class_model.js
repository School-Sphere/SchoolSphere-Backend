const mongoose = require('mongoose');
const Timetable = require('../models/timetable_model'); 

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    section: {
        type: String,
        required: true,
    },
    schoolCode: {
        type: String,
        required: true,
    },
    classTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
    },
    students: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
        },
    ],
    subjects: {
        type: Array,
        default: [],
    },
    timetable: {
        type: [Timetable.schema],
    },
    chatRoomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    }
});

const Class = mongoose.model("Class", classSchema);
module.exports = Class;