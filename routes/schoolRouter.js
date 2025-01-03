const express = require("express");
const schoolCtrl = require("../controllers/school_controller");
const { schoolAuth } = require("../middlewares");
const schoolRouter = express.Router();

schoolRouter.post("/add-student", schoolAuth, schoolCtrl.addStudent);
schoolRouter.post("/add-class", schoolAuth, schoolCtrl.addClass);
schoolRouter.post("/add-teacher", schoolAuth, schoolCtrl.addTeacher);

schoolRouter.post("/announcement", schoolAuth, schoolCtrl.createSchoolAnnouncement);
schoolRouter.get("/announcements", schoolAuth, schoolCtrl.getSchoolAnnouncements);

module.exports = schoolRouter;