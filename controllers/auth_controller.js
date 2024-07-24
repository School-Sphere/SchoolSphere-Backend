const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user_model");
const { ErrorHandler } = require("../middlewares/error");

require("dotenv").config();

const authCtrl = {
    signIn: async (req, res, next) => {
        try {
            const { email, schoolCode, password } = req.body;
            let user = await User.findOne({ email });
            if (!user) {
                return next(new ErrorHandler(400, "No user found"));
            }
            let isMatchSchool = false;
            if(user.schoolCode === schoolCode){
                isMatchSchool = true;
            }
            if(!isMatchSchool){
                return next(new ErrorHandler(401, "Incorrect school code"));
            }
            if (!isMatchSchool) {
                return next(new ErrorHandler(401, "Incorrect school code"));
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
};
module.exports = authCtrl;