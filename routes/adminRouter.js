const express = require("express");
const adminCtrl = require("../controllers/admin_controller");
const adminRouter = express.Router();

adminRouter.post("/create-school", adminCtrl.createSchool);
adminRouter.post("/sign-in-school", adminCtrl.signIn);

module.exports = adminRouter;