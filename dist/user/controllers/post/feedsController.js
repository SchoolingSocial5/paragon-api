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
exports.getHomeFeed = void 0;
const postModel_1 = __importDefault(require("../../../models/post/postModel"));
const Friend_1 = __importDefault(require("../../../models/chat/Friend"));
const interestModel_1 = __importDefault(require("../../../models/post/interestModel"));
const postStatModel_1 = require("../../../models/post/postStatModel");
const accountInterestModel_1 = __importDefault(require("../../../models/post/accountInterestModel"));
const muteModel_1 = require("../../../models/post/muteModel");
const blockModel_1 = require("../../../models/post/blockModel");
const followerModel_1 = require("../../../models/post/followerModel");
const postHelper_1 = require("./postHelper");
// Compound repost IDs (format: "{objectId}_rp_{repostId}") are synthetic feed keys
// and are not valid MongoDB ObjectIds. This extracts the base ObjectId so the value
// can be safely used in _id queries. Returns null for anything that can't be resolved.
const extractObjectId = (id) => {
    if (!id)
        return null;
    const str = id.toString();
    if (/^[a-f\d]{24}$/i.test(str))
        return str;
    const match = str.match(/^([a-f\d]{24})_rp_/i);
    return match ? match[1] : null;
};
/**
 * @desc    Get home feed posts (main algorithm)
 * @route   GET /api/posts (where no userId or username is provided)
 * @access  Public
 */
