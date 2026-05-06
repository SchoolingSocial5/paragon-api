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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const socialNotificationTemplateModel_1 = require("../models/messages/socialNotificationTemplateModel");
// Load .env from the root of the api directory
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const templates = [
    {
        name: 'user_comment',
        title: 'New Comment',
        greetings: 'New Interaction',
        content: '{{username}} has commented on your post, click here to see your post comments.',
    },
    {
        name: 'user_reply',
        title: 'New Reply',
        greetings: 'New Interaction',
        content: '{{username}} has replied to your comment, click here to see your post comments.',
    },
    {
        name: 'liked_post',
        title: 'New Like',
        greetings: 'New Interaction',
        content: '{{username}} has liked your post, click to see the number of likes to your post.',
    },
    {
        name: 'bookmarked_post',
        title: 'New Bookmark',
        greetings: 'New Interaction',
        content: '{{username}} has bookmarked your post, click here to see the post.',
    },
    {
        name: 'like_comment',
        title: 'New Like on Comment',
        greetings: 'New Interaction',
        content: '{{username}} liked your comment.',
    },
    {
        name: 'mention',
        title: 'You were mentioned',
        greetings: 'New Mention',
        content: '{{username}} mentioned you in a post.',
    },
    {
        name: 'follow',
        title: 'New Follower',
        greetings: 'Social Update',
        content: '{{username}} started following you.',
    },
    {
        name: 'follow_post',
        title: 'New Follower from Post',
        greetings: 'Social Update',
        content: '{{username}} followed you from a post you made, click here to see the post.',
    }
];
const seedSocialNotifications = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is not defined in .env');
        }
        yield mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB for seeding social notification templates...');
        for (const templateData of templates) {
            yield socialNotificationTemplateModel_1.SocialNotificationTemplate.findOneAndUpdate({ name: templateData.name }, templateData, { upsert: true, new: true });
            console.log(`Seeded/Updated template: ${templateData.name}`);
        }
        // Cleanup old template names if they exist
        yield socialNotificationTemplateModel_1.SocialNotificationTemplate.deleteOne({ name: 'reply_comment' });
        yield socialNotificationTemplateModel_1.SocialNotificationTemplate.deleteOne({ name: 'like_post' });
        console.log('Cleaned up old templates.');
        yield mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB.');
    }
    catch (error) {
        console.error('Error seeding social notification templates:', error);
        process.exit(1);
    }
});
seedSocialNotifications();
