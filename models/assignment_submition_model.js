const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    submissionDate: {
        type: Date,
        required: true
    },
    lateSubmission: {
        type: Boolean,
        required: true
    },
    content: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Submission', submissionSchema);