const express = require("express");
const teacherCtrl = require("../controllers/teacher_controller");
const { createMulterUpload } = require("../middlewares");
const teacherAuth = require("../middlewares/teacher");
const teacherRouter = express.Router();

teacherRouter.post("/create-assignment", teacherAuth, createMulterUpload('Assignments','content'), teacherCtrl.createAssignment);
teacherRouter.get("/teacher/get-assignments", teacherAuth, teacherCtrl.getAssignments);
teacherRouter.post("/assign-assignment", teacherAuth, teacherCtrl.assignAssignment);
teacherRouter.post("/mark-all-present", teacherAuth, teacherCtrl.markAllPresent);
teacherRouter.post("/mark-present", teacherAuth, teacherCtrl.markPresent);
teacherRouter.post("/mark-absent", teacherAuth, teacherCtrl.markAbsent);
teacherRouter.post("/create-timetable", teacherAuth, teacherCtrl.createTimeTable);
teacherRouter.get("/get-timetable", teacherAuth, teacherCtrl.getTimeTable);
teacherRouter.patch("/update-timetable", teacherAuth, teacherCtrl.updateTimeTable);
teacherRouter.get("/teacher",teacherAuth, teacherCtrl.getTeacher);
teacherRouter.get("/teacher/classes", teacherAuth, teacherCtrl.getTeacherClasses);
teacherRouter.get("/teacher/classes/:classId", teacherAuth, teacherCtrl.getClassDetails);
teacherRouter.post("/class/:classId/announcement", teacherAuth, teacherCtrl.createClassAnnouncement);
teacherRouter.get("/class/:classId/announcements", teacherAuth, teacherCtrl.getClassAnnouncements);
teacherRouter.get("/announcements", teacherAuth, teacherCtrl.getTeacherAnnouncements);
teacherRouter.get("/events", teacherAuth, teacherCtrl.getTeacherEvents);
teacherRouter.post("/upload-course-material", teacherAuth, createMulterUpload('Materials', 'content'), teacherCtrl.uploadCourseMaterial);
teacherRouter.get("/course-materials", teacherAuth, teacherCtrl.getCourseMaterials);
teacherRouter.put("/course-material/:materialId", teacherAuth, teacherCtrl.updateCourseMaterial);
teacherRouter.delete("/course-material/:materialId", teacherAuth, teacherCtrl.deleteCourseMaterial);



module.exports = teacherRouter;