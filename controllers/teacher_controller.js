const assignmentSchema = require('../models/assignment_model');
const studentAssignmentSchema = require('../models/student_assignment_model');
const uploadImage = require('../utils/cloudinary');
const teacherSchema = require('../models/teacher_model');
const studentSchema = require('../models/student_model');
const TimetableSchema = require('../models/timetable_model')
const Class = require('../models/class_model');
const { Announcement, ANNOUNCEMENT_SCOPE, TARGET_AUDIENCE } = require('../models/announcement_model');
const CourseMaterial = require('../models/course_material_model');
const { Event } = require('../models/event_model');
const School = require('../models/school_model');

const teacherCtrl = {
    createAssignment: async (req, res, next) => {
        try {
            const filePath = req.file.path;
            const { name, classId, subjectId, description, dueDate } = req.body;
            const teacherId = req.teacher._id;

            if (!teacherId || !name || !classId || !subjectId || !dueDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Please fill all required fields (name, class, subject, and due date) to create an assignment'
                });
            }

            const classDetails = await Class.findById(classId);
            if (!classDetails) {
                return res.status(404).json({ success: false, message: 'Class not found' });
            }

            const hasAccess = classDetails.subjects.some(subject =>
                subject._id.toString() === subjectId &&
                subject.teacher.toString() === teacherId.toString()
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to create assignments for this subject'
                });
            }

            let result = await uploadImage(filePath, teacherId);
            if (!result) {
                return res.status(500).json({ success: false, message: 'Error uploading the assignment' });
            }

            const teacher = await teacherSchema.findById(teacherId);
            const newAssignment = new assignmentSchema({
                teacherId,
                name,
                classId,
                subjectId,
                description,
                dueDate: new Date(dueDate),
                path: result.url
            });

            teacher.assignments.push(newAssignment._id);
            await teacher.save();
            await newAssignment.save();

            const assignmentObject = newAssignment.toObject();
            delete assignmentObject._id;
            const studentAssignment = new studentAssignmentSchema({
                ...assignmentObject,
                assignmentAssignedDate: Date.now(),
                assignmentDueDate: dueDate
            });

            const students = classDetails.students;
            let assignedStudents = 0;

            for (let i = 0; i < students.length; i++) {
                const student = await studentSchema.findOne({
                    _id: students[i],
                    schoolCode: req.teacher.schoolCode
                });
                if (!student) {
                    console.log('Student not found: ' + students[i]);
                    continue;
                }
                assignedStudents++;
                student.pendingAssignments.push(studentAssignment._id);
                await student.save();
            }

            await studentAssignment.save();

            res.json({
                success: true,
                message: `Assignment created and assigned successfully to ${assignedStudents} students of class ${classDetails.name}-${classDetails.section}`,
                data: {
                    teacherAssignment: newAssignment,
                    studentAssignment: studentAssignment,
                    assignedStudents
                }
            });
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
            if (assignment.teacherId.toString() !== req.teacher._id.toString()) {
                console.log('Teacher ID: ' + req.teacher._id, 'Assignment teacher ID: ' + assignment.teacherId);
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
            var assignedStudents = 0;
            for (let i = 0; i < students.length; i++) {
                const student = await studentSchema.findOne({ _id: students[i], schoolCode: req.teacher.schoolCode });
                if (student == null) {
                    console.log('Student not found' + students[i]);
                    continue;
                }
                assignedStudents++;
                student.pendingAssignments.push(newAssignment._id);
                await student.save();
            }
            await newAssignment.save();
            res.json({ success: true, message: 'Assignment assigned successfully to ' + assignedStudents + ' students of class ' + reqClass.name + '-' + reqClass.section });
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
            res.json({ success: true, data: teacher.timetable });
        }
        catch(err) {
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

    getTeacherClasses: async (req, res, next) => {
        try {
            const teacherId = req.teacher._id;
            if (!teacherId) {
                return res.status(400).json({ success: false, message: 'Teacher ID is required' });
            }

            const classes = await Class.find({
                $or: [
                    { classTeacher: teacherId },
                    { 'subjects.teacher': teacherId }
                ]
            }).select('name section students subjects timetable');

            res.json({ success: true, data: classes });
        } catch (err) {
            next(err);
        }
    },

    getClassDetails: async (req, res, next) => {
        try {
            const teacherId = req.teacher._id;
            const { classId } = req.params;

            if (!classId) {
                return res.status(400).json({ success: false, message: 'Class ID is required' });
            }

            const classDetails = await Class.findById(classId)
                .populate('students', 'name studentId gender profilePicture')
                .select('name section students');

            if (!classDetails) {
                return res.status(404).json({ success: false, message: 'Class not found' });
            }

            // Verify if teacher has access to this class
            if (classDetails.classTeacher && classDetails.classTeacher.toString() !== teacherId.toString() &&
                !classDetails.subjects.some(subject => subject.teacher && subject.teacher.toString() === teacherId.toString())) {
                return res.status(403).json({ success: false, message: 'You do not have access to this class' });
            }

            const responseData = {
                _id: classDetails._id,
                name: classDetails.name,
                section: classDetails.section,
                students: classDetails.students
            };

            res.json({ success: true, data: responseData });
        } catch (err) {
            next(err);
        }
    },

    getStudentDetails: async (req, res, next) => {
        try {
            const { studentId } = req.params;

            if (!studentId) {
                return next(new ErrorHandler(400, "Student ID is required"));
            }

            const student = await studentSchema.findOne({ studentId })
                .populate({
                    path: 'classId',
                    select: 'name section',
                    transform: (doc) => ({
                        className: doc.name,
                        section: doc.section
                    })
                })
                .select('_id studentId name gender parentContact email dob bloodGroup religion doa fatherName motherName parentEmail address fatherOccupation motherOccupation profilePicture');

            if (!student) {
                return next(new ErrorHandler(404, "Student not found"));
            }

            const formattedData = {
                id: student._id,
                studentId: student.studentId,
                name: student.name,
                gender: student.gender,
                parentContact: student.parentContact,
                email: student.email,
                dob: student.dob,
                bloodGroup: student.bloodGroup,
                religion: student.religion,
                doa: student.doa,
                fatherName: student.fatherName,
                motherName: student.motherName,
                parentEmail: student.parentEmail,
                address: student.address,
                className: student.classId?.className || null,
                section: student.classId?.section || null,
                fatherOccupation: student.fatherOccupation,
                motherOccupation: student.motherOccupation,
                profilePicture: student.profilePicture
            };

            res.status(200).json({
                success: true,
                data: formattedData
            });
        } catch (err) {
            next(err);
        }
    },

    createClassAnnouncement: async (req, res, next) => {
        try {
            const { title, description, classId } = req.body;
            const teacherId = req.teacher._id;

            if (!title || !description || !classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Title, description and class ID are required'
                });
            }

            // Verify teacher's association with the class
            const classDetails = await Class.findById(classId);
            if (!classDetails) {
                return res.status(404).json({ success: false, message: 'Class not found' });
            }

            if (classDetails.classTeacher.toString() !== teacherId.toString() &&
                !classDetails.subjects.some(subject => subject.teacher &&
                    subject.teacher.toString() === teacherId.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to create announcements for this class'
                });
            }

            const announcement = new Announcement({
                title,
                description,
                createdBy: teacherId,
                creatorModel: 'Teacher',
                targetAudience: TARGET_AUDIENCE.ALL,
                scope: ANNOUNCEMENT_SCOPE.CLASS,
                targetClass: classId,
                schoolCode: req.teacher.schoolCode
            });

            await announcement.save();

            res.status(201).json({
                success: true,
                message: 'Announcement created successfully',
                data: announcement
            });
        } catch (err) {
            next(err);
        }
    },

    getClassAnnouncements: async (req, res, next) => {
        try {
            const { classId } = req.params;
            const { startDate, endDate, page = 1, limit = 10 } = req.query;

            const query = {
                scope: ANNOUNCEMENT_SCOPE.CLASS,
                targetClass: classId
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

            res.json({
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

    getTeacherAnnouncements: async (req, res, next) => {
        try {
            const teacherId = req.teacher._id;
            const { page = 1, limit = 10 } = req.query;

            // Get teacher's classes
            const teacherClasses = await Class.find({
                $or: [
                    { classTeacher: teacherId },
                    { 'subjects.teacher': teacherId }
                ]
            }).select('_id');

            const classIds = teacherClasses.map(c => c._id);

            const query = {
                $or: [
                    { scope: ANNOUNCEMENT_SCOPE.SCHOOL },
                    {
                        scope: ANNOUNCEMENT_SCOPE.CLASS,
                        targetClass: { $in: classIds }
                    }
                ]
            };

            const skip = (page - 1) * limit;

            const announcements = await Announcement.find(query)
                .populate('createdBy', 'name email')
                .populate('targetClass', 'name section')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Announcement.countDocuments(query);

            res.json({
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

    getTeacherEvents: async (req, res, next) => {
        try {
            const { page = 1, limit = 10, startDate, endDate } = req.query;
            const schoolCode = req.teacher.schoolCode;

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
                sort: { time: 1 } // Sort events by time in ascending order
            };

            const events = await Event.paginate(query, options);

            res.status(200).json({
                success: true,
                data: events.docs, // Include the list of events
                pagination: {
                    total: events.totalDocs, // Total number of documents
                    page: events.page, // Current page
                    pages: events.totalPages // Total number of pages
                }
            });
        } catch (err) {
            next(err); // Pass errors to the error-handling middleware
        }
    },

    uploadCourseMaterial: async (req, res, next) => {
        try {
            const { title, description, classId, subjectId } = req.body;
            const teacherId = req.teacher._id;
            const filePath = req.file?.path;

            if (!title || !description || !classId || !subjectId) {
                return res.status(400).json({
                    success: false,
                    message: 'Title, description, class ID and subject ID are required'
                });
            }

            // Verify teacher's access to class and subject
            const classDetails = await Class.findById(classId);
            if (!classDetails) {
                return res.status(404).json({ success: false, message: 'Class not found' });
            }

            const hasAccess = classDetails.subjects.some(subject =>
                subject._id.toString() === subjectId &&
                subject.teacher.toString() === teacherId.toString()
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to upload materials for this subject'
                });
            }

            let fileUrl = null;
            if (filePath) {
                const result = await uploadImage(filePath, `materials/${teacherId}`);
                if (!result) {
                    return res.status(500).json({ success: false, message: 'Error uploading file' });
                }
                fileUrl = result.url;
            }

            const courseMaterial = new CourseMaterial({
                title,
                description,
                fileUrl,
                teacherId,
                classId,
                subjectId,
                schoolCode: req.teacher.schoolCode
            });

            await courseMaterial.save();

            res.status(201).json({
                success: true,
                message: 'Course material uploaded successfully',
                data: courseMaterial
            });
        } catch (err) {
            next(err);
        }
    },

    getCourseMaterials: async (req, res, next) => {
        try {
            const { classId, subjectId } = req.query;
            const teacherId = req.teacher._id;

            const query = { teacherId, schoolCode: req.teacher.schoolCode };
            if (classId) query.classId = classId;
            if (subjectId) query.subjectId = subjectId;

            const materials = await CourseMaterial.find(query)
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                data: materials
            });
        } catch (err) {
            next(err);
        }
    },

    updateCourseMaterial: async (req, res, next) => {
        try {
            const { materialId } = req.params;
            const { title, description } = req.body;
            const teacherId = req.teacher._id;

            const material = await CourseMaterial.findById(materialId);
            if (!material) {
                return res.status(404).json({ success: false, message: 'Course material not found' });
            }

            if (material.teacherId.toString() !== teacherId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to update this material'
                });
            }

            material.title = title || material.title;
            material.description = description || material.description;

            await material.save();

            res.json({
                success: true,
                message: 'Course material updated successfully',
                data: material
            });
        } catch (err) {
            next(err);
        }
    },

    deleteCourseMaterial: async (req, res, next) => {
        try {
            const { materialId } = req.params;
            const teacherId = req.teacher._id;

            const material = await CourseMaterial.findById(materialId);
            if (!material) {
                return res.status(404).json({ success: false, message: 'Course material not found' });
            }

            if (material.teacherId.toString() !== teacherId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to delete this material'
                });
            }

            await material.remove();

            res.json({
                success: true,
                message: 'Course material deleted successfully'
            });
        } catch (err) {
            next(err);
        }
    },

    getSchoolSubjects: async (req, res, next) => {
        try {
            const schoolCode = req.teacher.schoolCode;
            const school = await School.findOne({ schoolCode })
                .select('subjects')
                .lean();

            if (!school) {
                return res.status(404).json({
                    success: false,
                    message: 'School not found'
                });
            }

            const formattedSubjects = school.subjects?.map(subject => ({
                _id: subject._id,
                name: subject.subjectName,
                subjectId: subject.subjectId
            })) || [];

            console.log(formattedSubjects);

            res.json({
                success: true,
                message: 'School subjects retrieved successfully',
                data: {
                    subjects: formattedSubjects
                }
            });
        } catch (err) {
            console.error("Error in getSchoolSubjects:", err);
            next(err);
        }
    },
};

module.exports = teacherCtrl;