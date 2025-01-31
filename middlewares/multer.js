const multer = require("multer");
const fs = require("fs");
const path = require("path");

const ALLOWED_FILE_TYPES = {
    courseMaterial: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.xls', '.xlsx'],
    assignment: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png']
};

const MAX_FILE_SIZES = {
    courseMaterial: 25 * 1024 * 1024,
    assignment: 10 * 1024 * 1024
};

function createMulterUpload(reqPath, parameterName, options = {}) {
    const { fileType = 'assignment' } = options;

    const fileFilter = (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_FILE_TYPES[fileType].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Only ${ALLOWED_FILE_TYPES[fileType].join(', ')} files are allowed for ${fileType}`));
        }
    };

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
            const filename = file.fieldname + '-' + uniqueSuffix;
            console.log(`Generated filename: ${filename}`);
            cb(null, filename);
        }
    });

    const upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: MAX_FILE_SIZES[fileType]
        }
    });
    return upload.single(parameterName);
}

module.exports = createMulterUpload;