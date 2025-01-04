const Student = require("../models/student_model");
const Teacher = require("../models/teacher_model");
const Class = require("../models/class_model");
const generatePassword = require("../utils/password_generator");
const bcrypt = require("bcryptjs");
const School = require("../models/school_model");
const Models = require("../models/models");
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

    deleteSchool: async (req, res, next) => {
        try {
            const { password, schoolCode } = req.body;

            if (!password) {
                return res.status(400).json({ message: 'Password is required.' });
            }
            if (!schoolCode) {
                return res.status(400).json({ message: 'School code is required.' });
            }

            const adminUser = await School.findOne({ schoolCode });
            if (!adminUser) {
                return res.status(404).json({ message: 'No School found with given school code' });
            }

            const isPasswordValid = await bcrypt.compare(password, adminUser.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid password.' });
            }

            for (const modelName in Models) {
                if (Models.hasOwnProperty(modelName)) {
                    const Model = Models[modelName];
                    const result = await Model.deleteMany({ schoolCode });
                    console.log(`${modelName}: Deleted ${result.deletedCount} documents.`);
                }
            }

            res.status(200).json({
                success: true,
                message: `All data for school code '${schoolCode}' has been successfully deleted.`,
            });
        } catch (error) {
            console.error('Error deleting school data:', error);
            next(error);
        }
    },

    addTeacher: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { name, email, teacherId } = req.body;
            const schoolCode = req.school.schoolCode;

            let existingTeacher = await Teacher.findOne({
                $or: [
                    { email, schoolCode },
                    { teacherId, schoolCode }
                ]
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
            if (err.code === 11000) {
                return next(new ErrorHandler(400, "Teacher email or ID already exists in this school"));
            }
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
            const schoolCode = req.school.schoolCode;
            if (!name || !section || !classTeacher) {
                return res.status(400).json({ success: false, message: 'Please fill all the fields to add a class' });
            }
            if (!await Teacher.findById(classTeacher).session(session)) {
                return res.status(400).json({ success: false, message: 'Teacher not found' });
            }
            const myClass = await Class.findOne({ name, section, schoolCode }).session(session);
            if (myClass) {
                return res.status(400).json({ success: false, message: 'Class ' + name + '-' + section + ' already exists' });
            }
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