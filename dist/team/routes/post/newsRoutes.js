"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const newsController_1 = require("../../../user/controllers/place/newsController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect); // All routes here require authentication
router.get('/categories', newsController_1.getNewsCategories);
router.route('/')
    .get(newsController_1.getAllNewsStaff)
    .post(newsController_1.createNews);
router.delete('/bulk', newsController_1.deleteMultipleNews);
router.route('/:id')
    .put(newsController_1.updateNews)
    .delete(newsController_1.deleteNews);
exports.default = router;
