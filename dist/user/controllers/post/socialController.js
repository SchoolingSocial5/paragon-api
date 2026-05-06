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
exports.recordVisit = exports.reportAccount = exports.getFollowings = exports.getFollowers = exports.getMutes = exports.getBlocks = exports.toggleBlock = exports.toggleMute = exports.toggleFollow = void 0;
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
const followerModel_1 = require("../../../models/post/followerModel");
const muteModel_1 = require("../../../models/post/muteModel");
const blockModel_1 = require("../../../models/post/blockModel");
const reportedAccountModel_1 = require("../../../models/post/reportedAccountModel");
const visitorModel_1 = require("../../../models/user/visitorModel");
const userHelper_1 = require("../../../utils/userHelper");
const notificationHelper_1 = require("../../../utils/notificationHelper");
// @desc    Toggle follow/mute/block
const toggleInteraction = (req, res, type) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const targetUserId = req.params.id;
        if (userId.toString() === targetUserId) {
            res.status(400).json({ message: `You cannot ${type} yourself` });
            return;
        }
        if (type === 'follow') {
            const existingFollow = yield followerModel_1.Follower.findOne({ followerId: userId, userId: targetUserId });
            if (existingFollow) {
                yield followerModel_1.Follower.deleteOne({ _id: existingFollow._id });
                // Recalculate for both requester and target
                const [updatedRequester] = yield Promise.all([
                    (0, userHelper_1.recalculateUserStats)(userId.toString()),
                    (0, userHelper_1.recalculateUserStats)(targetUserId.toString())
                ]);
                res.json({ message: 'Account unfollowed successfully', status: false, user: updatedRequester });
            }
            else {
                const [followerUser, targetUser] = yield Promise.all([
                    userModel_1.default.findById(userId),
                    userModel_1.default.findById(targetUserId)
                ]);
                if (!followerUser || !targetUser) {
                    res.status(404).json({ message: 'User not found' });
                    return;
                }
                yield followerModel_1.Follower.create({
                    userId: targetUser._id,
                    username: targetUser.username,
                    displayName: targetUser.displayName,
                    isVerified: targetUser.isVerified,
                    picture: targetUser.picture,
                    followerId: followerUser._id,
                    followerUsername: followerUser.username,
                    followerPicture: followerUser.picture,
                    followerDisplayName: followerUser.displayName,
                    followerIsVerified: followerUser.isVerified,
                    postId: ((_b = req.body) === null || _b === void 0 ? void 0 : _b.postId) || null
                });
                // Notify target user
                try {
                    const postId = ((_c = req.body) === null || _c === void 0 ? void 0 : _c.postId) || "";
                    yield (0, notificationHelper_1.sendNotification)(targetUser.displayName || targetUser.username || "", targetUser.username || "", postId ? 'follow_post' : 'follow', { username: followerUser.username }, followerUser.picture, followerUser.username, postId, followerUser.username);
                }
                catch (notifError) {
                    console.error('[toggleInteraction] Failed to send follow notification:', notifError);
                }
                // Recalculate for both
                const [updatedRequester] = yield Promise.all([
                    (0, userHelper_1.recalculateUserStats)(userId.toString()),
                    (0, userHelper_1.recalculateUserStats)(targetUserId.toString())
                ]);
                res.json({ message: 'Account followed successfully', status: true, user: updatedRequester });
            }
            return;
        }
        if (type === 'mute') {
            const existingMute = yield muteModel_1.Mute.findOne({ muterId: userId, userId: targetUserId });
            if (existingMute) {
                yield muteModel_1.Mute.deleteOne({ _id: existingMute._id });
                res.json({ message: 'Account unmuted successfully', status: false });
            }
            else {
                const [muterUser, targetUser] = yield Promise.all([
                    userModel_1.default.findById(userId),
                    userModel_1.default.findById(targetUserId)
                ]);
                if (!muterUser || !targetUser) {
                    res.status(404).json({ message: 'User not found' });
                    return;
                }
                yield muteModel_1.Mute.create({
                    userId: targetUser._id,
                    username: targetUser.username,
                    displayName: targetUser.displayName,
                    isVerified: targetUser.isVerified,
                    picture: targetUser.picture,
                    muterId: muterUser._id,
                    muterUsername: muterUser.username,
                    muterPicture: muterUser.picture,
                    muterDisplayName: muterUser.displayName,
                    muterIsVerified: muterUser.isVerified,
                    postId: ((_d = req.body) === null || _d === void 0 ? void 0 : _d.postId) || null
                });
                res.json({ message: 'Account muted successfully', status: true });
            }
            return;
        }
        if (type === 'block') {
            const existingBlock = yield blockModel_1.Block.findOne({ blockerId: userId, userId: targetUserId });
            if (existingBlock) {
                yield blockModel_1.Block.deleteOne({ _id: existingBlock._id });
                res.json({ message: 'Account unblocked successfully', status: false });
            }
            else {
                const [blockerUser, targetUser] = yield Promise.all([
                    userModel_1.default.findById(userId),
                    userModel_1.default.findById(targetUserId)
                ]);
                if (!blockerUser || !targetUser) {
                    res.status(404).json({ message: 'User not found' });
                    return;
                }
                yield blockModel_1.Block.create({
                    userId: targetUser._id,
                    username: targetUser.username,
                    displayName: targetUser.displayName,
                    isVerified: targetUser.isVerified,
                    picture: targetUser.picture,
                    blockerId: blockerUser._id,
                    blockerUsername: blockerUser.username,
                    blockerPicture: blockerUser.picture,
                    blockerDisplayName: blockerUser.displayName,
                    blockerIsVerified: blockerUser.isVerified,
                    postId: ((_e = req.body) === null || _e === void 0 ? void 0 : _e.postId) || null
                });
                res.json({ message: 'Account blocked successfully', status: true });
            }
            return;
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
const toggleFollow = (req, res) => toggleInteraction(req, res, 'follow');
exports.toggleFollow = toggleFollow;
const toggleMute = (req, res) => toggleInteraction(req, res, 'mute');
exports.toggleMute = toggleMute;
const toggleBlock = (req, res) => toggleInteraction(req, res, 'block');
exports.toggleBlock = toggleBlock;
// @desc    Get blocked users
// @route   GET /api/users/blocks
// @access  Private
const getBlocks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const blocks = yield blockModel_1.Block.find({ blockerId: userId });
        res.json(blocks);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBlocks = getBlocks;
// @desc    Get muted users
// @route   GET /api/users/mutes
// @access  Private
const getMutes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const mutes = yield muteModel_1.Mute.find({ muterId: userId });
        res.json(mutes);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMutes = getMutes;
// @desc    Get followers of a user
// @route   GET /api/users/:id/followers
// @access  Public
const getFollowers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = req.params.id;
        const requesterId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Recalculate stats for the target user to ensure accuracy on fetch
        const stats = yield (0, userHelper_1.recalculateUserStats)(userId.toString());
        const followers = yield followerModel_1.Follower.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        if (requesterId) {
            const results = yield Promise.all(followers.map((f) => __awaiter(void 0, void 0, void 0, function* () {
                const isFollowed = yield followerModel_1.Follower.exists({ followerId: requesterId, userId: f.followerId });
                return Object.assign(Object.assign({}, f), { followed: !!isFollowed });
            })));
            res.json({ users: results, stats });
        }
        else {
            res.json({ users: followers, stats });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getFollowers = getFollowers;
// @desc    Get users followed by a user
// @route   GET /api/users/:id/following
// @access  Public
const getFollowings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.params.id;
        const requester = req.user;
        const requesterId = (_a = requester === null || requester === void 0 ? void 0 : requester._id) === null || _a === void 0 ? void 0 : _a.toString();
        const requesterUsername = requester === null || requester === void 0 ? void 0 : requester.username;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Recalculate stats for the target user (including the "Followings" count)
        const stats = yield (0, userHelper_1.recalculateUserStats)(userId.toString());
        const following = yield followerModel_1.Follower.find({ followerId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        if (requesterId) {
            const results = yield Promise.all(following.map((f) => __awaiter(void 0, void 0, void 0, function* () {
                var _a;
                const followedUserId = (_a = f.userId) === null || _a === void 0 ? void 0 : _a.toString();
                const followedUsername = f.username;
                // Check: does the requester follow this person?
                const isFollowed = yield followerModel_1.Follower.exists({
                    $or: [
                        { followerId: requesterId, userId: followedUserId },
                        ...(requesterUsername && followedUsername
                            ? [{ followerUsername: requesterUsername, username: followedUsername }]
                            : [])
                    ]
                });
                return Object.assign(Object.assign({}, f), { followed: !!isFollowed });
            })));
            res.json({ users: results, stats });
        }
        else {
            res.json({ users: following, stats });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getFollowings = getFollowings;
// @desc    Report account
// @route   POST /api/users/:id/report
// @access  Private
const reportAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const targetUserId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { reason } = req.body;
        const user = yield userModel_1.default.findById(targetUserId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const reporter = yield userModel_1.default.findById(userId);
        // Create a detailed reported account record
        yield reportedAccountModel_1.ReportedAccount.create({
            displayName: user.displayName,
            username: user.username,
            bioUserId: user.bioUserId,
            picture: user.picture,
            userId: targetUserId,
            reporterDisplayName: (reporter === null || reporter === void 0 ? void 0 : reporter.displayName) || 'Anonymous',
            reporterUsername: (reporter === null || reporter === void 0 ? void 0 : reporter.username) || 'anonymous',
            reporterBioUserId: (reporter === null || reporter === void 0 ? void 0 : reporter.bioUserId) || '',
            reporterPicture: (reporter === null || reporter === void 0 ? void 0 : reporter.picture) || '',
            reporterUserId: userId,
            report: reason || 'No reason provided',
        });
        user.reports = (user.reports || 0) + 1;
        yield user.save();
        res.json({ message: 'Account reported successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.reportAccount = reportAccount;
// @desc    Record a profile visit
// @route   POST /api/users/:id/visit
// @access  Private
const recordVisit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.params.id;
        const visitorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!visitorId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        if (userId === visitorId.toString()) {
            res.status(400).json({ message: 'Cannot record self-visit' });
            return;
        }
        try {
            // Try to create the visit record
            yield visitorModel_1.Visitor.create({ userId, visitorId });
            // If creation successful, it's a new visit -> increment user visits counter
            yield userModel_1.default.findByIdAndUpdate(userId, { $inc: { visits: 1 } });
            res.status(201).json({ message: 'Visit recorded' });
        }
        catch (error) {
            // Check for MongoDB duplicate key error (code 11000)
            if (error.code === 11000) {
                res.status(200).json({ message: 'Visit already recorded' });
            }
            else {
                // For other errors, pass them to the outer catch block
                throw error;
            }
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.recordVisit = recordVisit;
