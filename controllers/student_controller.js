const Student = require("../models/student_model");
const { Announcement, ANNOUNCEMENT_SCOPE, TARGET_AUDIENCE } = require('../models/announcement_model');
const { Event } = require('../models/event_model');
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
const CourseMaterial = require("../models/course_material_model");

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
            if (!student) {
                return next(new ErrorHandler(404, "Student data not found"));
            }
            const pendingAssignments = student.pendingAssignments;
            const submittedAssignments = student.submittedAssignments;
            res.status(200).json({
                success: true,
                data: {
                    "pendingAssignments": pendingAssignments,
                    "submittedAssignments": submittedAssignments
                }
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
        console.log("submitAssignment");
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
            if(!timeTable) {
                studentClass.timetable = [];
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


            const student = await Student.findById(studentId);
            const classId = student.classId;


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


            if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const skip = (page - 1) * limit;


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

    getStudentEvents: async (req, res, next) => {
        try {
            const { startDate, endDate, page = 1, limit = 10 } = req.query;
            const query = {
                schoolCode: req.student.schoolCode
            };

            if (startDate && endDate) {
                query.time = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const options = {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                sort: { time: 1 }
            };

            const events = await Event.paginate(query, options);

            res.status(200).json({
                success: true,
                data: events.docs,
                pagination: {
                    total: events.totalDocs,
                    page: events.page,
                    pages: events.totalPages
                }
            });
        } catch (err) {
            next(err);
        }
    },

    getSubmittedAssignments: async (req, res, next) => {
        try {
            const studentId = req.student._id;
            const { startDate, endDate, page = 1, limit = 10 } = req.query;


            const query = {
                studentId: studentId
            };


            if (startDate && endDate) {
                query.submissionDate = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const skip = (page - 1) * limit;


            const submissions = await submissionSchema.find(query)
                .populate({
                    path: 'assignmentId',
                    model: 'StudentAssignment',
                    select: 'name assignmentDueDate description'
                })
                .sort({ submissionDate: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await submissionSchema.countDocuments(query);

            res.status(200).json({
                success: true,
                data: submissions,
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

    getCourseMaterials: async (req, res, next) => {
        try {
            const studentId = req.student._id;
            const student = await StudentModel.findById(studentId);
            const classId = student.classId;
            const courseMaterials = await CourseMaterial.findOne({ "classId": classId, "schoolCode": student.schoolCode });
            console.log(courseMaterials);
            res.status(200).json({
                success: true,
                data: courseMaterials
            });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = studentCtrl;
