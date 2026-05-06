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
exports.syncFriendsOnlineStatus = exports.updateOnlineStatusLogic = exports.getUnreadChatCount = exports.deleteFriend = exports.getFriendsOnlineStatus = exports.getPendingFriendRequests = exports.getPendingFriendRequestCount = exports.checkFriendship = exports.declineFriendRequest = exports.updateFriend = exports.getFriends = void 0;
const Friend_1 = __importDefault(require("../../../models/chat/Friend"));
const socket_1 = require("../../../socket");
const chatController_1 = require("./chatController");
// @desc    Get user's friend list
// @route   GET /api/chat/friends
// @access  Private
const getFriends = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const username = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const friends = yield Friend_1.default.find({
            senderUsername: { $regex: new RegExp(`^${username}$`, 'i') }
        })
            .sort({ timeNumber: -1 })
            .skip(skip)
            .limit(limit);
        res.json(friends);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getFriends = getFriends;
// @desc    Add or update a friend connection
// @route   POST /api/chat/friends
// @access  Private
const updateFriend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { bioUserId, username, displayName, picture, isFriends, status, connection, senderDisplayName, senderPicture, isDeclined } = req.body;
        const senderUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        let friend = yield Friend_1.default.findOne({ bioUserId, username, senderUsername });
        if (friend) {
            friend.isFriends = isFriends !== null && isFriends !== void 0 ? isFriends : friend.isFriends;
            friend.status = status !== null && status !== void 0 ? status : friend.status;
            friend.connection = connection !== null && connection !== void 0 ? connection : friend.connection;
            friend.displayName = displayName !== null && displayName !== void 0 ? displayName : friend.displayName;
            friend.picture = picture !== null && picture !== void 0 ? picture : friend.picture;
            friend.senderDisplayName = senderDisplayName !== null && senderDisplayName !== void 0 ? senderDisplayName : friend.senderDisplayName;
            friend.senderPicture = senderPicture !== null && senderPicture !== void 0 ? senderPicture : friend.senderPicture;
            friend.isDeclined = isDeclined !== null && isDeclined !== void 0 ? isDeclined : friend.isDeclined;
            yield friend.save();
        }
        else {
            friend = yield Friend_1.default.create({
                bioUserId,
                username,
                displayName,
                picture,
                isFriends,
                status,
                connection,
                senderUsername,
                senderDisplayName,
                senderPicture,
                isDeclined: isDeclined !== null && isDeclined !== void 0 ? isDeclined : false
            });
        }
        res.status(200).json(friend);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateFriend = updateFriend;
// @desc    Decline a friend request
// @route   POST /api/chat/friends/decline
// @access  Private
const declineFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { connection } = req.body;
        const username = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        if (!connection) {
            res.status(400).json({ message: "Connection ID is required" });
            return;
        }
        const friend = yield Friend_1.default.findOne({
            connection,
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        });
        if (!friend) {
            res.status(404).json({ message: "Friend request not found" });
            return;
        }
        friend.isDeclined = true;
        yield friend.save();
        res.status(200).json(friend);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.declineFriendRequest = declineFriendRequest;
