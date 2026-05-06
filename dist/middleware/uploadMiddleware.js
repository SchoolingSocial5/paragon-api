"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schoolUpload = exports.singleFileUpload = exports.momentUpload = exports.chatUpload = void 0;
const multer_1 = __importDefault(require("multer"));
// Memory storage to keep files as Buffers for S3 upload
const storage = multer_1.default.memoryStorage();
// File filter to allow images, videos, and common document types
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Videos
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm',
        // Audio
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a',
        // Documents
        'application/pdf', 'application/msword', 'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Archives
        'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar',
        // Octet-stream for mobile uploads
        'application/octet-stream'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only images, videos, and documents are allowed.`), false);
    }
};
exports.chatUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit per file
        fieldSize: 100 * 1024 * 1024, // 100MB limit for text fields (payload)
    }
}).array('files', 4); // Handle up to 4 files with the field name 'files'
exports.momentUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB per media (Moments don't need 10GB)
        fieldSize: 10 * 1024 * 1024, // 10MB for text/metadata
    }
}).array('files', 5);
exports.singleFileUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit (same as chat)
        fieldSize: 10 * 1024 * 1024,
    }
}).single('file');
exports.schoolUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit for school media
        fieldSize: 10 * 1024 * 1024,
    }
}).fields([
    { name: 'logo', maxCount: 1 },
    { name: 'media', maxCount: 1 }
]);
