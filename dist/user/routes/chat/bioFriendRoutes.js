"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bioFriendController_1 = require("../../controllers/chat/bioFriendController");
const bioChatController_1 = require("../../controllers/chat/bioChatController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, bioFriendController_1.getBioFriends);
router.get('/unread-count', authMiddleware_1.protect, bioFriendController_1.getUnreadBioChatCount);
router.put('/mark-as-seen/:connection', authMiddleware_1.protect, bioChatController_1.markBioChatAsSeen);
exports.default = router;
