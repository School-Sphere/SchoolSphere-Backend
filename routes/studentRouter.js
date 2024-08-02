const express = require("express");
const studentCtrl = require("../controllers/student_controller");
const { studentAuth, upload } = require("../middlewares");
const studentRouter = express.Router();

studentRouter.get("/get-attendance", studentAuth, studentCtrl.getAttendance);
studentRouter.get("/get-assignments", studentAuth, studentCtrl.getAssignments);
studentRouter.get("/get-assignment/:assignmentId", studentAuth, studentCtrl.getAssignment);
studentRouter.post("/submit-assignment/:assignmentId",studentAuth, upload.single('content'), studentCtrl.submitAssignment);

module.exports = studentRouter;