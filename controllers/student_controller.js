const Student = require("../models/student_model");
const { Announcement, ANNOUNCEMENT_SCOPE, TARGET_AUDIENCE } = require('../models/announcement_model');
const Class = require("../models/class_model");
const TimeTable = require("../models/timetable_model");
const { ErrorHandler } = require("../middlewares/error");
const uploadImage = require("../utils/cloudinary");
const student_assignment_model = require("../models/student_assignment_model");
const Teacher = require("../models/teacher_model");
const submissionSchema = require("../models/assignment_submition_model");
const express = require('express');
const jwt = require('jsonwebtoken');
const StudentModel = require('../models/student_model');

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
    },

    getStudent: async (req, res, next) => {
        try {
            return res.status(200).json({
                success: true,
                data: req.student
            });
        } catch (error) {
            next(error);
        }
    },

    getStudentAnnouncements: async (req, res, next) => {
        try {
            const studentId = req.student._id;
            const { startDate, endDate, page = 1, limit = 10 } = req.query;

            // Get student's class
            const student = await Student.findById(studentId);
            const classId = student.classId;

            // Build query for both school-wide and class-specific announcements
            const query = {
                $or: [
                    {
                        scope: ANNOUNCEMENT_SCOPE.SCHOOL,
                        targetAudience: TARGET_AUDIENCE.ALL
                    },
                    {
                        scope: ANNOUNCEMENT_SCOPE.CLASS,
                        targetClass: classId,
                        targetAudience: TARGET_AUDIENCE.ALL
                    }
                ],
                schoolCode: req.student.schoolCode
            };

            // Add date range filter if provided
            if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const skip = (page - 1) * limit;

            // Fetch announcements with pagination
            const announcements = await Announcement.find(query)
                .populate('createdBy', 'name email')
                .populate('targetClass', 'name section')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Announcement.countDocuments(query);

            res.status(200).json({
                success: true,
                data: announcements,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = studentCtrl;
