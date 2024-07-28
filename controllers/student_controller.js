const Student = require("../models/student_model");
const { ErrorHandler } = require("../middlewares/error");

require("dotenv").config();

const studentCtrl = {
    getAttendance: async (req, res, next) => {
        try {
            const studentId = req.student._id;
            const attendanceData = await Student.findById(studentId).select('attendance'); 
            if (!attendanceData) {
                return next(new ErrorHandler(404, "Attendance data not found"));
            }
            res.status(200).json({
                success: true,
                data: attendanceData
            });
        } 
        catch (err) {
            next(err);
        }
    }
};
module.exports = studentCtrl;