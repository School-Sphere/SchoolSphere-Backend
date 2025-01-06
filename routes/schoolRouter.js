const express = require("express");
const schoolCtrl = require("../controllers/school_controller");
const { schoolAuth } = require("../middlewares");
const schoolRouter = express.Router();

schoolRouter.post("/add-student", schoolAuth, schoolCtrl.addStudent);
schoolRouter.patch("/update-student", schoolAuth, schoolCtrl.updateStudent);

schoolRouter.post("/add-class", schoolAuth, schoolCtrl.addClass);
schoolRouter.post("/add-teacher", schoolAuth, schoolCtrl.addTeacher);
schoolRouter.post("/update-class-teacher", schoolAuth, schoolCtrl.updateClassTeacher);
schoolRouter.post("/add-subjects", schoolAuth, schoolCtrl.addSubjectsToClass);
schoolRouter.post("/assign-subject-teacher", schoolAuth, schoolCtrl.assignTeacherToSubject);

schoolRouter.post("/announcement", schoolAuth, schoolCtrl.createSchoolAnnouncement);
schoolRouter.get("/announcements", schoolAuth, schoolCtrl.getSchoolAnnouncements);

schoolRouter.post("/events", schoolAuth, schoolCtrl.createEvent);
schoolRouter.get("/events", schoolAuth, schoolCtrl.getEvents);

schoolRouter.get("/students", schoolAuth, schoolCtrl.getAllStudents);
schoolRouter.get("/teachers", schoolAuth, schoolCtrl.getAllTeachers);
schoolRouter.get("/classes", schoolAuth, schoolCtrl.getAllClasses);

module.exports = schoolRouter;