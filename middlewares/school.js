const jwt = require("jsonwebtoken");
const { ErrorHandler } = require("./error");
const School = require("../models/school_model");

const schoolAuth = async (req, res, next) => {
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
            let school;

            school = await School.findById({ _id: id });

            if (!school) {
                return next(new ErrorHandler(400, "Failed to find school from token"));
            }
            req.school = school;

            next();
        });
    }
    catch (err) {
        next(err);
    }
};
module.exports = schoolAuth;