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
teacherRouter.get("/teacher", teacherCtrl.getTeacher);



module.exports = teacherRouter;