// @desc    Check if a friendship exists
// @route   GET /api/chat/friends/check/:username
// @access  Private
const checkFriendship = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { username } = req.params;
        const senderUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        const friend = yield Friend_1.default.findOne({
            senderUsername: { $regex: new RegExp(`^${senderUsername}$`, 'i') },
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        });
        if (!friend) {
            res.json({ isFriends: false, isFriendRequest: false });
            return;
        }
        else {
            // isFriendRequest is only true if they are not friends AND the current user is the receiver (status === 'received')
            res.json({
                isFriends: friend.isFriends,
                isFriendRequest: !friend.isFriends && friend.status === 'received'
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.checkFriendship = checkFriendship;
// @desc    Get count and list of pending friend requests (Deprecated)
// @route   GET /api/chat/friends/pending-count
// @access  Private
const getPendingFriendRequestCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Redundant under the new direct messaging model
        res.json({ count: 0, requests: [] });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPendingFriendRequestCount = getPendingFriendRequestCount;
// @desc    Get pending friend requests (Deprecated)
// @route   GET /api/chat/friends/pending
// @access  Private
const getPendingFriendRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Redundant under the new direct messaging model
        res.json([]);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPendingFriendRequests = getPendingFriendRequests;
// @desc    Get online status for a list of friends
// @route   POST /api/chat/friends/online-status
// @access  Private
const getFriendsOnlineStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { connections } = req.body;
        const senderUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        if (!connections || !Array.isArray(connections)) {
            res.status(400).json({ message: "Connections array is required" });
            return;
        }
        const friends = yield Friend_1.default.find({
            senderUsername: { $regex: new RegExp(`^${senderUsername}$`, 'i') },
            connection: { $in: connections }
        }).select('connection username isOnline');
        res.json(friends);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getFriendsOnlineStatus = getFriendsOnlineStatus;
// @desc    Delete a friend connection
// @route   DELETE /api/chat/friends/:username
// @access  Private
const deleteFriend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { username } = req.params;
        const senderUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        const senderRegex = { $regex: new RegExp(`^${senderUsername}$`, 'i') };
        const userRegex = { $regex: new RegExp(`^${username}$`, 'i') };
        yield Friend_1.default.deleteMany({
            $or: [
                { senderUsername: senderRegex, username: userRegex },
                { senderUsername: userRegex, username: senderRegex }
            ]
        });
        res.status(200).json({ message: "Friend removed successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteFriend = deleteFriend;
// @desc    Get total unread chat count for the authenticated user
// @route   GET /api/chat/friends/unread-count
// @access  Private
const getUnreadChatCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const username = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        const count = yield (0, chatController_1.getTotalUnreadCount)(username);
        res.json({ count });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUnreadChatCount = getUnreadChatCount;
// @desc    Update online status for a user and broadcast to all their contacts
const updateOnlineStatusLogic = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { isOnline, username } = data;
        if (!username) {
            return;
        }
        // 0. Update the actual User model status for global consistency
        const User = require('../../../models/user/userModel').default;
        yield User.findOneAndUpdate({ username: { $regex: new RegExp(`^${username}$`, 'i') } }, {
            $set: {
                online: !!isOnline,
                status: isOnline ? 'online' : 'offline'
            }
        });
        // 1. Update isOnline on ALL Friend docs where this user's username is the key
        yield Friend_1.default.updateMany({ username: { $regex: new RegExp(`^${username}$`, 'i') } }, { $set: { isOnline: !!isOnline } });
        // 1.5 Update isOnline on ALL BioFriend docs where this user's username is the key
        const BioFriend = require('../../../models/chat/BioFriend').default;
        yield BioFriend.updateMany({ bioUserUsername: { $regex: new RegExp(`^${username}$`, 'i') } }, { $set: { isOnline: !!isOnline } });
        // 2. RETRIEVE THE UPDATED DOCUMENTS for accurate emission
        const updatedFriendDocs = yield Friend_1.default.find({
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        });
        const updatedBioDocs = yield BioFriend.find({
            bioUserUsername: { $regex: new RegExp(`^${username}$`, 'i') }
        });
        const io = (0, socket_1.getIO)();
        if (!io) {
            return;
        }
        // 3. Emit the presence change to each contact individually (friend-scoped)
        for (const doc of updatedFriendDocs) {
            if (doc.senderUsername) {
                const eventName = `presence_updated_${doc.senderUsername.toLowerCase()}`;
                io.emit(eventName, {
                    username: doc.username,
                    isOnline: doc.isOnline,
                    connection: doc.connection
                });
            }
        }
        // 3.5 Emit to bio contacts
        for (const doc of updatedBioDocs) {
            if (doc.senderBioUserUsername) {
                const eventName = `presence_updated_bio_${doc.senderBioUserUsername.toLowerCase()}`;
                io.emit(eventName, {
                    username: doc.bioUserUsername,
                    isOnline: doc.isOnline,
                    connection: doc.connection
                });
            }
        }
        // 4. Broadcast a global event so admin/staff dashboards (which may not
        //    have Friend documents with every user) can still track online status.
        io.emit('user_status_changed', {
            username,
            isOnline: !!isOnline,
        });
    }
    catch (error) {
        console.error('[OnlineStatus] Error:', error);
    }
});
exports.updateOnlineStatusLogic = updateOnlineStatusLogic;
// @desc    Force sync all friends' online status from the User model
// @route   POST /api/chat/friends/sync-online
// @access  Private
const syncFriendsOnlineStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const username = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        const Friend = require('../../../models/chat/Friend').default;
        const User = require('../../../models/user/userModel').default;
        // 1. Get all friend records for this user
        const friends = yield Friend.find({
            senderUsername: { $regex: new RegExp(`^${username}$`, 'i') }
        });
        if (friends.length === 0) {
            res.json({ message: "No friends to sync" });
            return;
        }
        // 2. Get the target usernames
        const targetUsernames = friends.map((f) => f.username);
        // 3. Fetch their actual status from the User model
        const users = yield User.find({
            username: { $in: targetUsernames.map((u) => new RegExp(`^${u}$`, 'i')) }
        }).select('username online');
        // 4. Create a map for quick lookup
        const statusMap = {};
        users.forEach((u) => {
            statusMap[u.username.toLowerCase()] = !!u.online;
        });
        // 5. Update each friend record
        const updates = friends.map((friend) => __awaiter(void 0, void 0, void 0, function* () {
            const isOnline = statusMap[friend.username.toLowerCase()] || false;
            if (friend.isOnline !== isOnline) {
                friend.isOnline = isOnline;
                return friend.save();
            }
            return Promise.resolve();
        }));
        yield Promise.all(updates);
        res.json({ message: "Online status synced successfully", friendsSynced: friends.length });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.syncFriendsOnlineStatus = syncFriendsOnlineStatus;
