const Student = require('./student_model');
const Teacher = require('./teacher_model');
const Class = require('./class_model');
const User = require('./user_model');
const Otp = require('./otp_model');
const Payment = require('./payment_model');
const Timetable = require('./timetable_model');
const Assignment = require('./assignment_model');
const StudentAssignment = require('./student_assignment_model');
const AssignmentSubmission = require('./assignment_submition_model');
const CourseMaterial = require('./course_material_model');

Models = [
    Student,
    Teacher,
    Class,
    User,
    Otp,
    Payment,
    Timetable,
    Assignment,
    StudentAssignment,
    AssignmentSubmission,
    CourseMaterial
];

module.exports = Models;