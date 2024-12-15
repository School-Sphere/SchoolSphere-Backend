const Student = require("../models/student_model");
const Class = require("../models/class_model");
const TimeTable = require("../models/timetable_model");
const { ErrorHandler } = require("../middlewares/error");
const uploadImage = require("../utils/cloudinary");
const student_assignment_model = require("../models/student_assignment_model");
const Teacher = require("../models/teacher_model");
const submissionSchema = require("../models/assignment_submition_model");

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
            const assignmentId = req.params.assignmentId;
            const studentId = req.student._id;
            const submissionDate = Date.now();
            const content = req.file.path;
            const result = await uploadImage(content, studentId);
            if (!result) {
                return next(new ErrorHandler(500, "Error uploading the assignment"));
            }
            const lateSubmission = submissionDate > student_assignment_model.assignmentDueDate;
            const newSubmission = new submissionSchema({
                assignmentId,
                studentId,
                submissionDate,
                lateSubmission,
                content: result.url
            });
            await newSubmission.save();
            const student = await Student.findById(studentId);
            if (!student.pendingAssignments.includes(assignmentId)) {
                return next(new ErrorHandler(400, "Assignment already submitted"));
            }
            student.pendingAssignments = student.pendingAssignments.filter((assignment) => assignment != assignmentId);
            student.submittedAssignments.push(assignmentId);
            await student.save();
            const assignAssignment = await student_assignment_model.findById(assignmentId);
            const teacher = await Teacher.findById(assignAssignment.teacherId);
            teacher.submissions.push(newSubmission._id);
            await teacher.save();
            res.status(200).json({
                success: true,
                message: "Assignment submitted successfully"
            });
        }
        catch (err) {
            next(err);
        }
    },

    getTimeTable: async (req, res, next) => {
        try {
            const studentId = req.student._id;
            const student = await Student.findById(studentId);
            const classId = student.classId;
            const studentClass = await Class.findById(classId);
            const timeTable = studentClass.timetable;
            const timeTableData = await TimeTable.findById(timeTable);
            if (!timeTableData) {
                return next(new ErrorHandler(404, "TimeTable not found"));
            }
            res.status(200).json({
                success: true,
                data: timeTable
            });
        }
        catch (err) {
            next(err);
        }
    }
};
module.exports = studentCtrl;
