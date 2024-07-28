const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    schoolCode: {
        type: String,
        required: true,
    },
    classTeacher: {
        type: String,
        required: true,
    },
    students: {
        type: Array,
        default: [],
    },
    subjects: {
        type: Array,
        default: [],
    },
    timetable: {
        type: String,
    }
});
const Class = new mongoose.model("class", classSchema);
module.exports = Class;