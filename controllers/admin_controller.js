const School = require("../models/school_model");
const { ErrorHandler } = require("../middlewares/error");
const generatePassword = require("../utils/password_generator");
const sendEmailSchool = require("../utils/school_mailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const adminCtrl = {
    createSchool: async (req, res, next) => {
        try {
            const { name, address, email } = req.body;
            let existingSchool = await School.findOne({ email });
            if (existingSchool) {
                return next(new ErrorHandler(400, "School with the same email already exists"));
            }
            const schoolCount = await School.countDocuments();
            const schoolCode = (schoolCount + 1).toString().padStart(4, '0');
            const password = generatePassword();
            const hashedPassword = await bcrypt.hash(password, 8);
            const newSchool = new School({
                name,
                address,
                email,
                schoolCode,
                password: hashedPassword,
            });
            await newSchool.save();
            await sendEmailSchool(email, schoolCode, password, "School Created");
            res.status(201).json({
                success: true,
                message: "School created successfully",
                data: newSchool,
            });
        } 
        catch (e) {
            next(e);
        }
    },
    signIn: async (req, res, next) => {
        try {
            const { email, schoolCode, password } = req.body;
            let school = await School.findOne({ email, schoolCode });
            if (!school) {
                return next(new ErrorHandler(400, "No school found with the provided email and school code"));
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
                data: {
                    token,
                    name: school.name,
                    email,
                    schoolCode,
                    address: school.address,
                },
            });
        } 
        catch (e) {
            next(e);
        }
    },
};
  
module.exports = adminCtrl;