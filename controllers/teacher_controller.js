const assignmentSchema = require('../models/assignment_model');
const studentAssignmentSchema = require('../models/student_assignment_model');
const uploadImage = require('../utils/cloudinary');
const studentSchema = require('../models/student_model');
const Class = require('../models/class_model');

const teacherCtrl = {
    createAssignment: async (req, res, next) => {
        try {
            const filePath = req.file.path;
            const { teacherId, name } = req.body;
            if (!teacherId || !name) {
                return res.json({ success: false, message: 'Please fill all the fields to create an assignment' });
            }
            let result = await uploadImage(filePath, teacherId);
            console.log(result);
            if (!result) {
                return res.json({ success: false, message: 'Error uploading the assignment' });
            }
            const newAssignment = new assignmentSchema({
                teacherId,
                name,
                path: result.url
            });
            await newAssignment.save();
            res.json({ successs: true, message: 'Assignment created successfully' });
        } catch (err) {
            next(err);
        }
    },

    assignAssignment: async (req, res, next) => {
        try {
            const { classId, assignmentId, dueDate } = req.body;
            if (!classId || !assignmentId || !dueDate) {
                return res.json({ success: false, message: 'Please fill all the fields to assign an assignment' });
            }
            const assignment = await assignmentSchema.findById(assignmentId);
            if (!assignment) {
                return res.json({ success: false, message: 'Assignment not found' });
            }

            const newAssignment = new studentAssignmentSchema({
                ...assignment.toObject(),
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