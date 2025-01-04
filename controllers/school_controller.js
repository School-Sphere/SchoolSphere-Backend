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
const Room = require("../models/room_model");
const { Announcement, ANNOUNCEMENT_SCOPE, TARGET_AUDIENCE } = require("../models/announcement_model");
const { Event } = require("../models/event_model");

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

            // Add student to class chat room
            if (studentClass.chatRoomId) {
                const room = await Room.findById(studentClass.chatRoomId);
                if (room) {
                    await room.addMember(newStudent._id, 'student');
                }
            }

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
            if (!name || !section) {
                return res.status(400).json({ success: false, message: 'Class name and section are required' });
            }
            if (classTeacher) {
                const teacher = await Teacher.findById(classTeacher).session(session);
                if (!teacher) {
                    return res.status(400).json({ success: false, message: 'Specified teacher not found' });
                }
            }
            const myClass = await Class.findOne({ name, section, schoolCode }).session(session);
            if (myClass) {
                return res.status(400).json({ success: false, message: 'Class ' + name + '-' + section + ' already exists' });
            }
            const classData = {
                name,
                section,
                schoolCode
            };
            if (classTeacher) {
                classData.classTeacher = classTeacher;
            }
            const newClass = new Class(classData);
            const roomMembers = [];
            if (classTeacher) {
                roomMembers.push({ user: classTeacher, role: 'teacher' });
            }
            const room = await Room.create({
                name: `${name}-${section}`,
                type: 'class',
                members: roomMembers,
                schoolCode
            });

            newClass.chatRoomId = room._id;
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
    },

    createSchoolAnnouncement: async (req, res, next) => {
        try {
            const { title, description, targetAudience } = req.body;
            const schoolCode = req.school.schoolCode;

            if (!title || !description || !targetAudience) {
                return next(new ErrorHandler(400, "Please provide all required fields"));
            }

            if (!Object.values(TARGET_AUDIENCE).includes(targetAudience)) {
                return next(new ErrorHandler(400, "Invalid target audience"));
            }

            const announcement = new Announcement({
                title,
                description,
                createdBy: req.school._id,
                creatorModel: 'School',
                targetAudience,
                scope: ANNOUNCEMENT_SCOPE.SCHOOL,
                schoolCode
            });

            await announcement.save();

            res.status(201).json({
                success: true,
                message: "Announcement created successfully",
                data: announcement
            });
        } catch (err) {
            next(err);
        }
    },

    getSchoolAnnouncements: async (req, res, next) => {
        try {
            const schoolCode = req.school.schoolCode;
            const { page = 1, limit = 10, startDate, endDate, targetAudience } = req.query;

            const query = {
                schoolCode,
                scope: ANNOUNCEMENT_SCOPE.SCHOOL
            };

            if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            if (targetAudience && Object.values(TARGET_AUDIENCE).includes(targetAudience)) {
                query.targetAudience = targetAudience;
            }

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                sort: { createdAt: -1 },
                populate: {
                    path: 'createdBy',
                    select: 'name email'
                }
            };

            const announcements = await Announcement.paginate(query, options);

            res.status(200).json({
                success: true,
                data: announcements
            });
        } catch (err) {
            next(err);
        }
    },

    createEvent: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { title, description, time, venue } = req.body;
            const schoolCode = req.school.schoolCode;

            if (!title || !description || !time || !venue) {
                return next(new ErrorHandler(400, "Please provide all required fields"));
            }

            const event = new Event({
                title,
                description,
                time: new Date(time),
                venue,
                createdBy: req.school._id,
                schoolCode
            });

            await event.save({ session });

            await session.commitTransaction();
            res.status(201).json({
                success: true,
                message: "Event created successfully",
                data: event
            });
        } catch (err) {
            await session.abortTransaction();
            next(err);
        } finally {
            session.endSession();
        }
    },

    getEvents: async (req, res, next) => {
        try {
            const schoolCode = req.school.schoolCode;
            const { page = 1, limit = 10, startDate, endDate } = req.query;

            const query = { schoolCode };

            if (startDate && endDate) {
                query.time = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                sort: { time: 1 },
                populate: {
                    path: 'createdBy',
                    select: 'name email'
                }
            };

            const events = await Event.paginate(query, options);

            res.status(200).json({
                success: true,
                data: events
            });
        } catch (err) {
            next(err);
        }
    },

    updateClassTeacher: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { classId, teacherId } = req.body;
            const schoolCode = req.school.schoolCode;

            if (!classId || !teacherId) {
                return next(new ErrorHandler(400, "Class ID and Teacher ID are required"));
            }

            // Find and validate class
            const classToUpdate = await Class.findOne({ _id: classId, schoolCode }).session(session);
            if (!classToUpdate) {
                return next(new ErrorHandler(404, "Class not found"));
            }

            // Find and validate new teacher
            const newTeacher = await Teacher.findOne({ _id: teacherId, schoolCode }).session(session);
            if (!newTeacher) {
                return next(new ErrorHandler(404, "Teacher not found"));
            }

            // If there's an existing class teacher, remove the class reference
            if (classToUpdate.classTeacher) {
                const oldTeacher = await Teacher.findById(classToUpdate.classTeacher).session(session);
                if (oldTeacher) {
                    oldTeacher.class = undefined;
                    await oldTeacher.save({ session });

                    // Remove old teacher from class chat room if exists
                    if (classToUpdate.chatRoomId) {
                        const room = await Room.findById(classToUpdate.chatRoomId);
                        if (room) {
                            await room.removeMember(oldTeacher._id);
                        }
                    }
                }
            }

            // Update new teacher's class reference
            newTeacher.class = classToUpdate._id;
            await newTeacher.save({ session });

            // Update class's teacher reference
            classToUpdate.classTeacher = newTeacher._id;
            await classToUpdate.save({ session });

            // Add new teacher to class chat room
            if (classToUpdate.chatRoomId) {
                const room = await Room.findById(classToUpdate.chatRoomId);
                if (room) {
                    await room.addMember(newTeacher._id, 'teacher');
                }
            }

            await session.commitTransaction();
            res.status(200).json({
                success: true,
                message: "Class teacher updated successfully",
                data: classToUpdate
            });
        } catch (err) {
            await session.abortTransaction();
            next(err);
        } finally {
            session.endSession();
        }
    }
};

module.exports = schoolCtrl;