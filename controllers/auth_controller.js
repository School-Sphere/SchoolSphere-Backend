const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Teacher = require("../models/teacher_model");
const Otp = require("../models/otp_model");
const { ErrorHandler } = require("../middlewares/error");
const { passwordSchema } = require("../utils/validator");
const sendmail = require("../utils/mailer");
const Student = require("../models/student_model");
const UserModel = require('../models/user_model');

require("dotenv").config();

const authCtrl = {
    signInStudent: async (req, res, next) => {
        try {
            const { email, schoolCode, password } = req.body;
            let student = await Student.findOne({ email, schoolCode });
            if (!student) {
                return next(new ErrorHandler(400, "No student found with the provided email and school code"));
            }
            const isMatch = await bcryptjs.compare(password, student.password);
            if (!isMatch) {
                return next(new ErrorHandler(401, "Incorrect password"));
            }
            const payload = {
                id: student._id,
            };
            const token = jwt.sign(payload, process.env.SIGN);
            res.json({
                success: true,
                message: "User signed successfully",
                data: {
                    token,
                    name: student.name,
                    email,
                    role: student.role,
                    schoolCode
                },
            });
        }
        catch (e) {
            next(e);
        }
    },

    forgetPasswordStudent: async (req, res, next) => {
        try {
            const { email, schoolCode } = req.body;
            let student = await Student.findOne({ email, schoolCode });
            if (!student) {
                return next(new ErrorHandler(400, "This email is not registered for the given school code"));
            }
            const otp = Math.floor(1000 + Math.random() * 9000);
            let existingOtp = await Otp.findOne({ email });
            if (existingOtp) {
                await existingOtp.updateOne({ otp, createdAt: new Date() });
            }
            else {
                let newOtp = new Otp({
                    email,
                    otp,
                });
                await newOtp.save();
            }
            sendmail(email, otp, "Reset Passowrd");
            res.json({
                success: true,
                message: "otp is send to your registered email",
            });
        }
        catch (e) {
            next(e);
        }
    },

    verifyOtpStudent: async (req, res, next) => {
        try {
            const { email, otp, schoolCode } = req.body;
            let OTP = await Otp.findOne({ email });
            if (!OTP) {
                return next(new ErrorHandler(400, "OTP not found"));
            }
            if (otp != OTP.otp) {
                return next(new ErrorHandler(400, "Invalid OTP"));
            }
            let student = await Student.findOne({ email, schoolCode });
            if (!student) {
                return next(new ErrorHandler(400, "User not found"));
            }
            await Otp.deleteOne({ email });
            const token = jwt.sign({ id: student._id }, process.env.RESET, {
                expiresIn: 600,
            });
            res.json({
                success: true,
                message: "OTP is validated",
                data: {
                    token,
                },
            });
        }
        catch (e) {
            next(e);
        }
    },

    resendOtpStudent: async (req, res, next) => {
        try {
            const { email, schoolCode } = req.body;
            const otp = Math.floor(1000 + Math.random() * 9000);
            let student = await Student.findOne({ email, schoolCode });
            if (!student) {
                return next(new ErrorHandler(400, "No user found with this email and school code"));
            }
            let existingOtp = await Otp.findOne({ email });
            if (existingOtp) {
                if (Date.now() - existingOtp.createdAt >= 60000) {
                    await existingOtp.updateOne({ $set: { otp, createdAt: Date.now() } });
                } else {
                    return next(new ErrorHandler(400, "60 seconds not completed"));
                }
            } else {
                const newOtp = new Otp({
                    email,
                    otp,
                });
                await newOtp.save();
            }
            sendmail(email, otp, "Resend OTP");
            res.json({
                success: true,
                message: "New OTP has been sent to your registered email",
            });
        }
        catch (e) {
            next(e);
        }
    },

    changePasswordStudent: async (req, res, next) => {
        try {
            const result = await passwordSchema.validateAsync(req.body);
            const newPassword = result.password;
            let token = req.headers["authorization"];
            if (!token) {
                return next(new ErrorHandler(400, "Authorization token is required"));
            }
            token = token.replace(/^Bearer\s+/, "");
            const verified = jwt.verify(token, process.env.RESET);
            if (!verified) {
                return next(new ErrorHandler(400, "Invalid or expired token"));
            }
            const hashedPassword = await bcryptjs.hash(newPassword, 8);
            await Student.findByIdAndUpdate(verified.id, {
                password: hashedPassword,
            });
            res.json({
                success: true,
                message: "Password has been changed successfully",
            });
        }
        catch (e) {
            next(e);
        }
    },

    signInTeacher: async (req, res, next) => {
        try {
            const { email, schoolCode, password } = req.body;
            let teacher = await Teacher.findOne({ email, schoolCode });
            if (!teacher) {
                return next(new ErrorHandler(400, "No teacher found with the provided email and school code"));
            }
            const isMatch = await bcryptjs.compare(password, teacher.password);
            if (!isMatch) {
                return next(new ErrorHandler(401, "Incorrect password"));
            }
            const payload = {
                id: teacher._id,
            };
            const token = jwt.sign(payload, process.env.SIGN);
            res.json({
                success: true,
                message: "User signed successfully",
                data: {
                    token,
                    name: teacher.name,
                    email,
                    role: teacher.role,
                    schoolCode
                },
            });
        }
        catch (e) {
            next(e);
        }
    },

    forgetPasswordTeacher: async (req, res, next) => {
        try {
            const { email, schoolCode } = req.body;
            let teacher = await Teacher.findOne({ email, schoolCode });
            if (!teacher) {
                return next(new ErrorHandler(400, "This email is not registered for the given school code"));
            }
            const otp = Math.floor(1000 + Math.random() * 9000);
            let existingOtp = await Otp.findOne({ email });
            if (existingOtp) {
                await existingOtp.updateOne({ otp, createdAt: new Date() });
            }
            else {
                let newOtp = new Otp({
                    email,
                    otp,
                });
                await newOtp.save();
            }
            sendmail(email, otp, "Reset Passowrd");
            res.json({
                success: true,
                message: "otp is send to your registered email",
            });
        }
        catch (e) {
            next(e);
        }
    },

    verifyOtpTeacher: async (req, res, next) => {
        try {
            const { email, otp, schoolCode } = req.body;
            let OTP = await Otp.findOne({ email });
            if (!OTP) {
                return next(new ErrorHandler(400, "OTP not found"));
            }
            if (otp != OTP.otp) {
                return next(new ErrorHandler(400, "Invalid OTP"));
            }
            let teacher = await Teacher.findOne({ email, schoolCode });
            if (!teacher) {
                return next(new ErrorHandler(400, "User not found"));
            }
            await Otp.deleteOne({ email });
            const token = jwt.sign({ id: teacher._id }, process.env.RESET, {
                expiresIn: 600,
            });
            res.json({
                success: true,
                message: "OTP is validated",
                data: {
                    token,
                },
            });
        }
        catch (e) {
            next(e);
        }
    },

    resendOtpTeacher: async (req, res, next) => {
        try {
            const { email, schoolCode } = req.body;
            const otp = Math.floor(1000 + Math.random() * 9000);
            let teacher = await Teacher.findOne({ email, schoolCode });
            if (!teacher) {
                return next(new ErrorHandler(400, "No user found with this email and school code"));
            }
            let existingOtp = await Otp.findOne({ email });
            if (existingOtp) {
                if (Date.now() - existingOtp.createdAt >= 60000) {
                    await existingOtp.updateOne({ $set: { otp, createdAt: Date.now() } });
                } else {
                    return next(new ErrorHandler(400, "60 seconds not completed"));
                }
            } else {
                const newOtp = new Otp({
                    email,
                    otp,
                    // createdAt: new Date()
                });
                await newOtp.save();
            }
            sendmail(email, otp, "Resend OTP");
            res.json({
                success: true,
                message: "New OTP has been sent to your registered email",
            });
        }
        catch (e) {
            next(e);
        }
    },

    changePasswordTeacher: async (req, res, next) => {
        try {
            const result = await passwordSchema.validateAsync(req.body);
            const newPassword = result.password;
            let token = req.headers["authorization"];
            if (!token) {
                return next(new ErrorHandler(400, "Authorization token is required"));
            }
            token = token.replace(/^Bearer\s+/, "");
            const verified = jwt.verify(token, process.env.RESET);
            if (!verified) {
                return next(new ErrorHandler(400, "Invalid or expired token"));
            }
            const hashedPassword = await bcryptjs.hash(newPassword, 8);
            await Teacher.findByIdAndUpdate(verified.id, {
                password: hashedPassword,
            });
            res.json({
                success: true,
                message: "Password has been changed successfully",
            });
        }
        catch (e) {
            next(e);
        }
    },

    getUser: async (req, res, next) => {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.SIGN);
            console.log(decoded);
            const user = await UserModel.findById(decoded.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = authCtrl;