const getHomeFeed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const page = parseInt(req.query.page) || 1;
        const currentUserId = req.query.currentUserId || ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString());
        const userCountry = req.query.country || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.country);
        const LIMIT = 30;
        const skip = (page - 1) * LIMIT;
        // Base exclusion filter for Mutes/Blocks
        let excludedUserIds = [];
        let excludedPostIds = [];
        if (currentUserId) {
            const [mutes, incomingBlocks] = yield Promise.all([
                muteModel_1.Mute.find({ muterId: currentUserId }),
                blockModel_1.Block.find({ userId: currentUserId })
            ]);
            excludedUserIds = [
                ...mutes.map(m => { var _a; return (_a = m.userId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean),
                ...incomingBlocks.map(b => { var _a; return (_a = b.blockerId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean)
            ];
            excludedPostIds = mutes.map(m => { var _a; return (_a = m.postId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean);
            // Progressive View Filtering: Exclude posts the user has viewed multiple times
            // We use a threshold relative to the current page to allow some re-discovery but prevent stale feed
            const overViewedPosts = yield postStatModel_1.View.find({
                userId: currentUserId,
                count: { $gte: Math.max(2, page) }
            }).select('postId -_id').lean();
            const overViewedPostIds = overViewedPosts.map(v => { var _a; return (_a = v.postId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean);
            excludedPostIds.push(...overViewedPostIds);
        }
        excludedPostIds = [
            ...new Set(excludedPostIds
                .map(extractObjectId)
                .filter((id) => id !== null))
        ];
        const baseFilter = {
            replyToId: { $in: [null, undefined, ''] },
            userId: { $nin: excludedUserIds },
            _id: { $nin: excludedPostIds },
            isDraft: { $ne: true },
            status: { $ne: false }
        };
        const sharedFilter = { sharedPostId: { $exists: true, $ne: null } };
        const originalFilter = { sharedPostId: null };
        const pickCandidates = (userFilter_1, ...args_1) => __awaiter(void 0, [userFilter_1, ...args_1], void 0, function* (userFilter, limit = 2) {
            const posts = yield postModel_1.default.find(Object.assign(Object.assign({}, baseFilter), userFilter))
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
            return posts;
        });
        // --- COLLECT POOL FROM ALL STAGES ---
        // To ensure we can fulfill the 30-post requirement even with deduplication and pagination,
        // we fetch a larger pool from each stage.
        const POOL_LIMIT_PER_STAGE = 50;
        // Stage 0: Own
        let ownPosts = [];
        if (currentUserId) {
            ownPosts = yield pickCandidates({ userId: currentUserId }, 10);
        }
        // Stage 1 & 2: Social (Followers & Friends)
        let socialPosts = [];
        if (currentUserId) {
            const [following, friends] = yield Promise.all([
                followerModel_1.Follower.find({ followerId: currentUserId }).select('userId').limit(POOL_LIMIT_PER_STAGE).lean(),
                Friend_1.default.find({ senderUsername: (_d = req.user) === null || _d === void 0 ? void 0 : _d.username, isFriends: true }).select('username').limit(POOL_LIMIT_PER_STAGE).lean()
            ]);
            const followedIds = following.map(f => f.userId);
            const friendUsernames = friends.map(f => f.username);
            const [fPosts, frPosts] = yield Promise.all([
                postModel_1.default.find(Object.assign(Object.assign({}, baseFilter), { userId: { $in: followedIds } })).sort({ createdAt: -1 }).limit(POOL_LIMIT_PER_STAGE).lean(),
                postModel_1.default.find(Object.assign(Object.assign({}, baseFilter), { username: { $in: friendUsernames } })).sort({ createdAt: -1 }).limit(POOL_LIMIT_PER_STAGE).lean()
            ]);
            socialPosts = [...fPosts, ...frPosts];
        }
        // Stage 3 & 4: Geo & Trending
        const countryFilter = Object.assign({}, baseFilter);
        if (userCountry)
            countryFilter.country = userCountry;
        const [countryPosts, trendingPosts] = yield Promise.all([
            postModel_1.default.find(countryFilter).sort({ createdAt: -1, score: -1 }).limit(POOL_LIMIT_PER_STAGE).lean(),
            postModel_1.default.find(baseFilter).sort({ createdAt: -1, score: -1 }).limit(POOL_LIMIT_PER_STAGE).lean()
        ]);
        // Stage 5 & 6: Discovery (Interests & Interested Accounts)
        let discoveryPosts = [];
        if (currentUserId) {
            const [topInterests, topAccountInterests] = yield Promise.all([
                interestModel_1.default.find({ userId: currentUserId }).sort({ score: -1 }).limit(5).lean(),
                accountInterestModel_1.default.find({ userId: currentUserId }).sort({ score: -1 }).limit(5).lean()
            ]);
            const interestedUsernames = topAccountInterests.map(ai => ai.postUsername);
            const discPromises = [
                postModel_1.default.find(Object.assign(Object.assign({}, baseFilter), { username: { $in: interestedUsernames } })).sort({ createdAt: -1 }).limit(20).lean()
            ];
            // Content-based discovery (simplified for pool)
            if (topInterests.length > 0) {
                const keywords = topInterests.map(i => (i.contents || '').split(/\s+/).filter(w => w.length > 5)).flat().slice(0, 10);
                if (keywords.length > 0) {
                    const regex = new RegExp(keywords.join('|'), 'i');
                    discPromises.push(postModel_1.default.find(Object.assign(Object.assign({}, baseFilter), { content: { $regex: regex } })).sort({ createdAt: -1 }).limit(20).lean());
                }
            }
            const discResults = yield Promise.all(discPromises);
            discoveryPosts = discResults.flat();
        }
        // --- COMBINE, DEDUPLICATE AND PAGINATE ---
        const seenIds = new Set();
        const pool = [];
        [...ownPosts, ...socialPosts, ...countryPosts, ...trendingPosts, ...discoveryPosts].forEach(post => {
            const baseId = extractObjectId(post._id);
            if (baseId && !seenIds.has(baseId)) {
                seenIds.add(baseId);
                pool.push(post);
            }
        });
        // Sort pool by creation date to maintain chronological feel
        pool.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Slice the requested page
        const finalPosts = pool.slice(skip, skip + LIMIT);
        // If we don't have enough posts in the diverse pool (very high page number), 
        // fallback to a general fetch to ensure we reach 30 if possible.
        if (finalPosts.length < LIMIT) {
            const remaining = LIMIT - finalPosts.length;
            const fallbackPosts = yield postModel_1.default.find(Object.assign(Object.assign({}, baseFilter), { _id: { $nin: Array.from(seenIds) } }))
                .sort({ createdAt: -1 })
                .skip(Math.max(0, skip - pool.length + finalPosts.length))
                .limit(remaining)
                .lean();
            finalPosts.push(...fallbackPosts);
        }
        const processedPosts = yield (0, postHelper_1.processPosts)(finalPosts, currentUserId);
        res.json(processedPosts);
    }
    catch (error) {
        console.error('getHomeFeed Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.getHomeFeed = getHomeFeed;
