"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const newsController_1 = require("../../controllers/place/newsController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.extractUser, newsController_1.getNews);
router.get('/bookmarks', authMiddleware_1.protect, newsController_1.getBookmarkedNews);
router.get('/:id', authMiddleware_1.extractUser, newsController_1.getNewsById);
router.post('/:id/like', authMiddleware_1.protect, newsController_1.toggleNewsLike);
router.post('/:id/bookmark', authMiddleware_1.protect, newsController_1.toggleNewsBookmark);
router.post('/:id/view', authMiddleware_1.extractUser, newsController_1.incrementNewsViews);
// Comments
router.get('/:id/comments', authMiddleware_1.extractUser, newsController_1.getNewsComments);
router.post('/:id/comments', authMiddleware_1.protect, newsController_1.createNewsComment);
router.delete('/comments/:commentId', authMiddleware_1.protect, newsController_1.deleteNewsComment);
exports.default = router;
