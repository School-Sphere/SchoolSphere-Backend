const express = require("express");
const teacherCtrl = require("../controllers/teacher_controller");
const { upload } = require("../middlewares");
const teacherAuth = require("../middlewares/teacher");
const teacherRouter = express.Router();

teacherRouter.post("/create-assignment", teacherAuth, upload.single('content'), teacherCtrl.createAssignment);
teacherRouter.post("/assign-assignment", teacherAuth, teacherCtrl.assignAssignment);


module.exports = teacherRouter;