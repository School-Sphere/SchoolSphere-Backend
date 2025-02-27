const mongoose = require('mongoose');
const Timetable = require('../models/timetable_model');
const mongoosePaginate = require('mongoose-paginate-v2');

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    section: {
        type: String,
        required: true,
    },
    schoolCode: {
        type: String,
        required: true,
    },
    teachingClasses:{
        type: [mongoose.Schema.Types.ObjectId],
    },
    /** 
     * @description The teacher assigned as the class teacher. This field is optional and can be
     * set later or left unassigned.
     */
    classTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
    },
    students: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
        },
    ],
    subjects: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject"
        }],
        validate: [{
            validator: function (subjects) {
                return new Set(subjects.map(s => s.toString())).size === subjects.length;
            },
            message: 'Duplicate subjects are not allowed in a class'
        }]
    },
    timetable: {
        type: [Timetable.schema],
    },
    chatRoomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    }
});

classSchema.index({ schoolCode: 1, name: 1, section: 1 }, { unique: true });

// Pre-save middleware to validate subject references
classSchema.pre('save', async function (next) {
    if (this.subjects && this.subjects.length > 0) {
        const Subject = mongoose.model('Subject');
        const subjectIds = this.subjects.map(s => s.toString());
        const foundSubjects = await Subject.find({ _id: { $in: subjectIds } });

        if (foundSubjects.length !== subjectIds.length) {
            next(new Error('One or more subject references are invalid'));
        }
    }
    next();
});

classSchema.plugin(mongoosePaginate);

const Class = mongoose.model("Class", classSchema);
module.exports = Class;