"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.recalculateUserStats = void 0;
const mongoose = __importStar(require("mongoose"));
const userModel_1 = __importDefault(require("../models/user/userModel"));
const bioUserModel_1 = __importDefault(require("../models/user/bioUserModel"));
const followerModel_1 = require("../models/post/followerModel");
const visitorModel_1 = require("../models/user/visitorModel");
const postModel_1 = __importDefault(require("../models/post/postModel"));
/**
 * Helper to recalculate and sync user stats (followers, followings, visits) from actual records.
 * Returns the updated user object.
 */
const recalculateUserStats = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userIdStr = userId.toString();
        const userObjId = new mongoose.Types.ObjectId(userIdStr);
        const [followersCount, followingsCount, visitsCount, postCount, mediaCount] = yield Promise.all([
            followerModel_1.Follower.countDocuments({
                $or: [{ userId: userIdStr }, { userId: userObjId }]
            }),
            followerModel_1.Follower.countDocuments({
                $or: [{ followerId: userIdStr }, { followerId: userObjId }]
            }),
            visitorModel_1.Visitor.countDocuments({
                $or: [{ userId: userIdStr }, { userId: userObjId }]
            }),
            postModel_1.default.countDocuments({
                $and: [
                    { $or: [{ userId: userIdStr }, { userId: userObjId }] },
                    { $or: [{ replyToId: { $exists: false } }, { replyToId: null }, { replyToId: '' }] }
                ]
            }),
            postModel_1.default.countDocuments({
                $and: [
                    { $or: [{ userId: userIdStr }, { userId: userObjId }] },
                    { media: { $exists: true, $not: { $size: 0 } } }
                ]
            }),
        ]);
        const updatedUser = yield userModel_1.default.findByIdAndUpdate(userId, {
            followers: followersCount,
            followings: followingsCount,
            visits: visitsCount,
            posts: postCount,
            postMedia: mediaCount,
        }, { new: true }).lean();
        if (updatedUser && updatedUser.bioUserId) {
            const accountData = {
                userId: userIdStr,
                username: updatedUser.username,
                displayName: updatedUser.displayName,
                picture: updatedUser.picture || '',
                accountType: updatedUser.accountType || 'User',
                followers: followersCount,
                followings: followingsCount,
                posts: postCount,
                visits: visitsCount
            };
            // First try updating existing entry
            const bioUser = yield bioUserModel_1.default.findOneAndUpdate({ _id: updatedUser.bioUserId, "accounts.userId": userIdStr }, { $set: { "accounts.$": accountData } }, { new: true });
            // If not found (newly created account), push to array
            if (!bioUser) {
                yield bioUserModel_1.default.findByIdAndUpdate(updatedUser.bioUserId, { $addToSet: { accounts: accountData } });
            }
        }
        return updatedUser;
    }
    catch (error) {
        console.error(`Error recalculating stats for user ${userId}:`, error);
        return null;
    }
});
exports.recalculateUserStats = recalculateUserStats;
