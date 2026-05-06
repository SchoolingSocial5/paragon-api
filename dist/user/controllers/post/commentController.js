"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.toggleCommentHate = exports.toggleCommentLike = exports.deleteComment = exports.createComment = exports.getComments = exports.processComments = void 0;
const commentModel_1 = __importDefault(require("../../../models/post/commentModel"));
const postModel_1 = __importDefault(require("../../../models/post/postModel"));
const postStatModel_1 = require("../../../models/post/postStatModel");
const sanitize_1 = require("../../../utils/sanitize");
const notificationHelper_1 = require("../../../utils/notificationHelper");
const s3_1 = require("../../../utils/s3");
const postHelper_1 = require("../../../utils/postHelper");
const mentionHelper_1 = require("../../../utils/mentionHelper");
// Helper to check if a count is a notification milestone (1, 5, 10, 50, 100, 500, 1000, etc.)
const isNotificationMilestone = (n) => {
    if (n <= 0)
        return false;
    if (n === 1 || n === 5)
        return true;
    if (n % 10 === 0) {
        let temp = n;
        while (temp % 10 === 0)
            temp /= 10;
        return temp === 1 || temp === 5;
    }
    return false;
};
// Helper to process comments with user interaction status
const processComments = (comments, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    const commentIds = comments.map(comment => comment._id.toString());
    // Batch find likes and hates for efficiency
    const [likes, hates] = yield Promise.all([
        currentUserId ? postStatModel_1.Like.find({ userId: currentUserId, postId: { $in: commentIds } }) : Promise.resolve([]),
        currentUserId ? postStatModel_1.Hate.find({ userId: currentUserId, postId: { $in: commentIds } }) : Promise.resolve([])
    ]);
    const likedSet = new Set(likes.map(l => l.postId.toString()));
    const hatedSet = new Set(hates.map(h => h.postId.toString()));
    return comments.map(comment => {
        const commentData = comment.toObject ? comment.toObject() : comment;
        return Object.assign(Object.assign({}, commentData), { picture: (0, s3_1.getCloudFrontUrl)(commentData.picture), media: (commentData.media || []).map((m) => (Object.assign(Object.assign({}, m), { source: (0, s3_1.getCloudFrontUrl)(m.source), preview: m.preview ? (0, s3_1.getCloudFrontUrl)(m.preview) : undefined }))), liked: likedSet.has(commentData._id.toString()), hated: hatedSet.has(commentData._id.toString()) });
    });
});
exports.processComments = processComments;
// @desc    Get comments for a post
// @route   GET /api/posts/:postId/comments
// @access  Public
const getComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const postId = req.params.postId;
        const level = parseInt(req.query.level) || 1;
        const parentId = req.query.parentId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const currentUserId = req.query.currentUserId;
        const skip = (page - 1) * limit;
        const resolvedPostId = yield (0, postHelper_1.resolvePostId)(postId);
        const query = { postId: resolvedPostId, level };
        if (parentId) {
            query.replyToId = parentId;
        }
        else if (level === 1) {
            query.replyToId = { $exists: false };
        }
        const comments = yield commentModel_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const processedComments = yield (0, exports.processComments)(comments, currentUserId);
        res.json(processedComments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getComments = getComments;
// @desc    Create a comment
// @route   POST /api/posts/:postId/comments
// @access  Private
const createComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const postId = req.params.postId;
        const { content, media, commentId } = req.body;
        const user = req.user;
        if (!content) {
            res.status(400).json({ message: 'Content is required' });
            return;
        }
        const resolvedPostId = yield (0, postHelper_1.resolvePostId)(postId);
        const post = yield postModel_1.default.findById(resolvedPostId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        let mediaData = [];
        let commentMedia = "";
        if (media) {
            if (typeof media === 'string') {
                commentMedia = media;
                mediaData = [{ source: media, type: media.includes('.mp4') ? 'video/mp4' : 'image/jpeg' }];
            }
            else if (Array.isArray(media)) {
                mediaData = media;
                commentMedia = ((_a = media[0]) === null || _a === void 0 ? void 0 : _a.source) || "";
            }
            else if (typeof media === 'object' && media !== null) {
                // Handle single object from Flutter
                mediaData = [media];
                commentMedia = media.source || "";
            }
        }
        let parentLevel = 0;
        if (commentId) {
            const parentComment = yield commentModel_1.default.findById(commentId);
            if (parentComment) {
                parentLevel = parentComment.level || 0;
            }
        }
        const comment = yield commentModel_1.default.create({
            userId: user._id,
            postId: resolvedPostId,
            content: (0, sanitize_1.xssClean)(content),
            displayName: (0, sanitize_1.xssClean)(user.displayName),
            username: user.username,
            picture: user.picture,
            isVerified: user.isVerified,
            media: mediaData,
            commentMedia: commentMedia,
            replyToId: commentId,
            level: parentLevel + 1
        });
        // Handle mentions
        if (content) {
            (0, mentionHelper_1.handleMentions)(content, resolvedPostId, {
                _id: user._id,
                username: user.username,
                displayName: user.displayName,
                picture: user.picture
            }).catch(err => console.error('Mention handling error (comment):', err));
        }
        if (commentId) {
            // Increment reply count and score (+3 per reply) on parent comment
            const parentComment = yield commentModel_1.default.findByIdAndUpdate(commentId, { $inc: { replies: 1, score: 3 } }, { new: true });
            // Notify parent comment owner
            if (parentComment && parentComment.username !== user.username) {
                try {
                    yield (0, notificationHelper_1.sendNotification)(parentComment.displayName || parentComment.username || "", parentComment.username || "", 'user_reply', { username: user.username }, user.picture, resolvedPostId, resolvedPostId, user.username);
                }
                catch (notifError) {
                    console.error('[createComment] Failed to send reply notification:', notifError);
                }
            }
        }
        else {
            // Only increment replies count on the post if it's a root comment (level 1)
            post.replies = (post.replies || 0) + 1;
            yield post.save();
            const { updatePostScore } = yield Promise.resolve().then(() => __importStar(require('../../../utils/postHelper')));
            yield updatePostScore(resolvedPostId, 'comment', 1, String(user._id), user.username);
        }
        // Notify post owner
        if (post.username !== user.username) {
            try {
                yield (0, notificationHelper_1.sendNotification)(post.displayName, post.username, 'user_comment', { username: user.username }, user.picture, resolvedPostId, resolvedPostId, user.username);
            }
            catch (notifError) {
                console.error('[createComment] Failed to send notification:', notifError);
            }
        }
        res.status(201).json(comment);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createComment = createComment;
// @desc    Delete a comment
// @route   DELETE /api/posts/comments/:commentId
// @access  Private
const deleteComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const commentId = req.params.commentId;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const comment = yield commentModel_1.default.findById(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }
        if (comment.userId.toString() !== userId.toString()) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }
        if (comment.replyToId) {
            // Decrement reply count and score (-3 per reply removed) on parent comment
            yield commentModel_1.default.findByIdAndUpdate(comment.replyToId, { $inc: { replies: -1, score: -3 } });
        }
        else {
            const post = yield postModel_1.default.findById(comment.postId);
            if (post) {
                post.replies = Math.max(0, (post.replies || 0) - 1);
                yield post.save();
            }
        }
        yield commentModel_1.default.findByIdAndDelete(commentId);
        res.json({ message: 'Comment deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteComment = deleteComment;
// @desc    Toggle like on a comment
// @route   POST /api/posts/comments/:commentId/like
// @access  Private
const toggleCommentLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const commentId = req.params.commentId;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const comment = yield commentModel_1.default.findById(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }
        const existingLike = yield postStatModel_1.Like.findOne({ userId, postId: commentId });
        const existingHate = yield postStatModel_1.Hate.findOne({ userId, postId: commentId });
        if (existingLike) {
            yield postStatModel_1.Like.deleteOne({ _id: existingLike._id });
            comment.likes = Math.max(0, (comment.likes || 0) - 1);
            comment.score = Math.max(0, (comment.score || 0) - 2);
            yield comment.save();
            res.json({ liked: false, likes: comment.likes, score: comment.score });
        }
        else {
            yield postStatModel_1.Like.create({ userId, postId: commentId });
            comment.likes = (comment.likes || 0) + 1;
            comment.score = (comment.score || 0) + 2;
            if (existingHate) {
                yield postStatModel_1.Hate.deleteOne({ _id: existingHate._id });
                comment.hates = Math.max(0, (comment.hates || 0) - 1);
                comment.score = Math.max(0, (comment.score || 0) - 1); // hate removal gives back 1
            }
            yield comment.save();
            // Notify comment owner
            if (comment.userId.toString() !== userId.toString()) {
                try {
                    const currentUser = req.user;
                    yield (0, notificationHelper_1.sendNotification)(comment.displayName || comment.username || "", comment.username || "", 'like_comment', { username: currentUser.username }, currentUser.picture, comment.postId, // Pass the parent postId for routing
                    comment.postId, currentUser.username);
                }
                catch (notifError) {
                    console.error('[toggleCommentLike] Failed to send notification:', notifError);
                }
            }
            res.json({ liked: true, likes: comment.likes, hated: false, hates: comment.hates, score: comment.score });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleCommentLike = toggleCommentLike;
// @desc    Toggle hate on a comment
// @route   POST /api/posts/comments/:commentId/hate
// @access  Private
const toggleCommentHate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const commentId = req.params.commentId;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const comment = yield commentModel_1.default.findById(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }
        const existingLike = yield postStatModel_1.Like.findOne({ userId, postId: commentId });
        const existingHate = yield postStatModel_1.Hate.findOne({ userId, postId: commentId });
        if (existingHate) {
            yield postStatModel_1.Hate.deleteOne({ _id: existingHate._id });
            comment.hates = Math.max(0, (comment.hates || 0) - 1);
            yield comment.save();
            res.json({ hated: false, hates: comment.hates });
        }
        else {
            yield postStatModel_1.Hate.create({ userId, postId: commentId });
            comment.hates = (comment.hates || 0) + 1;
            if (existingLike) {
                yield postStatModel_1.Like.deleteOne({ _id: existingLike._id });
                comment.likes = Math.max(0, (comment.likes || 0) - 1);
            }
            yield comment.save();
            res.json({ hated: true, hates: comment.hates, liked: false, likes: comment.likes });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleCommentHate = toggleCommentHate;
