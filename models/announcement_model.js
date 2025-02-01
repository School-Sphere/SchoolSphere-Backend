const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');


const ANNOUNCEMENT_SCOPE = {
  SCHOOL: 'SCHOOL',
  CLASS: 'CLASS'
};

const TARGET_AUDIENCE = {
  TEACHERS_ONLY: 'TEACHERS_ONLY',
  ALL: 'ALL'
};

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'creatorModel',
    required: true
  },
  creatorModel: {
    type: String,
    required: true,
    enum: ['School', 'Teacher']
  },
  targetAudience: {
    type: String,
    required: true,
    enum: Object.values(TARGET_AUDIENCE)
  },
  scope: {
    type: String,
    enum: Object.values(ANNOUNCEMENT_SCOPE),
    required: true
  },
  targetClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: function () {
      return this.scope === ANNOUNCEMENT_SCOPE.CLASS;
    }
  },
  schoolCode: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
announcementSchema.index({ schoolCode: 1, createdAt: -1 });
announcementSchema.index({ targetClass: 1, createdAt: -1 });

// Methods for checking announcement visibility
announcementSchema.methods.isVisibleToStudent = function () {
  return this.targetAudience === TARGET_AUDIENCE.ALL;
};

announcementSchema.methods.isVisibleToTeacher = function () {
  return true; // Teachers can see all announcements
};

announcementSchema.plugin(mongoosePaginate);

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = {
  Announcement,
  ANNOUNCEMENT_SCOPE,
  TARGET_AUDIENCE
};