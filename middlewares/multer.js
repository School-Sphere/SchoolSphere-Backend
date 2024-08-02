const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const teacherId = req.body.teacherId || req.teacherId;
        const uploadPath = path.join('public', teacherId, 'assignments');
        
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

module.exports = upload;
