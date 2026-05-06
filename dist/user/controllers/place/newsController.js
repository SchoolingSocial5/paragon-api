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
exports.getNewsCategories = exports.getAllNewsStaff = exports.deleteMultipleNews = exports.deleteNews = exports.updateNews = exports.createNews = exports.deleteNewsComment = exports.createNewsComment = exports.getNewsComments = exports.getBookmarkedNews = exports.incrementNewsViews = exports.toggleNewsBookmark = exports.toggleNewsLike = exports.getNewsById = exports.getNews = void 0;
const newsModel_1 = __importDefault(require("../../../models/place/newsModel"));
const newsStatModel_1 = require("../../../models/place/newsStatModel");
const commentModel_1 = __importDefault(require("../../../models/post/commentModel"));
const postStatModel_1 = require("../../../models/post/postStatModel");
const sanitize_1 = require("../../../utils/sanitize");
// Helper to populate user interaction status
const populateUserInteractions = (news, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId)
        return news;
    const [likes, bookmarks] = yield Promise.all([
        newsStatModel_1.NewsLike.find({ userId, newsId: { $in: news.map(n => n._id) } }),
        newsStatModel_1.NewsBookmark.find({ userId, newsId: { $in: news.map(n => n._id) } })
    ]);
    const likedIds = new Set(likes.map(l => l.newsId.toString()));
    const bookmarkedIds = new Set(bookmarks.map(b => b.newsId.toString()));
    return news.map(n => {
        const obj = n.toObject();
        obj.liked = likedIds.has(n._id.toString());
        obj.bookmarked = bookmarkedIds.has(n._id.toString());
        return obj;
    });
});
const getNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { isFeatured, today, search, currentUserId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const userId = currentUserId || ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString());
        const filter = { isPublished: true };
        if (isFeatured === 'true') {
            filter.isFeatured = true;
        }
        if (today === 'true') {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            filter.createdAt = { $gte: yesterday };
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { subtitle: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        const news = yield newsModel_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const processedNews = yield populateUserInteractions(news, userId);
        res.json(processedNews);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getNews = getNews;
// @desc    Get single news
// @route   GET /api/news/:id
// @access  Public
const getNewsById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const newsId = req.params.id;
        const userId = req.query.currentUserId || ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString());
        const news = yield newsModel_1.default.findById(newsId);
        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }
        const newsObj = news.toObject();
        if (userId) {
            const [like, bookmark] = yield Promise.all([
                newsStatModel_1.NewsLike.findOne({ userId, newsId }),
                newsStatModel_1.NewsBookmark.findOne({ userId, newsId })
            ]);
            newsObj.liked = !!like;
            newsObj.bookmarked = !!bookmark;
        }
        res.json(newsObj);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getNewsById = getNewsById;
// @desc    Toggle like on news
// @route   POST /api/news/:id/like
// @access  Private
const toggleNewsLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newsId = req.params.id;
        const userId = req.user._id;
        const news = yield newsModel_1.default.findById(newsId);
        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }
        const existingLike = yield newsStatModel_1.NewsLike.findOne({ userId: userId, newsId: newsId });
        if (existingLike) {
            yield newsStatModel_1.NewsLike.deleteOne({ _id: existingLike._id });
            news.likes = Math.max(0, (news.likes || 1) - 1);
        }
        else {
            yield newsStatModel_1.NewsLike.create({ userId: userId, newsId: newsId });
            news.likes = (news.likes || 0) + 1;
        }
        yield news.save();
        res.json({ likes: news.likes, liked: !existingLike });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleNewsLike = toggleNewsLike;
// @desc    Toggle bookmark on news
// @route   POST /api/news/:id/bookmark
// @access  Private
const toggleNewsBookmark = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newsId = req.params.id;
        const userId = req.user._id;
        const news = yield newsModel_1.default.findById(newsId);
        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }
        const existingBookmark = yield newsStatModel_1.NewsBookmark.findOne({ userId: userId, newsId: newsId });
        if (existingBookmark) {
            yield newsStatModel_1.NewsBookmark.deleteOne({ _id: existingBookmark._id });
            news.bookmarks = Math.max(0, (news.bookmarks || 1) - 1);
        }
        else {
            yield newsStatModel_1.NewsBookmark.create({ userId: userId, newsId: newsId });
            news.bookmarks = (news.bookmarks || 0) + 1;
        }
        yield news.save();
        res.json({ bookmarks: news.bookmarks, bookmarked: !existingBookmark });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleNewsBookmark = toggleNewsBookmark;
