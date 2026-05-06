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
exports.hydrateReposts = hydrateReposts;
const postModel_1 = __importDefault(require("../../../models/post/postModel"));
function hydrateReposts(reposts) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!reposts || reposts.length === 0)
            return [];
        const originalPostIds = reposts.map(r => r.postId);
        const originalPosts = yield postModel_1.default.find({ _id: { $in: originalPostIds } });
        return reposts.map(repost => {
            const originalPost = originalPosts.find(p => p._id.toString() === repost.postId.toString());
            if (!originalPost)
                return null;
            return Object.assign(Object.assign({}, originalPost.toObject()), { _id: `${originalPost._id}_rp_${repost._id}`, originalPostId: originalPost._id, reposted: true, repostedBy: {
                    userId: repost.userId,
                    username: repost.username,
                    displayName: repost.displayName,
                    picture: repost.picture,
                    isVerified: repost.isVerified,
                    createdAt: repost.createdAt
                }, createdAt: repost.createdAt // Use repost time for sorting
             });
        }).filter(Boolean);
    });
}
