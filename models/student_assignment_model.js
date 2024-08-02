const mongoose = require('mongoose');
const Assignment = require('./assignment_model').schema;

const studentAssignmentSchema = new mongoose.Schema({
    ...Assignment.obj,
    assignmentAssignedDate: {
        type: Date,
        required: true
    },
    assignmentDueDate: {
        type: Date,
        required: true
    },
});

module.exports = mongoose.model('StudentAssignment', studentAssignmentSchema);