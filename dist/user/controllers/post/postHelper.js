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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPosts = void 0;
const postStatModel_1 = require("../../../models/post/postStatModel");
const repostModel_1 = require("../../../models/post/repostModel");
const followerModel_1 = require("../../../models/post/followerModel");
const muteModel_1 = require("../../../models/post/muteModel");
const blockModel_1 = require("../../../models/post/blockModel");
const pinPostModel_1 = require("../../../models/post/pinPostModel");
const s3_1 = require("../../../utils/s3");
const postHelper_1 = require("../../../utils/postHelper");
/**
 * Helper to map media keys to CloudFront URLs
 */
const deriveHlsFromSource = (source) => {
    if (!source)
        return '';
    const normalized = source.toString();
    if (normalized.endsWith('.m3u8'))
        return normalized;
    if (normalized.match(/\.(mp4|mov|avi|mkv)$/i)) {
        return normalized.replace(/\.(mp4|mov|avi|mkv)$/i, '') + '/master.m3u8';
    }
    return '';
};
const mapMedia = (media) => {
    if (!media)
        return [];
    return media.map(m => (Object.assign(Object.assign({}, m), { source: (0, s3_1.getCloudFrontUrl)(m.source), preview: m.preview ? (0, s3_1.getCloudFrontUrl)(m.preview) : undefined, hlsSource: m.hlsSource
            ? (0, s3_1.getCloudFrontUrl)(m.hlsSource)
            : (0, s3_1.getCloudFrontUrl)(deriveHlsFromSource(m.source)) })));
};
/**
 * Helper to process posts with user interaction status
 */
const processPosts = (posts, currentUserId, profileOwnerId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!currentUserId) {
        return posts.map(post => {
            const postData = post.toObject ? post.toObject() : post;
            return Object.assign(Object.assign({}, postData), { media: mapMedia(postData.media), sharedPost: postData.sharedPost ? Object.assign(Object.assign({}, postData.sharedPost), { media: mapMedia(postData.sharedPost.media) }) : undefined, picture: (0, s3_1.getCloudFrontUrl)(postData.picture), userMedia: (0, s3_1.getCloudFrontUrl)(postData.userMedia) });
        });
    }
    const postIds = yield Promise.all(posts.map(post => (0, postHelper_1.resolvePostId)(post._id.toString())));
    const authorIds = posts.map(post => { var _a, _b; return (_b = (post.userId || ((_a = post.sender) === null || _a === void 0 ? void 0 : _a._id) || post.sender)) === null || _b === void 0 ? void 0 : _b.toString(); }).filter(Boolean);
    // Batch find likes, bookmarks, views, reposts, follows, mutes, blocks, and pins for efficiency
    const [likes, bookmarks, views, reposts, follows, mutes, incomingBlocks, outgoingBlocks, viewerPins, profilePins] = yield Promise.all([
        postStatModel_1.Like.find({ userId: currentUserId, postId: { $in: postIds } }),
        postStatModel_1.Bookmark.find({ userId: currentUserId, postId: { $in: postIds } }),
        postStatModel_1.View.find({ userId: currentUserId, postId: { $in: postIds } }),
        repostModel_1.Repost.find({ userId: currentUserId, postId: { $in: postIds } }),
        followerModel_1.Follower.find({ followerId: currentUserId, userId: { $in: authorIds } }),
        muteModel_1.Mute.find({ muterId: currentUserId, userId: { $in: authorIds } }),
        blockModel_1.Block.find({ userId: currentUserId, blockerId: { $in: authorIds } }), // Blocks TARGETING me
        blockModel_1.Block.find({ blockerId: currentUserId, userId: { $in: authorIds } }), // Blocks CREATED BY me
        pinPostModel_1.Pin.find({ userId: currentUserId, postId: { $in: postIds } }),
        profileOwnerId ? pinPostModel_1.Pin.find({ userId: profileOwnerId.toString(), postId: { $in: postIds } }) : Promise.resolve([])
    ]);
    const likedSet = new Set(likes.map(l => l.postId.toString()));
    const bookmarkedSet = new Set(bookmarks.map(b => b.postId.toString()));
    const viewedSet = new Set(views.map(v => v.postId.toString()));
    const repostedSet = new Set(reposts.map(r => r.postId.toString()));
    const followedSet = new Set(follows.map(f => f.userId.toString()));
    const mutedSet = new Set(mutes.map(m => m.userId.toString()));
    const blockedMeSet = new Set(incomingBlocks.map(b => b.blockerId.toString()));
    const blockedByMeSet = new Set(outgoingBlocks.map(b => b.userId.toString()));
    const viewerPinnedSet = new Set(viewerPins.map(p => p.postId.toString()));
    const profilePinnedSet = new Set(profilePins.map(p => p.postId.toString()));
    const processed = posts
        .map(post => {
        var _a, _b, _c, _d, _e, _f;
        const postData = post.toObject ? post.toObject() : post;
        const authorId = (_b = (postData.userId || ((_a = postData.sender) === null || _a === void 0 ? void 0 : _a._id) || postData.sender)) === null || _b === void 0 ? void 0 : _b.toString();
        return Object.assign(Object.assign({}, postData), { media: mapMedia(postData.media), sharedPost: postData.sharedPost ? Object.assign(Object.assign({}, postData.sharedPost), { media: mapMedia(postData.sharedPost.media) }) : undefined, picture: (0, s3_1.getCloudFrontUrl)(postData.picture), userMedia: (0, s3_1.getCloudFrontUrl)(postData.userMedia), liked: likedSet.has(((_c = postData.originalPostId) === null || _c === void 0 ? void 0 : _c.toString()) || postIds[posts.indexOf(post)]), bookmarked: bookmarkedSet.has(((_d = postData.originalPostId) === null || _d === void 0 ? void 0 : _d.toString()) || postIds[posts.indexOf(post)]), viewed: viewedSet.has(((_e = postData.originalPostId) === null || _e === void 0 ? void 0 : _e.toString()) || postIds[posts.indexOf(post)]), hasReposted: repostedSet.has(((_f = postData.originalPostId) === null || _f === void 0 ? void 0 : _f.toString()) || postIds[posts.indexOf(post)]), followed: followedSet.has(authorId), muted: mutedSet.has(authorId), blocked: blockedByMeSet.has(authorId), blockedMe: blockedMeSet.has(authorId), isPinned: viewerPinnedSet.has(postIds[posts.indexOf(post)]), pinnedOnProfile: profilePinnedSet.has(postIds[posts.indexOf(post)]) });
    });
    const filtered = processed.filter(post => {
        const isMuted = post.muted;
        const isBlockedMe = post.blockedMe;
        return !isMuted && !isBlockedMe;
    });
    return filtered;
});
exports.processPosts = processPosts;
