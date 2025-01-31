const jwt = require("jsonwebtoken");
const { ErrorHandler } = require("./error");
const Student = require("../models/student_model");

const studentAuth = async (req, res, next) => {
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
            let student;

            student = await Student.findById({ _id: id });

            if (!student) {
                return next(new ErrorHandler(400, "Failed to find student from token"));
            }
            req.student = student;

            next();
        });
    }
    catch (err) {
        next(err);
    }
};
module.exports = studentAuth;