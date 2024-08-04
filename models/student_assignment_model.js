const mongoose = require('mongoose');
const Assignment = require('./assignment_model').schema;

const studentAssignmentSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true,
    },
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