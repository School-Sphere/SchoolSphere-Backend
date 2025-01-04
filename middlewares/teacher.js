const jwt = require("jsonwebtoken");
const { ErrorHandler } = require("./error");
const Teacher = require("../models/teacher_model");

const teacherAuth = async (req, res, next) => {
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

        jwt.verify(token, process.env.USER, async (err, payload) => {
            if (err) {
                return next(new ErrorHandler(401, "Invalid Token"));
            }

            const id = payload.id;
            let teacher;

            teacher = await Teacher.findById({ _id: id });

            if (!teacher) {
                return next(new ErrorHandler(400, "Failed to find teacher from token"));
            }
            req.teacher = teacher;
            
            next();
        });
    } 
    catch (err) {
        next(err);
    }
};
module.exports = teacherAuth;