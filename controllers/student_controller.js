const Student = require("../models/student_model");
const { ErrorHandler } = require("../middlewares/error");
const student_assignment_model = require("../models/student_assignment_model");

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
    },

    getAssignments: async (req, res, next) => {
        try {
            const studentId = req.student._id;
            const student = await Student.findById(studentId);
            const assignmentData = student.pendingAssignments;
            if (!assignmentData) {
                return next(new ErrorHandler(404, "Assignment data not found"));
            }
            res.status(200).json({
                success: true,
                data: assignmentData
            });
        }
        catch (err) {
            next(err);
        }
    },

    getAssignment: async (req, res, next) => {
        try {
            const assignmentId = req.params.assignmentId;
            const assignmentData = await student_assignment_model.findById(assignmentId);
            if (!assignmentData) {
                return next(new ErrorHandler(404, "Assignment data not found"));
            }
            res.status(200).json({
                success: true,
                data: assignmentData
            });
        }
        catch (err) {
            next(err);
        }
    },

    submitAssignment: async (req, res, next) => {
        try {
            const studentId = req.student._id;
            const assignmentId = req.params.assignmentId;
            const assignmentData = await Student.findById(studentId).select('assignments');
            if (!assignmentData) {
                return next(new ErrorHandler(404, "Assignment data not found"));
            }
            const assignment = assignmentData.assignments.find(assignment => assignment._id == assignmentId);
            if (!assignment) {
                return next(new ErrorHandler(404, "Assignment not found"));
            }
            const { filePath } = req.file;
            assignment.submitted = true;
            assignment.submittedPath = filePath;
            await assignmentData.save();
            res.status(200).json({
                success: true,
                message: "Assignment submitted successfully"
            });
        }
        catch (err) {
            next(err);
        }
    }
};
module.exports = studentCtrl;