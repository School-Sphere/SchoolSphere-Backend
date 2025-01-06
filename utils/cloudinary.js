const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadImage = async (localFilePath, teacherId, options = {}) => {
    try {
        if (!localFilePath) {
            throw new Error('No file path provided');
        }
        if (!teacherId) {
            throw new Error('Teacher ID is required');
        }

        const { materialType = 'assignment', subjectId = '' } = options;

        let folderPath;
        if (materialType === 'courseMaterial' && subjectId) {
            folderPath = `materials/${teacherId}/${subjectId}`;
        } else {
            folderPath = `assignments/${teacherId}`;
        }

        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: folderPath,
        });

        // Clean up the local file
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return result;
    } catch (error) {
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        console.error('Error uploading file:', error.message);
        throw new Error(`File upload failed: ${error.message}`);
    }
}

module.exports = uploadImage;