"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../../controllers/user/notificationController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.route('/').get(authMiddleware_1.protect, notificationController_1.getNotifications).delete(authMiddleware_1.protect, notificationController_1.deleteNotifications);
router.route('/personal').get(authMiddleware_1.protect, notificationController_1.getPersonalNotifications).delete(authMiddleware_1.protect, notificationController_1.deletePersonalNotifications);
router.route('/:id/read').put(authMiddleware_1.protect, notificationController_1.markNotificationAsRead);
router.route('/personal/:id/read').put(authMiddleware_1.protect, notificationController_1.markPersonalNotificationAsRead);
exports.default = router;
