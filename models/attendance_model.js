const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
});

const Attendance = new mongoose.model("attendance", attendanceSchema);
module.exports = Attendance;