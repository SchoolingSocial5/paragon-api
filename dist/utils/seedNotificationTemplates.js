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
const notificationTemplateModel_1 = require("../models/messages/notificationTemplateModel");
const socialNotificationTemplateModel_1 = require("../models/messages/socialNotificationTemplateModel");
const companyNotificationTemplateModel_1 = require("../models/messages/companyNotificationTemplateModel");
// Load .env from the root of the api directory
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const seedNotificationTemplates = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is not defined in .env');
        }
        yield mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB for seeding notification templates...');
        const contactTemplateData = {
            name: 'contact',
            title: 'New Support Message from {{name}}',
            greetings: 'New Contact Request',
            content: 'Name: {{name}}\nEmail: {{email}}\n\n{{content}}',
        };
        // 1. Remove from Personal/Social Notification templates if it exists to avoid confusion
        yield notificationTemplateModel_1.NotificationTemplate.deleteOne({ name: 'contact' });
        yield socialNotificationTemplateModel_1.SocialNotificationTemplate.deleteOne({ name: 'contact' });
        console.log('Cleaned up personal/social notification templates for "contact".');
        // 2. Add to Company Notification templates
        const existingCompany = yield companyNotificationTemplateModel_1.CompanyNotificationTemplate.findOne({ name: 'contact' });
        if (existingCompany) {
            console.log('Company Template "contact" already exists. Updating...');
            yield companyNotificationTemplateModel_1.CompanyNotificationTemplate.findOneAndUpdate({ name: 'contact' }, Object.assign(Object.assign({}, contactTemplateData), { staffDisplayName: 'System' }));
        }
        else {
            yield companyNotificationTemplateModel_1.CompanyNotificationTemplate.create(Object.assign(Object.assign({}, contactTemplateData), { staffDisplayName: 'System' }));
            console.log('Company Template "contact" created successfully!');
        }
        yield mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB.');
    }
    catch (error) {
        console.error('Error seeding notification templates:', error);
        process.exit(1);
    }
});
seedNotificationTemplates();
