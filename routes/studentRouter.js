const express = require("express");
const studentCtrl = require("../controllers/student_controller");
const { studentAuth } = require("../middlewares");
const studentRouter = express.Router();

studentRouter.get("/get-attendance", studentAuth, studentCtrl.getAttendance);

module.exports = studentRouter;