const School = require("../models/school_model");
const { ErrorHandler } = require("../middlewares/error");
const generatePassword = require("../utils/password_generator");
const sendEmailSchool = require("../utils/school_mailer");
const bcrypt = require("bcryptjs");

const schoolCtrl = {
    createSchool: async (req, res, next) => {
        try {
            const { name, address, email } = req.body;
            let existingSchool = await School.findOne({ email });
            if (existingSchool) {
                return next(new ErrorHandler(400, "School with the same email already exists"));
            }
            const schoolCount = await School.countDocuments();
            const code = (schoolCount + 1).toString().padStart(4, '0');
            const password = generatePassword();
            console.log(password);
            const hashedPassword = await bcrypt.hash(password, 8);
            const newSchool = new School({
                name,
                address,
                email,
                code,
                password: hashedPassword,
            });
            await newSchool.save();
            await sendEmailSchool(email, code, password, "School Created");
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
  };
  
  module.exports = schoolCtrl;