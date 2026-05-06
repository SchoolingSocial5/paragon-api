"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatController_1 = require("../../controllers/chat/chatController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const uploadMiddleware_1 = require("../../../middleware/uploadMiddleware");
const router = express_1.default.Router();
router.route('/messages').post(authMiddleware_1.protect, chatController_1.sendMessage);
router.route('/upload').post(authMiddleware_1.protect, uploadMiddleware_1.chatUpload, chatController_1.uploadChatMedia);
router.route('/search').get(authMiddleware_1.protect, chatController_1.searchChats);
router.route('/messages/:receiverUsername').get(authMiddleware_1.protect, chatController_1.getMessages);
router.route('/messages/read/:senderUsername').put(authMiddleware_1.protect, chatController_1.markAsRead);
router.route('/messages/seen/:id').put(authMiddleware_1.protect, chatController_1.markMediaAsSeenById);
exports.default = router;
