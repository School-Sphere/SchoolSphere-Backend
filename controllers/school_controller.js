const Student = require("../models/student_model");
const Teacher = require("../models/teacher_model");
const Class = require("../models/class_model");
const generatePassword = require("../utils/password_generator");
const bcrypt = require("bcryptjs");
const { ErrorHandler } = require("../middlewares/error");
const sendEmailSchool = require("../utils/school_mailer");

const schoolCtrl = {
    addStudent: async (req, res, next) => {
        try {
            const { name, email, studentId, classId } = req.body;
            const schoolCode = req.school.schoolCode;
            let existingStudent = await Student.findOne({ email, schoolCode });
            if (existingStudent) {
                return next(new ErrorHandler(400, "Student email already exists in this school"));
            }
            existingStudent = await Student.findOne({ studentId, schoolCode });
            if (existingStudent) {
                return next(new ErrorHandler(400, "Student ID already exists in this school"));
            }
            const password = generatePassword();
            const hashedPassword = await bcrypt.hash(password, 8);

            const studentClass = await Class.findById(classId);
            if (!studentClass) {
                return next(new ErrorHandler(400, "Class not found"));
            }
            const newStudent = new Student({
                name,
                email,
                password: hashedPassword,
                role: 'student',
                studentId,
                classId: classId,
                schoolCode
            });
            studentClass.students.push(newStudent._id);
            await studentClass.save();
            await newStudent.save();
            await sendEmailSchool(email, schoolCode, password, "Student Added");
            res.status(201).json({
                success: true,
                message: "Student added successfully",
                data: newStudent,
            });
        } catch (err) {
            next(err);
        }
    },

    addTeacher: async (req, res, next) => {
        try {
            const { name, email, teacherId } = req.body;
            const schoolCode = req.school.schoolCode;
            let existingTeacher = await Teacher.findOne({ email, schoolCode });
            if (existingTeacher) {
                return next(new ErrorHandler(400, "Teacher email already exists in this school"));
            }
            existingTeacher = await Teacher.findOne({ teacherId, schoolCode });
            if (existingTeacher) {
                return next(new ErrorHandler(400, "Teacher ID already exists in this school"));
            }
            const password = generatePassword();
            const hashedPassword = await bcrypt.hash(password, 8);
            const newTeacher = new Teacher({
                name,
                email,
                password: hashedPassword,
                role: 'teacher',
                teacherId,
                schoolCode
            });

            await newTeacher.save();
            await sendEmailSchool(email, schoolCode, password, "Teacher Added");
            res.status(201).json({
                success: true,
                message: "Teacher added successfully",
                data: newTeacher,
            });
        } catch (err) {
            next(err);
        }
    },

    addClass: async (req, res, next) => {
        try {
            const { name, section, classTeacher } = req.body;
            if (!name || !section || !classTeacher) {
                return res.status(400).json({ success: false, message: 'Please fill all the fields to add a class' });
            }
            if (!await Teacher.findById(classTeacher)) {
                return res.status(400).json({ success: false, message: 'Teacher not found' });
            }
            const myClass = await Class.findOne({ name, section });
            if (myClass) {
                console.log('Class already exists ' + name + '-' + section);
                return res.status(400).json({ success: false, message: 'Class already exists ' + name + '-' + section });
            }   
            const schoolCode = req.school.schoolCode;
            const newClass = new Class({
                name,
                section,
                schoolCode,
                classTeacher
            });
            await newClass.save();
            res.status(201).json({
                success: true,
                message: "Class " + newClass._id + " added successfully",
                data: newClass,
            });
        }
        catch (e) {
            next(e);
        }
    }

}

module.exports = schoolCtrl;