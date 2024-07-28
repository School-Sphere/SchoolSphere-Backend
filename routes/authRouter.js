const express = require("express");
const authCtrl = require("../controllers/auth_controller");
const authRouter = express.Router();

authRouter.post("/student-sign-in", authCtrl.signInStudent);
authRouter.post("/student-forget-password", authCtrl.forgetPasswordStudent);
authRouter.post("/student-verify-otp", authCtrl.verifyOtpStudent);
authRouter.post("/student-resend-otp", authCtrl.resendOtpStudent);
authRouter.post("/student-change-password", authCtrl.changePasswordStudent);

module.exports = authRouter;