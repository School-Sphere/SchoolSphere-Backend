const express = require("express");
const studentCtrl = require("../controllers/student_controller");
const { studentAuth, createMulterUpload } = require("../middlewares");
const studentRouter = express.Router();

studentRouter.get("/get-attendance", studentAuth, studentCtrl.getAttendance);
studentRouter.get("/get-assignments", studentAuth, studentCtrl.getAssignments);
studentRouter.get("/get-assignment/:assignmentId", studentAuth, studentCtrl.getAssignment);
studentRouter.post("/submit-assignment/:assignmentId", studentAuth, createMulterUpload('submission', 'content'), studentCtrl.submitAssignment);
studentRouter.get("/get-timetable", studentAuth, studentCtrl.getTimeTable);
studentRouter.get("/student", studentCtrl.getStudent);


module.exports = studentRouter;