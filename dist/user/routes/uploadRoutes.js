"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploadController_1 = require("../controllers/uploadController");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const uploadMiddleware_1 = require("../../middleware/uploadMiddleware");
const router = express_1.default.Router();
// SNS sends Content-Type: text/plain even though the body is JSON.
// express.json() (registered globally) won't parse it, so we add express.text()
// here as route-local middleware so the controller gets req.body as a raw string.
router.post('/mediaconvert-callback', express_1.default.text({ type: '*/*' }), uploadController_1.mediaConvertCallback);
router.post('/presigned', authMiddleware_1.protect, uploadController_1.getPresignedUrls);
router.post('/notify', authMiddleware_1.protect, uploadController_1.notifyUploadComplete);
router.post('/multipart-start', authMiddleware_1.protect, uploadController_1.startMultipart);
router.post('/multipart-presign', authMiddleware_1.protect, uploadController_1.presignMultipartPart);
router.post('/multipart-complete', authMiddleware_1.protect, uploadController_1.completeMultipart);
router.post('/file', authMiddleware_1.protect, uploadMiddleware_1.singleFileUpload, uploadController_1.uploadSingleFile);
router.delete('/*key', authMiddleware_1.protect, uploadController_1.deleteMedia);
exports.default = router;
