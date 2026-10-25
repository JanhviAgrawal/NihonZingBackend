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
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
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
        allowed_formats: ['mp3', 'wav', 'ogg', 'm4a'],
    }
});

// Upload guards: size caps + real MIME-type checks (a renamed .exe/.html/.svg
// is rejected before it ever reaches Cloudinary).
const makeFilter = (allowedMimes, label) => (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) return cb(null, true);
    const err = new Error(`Only ${label} files are allowed.`);
    err.status = 400;
    cb(err);
};

const imageUploadOptions = {
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: makeFilter(['image/jpeg', 'image/png', 'image/webp'], 'JPG, PNG or WebP image'),
};

const audioUploadOptions = {
    storage: audioStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: makeFilter(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'], 'MP3, WAV, OGG or M4A audio'),
};

module.exports = {
    imageUploadOptions,
    audioUploadOptions,
    // Kept for backwards compatibility with any existing import of `storage`
    storage: imageStorage,
    imageStorage,
    audioStorage
};