// @desc    Increment news views
// @route   POST /api/news/:id/view
// @access  Private (tracked) / Public (logged if possible)
const incrementNewsViews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const newsId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const news = yield newsModel_1.default.findById(newsId);
        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }
        // Check for existing view to ensure uniqueness
        let existingView;
        if (userId) {
            existingView = yield newsStatModel_1.NewsView.findOne({ userId: userId, newsId: newsId });
        }
        else {
            existingView = yield newsStatModel_1.NewsView.findOne({ ip: ip, newsId: newsId });
        }
        if (!existingView) {
            // Record the unique view
            yield newsStatModel_1.NewsView.create({
                userId: userId ? userId : undefined,
                ip: userId ? undefined : ip,
                newsId: newsId
            });
            news.views = (news.views || 0) + 1;
            yield news.save();
        }
        res.json({ views: news.views });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.incrementNewsViews = incrementNewsViews;
// @desc    Get bookmarked news
// @route   GET /api/news/bookmarks
// @access  Private
const getBookmarkedNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = req.query.userId || ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        if (!userId) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        const bookmarks = yield newsStatModel_1.NewsBookmark.find({ userId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        if (bookmarks.length === 0) {
            res.json([]);
            return;
        }
        const newsIds = bookmarks.map(b => b.newsId);
        const news = yield newsModel_1.default.find({ _id: { $in: newsIds } });
        // Sort news to match bookmark order (latest bookmarked first)
        const sortedNews = newsIds.map(id => news.find(n => n._id.toString() === id.toString())).filter(Boolean);
        const processedNews = yield populateUserInteractions(sortedNews, userId);
        res.json(processedNews);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBookmarkedNews = getBookmarkedNews;
// --- Comment Controllers for News ---
// Helper to process comments with user interaction status
const processComments = (comments, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!currentUserId)
        return comments;
    const commentIds = comments.map(comment => comment._id.toString());
    // Batch find likes and hates for efficiency (reusing post stat models for comments)
    const [likes, hates] = yield Promise.all([
        postStatModel_1.Like.find({ userId: currentUserId, postId: { $in: commentIds } }),
        postStatModel_1.Hate.find({ userId: currentUserId, postId: { $in: commentIds } })
    ]);
    const likedSet = new Set(likes.map(l => l.postId.toString()));
    const hatedSet = new Set(hates.map(h => h.postId.toString()));
    return comments.map(comment => {
        const commentData = comment.toObject ? comment.toObject() : comment;
        return Object.assign(Object.assign({}, commentData), { liked: likedSet.has(commentData._id.toString()), hated: hatedSet.has(commentData._id.toString()) });
    });
});
// @desc    Get comments for a news article
// @route   GET /api/news/:id/comments
// @access  Public
const getNewsComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: newsId } = req.params;
        const level = parseInt(req.query.level) || 1;
        const parentId = req.query.parentId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const currentUserId = req.query.currentUserId;
        const skip = (page - 1) * limit;
        const query = { postId: newsId, level }; // We store newsId in postId field of Comment model
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
        const processedComments = yield processComments(comments, currentUserId);
        res.json(processedComments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getNewsComments = getNewsComments;
// @desc    Create a comment on a news article
// @route   POST /api/news/:id/comments
// @access  Private
const createNewsComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const newsId = req.params.id;
        const { content, media, commentId } = req.body;
        const user = req.user;
        if (!content) {
            res.status(400).json({ message: 'Content is required' });
            return;
        }
        const news = yield newsModel_1.default.findById(newsId);
        if (!news) {
            res.status(404).json({ message: 'News article not found' });
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
            postId: newsId, // newsId stored in postId field
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
        if (commentId) {
            yield commentModel_1.default.findByIdAndUpdate(commentId, { $inc: { replies: 1 } });
        }
        else {
            news.replies = (news.replies || 0) + 1;
            yield news.save();
        }
        res.status(201).json(comment);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createNewsComment = createNewsComment;
// @desc    Delete a news comment
// @route   DELETE /api/news/comments/:commentId
// @access  Private
const deleteNewsComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            yield commentModel_1.default.findByIdAndUpdate(comment.replyToId, { $inc: { replies: -1 } });
        }
        else {
            const news = yield newsModel_1.default.findById(comment.postId);
            if (news) {
                news.replies = Math.max(0, (news.replies || 0) - 1);
                yield news.save();
            }
        }
        yield commentModel_1.default.findByIdAndDelete(commentId);
        res.json({ message: 'Comment deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteNewsComment = deleteNewsComment;
// --- Staff/Admin Controllers for News ---
// @desc    Create a news article
// @route   POST /api/team/posts/news
// @access  Private/Staff
const createNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, content, author, authorPicture, bioUserDisplayName, priority, isPublished, state, country, tags, category, subtitle, source, isFeatured, isMain, picture, video, seoDescription } = req.body;
        const news = yield newsModel_1.default.create({
            title: (0, sanitize_1.xssClean)(title),
            content, // Content might have HTML if using an editor, sanitize carefully or trust staff
            author: (0, sanitize_1.xssClean)(author),
            authorPicture: (0, sanitize_1.xssClean)(authorPicture),
            bioUserDisplayName: (0, sanitize_1.xssClean)(bioUserDisplayName),
            priority,
            isPublished,
            publishedAt: isPublished ? new Date() : undefined,
            state: (0, sanitize_1.xssClean)(state),
            country: (0, sanitize_1.xssClean)(country),
            tags,
            category: (0, sanitize_1.xssClean)(category),
            subtitle: (0, sanitize_1.xssClean)(subtitle),
            source: (0, sanitize_1.xssClean)(source),
            isFeatured,
            isMain,
            picture,
            video,
            seoDescription: (0, sanitize_1.xssClean)(seoDescription)
        });
        res.status(201).json(news);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createNews = createNews;
// @desc    Update a news article
// @route   PUT /api/team/posts/news/:id
// @access  Private/Staff
const updateNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (updateData.title)
            updateData.title = (0, sanitize_1.xssClean)(updateData.title);
        if (updateData.author)
            updateData.author = (0, sanitize_1.xssClean)(updateData.author);
        const news = yield newsModel_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }
        res.json(news);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateNews = updateNews;
// @desc    Delete a news article
// @route   DELETE /api/team/posts/news/:id
// @access  Private/Staff
const deleteNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const news = yield newsModel_1.default.findByIdAndDelete(id);
        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }
        // Also delete stats and comments
        yield Promise.all([
            newsStatModel_1.NewsLike.deleteMany({ newsId: id }),
            newsStatModel_1.NewsBookmark.deleteMany({ newsId: id }),
            newsStatModel_1.NewsView.deleteMany({ newsId: id }),
            commentModel_1.default.deleteMany({ postId: id })
        ]);
        res.json({ message: 'News article and related data deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteNews = deleteNews;
// @desc    Delete multiple news articles
// @route   DELETE /api/team/posts/news/bulk
// @access  Private/Staff
const deleteMultipleNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ message: 'Invalid or empty IDs array' });
            return;
        }
        const result = yield newsModel_1.default.deleteMany({ _id: { $in: ids } });
        if (result.deletedCount === 0) {
            res.status(404).json({ message: 'No news found to delete' });
            return;
        }
        // Also delete stats and comments for all deleted news
        yield Promise.all([
            newsStatModel_1.NewsLike.deleteMany({ newsId: { $in: ids } }),
            newsStatModel_1.NewsBookmark.deleteMany({ newsId: { $in: ids } }),
            newsStatModel_1.NewsView.deleteMany({ newsId: { $in: ids } }),
            commentModel_1.default.deleteMany({ postId: { $in: ids } })
        ]);
        res.json({ message: `${result.deletedCount} news articles and related data deleted successfully` });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteMultipleNews = deleteMultipleNews;
// @desc    Get all news articles for staff management (including unpublished)
// @route   GET /api/team/posts/news
// @access  Private/Staff
const getAllNewsStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const total = yield newsModel_1.default.countDocuments({});
        const news = yield newsModel_1.default.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        res.json({
            news,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getAllNewsStaff = getAllNewsStaff;
// @desc    Get all unique news categories
// @route   GET /api/team/posts/news/categories
// @access  Private/Staff
const getNewsCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield newsModel_1.default.distinct('category');
        console.log('[API] Fetched unique categories:', categories);
        res.json(categories.filter(Boolean)); // Remove any null/empty categories
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getNewsCategories = getNewsCategories;
