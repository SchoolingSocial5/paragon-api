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
Object.defineProperty(exports, "__esModule", { value: true });
exports.markExamPostAsRead = exports.toggleExamPostHate = exports.toggleExamPostLike = exports.toggleExamCommentHate = exports.toggleExamCommentLike = exports.deleteExamPostComment = exports.createExamPostComment = exports.getExamPostComments = exports.createExamPost = exports.getExamPostsByExamId = exports.getExamPosts = void 0;
const examPostModel_1 = require("../../../models/exam/examPostModel");
const postStatModel_1 = require("../../../models/post/postStatModel");
// @desc    Get all exam posts (global)
// @route   GET /api/exams/posts
// @access  Private/Staff
const getExamPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [posts, total] = yield Promise.all([
            examPostModel_1.ExamPost.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            examPostModel_1.ExamPost.countDocuments({})
        ]);
        const processedPosts = yield processExamPosts(posts, req.query.currentUserId);
        res.json({
            results: processedPosts,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getExamPosts = getExamPosts;
// @desc    Get all posts for a specific exam
// @route   GET /api/exams/posts/exam/:examId
// @access  Public
const getExamPostsByExamId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { examId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const currentUserId = req.query.currentUserId;
        const skip = (page - 1) * limit;
        const posts = yield examPostModel_1.ExamPost.find({ examId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const processedPosts = yield processExamPosts(posts, currentUserId);
        res.json(processedPosts);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getExamPostsByExamId = getExamPostsByExamId;
// Helper to process exam posts with user interaction status
const processExamPosts = (posts, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!currentUserId)
        return posts;
    const postIds = posts.map(post => post._id.toString());
    // Batch find likes and hates
    const [likes, hates] = yield Promise.all([
        postStatModel_1.Like.find({ userId: currentUserId, postId: { $in: postIds } }),
        postStatModel_1.Hate.find({ userId: currentUserId, postId: { $in: postIds } })
    ]);
    const likedSet = new Set(likes.map(l => l.postId.toString()));
    const hatedSet = new Set(hates.map(h => h.postId.toString()));
    return posts.map(post => {
        const postData = post.toObject ? post.toObject() : post;
        return Object.assign(Object.assign({}, postData), { liked_status: likedSet.has(postData._id.toString()), hated_status: hatedSet.has(postData._id.toString()) });
    });
});
// Helper to process comments with user interaction status
const processComments = (comments, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!currentUserId)
        return comments;
    const commentIds = comments.map(comment => comment._id.toString());
    // Batch find likes and hates for efficiency
    const [likes, hates] = yield Promise.all([
        postStatModel_1.Like.find({ userId: currentUserId, postId: { $in: commentIds } }),
        postStatModel_1.Hate.find({ userId: currentUserId, postId: { $in: commentIds } })
    ]);
    const likedSet = new Set(likes.map(l => l.postId.toString()));
    const hatedSet = new Set(hates.map(h => h.postId.toString()));
    return comments.map(comment => {
        const commentData = comment.toObject ? comment.toObject() : comment;
        return Object.assign(Object.assign({}, commentData), { liked_status: likedSet.has(commentData._id.toString()), hated_status: hatedSet.has(commentData._id.toString()) });
    });
});
// @desc    Create a new exam post
// @route   POST /api/exams/posts
// @access  Private
const createExamPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { examId, content, media, bioUserPicture, bioUserUsername, bioUserDisplayName } = req.body;
        if (!examId) {
            res.status(400).json({ message: 'Exam ID is required' });
            return;
        }
        const postData = {
            examId,
            content,
            media,
            bioUserId: userId,
            bioUserPicture,
            bioUserUsername,
            bioUserDisplayName,
            // Initialize stats
            comments: 0,
            likes: 0,
            hates: 0
        };
        const post = yield examPostModel_1.ExamPost.create(postData);
        res.status(201).json(post);
    }
    catch (error) {
        console.error('Create Exam Post Error:', error);
        res.status(400).json({ message: error.message });
    }
});
exports.createExamPost = createExamPost;
// @desc    Get comments for an exam post
// @route   GET /api/exams/posts/:postId/comments
// @access  Public
const getExamPostComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postId } = req.params;
        const level = parseInt(req.query.level) || 1;
        const parentId = req.query.parentId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const currentUserId = req.query.currentUserId;
        const skip = (page - 1) * limit;
        const Comment = require('../../../models/post/commentModel').default;
        const query = { postId, level };
        if (parentId) {
            query.replyToId = parentId;
        }
        else if (level === 1) {
            // Root level comments should not have a replyToId
            query.replyToId = { $exists: false };
        }
        const comments = yield Comment.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const processedComments = yield processComments(comments, currentUserId);
        res.json(processedComments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getExamPostComments = getExamPostComments;
// @desc    Create a comment for an exam post
// @route   POST /api/exams/posts/:postId/comments
// @access  Private
const createExamPostComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { postId } = req.params;
        const { content, media, commentId } = req.body;
        const user = req.user;
        if (!content) {
            res.status(400).json({ message: 'Content is required' });
            return;
        }
        const post = yield examPostModel_1.ExamPost.findById(postId);
        if (!post) {
            res.status(404).json({ message: 'Exam post not found' });
            return;
        }
        const Comment = require('../../../models/post/commentModel').default;
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
        }
        const comment = yield Comment.create({
            userId: user._id,
            postId,
            content,
            media: mediaData,
            displayName: user.displayName,
            username: user.username,
            picture: user.picture,
            isVerified: user.isVerified,
            commentMedia: commentMedia,
            replyToId: commentId,
            level: commentId ? 2 : 1
        });
        const responseObject = comment.toObject();
        responseObject.commentId = commentId;
        if (commentId) {
            yield Comment.findByIdAndUpdate(commentId, { $inc: { replies: 1 } });
        }
        // Increment comments count on the exam post
        post.comments = (post.comments || 0) + 1;
        yield post.save();
        res.status(201).json(responseObject);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createExamPostComment = createExamPostComment;
