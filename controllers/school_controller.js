const Student = require("../models/student_model");
const Teacher = require("../models/teacher_model");
const Class = require("../models/class_model");
const generatePassword = require("../utils/password_generator");
const bcrypt = require("bcryptjs");
const User = require("../models/user_model");
const { ErrorHandler } = require("../middlewares/error");
const mongoose = require("mongoose");
const sendEmailSchool = require("../utils/school_mailer");

const schoolCtrl = {
    addStudent: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { name, email, studentId, classId } = req.body;
            const schoolCode = req.school.schoolCode;

            let existingStudent = await Student.findOne({
                $or: [{ email }, { studentId }],
                schoolCode
            }).session(session);
            if (existingStudent) {
                if (existingStudent.email === email) {
                    return next(new ErrorHandler(400, "Student email already exists in this school"));
                }
                if (existingStudent.studentId === studentId) {
                    return next(new ErrorHandler(400, "Student ID already exists in this school"));
                }
            }
            const studentClass = await Class.findOne({ classId, schoolCode }).session(session);
            if (!studentClass) {
                return next(new ErrorHandler(400, "Class not found or does not belong to this school"));
            }
            const password = generatePassword();
            const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 8);
            const newStudent = new Student({
                name,
                email,
                password: hashedPassword,
                role: 'student',
                studentId,
                classId,
                schoolCode
            });
            studentClass.students.push(newStudent._id);
            await studentClass.save({ session });
            await newStudent.save({ session });

            // Create a user
            const newUser = new User({
                name,
                email,
                password: hashedPassword,
                role: 'student',
                schoolCode
            });
            await newUser.save({ session });

            await sendEmailSchool(email, schoolCode, password, "Student Added");

            await session.commitTransaction();
            res.status(201).json({
                success: true,
                message: "Student added successfully",
                data: newStudent,
            });
        } catch (err) {
            await session.abortTransaction();
            next(err);
        } finally {
            session.endSession();
        }
    },

    addTeacher: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { name, email, teacherId } = req.body;
            const schoolCode = req.school.schoolCode;

            let existingTeacher = await Teacher.findOne({
                $or: [{ email }, { teacherId }],
                schoolCode
            }).session(session);
            if (existingTeacher) {
                if (existingTeacher.email === email) {
                    return next(new ErrorHandler(400, "Teacher email already exists in this school"));
                }
                if (existingTeacher.teacherId === teacherId) {
                    return next(new ErrorHandler(400, "Teacher ID already exists in this school"));
                }
            }
            const password = generatePassword();
            const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 8);
            const newTeacher = new Teacher({
                name,
                email,
                password: hashedPassword,
                role: 'teacher',
                teacherId,
                schoolCode
            });
            await newTeacher.save({ session });

            // Create a user
            const newUser = new User({
                name,
                email,
                password: hashedPassword,
                role: 'teacher',
                schoolCode
            });
            await newUser.save({ session });

            await sendEmailSchool(email, schoolCode, password, "Teacher Added");

            await session.commitTransaction();
            res.status(201).json({
                success: true,
                message: "Teacher added successfully",
                data: newTeacher,
            });
        } catch (err) {
            await session.abortTransaction();
            next(err);
        } finally {
            session.endSession();
        }
    },

    addClass: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { name, section, classTeacher } = req.body;
            if (!name || !section || !classTeacher) {
                return res.status(400).json({ success: false, message: 'Please fill all the fields to add a class' });
            }
            if (!await Teacher.findById(classTeacher).session(session)) {
                return res.status(400).json({ success: false, message: 'Teacher not found' });
            }
            const myClass = await Class.findOne({ name, section }).session(session);
            if (myClass) {
                return res.status(400).json({ success: false, message: 'Class ' + name + '-' + section + ' already exists' });
            }
            const schoolCode = req.school.schoolCode;
            const newClass = new Class({
                name,
                section,
                schoolCode,
                classTeacher
            });
            await newClass.save({ session });

            await session.commitTransaction();
            res.status(201).json({
                success: true,
                message: "Class " + name + "-" + section + " added successfully",
                data: newClass,
            });
        } catch (e) {
            await session.abortTransaction();
            next(e);
        } finally {
            session.endSession();
        }
    }
};

module.exports = schoolCtrl;