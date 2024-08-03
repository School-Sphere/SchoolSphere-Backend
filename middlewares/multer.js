const multer = require("multer");
const fs = require("fs");
const path = require("path");

function createMulterUpload(reqPath, parameterName) {
    const storage = multer.diskStorage({
        destination: function (_req, _file, cb) {
            const uploadPath = path.join('public', reqPath);

            fs.mkdir(uploadPath, { recursive: true }, (err) => {
                if (err) {
                    return cb(err);
                }
                cb(null, uploadPath);
            });
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = req.body.teacherId + '-' + Date.now() + '-' + file.originalname;
            cb(null, file.fieldname + '-' + uniqueSuffix);
        }
    });

    const upload = multer({ storage: storage });

    return upload.single(parameterName);
}

module.exports = createMulterUpload;
