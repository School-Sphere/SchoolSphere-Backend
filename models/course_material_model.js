const mongoose = require('mongoose');

const courseMaterialSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    materialType: {
        type: String,
        required: true,
        enum: ['notes', 'presentation', 'worksheet', 'other']
    },
    fileUrl: {
        type: String,
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    schoolCode: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for efficient querying
courseMaterialSchema.index({ teacherId: 1, classId: 1 });
courseMaterialSchema.index({ classId: 1, subject: 1 });
courseMaterialSchema.index({ schoolCode: 1 });

module.exports = mongoose.model('CourseMaterial', courseMaterialSchema);