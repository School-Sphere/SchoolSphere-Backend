const express = require("express");
const studentCtrl = require("../controllers/student_controller");
const { studentAuth, createMulterUpload } = require("../middlewares");
const studentRouter = express.Router();

studentRouter.get("/get-attendance", studentAuth, studentCtrl.getAttendance);
studentRouter.get("/get-assignments", studentAuth, studentCtrl.getAssignments);
studentRouter.get("/get-assignment/:assignmentId", studentAuth, studentCtrl.getAssignment);
studentRouter.post("/submit-assignment/:assignmentId", studentAuth, createMulterUpload('submission', 'content'), studentCtrl.submitAssignment);
studentRouter.get("/get-submitted-assignments", studentAuth, studentCtrl.getSubmittedAssignments);
studentRouter.get("/get-timetable", studentAuth, studentCtrl.getTimeTable);
studentRouter.get("/student", studentCtrl.getStudent);
studentRouter.get("/announcements", studentAuth, studentCtrl.getStudentAnnouncements);

studentRouter.get("/events", studentAuth, studentCtrl.getStudentEvents);


module.exports = studentRouter;