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
const emailModel_1 = require("../models/messages/emailModel");
// Load .env
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const seedEmailTemplates = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');
        const welcomeTemplate = {
            name: 'welcome',
            title: 'Welcome to Schooling, {{name}}!',
            greetings: 'Hello {{name}},',
            content: 'We are thrilled to have you join Schooling! Your account has been successfully created. Explore our features and connect with other students.\n\nBest regards,\nThe Schooling Team',
            sendable: true
        };
        const contactTemplate = {
            name: 'contact',
            title: 'New Support Message',
            greetings: 'Dear Admin',
            content: 'Name: {{name}}\nEmail: {{email}}\n\n{{content}}',
            sendable: true
        };
        const templates = [welcomeTemplate, contactTemplate];
        for (const template of templates) {
            const existing = yield emailModel_1.Email.findOne({ name: template.name });
            if (existing) {
                console.log(`${template.name} template already exists. Updating...`);
                yield emailModel_1.Email.findOneAndUpdate({ name: template.name }, template);
            }
            else {
                yield emailModel_1.Email.create(template);
                console.log(`${template.name} email template seeded successfully!`);
            }
        }
        yield mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB.');
    }
    catch (error) {
        console.error('Error seeding email templates:', error);
        process.exit(1);
    }
});
seedEmailTemplates();
