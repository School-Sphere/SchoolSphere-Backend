const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
    },
    name: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
    },
    dueDate: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Assignment', assignmentSchema);