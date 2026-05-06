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
exports.sharePostToFeed = exports.recordCommentClick = exports.recordShare = exports.toggleRepost = exports.recordView = exports.reportPost = exports.togglePinPost = exports.toggleBookmark = exports.toggleLike = void 0;
const postModel_1 = __importDefault(require("../../../models/post/postModel"));
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
const postStatModel_1 = require("../../../models/post/postStatModel");
const repostModel_1 = require("../../../models/post/repostModel");
const reportedPostModel_1 = require("../../../models/post/reportedPostModel");
const pinPostModel_1 = require("../../../models/post/pinPostModel");
const postHelper_1 = require("../../../utils/postHelper");
const notificationHelper_1 = require("../../../utils/notificationHelper");
const feedHelper_1 = require("./feedHelper");
// @desc    Toggle like on a post
// @route   POST /api/posts/:id/like
// @access  Private
const toggleLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const postId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const resolvedId = yield (0, postHelper_1.resolvePostId)(postId);
        const post = yield postModel_1.default.findById(resolvedId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const existingLike = yield postStatModel_1.Like.findOne({
            userId: String(userId),
            postId: String(resolvedId)
        });
        if (existingLike) {
            // Already liked, so unlike
            yield postStatModel_1.Like.deleteOne({ _id: existingLike._id });
            post.likes = Math.max(0, (post.likes || 0) - 1);
            yield post.save();
            yield (0, postHelper_1.updatePostScore)(resolvedId, 'like', -1, userId, (_b = req.user) === null || _b === void 0 ? void 0 : _b.username);
            res.json({ message: 'Post unliked', likes: post.likes, liked: false, postId: resolvedId });
        }
        else {
            // Not liked, so like
            yield postStatModel_1.Like.create({
                userId: String(userId),
                postId: String(resolvedId)
            });
            post.likes = (post.likes || 0) + 1;
            yield post.save();
            yield (0, postHelper_1.updatePostScore)(resolvedId, 'like', 1, userId, (_c = req.user) === null || _c === void 0 ? void 0 : _c.username);
            // Notify post owner
            if (post.userId.toString() !== userId.toString()) {
                try {
                    const currentUser = req.user;
                    yield (0, notificationHelper_1.sendNotification)(post.displayName, post.username, 'liked_post', { username: currentUser.username }, currentUser.picture, resolvedId, resolvedId, currentUser.username);
                }
                catch (notifError) {
                    console.error('[toggleLike] Failed to send notification:', notifError);
                }
            }
            res.json({ message: 'Post liked', likes: post.likes, liked: true, postId: resolvedId });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleLike = toggleLike;
// @desc    Toggle bookmark on a post
// @route   POST /api/posts/:id/bookmark
// @access  Private
const toggleBookmark = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const postId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const resolvedId = yield (0, postHelper_1.resolvePostId)(postId);
        const post = yield postModel_1.default.findById(resolvedId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const existingBookmark = yield postStatModel_1.Bookmark.findOne({
            userId: String(userId),
            postId: String(resolvedId)
        });
        if (existingBookmark) {
            // Already bookmarked, so remove
            yield postStatModel_1.Bookmark.deleteOne({ _id: existingBookmark._id });
            post.bookmarks = Math.max(0, (post.bookmarks || 0) - 1);
            yield post.save();
            yield (0, postHelper_1.updatePostScore)(resolvedId, 'bookmark', -1, userId, (_b = req.user) === null || _b === void 0 ? void 0 : _b.username);
            res.json({ message: 'Post bookmark removed', bookmarks: post.bookmarks, bookmarked: false, postId: resolvedId });
        }
        else {
            // Not bookmarked, so add
            yield postStatModel_1.Bookmark.create({
                userId: String(userId),
                postId: String(resolvedId)
            });
            post.bookmarks = (post.bookmarks || 0) + 1;
            yield post.save();
            yield (0, postHelper_1.updatePostScore)(resolvedId, 'bookmark', 1, userId, (_c = req.user) === null || _c === void 0 ? void 0 : _c.username);
            // Notify post owner
            if (post.userId.toString() !== userId.toString()) {
                try {
                    const currentUser = req.user;
                    yield (0, notificationHelper_1.sendNotification)(post.displayName, post.username, 'bookmarked_post', { username: currentUser.username }, currentUser.picture, resolvedId, resolvedId, currentUser.username);
                }
                catch (notifError) {
                    console.error('[toggleBookmark] Failed to send notification:', notifError);
                }
            }
            res.json({ message: 'Post bookmarked', bookmarks: post.bookmarks, bookmarked: true, postId: resolvedId });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleBookmark = toggleBookmark;
// @desc    Toggle pin post
// @route   POST /api/posts/:id/pin
// @access  Private
const togglePinPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const postId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const resolvedId = yield (0, postHelper_1.resolvePostId)(postId);
        const post = yield postModel_1.default.findById(resolvedId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const userIdStr = String(userId);
        const postIdStr = String(resolvedId);
        const existingPin = yield pinPostModel_1.Pin.findOne({
            userId: userIdStr,
            postId: postIdStr
        });
        if (existingPin) {
            yield pinPostModel_1.Pin.deleteOne({ _id: existingPin._id });
            res.json({ message: 'Post unpinned', isPinned: false });
        }
        else {
            yield pinPostModel_1.Pin.create({
                userId: userIdStr,
                postId: postIdStr
            });
            res.json({ message: 'Post pinned', isPinned: true });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.togglePinPost = togglePinPost;
// @desc    Report post
// @route   POST /api/posts/:id/report
// @access  Private
const reportPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const postId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { reason } = req.body;
        const resolvedId = yield (0, postHelper_1.resolvePostId)(postId);
        const post = yield postModel_1.default.findById(resolvedId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const reporter = yield userModel_1.default.findById(userId);
        // Create a detailed reported post record
        yield reportedPostModel_1.ReportedPost.create({
            displayName: post.displayName,
            username: post.username,
            bioUserId: post.userId,
            picture: post.picture,
            userId: post.userId,
            reporterDisplayName: (reporter === null || reporter === void 0 ? void 0 : reporter.displayName) || 'Anonymous',
            reporterUsername: (reporter === null || reporter === void 0 ? void 0 : reporter.username) || 'anonymous',
            reporterBioUserId: (reporter === null || reporter === void 0 ? void 0 : reporter.bioUserId) || '',
            reporterPicture: (reporter === null || reporter === void 0 ? void 0 : reporter.picture) || '',
            reporterUserId: userId,
            report: reason || 'No reason provided',
            postId: resolvedId
        });
        post.reports = (post.reports || 0) + 1;
        yield post.save();
        res.json({ message: 'Post reported successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.reportPost = reportPost;
// @desc    Record post view
// @route   POST /api/posts/:id/view
// @access  Private
const recordView = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const postId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const resolvedId = yield (0, postHelper_1.resolvePostId)(postId);
        const post = yield postModel_1.default.findById(resolvedId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        // Check if user has already viewed this post
        const existingView = yield postStatModel_1.View.findOne({ userId: String(userId), postId: String(resolvedId) });
        if (!existingView) {
            try {
                // First time view: create record and increment post total views
                yield postStatModel_1.View.create({
                    userId: String(userId),
                    postId: String(resolvedId),
                    count: 1
                });
                post.views = (post.views || 0) + 1;
                yield post.save();
                // Update post score for better trending
                yield (0, postHelper_1.updatePostScore)(resolvedId, 'view', 1, userId, (_b = req.user) === null || _b === void 0 ? void 0 : _b.username);
            }
            catch (err) {
                // Handle race condition if record was created between findOne and create
                if (err.code === 11000) {
                    yield postStatModel_1.View.updateOne({ userId: String(userId), postId: String(resolvedId) }, { $inc: { count: 1 } });
                }
                else {
                    throw err;
                }
            }
        }
        else {
            // Already viewed: just increment the internal raw view count for analytics
            yield postStatModel_1.View.updateOne({ _id: existingView._id }, { $inc: { count: 1 } });
        }
        res.json({ message: 'View recorded', views: post.views, viewed: true, postId: resolvedId });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.recordView = recordView;
// @desc    Toggle repost on a post
// @route   POST /api/posts/:id/repost
// @access  Private
const toggleRepost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const postId = req.params.id;
        const currentUser = req.user;
        if (!currentUser) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const resolvedId = yield (0, postHelper_1.resolvePostId)(postId);
        const originalPost = yield postModel_1.default.findById(resolvedId);
        if (!originalPost) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const existingRepost = yield repostModel_1.Repost.findOne({
            userId: String(currentUser._id),
            postId: String(resolvedId)
        });
        if (existingRepost) {
            // Already reposted, so remove it
            const deletedPostId = `${resolvedId}_rp_${existingRepost._id}`;
            yield repostModel_1.Repost.deleteOne({ userId: String(currentUser._id), postId: String(resolvedId) });
            originalPost.reposts = Math.max(0, (originalPost.reposts || 0) - 1);
            yield originalPost.save();
            res.json({
                message: 'Repost removed',
                reposts: originalPost.reposts,
                hasReposted: false,
                postId: resolvedId,
                deletedPostId
            });
        }
        else {
            // Not reposted, so create a new repost record
            const newRepost = yield repostModel_1.Repost.create({
                userId: String(currentUser._id),
                username: currentUser.username,
                displayName: currentUser.displayName,
                picture: currentUser.picture,
                isVerified: currentUser.isVerified,
                postId: String(resolvedId)
            });
            originalPost.reposts = (originalPost.reposts || 0) + 1;
            yield originalPost.save();
            yield (0, postHelper_1.updatePostScore)(resolvedId, 'repost', 1, String(currentUser._id), currentUser.username);
            const hydratedReposts = yield (0, feedHelper_1.hydrateReposts)([newRepost]);
            const newPost = hydratedReposts[0];
            res.json({
                message: 'Post reposted',
                reposts: originalPost.reposts,
                hasReposted: true,
                postId: resolvedId,
                newPost
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleRepost = toggleRepost;
// @desc    Record post share
// @route   POST /api/posts/:id/share
// @access  Private
const recordShare = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const postId = req.params.id;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const resolvedId = yield (0, postHelper_1.resolvePostId)(postId);
        const post = yield postModel_1.default.findById(resolvedId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        post.shares = (post.shares || 0) + 1;
        yield post.save();
        yield (0, postHelper_1.updatePostScore)(resolvedId, 'share', 1, String(user._id), user.username);
        res.json({ message: 'Share recorded', shares: post.shares, postId: resolvedId });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.recordShare = recordShare;
// @desc    Record comment icon click (interest)
// @route   POST /api/posts/:id/comment-click
// @access  Private
const recordCommentClick = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const postId = req.params.id;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const resolvedId = yield (0, postHelper_1.resolvePostId)(postId);
        const post = yield postModel_1.default.findById(resolvedId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        yield post.save();
        yield (0, postHelper_1.updatePostScore)(resolvedId, 'comment_click', 1, String(user._id), user.username);
        res.json({ message: 'Comment click recorded', postId: resolvedId });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.recordCommentClick = recordCommentClick;
// @desc    Share a post to feed (quote share — creates a new post embedding the original)
// @route   POST /api/posts/:id/share-to-feed
// @access  Private
const sharePostToFeed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const postId = req.params.id;
        const user = req.user;
        const { content } = req.body;
        if (!user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const resolvedId = yield (0, postHelper_1.resolvePostId)(postId);
        // Resolve to the root post (don't share a share)
        const originalPost = yield postModel_1.default.findById(resolvedId);
        if (!originalPost) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const rootPostId = originalPost.sharedPostId || originalPost._id;
        const rootPost = rootPostId.toString() === originalPost._id.toString()
            ? originalPost
            : (yield postModel_1.default.findById(rootPostId)) || originalPost;
        const newPost = yield postModel_1.default.create({
            userId: user._id,
            username: user.username,
            displayName: user.displayName,
            picture: user.picture,
            isVerified: user.isVerified,
            content: content || '',
            sharedPostId: rootPost._id,
            sharedPost: {
                _id: rootPost._id,
                content: rootPost.content,
                backgroundColor: rootPost.backgroundColor,
                media: (rootPost.media || []).map((m) => ({
                    source: m.source || '',
                    type: m.type || 'image',
                    preview: m.preview || m.source || ''
                })),
                username: rootPost.username,
                displayName: rootPost.displayName,
                picture: rootPost.picture,
                isVerified: rootPost.isVerified,
                createdAt: rootPost.createdAt
            }
        });
        // Increment shares on the original post
        yield postModel_1.default.findByIdAndUpdate(rootPost._id, { $inc: { shares: 1 } });
        yield (0, postHelper_1.updatePostScore)(String(rootPost._id), 'share', 1, String(user._id), user.username);
        const populated = yield postModel_1.default.findById(newPost._id);
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.sharePostToFeed = sharePostToFeed;