// @desc    Delete a comment from an exam post
// @route   DELETE /api/exams/posts/:postId/comments/:commentId
// @access  Private
const deleteExamPostComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { postId, commentId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const Comment = require('../../../models/post/commentModel').default;
        const comment = yield Comment.findById(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }
        // Check ownership
        if (comment.userId.toString() !== userId.toString()) {
            res.status(403).json({ message: 'Not authorized to delete this comment' });
            return;
        }
        // If it's a reply, decrement parent's reply count
        if (comment.replyToId) {
            yield Comment.findByIdAndUpdate(comment.replyToId, { $inc: { replies: -1 } });
        }
        // Decrement post's comment count
        const post = yield examPostModel_1.ExamPost.findById(postId);
        if (post) {
            post.comments = Math.max(0, (post.comments || 0) - 1);
            yield post.save();
        }
        yield Comment.findByIdAndDelete(commentId);
        res.json({ message: 'Comment deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteExamPostComment = deleteExamPostComment;
// @desc    Toggle like on an exam comment
// @route   POST /api/exams/posts/comments/:commentId/like
// @access  Private
const toggleExamCommentLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { commentId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const Comment = require('../../../models/post/commentModel').default;
        const comment = yield Comment.findById(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }
        const existingLike = yield postStatModel_1.Like.findOne({ userId, postId: commentId });
        const existingHate = yield postStatModel_1.Hate.findOne({ userId, postId: commentId });
        if (existingLike) {
            // Remove like
            yield postStatModel_1.Like.deleteOne({ _id: existingLike._id });
            comment.likes = Math.max(0, (comment.likes || 0) - 1);
            yield comment.save();
            res.json({ message: 'Like removed', liked: false, likes: comment.likes });
        }
        else {
            // Add like
            yield postStatModel_1.Like.create({ userId, postId: commentId });
            comment.likes = (comment.likes || 0) + 1;
            // If hated, remove hate (mutual exclusivity)
            if (existingHate) {
                yield postStatModel_1.Hate.deleteOne({ _id: existingHate._id });
                comment.hates = Math.max(0, (comment.hates || 0) - 1);
            }
            yield comment.save();
            res.json({
                message: 'Comment liked',
                liked: true,
                likes: comment.likes,
                hated: false,
                hates: comment.hates
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleExamCommentLike = toggleExamCommentLike;
// @desc    Toggle hate on an exam comment
// @route   POST /api/exams/posts/comments/:commentId/hate
// @access  Private
const toggleExamCommentHate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { commentId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const Comment = require('../../../models/post/commentModel').default;
        const comment = yield Comment.findById(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }
        const existingLike = yield postStatModel_1.Like.findOne({ userId, postId: commentId });
        const existingHate = yield postStatModel_1.Hate.findOne({ userId, postId: commentId });
        if (existingHate) {
            // Remove hate
            yield postStatModel_1.Hate.deleteOne({ _id: existingHate._id });
            comment.hates = Math.max(0, (comment.hates || 0) - 1);
            yield comment.save();
            res.json({ message: 'Hate removed', hated: false, hates: comment.hates });
        }
        else {
            // Add hate
            yield postStatModel_1.Hate.create({ userId, postId: commentId });
            comment.hates = (comment.hates || 0) + 1;
            // If liked, remove like (mutual exclusivity)
            if (existingLike) {
                yield postStatModel_1.Like.deleteOne({ _id: existingLike._id });
                comment.likes = Math.max(0, (comment.likes || 0) - 1);
            }
            yield comment.save();
            res.json({
                message: 'Comment hated',
                hated: true,
                hates: comment.hates,
                liked: false,
                likes: comment.likes
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleExamCommentHate = toggleExamCommentHate;
// @desc    Toggle like on an exam post
// @route   POST /api/exams/posts/:postId/like
// @access  Private
const toggleExamPostLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { postId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const post = yield examPostModel_1.ExamPost.findById(postId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const existingLike = yield postStatModel_1.Like.findOne({ userId, postId });
        const existingHate = yield postStatModel_1.Hate.findOne({ userId, postId });
        if (existingLike) {
            yield postStatModel_1.Like.deleteOne({ _id: existingLike._id });
            post.likes = Math.max(0, (post.likes || 0) - 1);
            yield post.save();
            res.json({ message: 'Like removed', liked: false, likes: post.likes });
        }
        else {
            yield postStatModel_1.Like.create({ userId, postId });
            post.likes = (post.likes || 0) + 1;
            if (existingHate) {
                yield postStatModel_1.Hate.deleteOne({ _id: existingHate._id });
                post.hates = Math.max(0, (post.hates || 0) - 1);
            }
            yield post.save();
            res.json({
                message: 'Post liked',
                liked: true,
                likes: post.likes,
                hated: false,
                hates: post.hates
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleExamPostLike = toggleExamPostLike;
// @desc    Toggle hate on an exam post
// @route   POST /api/exams/posts/:postId/hate
// @access  Private
const toggleExamPostHate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { postId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const post = yield examPostModel_1.ExamPost.findById(postId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const existingLike = yield postStatModel_1.Like.findOne({ userId, postId });
        const existingHate = yield postStatModel_1.Hate.findOne({ userId, postId });
        if (existingHate) {
            yield postStatModel_1.Hate.deleteOne({ _id: existingHate._id });
            post.hates = Math.max(0, (post.hates || 0) - 1);
            yield post.save();
            res.json({ message: 'Hate removed', hated: false, hates: post.hates });
        }
        else {
            yield postStatModel_1.Hate.create({ userId, postId });
            post.hates = (post.hates || 0) + 1;
            if (existingLike) {
                yield postStatModel_1.Like.deleteOne({ _id: existingLike._id });
                post.likes = Math.max(0, (post.likes || 0) - 1);
            }
            yield post.save();
            res.json({
                message: 'Post hated',
                hated: true,
                hates: post.hates,
                liked: false,
                likes: post.likes
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleExamPostHate = toggleExamPostHate;
/**
 * @desc    Mark an exam post as read
 * @route   PUT /api/exams/posts/:postId/read
 * @access  Private/Staff
 */
const markExamPostAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postId } = req.params;
        const post = yield examPostModel_1.ExamPost.findByIdAndUpdate(postId, { read: true }, { new: true });
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        res.json(post);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.markExamPostAsRead = markExamPostAsRead;
