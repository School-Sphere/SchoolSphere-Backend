const multer = require('multer');
const path = require('path');
const { ErrorHandler } = require('./error');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for CSV and Excel files
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ErrorHandler(400, 'Only CSV and Excel files are allowed'), false);
  }
};

// Configure upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('file');

// Wrapper middleware with error handling
const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ErrorHandler(400, 'File size exceeds 5MB limit'));
      }
      return next(new ErrorHandler(400, err.message));
    } else if (err) {
      return next(err);
    }
    
    if (!req.file) {
      return next(new ErrorHandler(400, 'Please upload a file'));
    }
    
    next();
  });
};

module.exports = uploadMiddleware;