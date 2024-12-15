const express = require("express");
const authCtrl = require("../controllers/auth_controller");
const authRouter = express.Router();

authRouter.post("/student-sign-in", authCtrl.signInStudent);
authRouter.post("/student-forget-password", authCtrl.forgetPasswordStudent);
authRouter.post("/student-verify-otp", authCtrl.verifyOtpStudent);
authRouter.post("/student-resend-otp", authCtrl.resendOtpStudent);
authRouter.post("/student-change-password", authCtrl.changePasswordStudent);
authRouter.post("/teacher-sign-in", authCtrl.signInTeacher);
authRouter.post("/teacher-forget-password", authCtrl.forgetPasswordTeacher);
authRouter.post("/teacher-verify-otp", authCtrl.verifyOtpTeacher);
authRouter.post("/teacher-resend-otp", authCtrl.resendOtpTeacher);
authRouter.post("/teacher-change-password", authCtrl.changePasswordTeacher);
authRouter.get("/user", authCtrl.getUser);

module.exports = authRouter;