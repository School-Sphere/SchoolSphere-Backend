const express = require("express");
const studentCtrl = require("../controllers/student_controller");
const { studentAuth, createMulterUpload } = require("../middlewares");
const studentRouter = express.Router();

studentRouter.get("/get-attendance", studentAuth, studentCtrl.getAttendance);
studentRouter.get("/get-assignments", studentAuth, studentCtrl.getAssignments);
studentRouter.get("/get-assignment/:assignmentId", studentAuth, studentCtrl.getAssignment);
studentRouter.post("/submit-assignment/:assignmentId", studentAuth, createMulterUpload('submission', 'file', {}), studentCtrl.submitAssignment);
studentRouter.get("/get-submitted-assignments", studentAuth, studentCtrl.getSubmittedAssignments);
studentRouter.get("/student-timetable", studentAuth, studentCtrl.getTimeTable);
studentRouter.get("/student", studentAuth, studentCtrl.getStudent);
studentRouter.get("/announcements", studentAuth, studentCtrl.getStudentAnnouncements);
studentRouter.get("/get-course-materials", studentAuth, studentCtrl.getCourseMaterials);
studentRouter.get("/student-events", studentAuth, studentCtrl.getStudentEvents);


module.exports = studentRouter;