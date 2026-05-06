"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const friendController_1 = require("../../controllers/chat/friendController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.route('/').get(authMiddleware_1.protect, friendController_1.getFriends).post(authMiddleware_1.protect, friendController_1.updateFriend);
router.post('/online-status', authMiddleware_1.protect, friendController_1.getFriendsOnlineStatus);
router.post('/sync-online', authMiddleware_1.protect, friendController_1.syncFriendsOnlineStatus);
router.get('/check/:username', authMiddleware_1.protect, friendController_1.checkFriendship);
router.delete('/:username', authMiddleware_1.protect, friendController_1.deleteFriend);
router.get('/pending-count', authMiddleware_1.protect, friendController_1.getPendingFriendRequestCount);
router.get('/pending', authMiddleware_1.protect, friendController_1.getPendingFriendRequests);
router.post('/decline', authMiddleware_1.protect, friendController_1.declineFriendRequest);
router.get('/unread-count', authMiddleware_1.protect, friendController_1.getUnreadChatCount);
exports.default = router;
