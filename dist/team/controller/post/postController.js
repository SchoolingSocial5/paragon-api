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
exports.getPostStats = exports.getPosts = void 0;
const postModel_1 = __importDefault(require("../../../models/post/postModel"));
// @desc    Get all posts for team dashboard
// @route   GET /api/team/posts
// @access  Private/Staff
const getPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield postModel_1.default.find({}).sort({ createdAt: -1 }).limit(100);
        res.json(posts);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPosts = getPosts;
// @desc    Get post statistics
// @route   GET /api/team/posts/stats
// @access  Private/Staff
const getPostStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalPosts = yield postModel_1.default.countDocuments({});
        res.json({ totalPosts });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPostStats = getPostStats;
