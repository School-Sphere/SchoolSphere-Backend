const express = require("express");
const schoolCtrl = require("../controllers/school_controller");
const schoolRouter = express.Router();

schoolRouter.post("/create-school", schoolCtrl.createSchool);

module.exports = schoolRouter;