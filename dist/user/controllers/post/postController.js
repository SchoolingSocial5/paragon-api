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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishPost = exports.getFollowingFeed = exports.getPostById = exports.getUserLikedPosts = exports.getBookmarkedPosts = exports.deletePost = exports.createPost = exports.getPosts = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const postModel_1 = __importDefault(require("../../../models/post/postModel"));
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
const postStatModel_1 = require("../../../models/post/postStatModel");
const muteModel_1 = require("../../../models/post/muteModel");
const blockModel_1 = require("../../../models/post/blockModel");
const pinPostModel_1 = require("../../../models/post/pinPostModel");
const followerModel_1 = require("../../../models/post/followerModel");
const s3_1 = require("../../../utils/s3");
const postHelper_1 = require("./postHelper");
const feedHelper_1 = require("./feedHelper");
const sanitize_1 = require("../../../utils/sanitize");
const repostModel_1 = require("../../../models/post/repostModel");
const postHelper_2 = require("../../../utils/postHelper");
const mentionHelper_1 = require("../../../utils/mentionHelper");
const mediaProcessingService_1 = require("../../../services/mediaProcessingService");
// @desc    Get user profile posts (optionally filtered by type)
// @route   GET /api/posts?userId=... or GET /api/posts?username=...
// @access  Public
const getPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const currentUserId = req.query.currentUserId || ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString());
        const targetUserId = req.query.userId;
        const targetUsername = req.query.username;
        const type = req.query.type; // 'posts', 'replies', 'media', 'likes'
        const search = req.query.search;
        const skip = (page - 1) * limit;
        if (!targetUserId && !targetUsername) {
            res.status(400).json({ message: 'User ID or Username is required for this endpoint' });
            return;
        }
        const filter = {};
        if (search) {
            filter.content = { $regex: search, $options: 'i' };
        }
        const orConditions = [];
        if (targetUserId && mongoose_1.default.Types.ObjectId.isValid(targetUserId)) {
            orConditions.push({ userId: new mongoose_1.default.Types.ObjectId(targetUserId) });
            orConditions.push({ userId: targetUserId });
        }
        if (targetUsername) {
            orConditions.push({ username: { $regex: new RegExp(`^${targetUsername}$`, 'i') } });
            const targetUser = yield userModel_1.default.findOne({ username: { $regex: new RegExp(`^${targetUsername}$`, 'i') } });
            if (targetUser) {
                const actualId = targetUser._id;
                if (!orConditions.some(c => { var _a; return ((_a = c.userId) === null || _a === void 0 ? void 0 : _a.toString()) === actualId.toString(); })) {
                    orConditions.push({ userId: actualId });
                }
            }
        }
        // --- GLOBAL EXCLUSION FILTER (Mutes/Blocks) ---
        const exclusionFilter = {};
        if (currentUserId) {
            const [mutes, incomingBlocks] = yield Promise.all([
                muteModel_1.Mute.find({ muterId: currentUserId }),
                blockModel_1.Block.find({ userId: currentUserId })
            ]);
            const excludedUserIds = [
                ...mutes.map(m => { var _a; return (_a = m.userId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean),
                ...incomingBlocks.map(b => { var _a; return (_a = b.blockerId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean)
            ];
            if (excludedUserIds.length > 0) {
                exclusionFilter.userId = { $nin: excludedUserIds };
            }
            const excludedPostIds = mutes.map(m => { var _a; return (_a = m.postId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean);
            if (excludedPostIds.length > 0) {
                exclusionFilter._id = { $nin: excludedPostIds };
            }
        }
        // --- PROFILE AUTHORSHIP FILTER ---
        const authorshipFilter = orConditions.length > 0 ? { $or: orConditions } : {};
        // --- CONTENT TYPE FILTER ---
        const contentTypeFilter = {};
        if (type === 'media') {
            contentTypeFilter.media = { $exists: true, $not: { $size: 0 } };
        }
        else if (type === 'replies') {
            contentTypeFilter.replyToId = { $exists: true, $ne: null, $not: { $eq: '' } };
        }
        else if (type === 'posts') {
            contentTypeFilter.$or = [
                { replyToId: { $exists: false } },
                { replyToId: null },
                { replyToId: '' },
                { replyToId: { $exists: true, $eq: null } }
            ];
        }
        // --- ASSEMBLE FILTERS ---
        const baseFilter = Object.assign(Object.assign(Object.assign({}, exclusionFilter), contentTypeFilter), { isDraft: type === 'drafts' ? true : { $ne: true }, status: type === 'drafts' ? false : { $ne: false } });
        if (search) {
            baseFilter.$or = [
                { content: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { displayName: { $regex: search, $options: 'i' } }
            ];
        }
        // Full filter for normal feed
        const fullFilter = (Object.keys(baseFilter).length > 0 && Object.keys(authorshipFilter).length > 0)
            ? { $and: [baseFilter, authorshipFilter] }
            : Object.assign(Object.assign({}, baseFilter), authorshipFilter);
        // Logic for profile pins
        const targetUser = targetUsername ? yield userModel_1.default.findOne({ username: { $regex: new RegExp(`^${targetUsername}$`, 'i') } }) : null;
        const effectiveTargetId = targetUserId || ((_c = targetUser === null || targetUser === void 0 ? void 0 : targetUser._id) === null || _c === void 0 ? void 0 : _c.toString());
        let posts = [];
        if (effectiveTargetId && (type === 'posts' || !type)) {
            const pins = yield pinPostModel_1.Pin.find({ userId: effectiveTargetId }).sort({ createdAt: -1 });
            const pinnedPostIds = pins.map(p => p.postId);
            if (page === 1) {
                // Pinned posts query ignores authorshipFilter so they can show someone else's pinned post
                const [pinnedPosts, reposts] = yield Promise.all([
                    postModel_1.default.find(Object.assign({ _id: { $in: pinnedPostIds } }, baseFilter)).sort({ createdAt: -1 }),
                    repostModel_1.Repost.find(Object.assign(Object.assign({}, fullFilter), { _id: { $nin: pinnedPostIds } })).sort({ createdAt: -1 }).limit(limit)
                ]);
                const hydratedReposts = yield (0, feedHelper_1.hydrateReposts)(reposts);
                const sortedPinnedPosts = pinnedPostIds
                    .map(id => pinnedPosts.find(p => p._id.toString() === id.toString()))
                    .filter(Boolean);
                const regularPosts = yield postModel_1.default.find(Object.assign(Object.assign({}, fullFilter), { _id: { $nin: pinnedPostIds } }))
                    .sort({ createdAt: -1 })
                    .limit(Math.max(0, limit - sortedPinnedPosts.length));
                const combined = [...regularPosts.map(p => p.toObject()), ...hydratedReposts]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, Math.max(0, limit - sortedPinnedPosts.length));
                posts = [...sortedPinnedPosts.map(p => (p.toObject ? p.toObject() : p)), ...combined];
            }
            else {
                const skipRegular = Math.max(0, (page - 1) * limit - pinnedPostIds.length);
                const [regularPosts, reposts] = yield Promise.all([
                    postModel_1.default.find(Object.assign(Object.assign({}, fullFilter), { _id: { $nin: pinnedPostIds } }))
                        .sort({ createdAt: -1 })
                        .skip(skipRegular)
                        .limit(limit),
                    repostModel_1.Repost.find(Object.assign(Object.assign({}, fullFilter), { _id: { $nin: pinnedPostIds } }))
                        .sort({ createdAt: -1 })
                        .skip(skipRegular)
                        .limit(limit)
                ]);
                const hydratedReposts = yield (0, feedHelper_1.hydrateReposts)(reposts);
                posts = [...regularPosts.map(p => p.toObject()), ...hydratedReposts]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, limit);
            }
        }
        else {
            const [regularPosts, reposts] = yield Promise.all([
                postModel_1.default.find(fullFilter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                repostModel_1.Repost.find(fullFilter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
            ]);
            const hydratedReposts = yield (0, feedHelper_1.hydrateReposts)(reposts);
            posts = [...regularPosts.map(p => p.toObject()), ...hydratedReposts]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, limit);
        }
        const [processedPosts, total] = yield Promise.all([
            (0, postHelper_1.processPosts)(posts, currentUserId, effectiveTargetId),
            postModel_1.default.countDocuments(fullFilter)
        ]);
        res.json({ posts: processedPosts, total });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPosts = getPosts;
const createPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) || req.body.userId;
        if (!userId) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        const _d = req.body, { sender, to } = _d, rest = __rest(_d, ["sender", "to"]);
        const media = rest.media || [];
        const processedMedia = media.map((m) => {
            const source = m.source || m.src || m.url || '';
            return Object.assign(Object.assign({}, m), { source: source, type: m.type || 'image', preview: m.preview || source || '', hlsSource: m.hlsSource || m.hls || m.manifest || '' });
        });
        const postData = Object.assign(Object.assign({}, rest), { media: processedMedia, content: (0, sanitize_1.xssClean)(rest.content || ''), userId, isNews: rest.isNews === true || rest.isNews === 'true' || rest.sharedPostType === 'news', sharedPostType: rest.sharedPostType || (rest.isNews ? 'news' : 'post'), postType: to || rest.postType || 'post', 
            // Save denormalized fields from sender object if provided
            username: (sender === null || sender === void 0 ? void 0 : sender.username) || rest.username, displayName: (0, sanitize_1.xssClean)((sender === null || sender === void 0 ? void 0 : sender.displayName) || rest.displayName || ''), picture: (sender === null || sender === void 0 ? void 0 : sender.picture) || rest.picture, isVerified: (sender === null || sender === void 0 ? void 0 : sender.isVerified) !== undefined ? sender.isVerified : rest.isVerified, sender: userId, isDraft: rest.isDraft === true || rest.isDraft === 'true', status: !(rest.isDraft === true || rest.isDraft === 'true') });
        // Always fetch the author to get accountWeight and ensure identity fields are present
        const author = yield userModel_1.default.findById(userId).select('username displayName picture isVerified country accountWeight');
        if (author) {
            postData.username = postData.username || author.username;
            postData.displayName = postData.displayName || author.displayName;
            postData.picture = postData.picture || author.picture;
            postData.isVerified = (_c = postData.isVerified) !== null && _c !== void 0 ? _c : author.isVerified;
            postData.country = postData.country || author.country;
            postData.score = author.accountWeight || 1; // Set initial score from account weight
        }
        const post = yield postModel_1.default.create(postData);
        // Handle mentions
        if (postData.content) {
            (0, mentionHelper_1.handleMentions)(postData.content, String(post._id), {
                _id: userId,
                username: postData.username,
                displayName: postData.displayName,
                picture: postData.picture
            }).catch(err => console.error('Mention handling error:', err));
        }
        // If this is a repost/share in feed, increase the original post's score
        if (postData.sharedPostId) {
            try {
                const { updatePostScore } = yield Promise.resolve().then(() => __importStar(require('../../../utils/postHelper')));
                yield updatePostScore(String(postData.sharedPostId), 'repost', 1, userId, author === null || author === void 0 ? void 0 : author.username);
            }
            catch (scoreError) {
                console.error('Failed to update post score during repost:', scoreError);
            }
        }
        /*
        // LEGACY: Post score now set during creation via accountWeight
        const authorWithFollowers = await User.findById(userId).select('followers');
        if (authorWithFollowers) {
            const { updatePostScore } = await import('../../../utils/postHelper');
            await updatePostScore(String(post._id), 'creation', authorWithFollowers.followers || 0);
        }
        */
        // Kick off HLS transcoding for any video media that doesn't yet have an hlsSource.
        // Fire-and-forget — the mediaconvert-callback webhook updates hlsSource when done.
        for (const m of processedMedia) {
            if (m.type === 'video' && !m.hlsSource && m.source) {
                const key = m.source.includes('cloudfront.net/')
                    ? m.source.split('cloudfront.net/')[1]
                    : m.source.includes('amazonaws.com/')
                        ? m.source.split('amazonaws.com/')[1]
                        : m.source.startsWith('http') ? null : m.source;
                if (key && key.match(/\.(mp4|mov|avi|mkv)$/i)) {
                    mediaProcessingService_1.MediaProcessingService.processVideo(key).catch(err => console.error('[createPost] MediaConvert trigger failed:', err));
                }
            }
        }
        // Populate sender before returning
        const populatedPost = yield postModel_1.default.findById(post._id);
        res.status(201).json(populatedPost);
    }
    catch (error) {
        console.error('Create Post Error:', error);
        res.status(400).json({ message: error.message });
    }
});
exports.createPost = createPost;
// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const postId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const post = yield postModel_1.default.findById(postId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        // Check if user is the owner
        if (post.userId.toString() !== userId.toString()) {
            res.status(401).json({ message: 'User not authorized to delete this post' });
            return;
        }
        // Remove media from S3 if present
        if (post.media && post.media.length > 0) {
            for (const item of post.media) {
                try {
                    // Extract key from S3 URL
                    // Example: https://bucket.s3.region.amazonaws.com/folder/filename.jpg
                    const urlParts = item.source.split('.amazonaws.com/');
                    if (urlParts.length > 1) {
                        const key = urlParts[1];
                        yield (0, s3_1.deleteFromS3)(key);
                    }
                }
                catch (s3Error) {
                    console.error('Failed to delete media from S3 during post deletion:', s3Error);
                }
            }
        }
        yield postModel_1.default.deleteOne({ _id: postId });
        res.json({ message: 'Post removed' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deletePost = deletePost;
// @desc    Get bookmarked posts
// @route   GET /api/posts/bookmarks
// @access  Private
const getBookmarkedPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.query.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        if (!userId) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        const bookmarks = yield postStatModel_1.Bookmark.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        if (bookmarks.length === 0) {
            res.json([]);
            return;
        }
        // Fetch user's mutes and blocks to filter them out from the source
        const [mutes, incomingBlocks] = yield Promise.all([
            muteModel_1.Mute.find({ muterId: userId }),
            blockModel_1.Block.find({ userId })
        ]);
        const excludedUserIds = [
            ...mutes.map(m => { var _a; return (_a = m.userId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean),
            ...incomingBlocks.map(b => { var _a; return (_a = b.blockerId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean)
        ];
        const excludedUsernames = mutes.map(m => m.username).filter(Boolean);
        const excludedPostIds = mutes.map(m => { var _a; return (_a = m.postId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean);
        const postIds = bookmarks.map(b => b.postId);
        // Fetch posts and preserve order of bookmarks, applying exclusion filter
        const postFilter = { _id: { $in: postIds } };
        if (excludedUserIds.length > 0)
            postFilter.userId = { $nin: excludedUserIds };
        if (excludedUsernames.length > 0)
            postFilter.username = { $nin: excludedUsernames };
        // Combine $in and $nin for _id
        if (excludedPostIds.length > 0) {
            postFilter._id = { $in: postIds, $nin: excludedPostIds };
        }
        const posts = yield postModel_1.default.find(postFilter);
        // Sort posts to match bookmark order (latest bookmarked first)
        const sortedPosts = postIds.map(id => posts.find(p => p._id.toString() === id.toString())).filter(Boolean);
        const [processedPosts, total] = yield Promise.all([
            (0, postHelper_1.processPosts)(sortedPosts, userId),
            postStatModel_1.Bookmark.countDocuments({ userId })
        ]);
        res.json({ posts: processedPosts, total });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBookmarkedPosts = getBookmarkedPosts;
// @desc    Get liked posts by a user
// @route   GET /api/posts/likes
// @access  Public
const getUserLikedPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let userId = req.query.userId;
        const username = req.query.username;
        const currentUserId = req.query.currentUserId || userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        if (!userId && username) {
            const user = yield userModel_1.default.findOne({
                username: { $regex: new RegExp(`^${username}$`, 'i') }
            }).select('_id');
            if (user)
                userId = user._id.toString();
        }
        if (!userId) {
            res.status(400).json({ message: 'User ID or Username is required' });
            return;
        }
        const likes = yield postStatModel_1.Like.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        if (likes.length === 0) {
            res.json([]);
            return;
        }
        // Fetch user's mutes and blocks to filter them out from the source
        const [mutes, incomingBlocks] = yield Promise.all([
            muteModel_1.Mute.find({ muterId: currentUserId }),
            blockModel_1.Block.find({ userId: currentUserId })
        ]);
        const excludedUserIds = [
            ...mutes.map(m => { var _a; return (_a = m.userId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean),
            ...incomingBlocks.map(b => { var _a; return (_a = b.blockerId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean)
        ];
        const excludedUsernames = mutes.map(m => m.username).filter(Boolean);
        const excludedPostIds = mutes.map(m => { var _a; return (_a = m.postId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean);
        const postIds = likes.map(l => l.postId);
        const postFilter = { _id: { $in: postIds } };
        if (excludedUserIds.length > 0)
            postFilter.userId = { $nin: excludedUserIds };
        if (excludedUsernames.length > 0)
            postFilter.username = { $nin: excludedUsernames };
        // Combine $in and $nin for _id
        if (excludedPostIds.length > 0) {
            postFilter._id = { $in: postIds, $nin: excludedPostIds };
        }
        const posts = yield postModel_1.default.find(postFilter);
        // Sort posts to match like order
        const sortedPosts = postIds.map(id => posts.find(p => p._id.toString() === id.toString())).filter(Boolean);
        const [processedPosts, total] = yield Promise.all([
            (0, postHelper_1.processPosts)(sortedPosts, currentUserId),
            postStatModel_1.Like.countDocuments({ userId })
        ]);
        res.json({ posts: processedPosts, total });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUserLikedPosts = getUserLikedPosts;
// @desc    Get post by ID
// @route   GET /api/posts/:id
// @access  Public
const getPostById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const currentUserId = req.query.currentUserId;
        const resolvedId = yield (0, postHelper_2.resolvePostId)(id);
        const post = yield postModel_1.default.findById(resolvedId);
        if (!post || (post.isDraft && (!currentUserId || post.userId.toString() !== currentUserId.toString()))) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const processedPosts = yield (0, postHelper_1.processPosts)([post], currentUserId);
        if (processedPosts.length === 0) {
            res.status(404).json({ message: 'Post unavailable' });
            return;
        }
        res.json(processedPosts[0]);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPostById = getPostById;
/**
 * @desc    Get posts from accounts the user follows
 * @route   GET /api/posts/following
 * @access  Private
 */
const getFollowingFeed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const skip = (page - 1) * limit;
        if (!currentUserId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        // 1. Get IDs of accounts the user follows
        // Explicitly query Follower model for this user
        const following = yield followerModel_1.Follower.find({ followerId: currentUserId.toString() }).select('userId');
        const followedUserIds = following.map(f => f.userId).filter(Boolean);
        // Debug log to help identify why user sees posts if they follow no one
        if (followedUserIds.length === 0) {
            res.json([]);
            return;
        }
        // Convert to ObjectIds for strict MongoDB matching against Post.userId
        const followedObjectIds = followedUserIds
            .filter(id => mongoose_1.default.Types.ObjectId.isValid(id))
            .map(id => new mongoose_1.default.Types.ObjectId(id));
        // 2. Build filter
        // We only show posts WHERE userId is in the followed list
        const filter = {
            $and: [
                {
                    $or: [
                        { userId: { $in: followedUserIds } },
                        { userId: { $in: followedObjectIds } }
                    ]
                },
                { replyToId: { $in: [null, undefined, ''] } },
                { isDraft: false },
                { status: true }
            ]
        };
        const [mutes, incomingBlocks] = yield Promise.all([
            muteModel_1.Mute.find({ muterId: currentUserId }),
            blockModel_1.Block.find({ userId: currentUserId })
        ]);
        const excludedUserIds = [
            ...mutes.map(m => { var _a; return (_a = m.userId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean),
            ...incomingBlocks.map(b => { var _a; return (_a = b.blockerId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean)
        ];
        const excludedPostIds = mutes.map(m => { var _a; return (_a = m.postId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean);
        // Apply global mutes/blocks exclusion
        if (excludedUserIds.length > 0) {
            filter.$and.push({ userId: { $nin: excludedUserIds } });
        }
        if (excludedPostIds.length > 0) {
            filter.$and.push({ _id: { $nin: excludedPostIds } });
        }
        const [posts, reposts] = yield Promise.all([
            postModel_1.default.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            repostModel_1.Repost.find(Object.assign({}, filter))
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
        ]);
        const hydratedReposts = yield (0, feedHelper_1.hydrateReposts)(reposts);
        const combined = [...posts.map(p => p.toObject()), ...hydratedReposts]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
        const processedPosts = yield (0, postHelper_1.processPosts)(combined, currentUserId);
        res.json(processedPosts);
    }
    catch (error) {
        console.error('getFollowingFeed Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.getFollowingFeed = getFollowingFeed;
// @desc    Publish a drafted post
// @route   PUT /api/posts/:id/publish
// @access  Private
const publishPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const post = yield postModel_1.default.findById(id);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        if (post.userId.toString() !== userId.toString()) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        post.isDraft = false;
        post.status = true;
        post.createdAt = new Date();
        yield post.save();
        res.json(post);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.publishPost = publishPost;
