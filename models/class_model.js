const mongoose = require("mongoose");
const Timetable = require("./timetable_model");

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
        type: [Timetable],
    }
});
const Class = new mongoose.model("class", classSchema);
module.exports = Class;