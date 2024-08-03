const assignmentSchema = require('../models/assignment_model');
const studentAssignmentSchema = require('../models/student_assignment_model');
const uploadImage = require('../utils/cloudinary');
const teacherSchema = require('../models/teacher_model');
const studentSchema = require('../models/student_model');
const Class = require('../models/class_model');

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
            if(assignment.teacherId != req.teacher._id){
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
                    console.log('Student not found'+students[i]);
                }
                student.pendingAssignments.push(newAssignment._id);
                await student.save();
            }
            await newAssignment.save();
            res.json({ success: true, message: 'Assignment assigned successfully to ' + students.length + ' students of class ' + reqClass.name + '-' + reqClass.section });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = teacherCtrl;