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
exports.handleMentions = void 0;
const userModel_1 = __importDefault(require("../models/user/userModel"));
const notificationHelper_1 = require("./notificationHelper");
/**
 * Extracts mentions from content and sends notifications to mentioned users.
 * @param content The text content to search for mentions (e.g., @username)
 * @param postId The ID of the post where the mention occurred
 * @param senderUser The user object of the person who made the post/comment
 */
const handleMentions = (content, postId, senderUser) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!content)
            return;
        // Regex to find @username (usernames can contain letters, numbers, underscores, and dots)
        // We ensure it starts with @ and is followed by at least 3 characters
        const mentionRegex = /@([a-zA-Z0-9_.]+)/g;
        const matches = content.matchAll(mentionRegex);
        const uniqueUsernames = new Set();
        for (const match of matches) {
            const username = match[1].toLowerCase();
            // Don't notify the sender themselves
            if (username !== senderUser.username.toLowerCase()) {
                uniqueUsernames.add(username);
            }
        }
        if (uniqueUsernames.size === 0)
            return;
        // Fetch users to verify they exist and get their display names
        const mentionedUsers = yield userModel_1.default.find({
            username: { $in: Array.from(uniqueUsernames) }
        }).select('username displayName picture');
        for (const recipient of mentionedUsers) {
            try {
                yield (0, notificationHelper_1.sendNotification)(recipient.displayName || recipient.username, recipient.username, 'mention', { username: senderUser.username }, senderUser.picture || "", postId, // routeValue
                postId, // postId
                senderUser.username // reactingUsername
                );
            }
            catch (notifError) {
                console.error(`[handleMentions] Failed to notify @${recipient.username}:`, notifError);
            }
        }
    }
    catch (err) {
        console.error('[handleMentions] Error processing mentions:', err);
    }
});
exports.handleMentions = handleMentions;
