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
exports.updatePostScore = exports.resolvePostId = void 0;
const postModel_1 = __importDefault(require("../models/post/postModel"));
const interestModel_1 = __importDefault(require("../models/post/interestModel"));
const accountInterestModel_1 = __importDefault(require("../models/post/accountInterestModel"));
const repostModel_1 = require("../models/post/repostModel");
/**
 * Resolves a potentially virtual Post ID (like from a repost) to its actual Post ObjectId string.
 * Supports the format: {originalPostId}_rp_{repostId}
 * Fallback: {repostId}_repost (requires DB lookup)
 */
const resolvePostId = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!id)
        return id;
    // New format: originalPostId_rp_repostId
    if (id.includes('_rp_')) {
        return id.split('_rp_')[0];
    }
    // Legacy format: repostId_repost
    if (id.endsWith('_repost')) {
        const repostId = id.split('_repost')[0];
        try {
            const repost = yield repostModel_1.Repost.findById(repostId);
            if (repost)
                return String(repost.postId);
        }
        catch (e) {
            console.error(`[resolvePostId] Failed to resolve legacy repost ID ${id}:`, e);
        }
    }
    return id;
});
exports.resolvePostId = resolvePostId;
/**
 * Updates the post's ranking score and user interest record based on interactions.
 *
 * Weights:
 * - Creation: 0.1 per author follower
 * - Like: 2 points
 * - Bookmark: 5 points
 * - Share: 10 points
 * - Repost: 10 points
 * - Comment: 3 points
 * - View: 1 point
 * - Comment Click: 2 points
 *
 * @param postId ID of the post to update
 * @param type Interaction type
 * @param value Change value (e.g., follower count for creation, 1 for add, -1 for remove)
 * @param userId Optional user ID for interest tracking
 * @param username Optional username for interest tracking
 */
const updatePostScore = (postId_1, type_1, ...args_1) => __awaiter(void 0, [postId_1, type_1, ...args_1], void 0, function* (postId, type, value = 1, userId, username) {
    try {
        const weights = {
            creation: 0.1,
            like: 2,
            bookmark: 5,
            share: 10,
            repost: 10,
            comment: 3,
            view: 1,
            comment_click: 2
        };
        let scoreDelta = 0;
        if (type === 'creation') {
            scoreDelta = value * weights.creation;
        }
        else {
            scoreDelta = value * weights[type];
        }
        if (scoreDelta === 0)
            return;
        const resolvedId = yield (0, exports.resolvePostId)(postId);
        // 1. Update global post score
        yield postModel_1.default.findByIdAndUpdate(resolvedId, { $inc: { score: scoreDelta } });
        // 2. Update user-specific interest if context provided
        if (userId && username && type !== 'creation') {
            yield Promise.all([
                updateUserInterest(postId, userId, username, type, value, weights),
                updateAccountInterest(postId, userId, username, type, value, weights)
            ]);
        }
    }
    catch (error) {
        console.error(`[updatePostScore] Error updating score for post ${postId}:`, error);
    }
});
exports.updatePostScore = updatePostScore;
/**
 * Updates or creates a user's interest record for a specific post.
 */
const updateUserInterest = (postId, userId, username, type, value, weights) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const interestDelta = value * weights[type];
        if (interestDelta === 0)
            return;
        const resolvedId = yield (0, exports.resolvePostId)(postId);
        // We need the post content for the first record
        const post = yield postModel_1.default.findById(resolvedId).select('content');
        if (!post)
            return;
        yield interestModel_1.default.findOneAndUpdate({ userId, postId: resolvedId }, {
            $inc: { score: interestDelta },
            $set: {
                username,
                contents: post.content || ''
            }
        }, { upsert: true, new: true });
    }
    catch (error) {
        console.error(`[updateUserInterest] Error for user ${userId} on post ${postId}:`, error);
    }
});
/**
 * Updates or creates a user's interest record for a specific author (account).
 */
const updateAccountInterest = (postId, userId, username, type, value, weights) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const interestDelta = value * weights[type];
        if (interestDelta === 0)
            return;
        const resolvedId = yield (0, exports.resolvePostId)(postId);
        // We need the post author (postUsername)
        const post = yield postModel_1.default.findById(resolvedId).select('username');
        if (!post || !post.username)
            return;
        yield accountInterestModel_1.default.findOneAndUpdate({ userId, postUsername: post.username }, {
            $inc: { score: interestDelta },
            $set: {
                username
            }
        }, { upsert: true, new: true });
    }
    catch (error) {
        console.error(`[updateAccountInterest] Error for user ${userId} on account ${postId}:`, error);
    }
});
