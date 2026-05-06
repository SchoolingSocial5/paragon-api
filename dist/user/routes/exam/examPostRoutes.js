"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const examPostController_1 = require("../../controllers/exam/examPostController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, examPostController_1.getExamPosts);
router.get('/exam/:examId', examPostController_1.getExamPostsByExamId);
router.post('/', authMiddleware_1.protect, examPostController_1.createExamPost);
router.post('/:postId/like', authMiddleware_1.protect, examPostController_1.toggleExamPostLike);
router.post('/:postId/hate', authMiddleware_1.protect, examPostController_1.toggleExamPostHate);
router.put('/:postId/read', authMiddleware_1.protect, examPostController_1.markExamPostAsRead);
// Comments
router.get('/:postId/comments', examPostController_1.getExamPostComments);
router.post('/:postId/comments', authMiddleware_1.protect, examPostController_1.createExamPostComment);
router.delete('/:postId/comments/:commentId', authMiddleware_1.protect, examPostController_1.deleteExamPostComment);
router.post('/comments/:commentId/like', authMiddleware_1.protect, examPostController_1.toggleExamCommentLike);
router.post('/comments/:commentId/hate', authMiddleware_1.protect, examPostController_1.toggleExamCommentHate);
exports.default = router;
