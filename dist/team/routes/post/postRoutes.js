"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const postController_1 = require("../../controller/post/postController");
const router = express_1.default.Router();
router.get('/', postController_1.getPosts);
router.get('/stats', postController_1.getPostStats);
exports.default = router;
