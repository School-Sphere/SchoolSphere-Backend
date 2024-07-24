const express = require("express");
const authCtrl = require("../controllers/auth_controller");
const authRouter = express.Router();

authRouter.post("/sign-in", authCtrl.signIn);

module.exports = authRouter;