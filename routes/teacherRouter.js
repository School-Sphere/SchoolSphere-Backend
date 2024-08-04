const express = require("express");
const teacherCtrl = require("../controllers/teacher_controller");
const { createMulterUpload } = require("../middlewares");
const teacherAuth = require("../middlewares/teacher");
const teacherRouter = express.Router();

teacherRouter.post("/create-assignment", teacherAuth, createMulterUpload('Assignments','content'), teacherCtrl.createAssignment);
teacherRouter.get("/teacher/get-assignments", teacherAuth, teacherCtrl.getAssignments);
teacherRouter.post("/assign-assignment", teacherAuth, teacherCtrl.assignAssignment);


module.exports = teacherRouter;