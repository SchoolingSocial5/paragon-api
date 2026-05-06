"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bioChatController_1 = require("../../controllers/chat/bioChatController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.get('/messages/:receiverBioUserUsername', authMiddleware_1.protect, bioChatController_1.getMessages);
router.get('/user/:username', authMiddleware_1.protect, bioChatController_1.getBioUserByUsername);
router.post('/messages', authMiddleware_1.protect, bioChatController_1.sendMessage);
router.post('/upload', authMiddleware_1.protect, upload.array('files'), bioChatController_1.uploadBioChatMedia);
router.put('/messages/seen/:connection', authMiddleware_1.protect, bioChatController_1.markBioChatAsSeen);
exports.default = router;
