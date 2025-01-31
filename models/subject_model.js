const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    subjectName: {
        type: String,
        required: true,
    },
    subjectId: {
        type: String,
        required: true,
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        validate: {
            validator: async function (value) {
                if (!value) return true; // Skip validation if teacherId is not provided
                const Teacher = mongoose.model('Teacher');
                const teacher = await Teacher.findById(value);
                return teacher && teacher.schoolCode === this.schoolCode;
            },
            message: 'Teacher must belong to the same school'
        }
    },
    schoolCode: {
        type: String,
        required: true,
    }
}, { timestamps: true });

// Ensure unique subject names within a school
subjectSchema.index({ schoolCode: 1, subjectName: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);