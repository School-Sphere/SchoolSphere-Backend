const School = require("../models/school_model");
const { ErrorHandler } = require("../middlewares/error");
const generatePassword = require("../utils/password_generator");
const sendEmailSchool = require("../utils/school_mailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const adminCtrl = {
    createSchool: async (req, res, next) => {
        try {
            const { name, address, email, schoolCode } = req.body;
            let existingSchool = await School.findOne({ email, schoolCode });
            if (existingSchool) {
                return next(new ErrorHandler(400, "School with the same email already exists"));
            }
            const password = generatePassword();
            const hashedPassword = await bcrypt.hash(password, 8);
            const newSchool = new School({
                name,
                address,
                email,
                schoolCode,
                password: hashedPassword,
            });
            try {
                await sendEmailSchool(email, schoolCode, password, "School Created");
            }
            catch (e) {
                res.status(500).json({ "Could not send email. Please try again later": e });
                return;
            }
            await newSchool.save();
            res.status(201).json({
                success: true,
                message: "School created successfully",
                data: {
                    ...newSchool.toObject(),
                    schoolCode: schoolCode
                }
            });
        }
        catch (e) {
            next(e);
        }
    },
    signIn: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            let school = await School.findOne({ email });
            if (!school) {
                return next(new ErrorHandler(400, "No school found with the provided email and password"));
            }
            const isMatch = await bcrypt.compare(password, school.password);
            if (!isMatch) {
                return next(new ErrorHandler(401, "Incorrect password"));
            }
            const payload = {
                id: school._id,
            };
            const token = jwt.sign(payload, process.env.USER);
            res.json({
                success: true,
                message: "User signed successfully",
                token: token,
                data: school
            });
        }
        catch (e) {
            next(e);
        }
    },
};

module.exports = adminCtrl;