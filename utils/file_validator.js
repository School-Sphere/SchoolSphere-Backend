const xlsx = require('xlsx');
const { parse } = require('csv-parse/sync');
const path = require('path');

// Constants for file validation
const ALLOWED_FILE_TYPES = {
  'text/csv': '.csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Required fields for student data
const REQUIRED_FIELDS = [
  'studentId',
  'name',
  'email',
  'classId'
];

// Required fields for teacher data
const REQUIRED_TEACHER_FIELDS = [
  'teacherId',
  'name',
  'email'
];

/**
 * Validates if the file type is allowed
 * @param {Object} file - The uploaded file object
 * @returns {boolean} - True if file type is valid
 */
const isValidFileType = (file) => {
  const fileType = file.mimetype;
  const extension = path.extname(file.originalname).toLowerCase();
  return ALLOWED_FILE_TYPES[fileType] && ALLOWED_FILE_TYPES[fileType] === extension;
};

/**
 * Validates if the file size is within limits
 * @param {Object} file - The uploaded file object
 * @returns {boolean} - True if file size is valid
 */
const isValidFileSize = (file) => {
  return file.size <= MAX_FILE_SIZE;
};

/**
 * Parses CSV file content
 * @param {Buffer} fileBuffer - The file buffer
 * @returns {Array} - Array of objects containing student data
 */
const parseCSV = (fileBuffer) => {
  const content = fileBuffer.toString();
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
};

/**
 * Parses Excel file content
 * @param {Buffer} fileBuffer - The file buffer
 * @returns {Array} - Array of objects containing student data
 */
const parseExcel = (fileBuffer) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return xlsx.utils.sheet_to_json(worksheet);
};

/**
 * Validates student data fields
 * @param {Object} data - Student data object
 * @returns {Object} - Validation result with status and errors
 */
const validateStudentData = (data) => {
  const errors = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  REQUIRED_FIELDS.forEach(field => {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  if (data.email && !emailRegex.test(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.parentEmail && !emailRegex.test(data.parentEmail)) {
    errors.push('Invalid parent email format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates teacher data fields
 * @param {Object} data - Teacher data object
 * @returns {Object} - Validation result with status and errors
 */
const validateTeacherData = (data) => {
  const errors = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  REQUIRED_TEACHER_FIELDS.forEach(field => {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  if (data.email && !emailRegex.test(data.email)) {
    errors.push('Invalid email format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidFileType,
  isValidFileSize,
  parseCSV,
  parseExcel,
  validateStudentData,
  validateTeacherData,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  REQUIRED_FIELDS,
  REQUIRED_TEACHER_FIELDS
};