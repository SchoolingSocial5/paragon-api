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
exports.deleteMomentMedia = exports.getMomentMediaLikes = exports.getMomentMediaViews = exports.getMomentMediaComments = exports.commentMomentMedia = exports.likeMomentMedia = exports.viewMomentMedia = exports.submitMoment = exports.createMoment = exports.getMyActiveMoment = exports.getMoments = void 0;
const s3_1 = require("../../../utils/s3");
const mongoose_1 = __importDefault(require("mongoose"));
const momentModel_1 = __importDefault(require("../../../models/post/momentModel"));
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
const momentStatModel_1 = require("../../../models/post/momentStatModel");
const sanitize_1 = require("../../../utils/sanitize");
const socket_1 = require("../../../socket");
const notificationHelper_1 = require("../../../utils/notificationHelper");
/** Emit a moment update via socket */
function emitMomentUpdate(event, moment, userId) {
    const io = (0, socket_1.getIO)();
    if (io) {
        io.emit('message', {
            event,
            data: moment,
            userId
        });
    }
}
/** Serialize a moment document for API responses.
 *  Handles interaction states (liked, isViewed) by checking separate stat collections. */
function serializeMoment(moment, requestUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        const obj = moment.toObject ? moment.toObject() : Object.assign({}, moment);
        const momentId = obj._id.toString();
        const mediaList = obj.media || [];
        // If requestUserId is provided, check interaction states for all media items in bulk
        let userLikes = new Set();
        let userViews = new Set();
        if (requestUserId) {
            const [likes, views] = yield Promise.all([
                momentStatModel_1.MomentLike.find({ userId: requestUserId.toString(), momentId: momentId }).select('index'),
                momentStatModel_1.MomentView.find({ userId: requestUserId.toString(), momentId: momentId }).select('index')
            ]);
            userLikes = new Set(likes.map(l => l.index));
            userViews = new Set(views.map(v => v.index));
        }
        obj.media = mediaList.map((m, index) => {
            return Object.assign(Object.assign({}, m), { src: (0, s3_1.getCloudFrontUrl)(m.src), preview: m.preview ? (0, s3_1.getCloudFrontUrl)(m.preview) : undefined, views: m.views || 0, likes: m.likes || 0, comments: m.comments || 0, liked: requestUserId ? userLikes.has(index) : false, isViewed: requestUserId ? userViews.has(index) : false });
        });
        obj.picture = (0, s3_1.getCloudFrontUrl)(obj.picture);
        return obj;
    });
}
// @desc    Get latest moments
// @route   GET /api/moments
// @access  Public
const getMoments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const limit = parseInt(req.query.limit) || 20;
        const requestUserId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString();
        const moments = yield momentModel_1.default.find()
            .sort({ createdAt: -1 })
            .limit(limit);
        const serializedMoments = yield Promise.all(moments.map(m => serializeMoment(m, requestUserId)));
        res.json(serializedMoments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMoments = getMoments;
// @desc    Get current user's active moment
// @route   GET /api/moments/mine
// @access  Private
const getMyActiveMoment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const moment = yield momentModel_1.default.findOne({ userId });
        if (!moment) {
            res.json(null);
            return;
        }
        res.json(yield serializeMoment(moment, userId === null || userId === void 0 ? void 0 : userId.toString()));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMyActiveMoment = getMyActiveMoment;
// @desc    Create a new moment
// @route   POST /api/moments
// @access  Private
const createMoment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || req.body.userId;
        const { media, username, displayName, picture } = req.body;
        const user = yield userModel_1.default.findById(userId).select('username displayName picture isVerified');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const finalUsername = username || user.username;
        const finalDisplayName = displayName || user.displayName;
        const finalPicture = picture || user.picture;
        const finalIsVerified = user.isVerified || false;
        const processedMedia = media.map((item) => (Object.assign(Object.assign({}, item), { createdAt: new Date(), views: 0, likes: 0, comments: 0 })));
        const moment = yield momentModel_1.default.findOneAndUpdate({ userId }, {
            $push: { media: { $each: processedMedia } },
            $set: {
                username: finalUsername,
                displayName: finalDisplayName,
                picture: finalPicture,
                isVerified: finalIsVerified
            }
        }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, rawResult: true });
        const serialized = moment.value ? yield serializeMoment(moment.value, userId === null || userId === void 0 ? void 0 : userId.toString()) : null;
        if (serialized) {
            emitMomentUpdate(((_b = moment.lastErrorObject) === null || _b === void 0 ? void 0 : _b.updatedExisting) ? 'moment_updated' : 'moment_added', serialized, userId === null || userId === void 0 ? void 0 : userId.toString());
        }
        res.status(201).json(serialized);
    }
    catch (error) {
        console.error('Create Moment Error:', error);
        res.status(400).json({ message: error.message });
    }
});
exports.createMoment = createMoment;
// @desc    Submit a new moment with multipart files (Metadata + Files)
// @route   POST /api/moments/submit
// @access  Private
const submitMoment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { username, displayName, picture } = req.body;
        const mediaMetadata = req.body.media ? JSON.parse(req.body.media) : [];
        const files = req.files;
        if (!mediaMetadata || mediaMetadata.length === 0) {
            res.status(400).json({ message: 'Media metadata is required' });
            return;
        }
        const processedMedia = yield Promise.all(mediaMetadata.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            let src = '';
            let preview = '';
            if (item.type !== 'text') {
                const fileIndex = item.fileIndex;
                const file = files[fileIndex];
                if (file) {
                    const folder = item.type === 'video' ? 'videos' : 'posts';
                    src = yield (0, s3_1.uploadBufferToS3)(file.buffer, file.originalname, file.mimetype, folder);
                }
                if (item.previewIndex !== undefined) {
                    const previewFile = files[item.previewIndex];
                    if (previewFile) {
                        preview = yield (0, s3_1.uploadBufferToS3)(previewFile.buffer, previewFile.originalname, previewFile.mimetype, 'thumbnails');
                    }
                }
                else if (item.type === 'video') {
                    preview = src;
                }
            }
            return {
                type: item.type,
                src: src || item.src || item.source || item.url || undefined,
                preview: preview || item.preview || item.source || item.url || undefined,
                content: item.content || '',
                backgroundColor: item.backgroundColor || '#da3986',
                duration: item.duration || 5,
                isViewed: false,
                createdAt: new Date(),
                views: 0,
                likes: 0,
                comments: 0,
                width: item.width,
                height: item.height
            };
        })));
        const user = yield userModel_1.default.findById(userId).select('username displayName picture isVerified');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const finalUsername = username || user.username;
        const finalDisplayName = displayName || user.displayName;
        const finalPicture = picture || user.picture;
        const finalIsVerified = user.isVerified || false;
        const moment = yield momentModel_1.default.findOneAndUpdate({ userId }, {
            $push: { media: { $each: processedMedia } },
            $set: {
                username: finalUsername,
                displayName: finalDisplayName,
                picture: finalPicture,
                isVerified: finalIsVerified
            }
        }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, rawResult: true });
        const serialized = moment.value ? yield serializeMoment(moment.value, userId === null || userId === void 0 ? void 0 : userId.toString()) : null;
        if (serialized) {
            emitMomentUpdate(((_b = moment.lastErrorObject) === null || _b === void 0 ? void 0 : _b.updatedExisting) ? 'moment_updated' : 'moment_added', serialized, userId === null || userId === void 0 ? void 0 : userId.toString());
        }
        res.status(201).json(serialized);
    }
    catch (error) {
        console.error('Submit Moment Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.submitMoment = submitMoment;
/** Helper to find a moment and the specific index of a media item. */
function findMomentAndMediaIndex(storyId, mediaId) {
    return __awaiter(this, void 0, void 0, function* () {
        const moment = storyId
            ? yield momentModel_1.default.findById(storyId)
            : yield momentModel_1.default.findOne({ 'media._id': new mongoose_1.default.Types.ObjectId(mediaId) });
        if (!moment)
            return { moment: null, index: -1 };
        const index = moment.media.findIndex((m) => m._id.toString() === mediaId);
        return { moment, index };
    });
}
// @desc    Record a view on a moment media item
// @route   POST /api/moments/:mediaId/view
// @access  Private
const viewMomentMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const mediaId = req.params.mediaId;
        const storyId = req.body.storyId;
        const { moment, index } = yield findMomentAndMediaIndex(storyId, mediaId);
        if (!moment || index === -1) {
            res.status(404).json({ message: 'Media not found' });
            return;
        }
        if (moment.userId.toString() === userId.toString()) {
            res.json({ message: 'Owner view not counted' });
            return;
        }
        // Check if already viewed in separate collection
        const alreadyViewed = yield momentStatModel_1.MomentView.findOne({ userId: userId.toString(), momentId: moment._id, index });
        if (alreadyViewed) {
            res.json({ message: 'Already viewed' });
            return;
        }
        // Atomic update: Record interaction and increment counter
        yield Promise.all([
            momentStatModel_1.MomentView.create({ userId: userId.toString(), momentId: moment._id, index }),
            momentModel_1.default.updateOne({ _id: moment._id, [`media.${index}._id`]: new mongoose_1.default.Types.ObjectId(mediaId) }, { $inc: { [`media.${index}.views`]: 1 } })
        ]);
        res.json({ message: 'View recorded' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.viewMomentMedia = viewMomentMedia;
// @desc    Toggle like on a moment media item
// @route   POST /api/moments/:mediaId/like
// @access  Private
const likeMomentMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const mediaId = req.params.mediaId;
        const storyId = req.body.storyId;
        const { moment, index } = yield findMomentAndMediaIndex(storyId, mediaId);
        if (!moment || index === -1) {
            res.status(404).json({ message: 'Media not found' });
            return;
        }
        const alreadyLiked = yield momentStatModel_1.MomentLike.findOne({ userId: userId.toString(), momentId: moment._id, index });
        if (alreadyLiked) {
            yield Promise.all([
                momentStatModel_1.MomentLike.deleteOne({ _id: alreadyLiked._id }),
                momentModel_1.default.updateOne({ _id: moment._id, [`media.${index}._id`]: new mongoose_1.default.Types.ObjectId(mediaId) }, { $inc: { [`media.${index}.likes`]: -1 } })
            ]);
            res.json({ liked: false });
        }
        else {
            yield Promise.all([
                momentStatModel_1.MomentLike.create({ userId: userId.toString(), momentId: moment._id, index }),
                momentModel_1.default.updateOne({ _id: moment._id, [`media.${index}._id`]: new mongoose_1.default.Types.ObjectId(mediaId) }, { $inc: { [`media.${index}.likes`]: 1 } })
            ]);
            res.json({ liked: true });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.likeMomentMedia = likeMomentMedia;
// @desc    Add a comment to a moment media item
// @route   POST /api/moments/:mediaId/comment
// @access  Private
const commentMomentMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const mediaId = req.params.mediaId;
        const { content, media: rawMedia, commentId } = req.body;
        const storyId = req.body.storyId;
        if (!(content === null || content === void 0 ? void 0 : content.trim())) {
            res.status(400).json({ message: 'Comment content is required' });
            return;
        }
        const user = yield userModel_1.default.findById(userId).select('username displayName picture isVerified');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const { moment, index } = yield findMomentAndMediaIndex(storyId, mediaId);
        if (!moment || index === -1) {
            res.status(404).json({ message: 'Moment not found' });
            return;
        }
        // Create comment in dedicated collection
        const comment = yield momentStatModel_1.MomentComment.create({
            userId,
            momentId: moment._id,
            index,
            content: (0, sanitize_1.xssClean)(content.trim()),
            displayName: (0, sanitize_1.xssClean)(user.displayName),
            username: user.username,
            picture: user.picture || '',
            isVerified: user.isVerified || false,
        });
        // Increment count in main document
        yield momentModel_1.default.updateOne({ _id: moment._id, [`media.${index}._id`]: new mongoose_1.default.Types.ObjectId(mediaId) }, { $inc: { [`media.${index}.comments`]: 1 } });
        // Notify moment owner
        if (moment.username !== user.username) {
            try {
                yield (0, notificationHelper_1.sendNotification)(moment.displayName || moment.username || "", moment.username || "", 'user_comment', { username: user.username }, user.picture || '', mediaId, moment._id.toString());
            }
            catch (notifError) {
                console.error('[commentMomentMedia] Failed to send notification:', notifError);
            }
        }
        res.status(201).json(comment);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.commentMomentMedia = commentMomentMedia;
// @desc    Get comments for a moment media item
// @route   GET /api/moments/:mediaId/comments
// @access  Public
const getMomentMediaComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mediaId = req.params.mediaId;
        const storyId = req.query.storyId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { moment, index } = yield findMomentAndMediaIndex(storyId, mediaId);
        if (!moment || index === -1) {
            res.status(404).json({ message: 'Media not found' });
            return;
        }
        const comments = yield momentStatModel_1.MomentComment.find({ momentId: moment._id, index })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMomentMediaComments = getMomentMediaComments;
// @desc    Get views for a moment media item
// @route   GET /api/moments/:mediaId/views
// @access  Private
const getMomentMediaViews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mediaId = req.params.mediaId;
        const storyId = req.query.storyId;
        const { moment, index } = yield findMomentAndMediaIndex(storyId, mediaId);
        if (!moment || index === -1) {
            res.status(404).json({ message: 'Media not found' });
            return;
        }
        const views = yield momentStatModel_1.MomentView.find({ momentId: moment._id, index }).select('userId').lean();
        if (!views.length) {
            res.json([]);
            return;
        }
        const userIds = views.map(v => v.userId);
        const users = yield userModel_1.default.find({ _id: { $in: userIds } }).select('username displayName picture').lean();
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMomentMediaViews = getMomentMediaViews;
// @desc    Get likes for a moment media item
// @route   GET /api/moments/:mediaId/likes
// @access  Public
const getMomentMediaLikes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mediaId = req.params.mediaId;
        const storyId = req.query.storyId;
        const { moment, index } = yield findMomentAndMediaIndex(storyId, mediaId);
        if (!moment || index === -1) {
            res.status(404).json({ message: 'Media not found' });
            return;
        }
        const likes = yield momentStatModel_1.MomentLike.find({ momentId: moment._id, index }).select('userId').lean();
        if (!likes.length) {
            res.json([]);
            return;
        }
        const userIds = likes.map(l => l.userId);
        const users = yield userModel_1.default.find({ _id: { $in: userIds } }).select('username displayName picture').lean();
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMomentMediaLikes = getMomentMediaLikes;
// @desc    Delete a specific media from a moment
// @route   DELETE /api/moments/:mediaId
// @access  Private
const deleteMomentMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { mediaId } = req.params;
        const moment = yield momentModel_1.default.findOne({ userId });
        if (!moment) {
            res.status(404).json({ message: 'Moment not found' });
            return;
        }
        const index = moment.media.findIndex((m) => m._id.toString() === mediaId);
        if (index === -1) {
            res.status(404).json({ message: 'Media item not found' });
            return;
        }
        const itemToDelete = moment.media[index];
        // 1. Delete from S3
        const extractKey = (url) => {
            if (!url || !url.includes('.amazonaws.com/'))
                return null;
            return url.split('.amazonaws.com/')[1];
        };
        try {
            const mainKey = extractKey(itemToDelete.src);
            if (mainKey)
                yield (0, s3_1.deleteFromS3)(mainKey);
            const previewKey = extractKey(itemToDelete.preview);
            if (previewKey && previewKey !== mainKey)
                yield (0, s3_1.deleteFromS3)(previewKey);
        }
        catch (s3Error) {
            console.error('S3 Delete Error:', s3Error);
        }
        // 2. Cleanup stats for this specific media item
        // Note: Because we use index, deleting an item shifts indices of subsequent items.
        // This is a known limitation of using array indices for stats.
        yield Promise.all([
            momentStatModel_1.MomentLike.deleteMany({ momentId: moment._id, index }),
            momentStatModel_1.MomentView.deleteMany({ momentId: moment._id, index }),
            momentStatModel_1.MomentComment.deleteMany({ momentId: moment._id, index })
        ]);
        // 3. Filter out the media by ID
        moment.media = moment.media.filter((m) => m._id.toString() !== mediaId);
        if (moment.media.length === 0) {
            yield momentModel_1.default.deleteOne({ userId });
            res.json({ message: 'Moment deleted successfully' });
        }
        else {
            yield moment.save();
            res.json(moment);
        }
    }
    catch (error) {
        console.error('Delete Moment Media Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.deleteMomentMedia = deleteMomentMedia;
