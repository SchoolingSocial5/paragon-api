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
exports.submitContactForm = void 0;
const notificationHelper_1 = require("../../../utils/notificationHelper");
const helperEmail_1 = require("../../../utils/helperEmail");
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
/**
 * @desc    Submit contact form and create notification
 * @route   POST /api/support/contact
 * @access  Public
 */
const submitContactForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            res.status(400).json({ message: 'Please provide name, email, and message' });
            return;
        }
        if (message.length < 30) {
            res.status(400).json({ message: 'Support message must be at least 30 characters long' });
            return;
        }
        const receiverUsername = process.env.APP_USERNAME || 'Schooling';
        // Find staff user to get their email
        const staffUser = yield userModel_1.default.findOne({ username: receiverUsername });
        // 1. Send Company Notification to the team
        yield (0, notificationHelper_1.sendCompanyNotification)('contact', {
            name: name,
            email: email,
            content: message,
        });
        // 2. Send Email to the staff
        if (staffUser && staffUser.email) {
            yield (0, helperEmail_1.sendEmail)(name, // Sender Name
            staffUser.email, // Recipient Email (Staff)
            'contact', {
                email: email, // Sender Email placeholder
                content: message // Sender Message placeholder
            });
        }
        res.status(200).json({ status: 'success', message: 'Message sent successfully' });
    }
    catch (error) {
        console.error('Error in submitContactForm:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
exports.submitContactForm = submitContactForm;
