"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const postController_1 = require("../../controllers/post/postController");
const postReactionController_1 = require("../../controllers/post/postReactionController");
const feedsController_1 = require("../../controllers/post/feedsController");
const commentController_1 = require("../../controllers/post/commentController");
const socialController_1 = require("../../controllers/post/socialController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/bookmarks', authMiddleware_1.protect, postController_1.getBookmarkedPosts);
router.get('/likes', postController_1.getUserLikedPosts);
router.get('/following', authMiddleware_1.protect, postController_1.getFollowingFeed);
router.get('/blocks', authMiddleware_1.protect, socialController_1.getBlocks);
router.get('/mutes', authMiddleware_1.protect, socialController_1.getMutes);
router.get('/:id', postController_1.getPostById);
router.get('/', authMiddleware_1.extractUser, (req, res, next) => {
    if (req.query.userId || req.query.username) {
        return (0, postController_1.getPosts)(req, res);
    }
    return (0, feedsController_1.getHomeFeed)(req, res);
});
router.post('/', authMiddleware_1.protect, postController_1.createPost);
router.post('/:id/like', authMiddleware_1.protect, postReactionController_1.toggleLike);
router.post('/:id/bookmark', authMiddleware_1.protect, postReactionController_1.toggleBookmark);
router.delete('/:id', authMiddleware_1.protect, postController_1.deletePost);
router.post('/:id/pin', authMiddleware_1.protect, postReactionController_1.togglePinPost);
router.post('/:id/report', authMiddleware_1.protect, postReactionController_1.reportPost);
router.post('/:id/view', authMiddleware_1.protect, postReactionController_1.recordView);
router.post('/:id/repost', authMiddleware_1.protect, postReactionController_1.toggleRepost);
router.post('/:id/share', authMiddleware_1.protect, postReactionController_1.recordShare);
router.post('/:id/share-to-feed', authMiddleware_1.protect, postReactionController_1.sharePostToFeed);
router.put('/:id/publish', authMiddleware_1.protect, postController_1.publishPost);
router.post('/:id/comment-click', authMiddleware_1.protect, postReactionController_1.recordCommentClick);
// Comments
router.get('/:postId/comments', authMiddleware_1.extractUser, commentController_1.getComments);
router.post('/:postId/comments', authMiddleware_1.protect, commentController_1.createComment);
router.delete('/comments/:commentId', authMiddleware_1.protect, commentController_1.deleteComment);
router.post('/comments/:commentId/like', authMiddleware_1.protect, commentController_1.toggleCommentLike);
router.post('/comments/:commentId/hate', authMiddleware_1.protect, commentController_1.toggleCommentHate);
exports.default = router;
