"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePersonalNotifications = exports.deleteNotifications = exports.markPersonalNotificationAsRead = exports.markNotificationAsRead = exports.getPersonalNotifications = exports.getNotifications = void 0;
const socialNotificationModel_1 = require("../../../models/messages/socialNotificationModel");
const personalNotificationModel_1 = require("../../../models/messages/personalNotificationModel");
const bioUserModel_1 = __importDefault(require("../../../models/user/bioUserModel"));
// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        let username = user === null || user === void 0 ? void 0 : user.username;
        const bioUserId = user === null || user === void 0 ? void 0 : user.bioUserId;
        // Staff can request notifications for a specific username (like APP_USERNAME)
        const targetUsername = req.query.username;
        const APP_USERNAME = process.env.APP_USERNAME || 'Schooling';
        if ((user === null || user === void 0 ? void 0 : user.status) === 'Staff' && targetUsername === APP_USERNAME) {
            username = targetUsername;
        }
        else if (bioUserId) {
            // Robust username lookup
            const bioUser = yield bioUserModel_1.default.findById(bioUserId);
            if (bioUser && bioUser.bioUserUsername) {
                username = bioUser.bioUserUsername;
            }
        }
        if (!username) {
            res.status(400).json({ message: 'Username/BioUserUsername not found' });
            return;
        }
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const query = {
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        };
        const [notifications, total, unreadCount] = yield Promise.all([
            socialNotificationModel_1.SocialNotification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            socialNotificationModel_1.SocialNotification.countDocuments(query),
            socialNotificationModel_1.SocialNotification.countDocuments(Object.assign(Object.assign({}, query), { unread: true }))
        ]);
        res.json({
            results: notifications,
            unreadCount,
            metadata: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getNotifications = getNotifications;
// @desc    Get user personal notifications
// @route   GET /api/notifications/personal
// @access  Private
const getPersonalNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        let username = user === null || user === void 0 ? void 0 : user.username;
        const bioUserId = user === null || user === void 0 ? void 0 : user.bioUserId;
        if (bioUserId) {
            const bioUser = yield bioUserModel_1.default.findById(bioUserId);
            if (bioUser && bioUser.bioUserUsername) {
                username = bioUser.bioUserUsername;
            }
        }
        if (!username) {
            res.status(400).json({ message: 'Username/BioUserUsername not found' });
            return;
        }
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const query = {
            bioUserUsername: { $regex: new RegExp(`^${username}$`, 'i') }
        };
        const [notifications, total, unreadCount] = yield Promise.all([
            personalNotificationModel_1.PersonalNotification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            personalNotificationModel_1.PersonalNotification.countDocuments(query),
            personalNotificationModel_1.PersonalNotification.countDocuments(Object.assign(Object.assign({}, query), { unread: true }))
        ]);
        res.json({
            results: notifications,
            unreadCount,
            metadata: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPersonalNotifications = getPersonalNotifications;
// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        let username = user === null || user === void 0 ? void 0 : user.username;
        const bioUserId = user === null || user === void 0 ? void 0 : user.bioUserId;
        if (bioUserId) {
            const bioUser = yield bioUserModel_1.default.findById(bioUserId);
            if (bioUser && bioUser.bioUserUsername) {
                username = bioUser.bioUserUsername;
            }
        }
        const notification = yield socialNotificationModel_1.SocialNotification.findByIdAndUpdate(req.params.id, { unread: false }, { new: true });
        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }
        // Get updated unread count
        const unreadCount = yield socialNotificationModel_1.SocialNotification.countDocuments({
            username: { $regex: new RegExp(`^${username}$`, 'i') },
            unread: true
        });
        res.json({ notification, unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.markNotificationAsRead = markNotificationAsRead;
// @desc    Mark personal notification as read
// @route   PUT /api/notifications/personal/:id/read
// @access  Private
const markPersonalNotificationAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        let username = user === null || user === void 0 ? void 0 : user.username;
        const bioUserId = user === null || user === void 0 ? void 0 : user.bioUserId;
        if (bioUserId) {
            const bioUser = yield bioUserModel_1.default.findById(bioUserId);
            if (bioUser && bioUser.bioUserUsername) {
                username = bioUser.bioUserUsername;
            }
        }
        const notification = yield personalNotificationModel_1.PersonalNotification.findByIdAndUpdate(req.params.id, { unread: false }, { new: true });
        if (!notification) {
            res.status(404).json({ message: 'Personal notification not found' });
            return;
        }
        // Get updated unread count
        const unreadCount = yield personalNotificationModel_1.PersonalNotification.countDocuments({
            bioUserUsername: { $regex: new RegExp(`^${username}$`, 'i') },
            unread: true
        });
        res.json({ notification, unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.markPersonalNotificationAsRead = markPersonalNotificationAsRead;
// @desc    Delete multiple notifications
// @route   DELETE /api/notifications
// @access  Private
const deleteNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        const user = req.user;
        let username = user === null || user === void 0 ? void 0 : user.username;
        const bioUserId = user === null || user === void 0 ? void 0 : user.bioUserId;
        if (bioUserId) {
            const bioUser = yield bioUserModel_1.default.findById(bioUserId);
            if (bioUser && bioUser.bioUserUsername) {
                username = bioUser.bioUserUsername;
            }
        }
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ message: 'Invalid or empty notification IDs' });
            return;
        }
        yield socialNotificationModel_1.SocialNotification.deleteMany({
            _id: { $in: ids },
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        });
        // Get updated unread count
        const unreadCount = yield socialNotificationModel_1.SocialNotification.countDocuments({
            username: { $regex: new RegExp(`^${username}$`, 'i') },
            unread: true
        });
        res.json({ message: 'Notifications deleted successfully', unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteNotifications = deleteNotifications;
// @desc    Delete multiple personal notifications
// @route   DELETE /api/notifications/personal
// @access  Private
const deletePersonalNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        const user = req.user;
        let username = user === null || user === void 0 ? void 0 : user.username;
        const bioUserId = user === null || user === void 0 ? void 0 : user.bioUserId;
        if (bioUserId) {
            const bioUser = yield bioUserModel_1.default.findById(bioUserId);
            if (bioUser && bioUser.bioUserUsername) {
                username = bioUser.bioUserUsername;
            }
        }
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ message: 'Invalid or empty notification IDs' });
            return;
        }
        yield personalNotificationModel_1.PersonalNotification.deleteMany({
            _id: { $in: ids },
            bioUserUsername: { $regex: new RegExp(`^${username}$`, 'i') }
        });
        // Get updated unread count
        const unreadCount = yield personalNotificationModel_1.PersonalNotification.countDocuments({
            bioUserUsername: { $regex: new RegExp(`^${username}$`, 'i') },
            unread: true
        });
        res.json({ message: 'Personal notifications deleted successfully', unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deletePersonalNotifications = deletePersonalNotifications;
