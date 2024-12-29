const Student = require("../models/student_model");
const Teacher = require("../models/teacher_model");
const Class = require("../models/class_model");
const generatePassword = require("../utils/password_generator");
const bcrypt = require("bcryptjs");
const User = require("../models/user_model");
const { ErrorHandler } = require("../middlewares/error");
const sendEmailSchool = require("../utils/school_mailer");

const schoolCtrl = {
    addStudent: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { name, email, studentId, classId } = req.body;
            const schoolCode = req.school.schoolCode;
    
            // Check if student already exists
            let existingStudent = await Student.findOne({ 
                $or: [{ email }, { studentId }], 
                schoolCode 
            });
            if (existingStudent) {
                if (existingStudent.email === email) {
                    return next(new ErrorHandler(400, "Student email already exists in this school"));
                }
                if (existingStudent.studentId === studentId) {
                    return next(new ErrorHandler(400, "Student ID already exists in this school"));
                }
            }
    
            // Check if class exists in the same school
            const studentClass = await Class.findOne({ _id: classId, schoolCode });
            if (!studentClass) {
                return next(new ErrorHandler(400, "Class not found or does not belong to this school"));
            }
    
            // Generate password and hash it
            const password = generatePassword();
            const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 8);
    
            // Create new student
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
    
            // Save class and student in the transaction
            await studentClass.save({ session });
            await newStudent.save({ session });
    
            // Create user account
            const newUser = new User({
                name,
                email,
                password: hashedPassword,
                role: 'student',
                schoolCode
            });
            await newUser.save({ session });
    
            // Commit transaction
            await session.commitTransaction();
            session.endSession();
    
            // Send notification email
            await sendEmailSchool(email, schoolCode, password, "Student Added");
            res.status(201).json({
                success: true,
                message: "Student added successfully",
                data: newStudent,
            });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
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

            const newUser = new User({
                name,
                email,
                password: hashedPassword,
                role: 'teacher',
                schoolCode
            });
            await newUser.save();

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
                return res.status(400).json({ success: false, message: 'Class ' + name + '-' + section + ' already exists' });
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
                message: "Class " + name + "-" + section + " added successfully",
                data: newClass,
            });
        }
        catch (e) {
            next(e);
        }
    }

}

module.exports = schoolCtrl;