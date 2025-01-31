# Teacher Import API Documentation

## Overview

The Teacher Import API allows schools to bulk import teacher records using CSV or Excel files. This endpoint facilitates the creation of multiple teacher accounts simultaneously while maintaining data consistency and validation.

## Endpoint

```
POST /api/school/import-teachers
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
- `teacherId` - Unique identifier for the teacher
- `name` - Full name of the teacher
- `email` - Teacher's email address
- `subjects` - Comma-separated list of subject IDs
- `designation` - Teacher's designation/role

### Optional Fields
- `gender` - Teacher's gender
- `dob` - Date of birth (YYYY-MM-DD)
- `qualification` - Educational qualification
- `experience` - Years of teaching experience
- `doj` - Date of joining (YYYY-MM-DD)
- `contact` - Contact number
- `address` - Residential address
- `profilePic` - URL of profile picture
- `specialization` - Area of specialization
- `department` - Department name

## Sample Templates

### CSV Template
```csv
teacherId,name,email,subjects,designation,gender,dob,qualification,experience,doj,contact,address,specialization,department
TCH001,Jane Smith,jane.smith@example.com,507f1f77bcf86cd799439011;507f1f77bcf86cd799439012,Senior Teacher,Female,1985-03-20,M.Sc,8,2023-06-01,1234567890,456 Oak Street,Mathematics,Science
```

### Excel Template
Available for download at: `/templates/teacher-import-template.xlsx`

## Response Format

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Bulk teacher import completed",
  "data": {
    "successful": [
      {
        "teacherId": "TCH001",
        "name": "Jane Smith"
      }
    ],
    "failed": [
      {
        "teacherId": "TCH002",
        "errors": ["Teacher with this email or ID already exists"]
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
| DATA_003   | Duplicate teacher record |
| SUBJ_001   | Invalid subject ID |

## Implementation Notes

1. Each record is processed within a transaction to ensure data consistency
2. Duplicate checks are performed on email and teacherId
3. Failed records don't affect the processing of other records
4. Welcome emails are automatically sent to successfully imported teachers
5. Teachers are automatically assigned to their respective subjects
6. Subject IDs are validated against the school's subject database

## Usage Example

### Using cURL
```bash
curl -X POST \
  -H "Authorization: Bearer <school_token>" \
  -F "file=@teachers.csv" \
  http://api.schoolsphere.com/api/school/import-teachers
```

### Using JavaScript/Axios
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

await axios.post('/api/school/import-teachers', formData, {
  headers: {
    'Authorization': `Bearer ${schoolToken}`,
    'Content-Type': 'multipart/form-data'
  }
});