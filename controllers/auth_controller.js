const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user_model");
const Otp = require("../models/otp_model");
const { ErrorHandler } = require("../middlewares/error");
const { passwordSchema } = require("../utils/validator");
const sendmail = require("../utils/mailer");

require("dotenv").config();

const authCtrl = {
    signIn: async (req, res, next) => {
        try {
            const { email, schoolCode, password } = req.body;
            let user = await User.findOne({ email, schoolCode });
            if (!user) {
                return next(new ErrorHandler(400, "No user found with the provided email and school code"));
            }
            const isMatch = await bcryptjs.compare(password, user.password);
            if (!isMatch) {
                return next(new ErrorHandler(401, "Incorrect password"));
            }
            const payload = {
                id: user._id,
            };
            const token = jwt.sign(payload, process.env.USER);
            res.json({
                success: true,
                message: "User signed successfully",
                data: {
                    token,
                    name: user.name,
                    email,
                    role: user.role,
                    schoolCode
                },
            });
        } 
        catch (e) {
            next(e);
        }
    },

    forgetPassword: async (req, res, next) => {
        try {
            const { email, schoolCode } = req.body;
            let user = await User.findOne({ email, schoolCode });
            if (!user) {
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
                    // createdAt: new Date()
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

    verifyOtp: async (req, res, next) => {
        try {
            const { email, otp, schoolCode } = req.body;
            let OTP = await Otp.findOne({ email });
            if (!OTP) {
                return next(new ErrorHandler(400, "OTP not found"));
            }
            if (otp != OTP.otp) {
                return next(new ErrorHandler(400, "Invalid OTP"));
            }
            let user = await User.findOne({ email, schoolCode });
            if (!user) {
                return next(new ErrorHandler(400, "User not found"));
            }
            await Otp.deleteOne({ email });
            const token = jwt.sign({ id: user._id }, process.env.RESET, {
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
    
    resendOtp: async (req, res, next) => {
        try {
            const { email, schoolCode } = req.body;
            const otp = Math.floor(1000 + Math.random() * 9000);
            let user = await User.findOne({ email, schoolCode });
            if (!user) {
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
    
    changePassword: async (req, res, next) => {
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
            await User.findByIdAndUpdate(verified.id, {
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
};
module.exports = authCtrl;