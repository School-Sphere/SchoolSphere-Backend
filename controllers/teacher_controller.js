const assignmentSchema = require('../models/assignment_model');
const studentAssignmentSchema = require('../models/student_assignment_model');
const uploadImage = require('../utils/cloudinary');
const teacherSchema = require('../models/teacher_model');
const studentSchema = require('../models/student_model');
const TimetableSchema = require('../models/timetable_model')
const Class = require('../models/class_model');
const express = require('express');
const jwt = require('jsonwebtoken');
const TeacherModel = require('../models/teacher_model');

const teacherCtrl = {
    createAssignment: async (req, res, next) => {
        try {
            const filePath = req.file.path;
            const { name } = req.body;
            const teacherId = req.teacher._id;
            if (!teacherId || !name) {
                return res.json({ success: false, message: 'Please fill all the fields to create an assignment' });
            }
            let result = await uploadImage(filePath, teacherId);
            console.log(result);
            if (!result) {
                return res.json({ success: false, message: 'Error uploading the assignment' });
            }
            const teacher = await teacherSchema.findById(teacherId);
            const newAssignment = new assignmentSchema({
                teacherId,
                name,
                path: result.url
            });
            teacher.assignments.push(newAssignment._id);
            await teacher.save();
            await newAssignment.save();
            res.json({ successs: true, message: 'Assignment created successfully', data: newAssignment });
        } catch (err) {
            next(err);
        }
    },

    getAssignments: async (req, res, next) => {
        try {
            const teacherId = req.teacher._id;
            const teacher = await teacherSchema.findById(teacherId).
                populate('assignments');
            if (!teacher) {
                return res.json({ success: false, message: 'Teacher not found' });
            }
            res.json({ success: true, data: teacher.assignments });
        } catch (err) {
            next(err);
        }
    },

    assignAssignment: async (req, res, next) => {
        try {
            const { classId, assignmentId, dueDate } = req.body;
            if (!classId || !assignmentId || !dueDate) {
                return res.status(400).json({ success: false, message: 'Please fill all the fields to assign an assignment' });
            }
            const assignment = await assignmentSchema.findById(assignmentId);
            if (!assignment) {
                return res.status(404).json({ success: false, message: 'Assignment not found' });
            }
            if (assignment.teacherId != req.teacher._id) {
                return res.status(403).json({ success: false, message: 'You are not authorized to assign this assignment' });
            }
            const assignmentObject = assignment.toObject();
            delete assignmentObject._id;
            const newAssignment = new studentAssignmentSchema({
                ...assignmentObject,
                assignmentAssignedDate: Date.now(),
                assignmentDueDate: dueDate
            });

            const reqClass = await Class.findById(classId);
            if (!reqClass) {
                return res.json({ success: false, message: 'Class not found' });
            }
            const students = reqClass.students;
            for (let i = 0; i < students.length; i++) {
                const student = await studentSchema.findById(students[i]);
                if (!student) {
                    console.log('Student not found' + students[i]);
                }
                student.pendingAssignments.push(newAssignment._id);
                await student.save();
            }
            await newAssignment.save();
            res.json({ success: true, message: 'Assignment assigned successfully to ' + students.length + ' students of class ' + reqClass.name + '-' + reqClass.section });
        } catch (err) {
            next(err);
        }
    },

    createTimeTable: async (req, res, next) => {
        try {
            const teacherId = req.teacher._id;
            const teacher = await teacherSchema.findById(teacherId);
            if (!teacher) {
                return res.json({ success: false, message: 'Teacher not found' });
            }
            const teacherClass = await Class.findById(teacher.class);
            const { day, lectures } = req.body;
            if (!day || !lectures) {
                return res.json({ success: false, message: 'Please fill all the fields to create a timetable' });
            }
            const newTimeTable = new TimetableSchema({
                day,
                lectures
            })
            teacherClass.timetable.push(newTimeTable);
            await teacherClass.save();
            res.json({ success: true, message: 'Timetable created successfully', data: newTimeTable });
        } catch (err) {
            next(err);
        }
    },

    updateTimeTable: async (req, res, next) => {
        try {
            const teacherId = req.teacher._id;
            const teacher = await teacherSchema.findById(teacherId);
            const teacherClass = await Class.findById(teacher.class);

            if (!teacher) {
                return res.json({ success: false, message: 'Teacher not found' });
            }
            const { day, lectures } = req.body;
            if (!day || !lectures) {
                return res.json({ success: false, message: 'Please fill all the fields to update a timetable' });
            }
            const timeTable = teacherClass.timetable.find((timeTable) => timeTable.day === day);
            if (!timeTable) {
                return res.json({ success: false, message: 'Timetable not found' });
            }
            timeTable.lectures = lectures;
            await teacherClass.save();
            res.json({ success: true, message: 'Timetable updated successfully', data: timeTable });
        } catch (err) {
            next(err);
        }
    },

    getTimeTable: async (req, res, next) => {
        try {
            const teacherId = req.teacher._id;
            const teacher = await teacherSchema.findById(teacherId);
            if (!teacher) {
                return res.json({ success: false, message: 'Teacher not found' });
            }
            const teacherClass = await Class.findById(teacher.class);
            res.json({ success: true, data: teacherClass.timetable });
        }
        catch {
            next(err);
        }
    },

    markAllPresent: async (req, res, next) => {
        try {
            const { classId, date } = req.body;
            if (!classId || !date) {
                return res.status(400).json({ success: false, message: 'Please fill all the fields to mark all students present' });
            }
            const reqClass = await Class.findById(classId);
            if (!reqClass) {
                return res.json({ success: false, message: 'Class not found' });
            }
            const students = reqClass.students;
            for (let i = 0; i < students.length; i++) {
                const student = await studentSchema.findById(students[i]);
                if (!student) {
                    console.log('Student not found' + students[i]);
                }
                student.attendance.push({ date, status: 'Present' });
                await student.save();
            }
            res.json({ success: true, message: 'Attendance marked successfully for ' + students.length + ' students of class ' + reqClass.name + '-' + reqClass.section });
        } catch (err) {
            next(err);
        }
    },

    markPresent: async (req, res, next) => {
        try {
            const { studentId, date } = req.body;
            if (!studentId || !date) {
                return res.status(400).json({ success: false, message: 'Please fill all the fields to mark student present' });
            }
            const student = await studentSchema.findById(studentId);
            if (!student) {
                return res.json({ success: false, message: 'Student not found' });
            }
            student.attendance.push({ date, status: 'Present' });
            await student.save();
            res.json({ success: true, message: 'Attendance marked successfully for student ' + student.name });
        } catch (err) {
            next(err);
        }
    },

    markAbsent: async (req, res, next) => {
        try {
            const { studentId, date } = req.body;
            if (!studentId || !date) {
                return res.status(400).json({ success: false, message: 'Please fill all the fields to mark student absent' });
            }
            const student = await studentSchema.findById(studentId);
            if (!student) {
                return res.json({ success: false, message: 'Student not found' });
            }
            student.attendance.push({ date, status: 'Absent' });
            await student.save();
            res.json({ success: true, message: 'Attendance marked successfully for student ' + student.name });
        } catch (err) {
            next(err);
        }
    },

    getTeacher: async (req, res, next) => {
        try {
            return res.json({ success: true, data: req.teacher });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = teacherCtrl;