const { CloudinaryStorage } = require('multer-storage-cloudinary');

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    secure: true
});

// Images (profile pictures, book covers, flashcard images, etc.)
const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "Nihon-Zing",
        allowedFormats: ['jpg', 'png', 'jpeg'],
    }
});

// Audio (kana pronunciation clips). Cloudinary stores non-image media under
// resource_type "video", which also covers audio-only files like mp3.
const audioStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "Nihon-Zing/audio",
        resource_type: "video",
        allowedFormats: ['mp3', 'wav', 'ogg', 'm4a'],
    }
});

module.exports = {
    // Kept for backwards compatibility with any existing import of `storage`
    storage: imageStorage,
    imageStorage,
    audioStorage
};