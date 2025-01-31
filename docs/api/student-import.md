# Student Import API Documentation

## Overview

The Student Import API allows schools to bulk import student records using CSV or Excel files. This endpoint facilitates the creation of multiple student accounts simultaneously while maintaining data consistency and validation.

## Endpoint

```
POST /api/school/import-students
```

## Authentication

Requires school authentication token in the request header:
```
Authorization: Bearer <school_token>
```

## Request Format

### Content-Type
- `multipart/form-data`

### File Requirements
- **File Field Name**: `file`
- **Supported Formats**: 
  - CSV (.csv)
  - Excel (.xlsx, .xls)
- **Maximum File Size**: 5MB

## File Format Specifications

### Required Fields
- `studentId` - Unique identifier for the student
- `name` - Full name of the student
- `email` - Student's email address
- `classId` - MongoDB ObjectId of the class

### Optional Fields
- `gender` - Student's gender
- `dob` - Date of birth (YYYY-MM-DD)
- `bloodGroup` - Blood group
- `religion` - Religious affiliation
- `doa` - Date of admission (YYYY-MM-DD)
- `fatherName` - Father's name
- `motherName` - Mother's name
- `parentEmail` - Parent's email address
- `parentContact` - Parent's contact number
- `fatherOccupation` - Father's occupation
- `address` - Residential address
- `profilePic` - URL of profile picture

## Sample Templates

### CSV Template
```csv
studentId,name,email,classId,gender,dob,bloodGroup,religion,doa,fatherName,motherName,parentEmail,parentContact,fatherOccupation,address
ST001,John Doe,john.doe@example.com,507f1f77bcf86cd799439011,Male,2010-05-15,B+,Christian,2023-06-01,James Doe,Jane Doe,parent@example.com,1234567890,Engineer,123 Main St
```

### Excel Template
Available for download at: `/templates/student-import-template.xlsx`

## Response Format

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Bulk student import completed",
  "data": {
    "successful": [
      {
        "studentId": "ST001",
        "name": "John Doe"
      }
    ],
    "failed": [
      {
        "studentId": "ST002",
        "errors": ["Student with this email or ID already exists"]
      }
    ]
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid file type. Only CSV and Excel files are allowed"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 413 Payload Too Large
```json
{
  "success": false,
  "message": "File size exceeds limit"
}
```

## Error Codes and Descriptions

| Error Code | Description |
|------------|-------------|
| FILE_001   | No file uploaded |
| FILE_002   | Invalid file type |
| FILE_003   | File size exceeds limit |
| DATA_001   | Missing required fields |
| DATA_002   | Invalid data format |
| DATA_003   | Duplicate student record |
| CLASS_001  | Invalid class ID |

## Implementation Notes

1. Each record is processed within a transaction to ensure data consistency
2. Duplicate checks are performed on email and studentId
3. Failed records don't affect the processing of other records
4. Welcome emails are automatically sent to successfully imported students
5. Students are automatically added to their class chat rooms

## Usage Example

### Using cURL
```bash
curl -X POST \
  -H "Authorization: Bearer <school_token>" \
  -F "file=@students.csv" \
  http://api.schoolsphere.com/api/school/import-students
```

### Using JavaScript/Axios
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

await axios.post('/api/school/import-students', formData, {
  headers: {
    'Authorization': `Bearer ${schoolToken}`,
    'Content-Type': 'multipart/form-data'
  }
});
```