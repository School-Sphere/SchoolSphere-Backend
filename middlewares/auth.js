const jwt = require("jsonwebtoken");
const { ErrorHandler } = require("./error");
const Student = require("../models/student_model");
const Teacher = require("../models/teacher_model");

const validateAuth = async (req, res, next) => {
    try {
        let token;
        if (req.headers["authorization"]) {
            token = req.headers["authorization"];
        }

        if (!token && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return next(new ErrorHandler(401, "No Token"));
        }

        token = token.replace(/^Bearer\s+/, "");

        jwt.verify(token, process.env.SIGN, async (err, payload) => {
            if (err) {
                return next(new ErrorHandler(401, "Invalid Token"));
            }

            const id = payload.id;

            // Try to find user in both collections
            let user = await Student.findById(id);
            if (user) {
                req.student = user;
                next();
                return;
            }

            user = await Teacher.findById(id);
            if (user) {
                req.teacher = user;
                next();
                return;
            }

            return next(new ErrorHandler(400, "User not found"));
        });
    } catch (err) {
        next(err);
    }
};

module.exports = validateAuth; 