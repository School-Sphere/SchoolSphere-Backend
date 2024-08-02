const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadImage = async (localFilePath,teacherId) => {
    try {
        if (!localFilePath) {
            throw new Error('No file path provided');
        };
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: "assignments/"+teacherId,
        });
        fs.unlinkSync(localFilePath);
        return result;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.log(error);
        return null;
    }
}

module.exports = uploadImage;