const mongoose = require("mongoose");

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
        type: String,
    },
    chatRoom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        default: null,
    },
});
const Class = new mongoose.model("class", classSchema);
module.exports = Class;