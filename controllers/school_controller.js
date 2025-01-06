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
            const {
                studentId,
                name,
                email,
                gender,
                classId,
                dob,
                bloodGroup,
                religion,
                doa,
                fatherName,
                motherName,
                parentEmail,
                parentContact,
                fatherOccupation,
                address,
                profilePic
            } = req.body;
    
            const schoolCode = req.school.schoolCode;
    
            if (!studentId || !name || !email || !classId) {
                return next(new ErrorHandler(400, "Missing required fields: studentId, name, email, or classId"));
            }
    
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
    
            const studentClass = await Class.findOne({ _id: classId, schoolCode }).session(session);
            if (!studentClass) {
                return next(new ErrorHandler(400, "Class not found or does not belong to this school"));
            }
    
            const password = generatePassword();
            const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 8);
    
            const newStudent = new Student({
                studentId,
                name,
                email,
                gender,
                classId,
                dob,
                bloodGroup,
                religion,
                doa,
                fatherName,
                motherName,
                parentEmail,
                parentContact,
                fatherOccupation,
                address,
                profilePicture: profilePic,
                password: hashedPassword,
                role: 'student',
                schoolCode
            });
    
            studentClass.students.push(newStudent._id);
            await studentClass.save({ session });
            await newStudent.save({ session });
    
            if (studentClass.chatRoomId) {
                const room = await Room.findById(studentClass.chatRoomId);
                if (room) {
                    await room.addMember(newStudent._id, 'student');
                }
            }
    
            const newUser = new User({
                _id: newStudent._id,
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
                _id: newTeacher._id,
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
            const { title, description, time, venue, date} = req.body;
            const schoolCode = req.school.schoolCode;

            if (!title || !date || !time || !venue) {
                return next(new ErrorHandler(400, "Please provide all required fields"));
            }

            const event = new Event({
                title,
                description,
                time: new Date(time),
                venue,
                date: new Date(date),
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
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                sort: { time: 1 }, // Sort by time in ascending order
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
    },

    addSubjectsToClass: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { classId, subjects } = req.body;
            const schoolCode = req.school.schoolCode;

            if (!classId || !Array.isArray(subjects) || subjects.length === 0) {
                return next(new ErrorHandler(400, "Class ID and subjects array are required"));
            }

            const classToUpdate = await Class.findOne({ _id: classId, schoolCode }).session(session);
            if (!classToUpdate) {
                return next(new ErrorHandler(404, "Class not found"));
            }

            const Subject = mongoose.model('Subject');
            const subjectDocs = [];

            for (const subjectName of subjects) {
                let subject = await Subject.findOne({ subjectName, schoolCode }).session(session);
                if (!subject) {
                    subject = new Subject({
                        subjectName,
                        schoolCode
                    });
                    await subject.save({ session });
                }
                if (!classToUpdate.subjects.includes(subject._id)) {
                    subjectDocs.push(subject);
                }
            }

            classToUpdate.subjects.push(...subjectDocs.map(s => s._id));
            await classToUpdate.save({ session });

            await session.commitTransaction();
            res.status(200).json({
                success: true,
                message: "Subjects added to class successfully",
                data: classToUpdate
            });
        } catch (err) {
            await session.abortTransaction();
            next(err);
        } finally {
            session.endSession();
        }
    },

    assignTeacherToSubject: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { subjectId, teacherId } = req.body;
            const schoolCode = req.school.schoolCode;

            if (!subjectId || !teacherId) {
                return next(new ErrorHandler(400, "Subject ID and Teacher ID are required"));
            }

            const subject = await mongoose.model('Subject').findOne({ _id: subjectId, schoolCode }).session(session);
            if (!subject) {
                return next(new ErrorHandler(404, "Subject not found"));
            }

            const teacher = await Teacher.findOne({ _id: teacherId, schoolCode }).session(session);
            if (!teacher) {
                return next(new ErrorHandler(404, "Teacher not found"));
            }

            subject.teacherId = teacherId;
            await subject.save({ session });

            await session.commitTransaction();
            res.status(200).json({
                success: true,
                message: "Teacher assigned to subject successfully",
                data: subject
            });
        } catch (err) {
            await session.abortTransaction();
            next(err);
        } finally {
            session.endSession();
        }
    },

    getAllStudents: async (req, res, next) => {
        try {
            const schoolCode = req.school.schoolCode;
            const { page = 1, limit = 10 } = req.query;
    
            if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
                return next(new ErrorHandler(400, "Invalid pagination parameters"));
            }
    
            const query = { schoolCode };
    
            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                sort: { name: 1 }, 
                populate: {
                    path: 'classId', 
                    select: 'name section',
                    transform: (doc) => ({
                        className: doc.name,
                        section: doc.section
                    })
                },
                select: '_id studentId name gender parentContact' 
            };
    
            const students = await Student.paginate(query, options);
    
            const formattedData = students.docs.map(student => ({
                id: student._id,
                studentId: student.studentId,
                name: student.name,
                gender: student.gender,
                parentContact: student.parentContact,
                className: student.classId?.className || null,
                section: student.classId?.section || null
            }));
    
            res.status(200).json({
                success: true,
                data: {
                    docs: formattedData,
                    totalDocs: students.totalDocs,
                    limit: students.limit,
                    totalPages: students.totalPages,
                    page: students.page,
                    pagingCounter: students.pagingCounter,
                    hasPrevPage: students.hasPrevPage,
                    hasNextPage: students.hasNextPage,
                    prevPage: students.prevPage,
                    nextPage: students.nextPage
                }
            });
        } catch (err) {
            next(err); 
        }
    },    
    
    getAllTeachers: async (req, res, next) => {
        try {
            const schoolCode = req.school.schoolCode;
            const { page = 1, limit = 10 } = req.query;
    
            if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
                return next(new ErrorHandler(400, "Invalid pagination parameters"));
            }
    
            const query = { schoolCode };
    
            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                sort: { name: 1 }, 
                populate: {
                    path: 'assignedClass', 
                    select: 'name section', 
                    transform: (doc) => ({
                        className: doc.name,
                        section: doc.section
                    }) 
                },
                select: '_id teacherId name gender contactNumber assignedClass' 
            };
    
            const teachers = await Teacher.paginate(query, options);
    
            const formattedData = teachers.docs.map(teacher => ({
                id: teacher._id,
                teacherId: teacher.teacherId,
                name: teacher.name,
                gender: teacher.gender,
                contactNumber: teacher.contactNumber,
                className: teacher.assignedClass?.className || null,
                section: teacher.assignedClass?.section || null
            }));
    
            res.status(200).json({
                success: true,
                data: {
                    docs: formattedData,
                    totalDocs: teachers.totalDocs,
                    limit: teachers.limit,
                    totalPages: teachers.totalPages,
                    page: teachers.page,
                    pagingCounter: teachers.pagingCounter,
                    hasPrevPage: teachers.hasPrevPage,
                    hasNextPage: teachers.hasNextPage,
                    prevPage: teachers.prevPage,
                    nextPage: teachers.nextPage
                }
            });
        } catch (err) {
            next(err); 
        }
    },    

    getAllClasses: async (req, res, next) => {
        try {
            const schoolCode = req.school.schoolCode;
            const { page = 1, limit = 10 } = req.query;
    
            if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
                return next(new ErrorHandler(400, "Invalid pagination parameters"));
            }
    
            const query = { schoolCode };
    
            const options = {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                sort: { name: 1, section: 1 },
                populate: {
                    path: 'classTeacher', // Populate the classTeacher field
                    select: 'name', // Include only the name of the classTeacher
                },
                select: '_id name section students classTeacher',
            };
    
            const classes = await Class.paginate(query, options);
    
            const formattedData = classes.docs.map(classItem => ({
                id: classItem._id,
                className: classItem.name,
                section: classItem.section,
                classTeacher: classItem.classTeacher ? classItem.classTeacher.name : null, // Get classTeacher name or null
                totalStudents: classItem.students.length, // Calculate the total number of students
            }));
    
            res.status(200).json({
                success: true,
                data: {
                    docs: formattedData,
                    totalDocs: classes.totalDocs,
                    limit: classes.limit,
                    totalPages: classes.totalPages,
                    page: classes.page,
                    pagingCounter: classes.pagingCounter,
                    hasPrevPage: classes.hasPrevPage,
                    hasNextPage: classes.hasNextPage,
                    prevPage: classes.prevPage,
                    nextPage: classes.nextPage,
                },
            });
        } catch (err) {
            next(err); // Pass errors to the error-handling middleware
        }
    }    
};

module.exports = schoolCtrl;