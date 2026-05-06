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
exports.bulkDeleteNotificationTemplates = exports.bulkDeleteSocialNotificationTemplates = exports.bulkDeleteCompanyNotifications = exports.deleteCompanyNotification = exports.markCompanyNotificationAsRead = exports.getCompanyNotifications = exports.sendBulkEmail = exports.deleteSms = exports.updateSms = exports.createSms = exports.getSms = exports.deleteSocialNotificationTemplate = exports.updateSocialNotificationTemplate = exports.createSocialNotificationTemplate = exports.getSocialNotificationTemplates = exports.deleteNotificationTemplate = exports.updateNotificationTemplate = exports.createNotificationTemplate = exports.getNotificationTemplates = exports.deleteEmail = exports.updateEmail = exports.createEmail = exports.getMessagingStats = exports.getEmails = exports.deleteCompanyNotificationTemplate = exports.updateCompanyNotificationTemplate = exports.createCompanyNotificationTemplate = exports.getCompanyNotificationTemplates = void 0;
const emailModel_1 = require("../../../models/messages/emailModel");
const notificationTemplateModel_1 = require("../../../models/messages/notificationTemplateModel");
const socialNotificationTemplateModel_1 = require("../../../models/messages/socialNotificationTemplateModel");
const companyNotificationTemplateModel_1 = require("../../../models/messages/companyNotificationTemplateModel");
const companyNotificationModel_1 = require("../../../models/messages/companyNotificationModel");
const smsModel_1 = require("../../../models/messages/smsModel");
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
const helperEmail_1 = require("../../../utils/helperEmail");
// @desc    Get all company notification templates with pagination and search
// @route   GET /api/team/messaging/company-notifications-temp
// @access  Private/Staff
const getCompanyNotificationTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        const count = yield companyNotificationTemplateModel_1.CompanyNotificationTemplate.countDocuments(query);
        const templates = yield companyNotificationTemplateModel_1.CompanyNotificationTemplate.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1));
        res.json({
            templates,
            total: count,
            pages: Math.ceil(count / limit),
            currentPage: page
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getCompanyNotificationTemplates = getCompanyNotificationTemplates;
// @desc    Create a new company notification template
// @route   POST /api/team/messaging/company-notifications-temp
// @access  Private/Staff
const createCompanyNotificationTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = req.user;
        const staffDisplayName = (staff === null || staff === void 0 ? void 0 : staff.displayName) || (staff === null || staff === void 0 ? void 0 : staff.username) || '';
        const template = new companyNotificationTemplateModel_1.CompanyNotificationTemplate(Object.assign(Object.assign({}, req.body), { staffDisplayName }));
        yield template.save();
        res.status(201).json(template);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createCompanyNotificationTemplate = createCompanyNotificationTemplate;
// @desc    Update a company notification template
// @route   PATCH /api/team/messaging/company-notifications-temp/:id
// @access  Private/Staff
const updateCompanyNotificationTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = req.user;
        const staffDisplayName = (staff === null || staff === void 0 ? void 0 : staff.displayName) || (staff === null || staff === void 0 ? void 0 : staff.username) || '';
        const template = yield companyNotificationTemplateModel_1.CompanyNotificationTemplate.findByIdAndUpdate(req.params.id, Object.assign(Object.assign({}, req.body), { staffDisplayName }), { new: true });
        if (!template) {
            return res.status(404).json({ message: 'Company notification template not found' });
        }
        res.json(template);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateCompanyNotificationTemplate = updateCompanyNotificationTemplate;
// @desc    Delete a company notification template
// @route   DELETE /api/team/messaging/company-notifications-temp/:id
// @access  Private/Staff
const deleteCompanyNotificationTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const template = yield companyNotificationTemplateModel_1.CompanyNotificationTemplate.findByIdAndDelete(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Company notification template not found' });
        }
        res.json({ message: 'Company notification template deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteCompanyNotificationTemplate = deleteCompanyNotificationTemplate;
// @desc    Get all emails with pagination and search
// @route   GET /api/team/messaging/emails
// @access  Private/Staff
const getEmails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        const count = yield emailModel_1.Email.countDocuments(query);
        const emails = yield emailModel_1.Email.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1));
        res.json({
            emails,
            total: count,
            pages: Math.ceil(count / limit),
            currentPage: page
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getEmails = getEmails;
// @desc    Get generic stats for messaging (placeholder)
// @route   GET /api/team/messaging/stats
// @access  Private/Staff
const getMessagingStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalEmails = yield emailModel_1.Email.countDocuments();
        res.json({ totalEmails });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMessagingStats = getMessagingStats;
// @desc    Create a new email template
// @route   POST /api/team/messaging/emails
// @access  Private/Staff
const createEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = new emailModel_1.Email(req.body);
        yield email.save();
        res.status(201).json(email);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createEmail = createEmail;
// @desc    Update an email template
// @route   PATCH /api/team/messaging/emails/:id
// @access  Private/Staff
const updateEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = yield emailModel_1.Email.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!email) {
            return res.status(404).json({ message: 'Email not found' });
        }
        res.json(email);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateEmail = updateEmail;
// @desc    Delete an email template
// @route   DELETE /api/team/messaging/emails/:id
// @access  Private/Staff
const deleteEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = yield emailModel_1.Email.findByIdAndDelete(req.params.id);
        if (!email) {
            return res.status(404).json({ message: 'Email not found' });
        }
        res.json({ message: 'Email deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteEmail = deleteEmail;
// @desc    Get all notification templates with pagination and search
// @route   GET /api/team/messaging/notification-templates
// @access  Private/Staff
const getNotificationTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        const count = yield notificationTemplateModel_1.NotificationTemplate.countDocuments(query);
        const templates = yield notificationTemplateModel_1.NotificationTemplate.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1));
        res.json({
            templates,
            total: count,
            pages: Math.ceil(count / limit),
            currentPage: page
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getNotificationTemplates = getNotificationTemplates;
// @desc    Create a new notification template
// @route   POST /api/team/messaging/notification-templates
// @access  Private/Staff
const createNotificationTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = req.user;
        const staffDisplayName = (staff === null || staff === void 0 ? void 0 : staff.displayName) || (staff === null || staff === void 0 ? void 0 : staff.username) || '';
        const template = new notificationTemplateModel_1.NotificationTemplate(Object.assign(Object.assign({}, req.body), { staffDisplayName }));
        yield template.save();
        res.status(201).json(template);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createNotificationTemplate = createNotificationTemplate;
// @desc    Update a notification template
// @route   PATCH /api/team/messaging/notification-templates/:id
// @access  Private/Staff
const updateNotificationTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = req.user;
        const staffDisplayName = (staff === null || staff === void 0 ? void 0 : staff.displayName) || (staff === null || staff === void 0 ? void 0 : staff.username) || '';
        const template = yield notificationTemplateModel_1.NotificationTemplate.findByIdAndUpdate(req.params.id, Object.assign(Object.assign({}, req.body), { staffDisplayName }), { new: true });
        if (!template) {
            return res.status(404).json({ message: 'Notification template not found' });
        }
        res.json(template);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateNotificationTemplate = updateNotificationTemplate;
// @desc    Delete a notification template
// @route   DELETE /api/team/messaging/notification-templates/:id
// @access  Private/Staff
const deleteNotificationTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const template = yield notificationTemplateModel_1.NotificationTemplate.findByIdAndDelete(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Notification template not found' });
        }
        res.json({ message: 'Notification template deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteNotificationTemplate = deleteNotificationTemplate;
// @desc    Get all social notification templates with pagination and search
// @route   GET /api/team/messaging/social-notification-templates
// @access  Private/Staff
const getSocialNotificationTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        const count = yield socialNotificationTemplateModel_1.SocialNotificationTemplate.countDocuments(query);
        const templates = yield socialNotificationTemplateModel_1.SocialNotificationTemplate.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1));
        res.json({
            templates,
            total: count,
            pages: Math.ceil(count / limit),
            currentPage: page
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSocialNotificationTemplates = getSocialNotificationTemplates;
// @desc    Create a new social notification template
// @route   POST /api/team/messaging/social-notification-templates
// @access  Private/Staff
const createSocialNotificationTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = req.user;
        const staffDisplayName = (staff === null || staff === void 0 ? void 0 : staff.displayName) || (staff === null || staff === void 0 ? void 0 : staff.username) || '';
        const template = new socialNotificationTemplateModel_1.SocialNotificationTemplate(Object.assign(Object.assign({}, req.body), { staffDisplayName }));
        yield template.save();
        res.status(201).json(template);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createSocialNotificationTemplate = createSocialNotificationTemplate;
// @desc    Update a social notification template
// @route   PATCH /api/team/messaging/social-notification-templates/:id
// @access  Private/Staff
const updateSocialNotificationTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = req.user;
        const staffDisplayName = (staff === null || staff === void 0 ? void 0 : staff.displayName) || (staff === null || staff === void 0 ? void 0 : staff.username) || '';
        const template = yield socialNotificationTemplateModel_1.SocialNotificationTemplate.findByIdAndUpdate(req.params.id, Object.assign(Object.assign({}, req.body), { staffDisplayName }), { new: true });
        if (!template) {
            return res.status(404).json({ message: 'Social notification template not found' });
        }
        res.json(template);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateSocialNotificationTemplate = updateSocialNotificationTemplate;
// @desc    Delete a social notification template
// @route   DELETE /api/team/messaging/social-notification-templates/:id
// @access  Private/Staff
const deleteSocialNotificationTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const template = yield socialNotificationTemplateModel_1.SocialNotificationTemplate.findByIdAndDelete(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Social notification template not found' });
        }
        res.json({ message: 'Social notification template deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteSocialNotificationTemplate = deleteSocialNotificationTemplate;
// @desc    Get all SMS templates with pagination and search
// @route   GET /api/team/messaging/sms
// @access  Private/Staff
const getSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        const count = yield smsModel_1.Sms.countDocuments(query);
        const sms = yield smsModel_1.Sms.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1));
        res.json({
            sms,
            total: count,
            pages: Math.ceil(count / limit),
            currentPage: page
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSms = getSms;
// @desc    Create a new SMS template
// @route   POST /api/team/messaging/sms
// @access  Private/Staff
const createSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sms = new smsModel_1.Sms(req.body);
        yield sms.save();
        res.status(201).json(sms);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createSms = createSms;
// @desc    Update an SMS template
// @route   PATCH /api/team/messaging/sms/:id
// @access  Private/Staff
const updateSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sms = yield smsModel_1.Sms.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!sms) {
            return res.status(404).json({ message: 'SMS not found' });
        }
        res.json(sms);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateSms = updateSms;
// @desc    Delete an SMS template
// @route   DELETE /api/team/messaging/sms/:id
// @access  Private/Staff
const deleteSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sms = yield smsModel_1.Sms.findByIdAndDelete(req.params.id);
        if (!sms) {
            return res.status(404).json({ message: 'SMS not found' });
        }
        res.json({ message: 'SMS deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteSms = deleteSms;
// @desc    Send bulk email to multiple users using a template
// @route   POST /api/team/messaging/emails/send-bulk
// @access  Private/Staff
const sendBulkEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userIds, templateName } = req.body;
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'No users selected' });
        }
        if (!templateName) {
            return res.status(400).json({ message: 'No template selected' });
        }
        // 1. Fetch users to get their names and emails
        const users = yield userModel_1.default.find({ _id: { $in: userIds } });
        if (users.length === 0) {
            return res.status(404).json({ message: 'Selected users not found' });
        }
        // 2. Send emails
        const sendPromises = users.map(user => (0, helperEmail_1.sendEmail)(user.displayName, user.email, templateName));
        yield Promise.all(sendPromises);
        res.json({ message: `Successfully sent emails to ${users.length} users` });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to send bulk emails' });
    }
});
exports.sendBulkEmail = sendBulkEmail;
// @desc    Get all company notifications with pagination and search
// @route   GET /api/team/messaging/company-notifications
// @access  Private/Staff
const getCompanyNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const type = req.query.type;
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }
        if (type && type !== 'all') {
            query.type = type;
        }
        const count = yield companyNotificationModel_1.CompanyNotification.countDocuments(query);
        const unreadCount = yield companyNotificationModel_1.CompanyNotification.countDocuments({ unread: true });
        const notifications = yield companyNotificationModel_1.CompanyNotification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1));
        res.json({
            notifications,
            total: count,
            pages: Math.ceil(count / limit),
            currentPage: page,
            unreadCount
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getCompanyNotifications = getCompanyNotifications;
// @desc    Mark company notification as read
// @route   PATCH /api/team/messaging/company-notifications/:id/read
// @access  Private/Staff
const markCompanyNotificationAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notification = yield companyNotificationModel_1.CompanyNotification.findByIdAndUpdate(req.params.id, { unread: false }, { new: true });
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.markCompanyNotificationAsRead = markCompanyNotificationAsRead;
// @desc    Delete a company notification
// @route   DELETE /api/team/messaging/company-notifications/:id
// @access  Private/Staff
const deleteCompanyNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notification = yield companyNotificationModel_1.CompanyNotification.findByIdAndDelete(req.params.id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ message: 'Notification deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteCompanyNotification = deleteCompanyNotification;
// @desc    Delete multiple company notifications
// @route   POST /api/team/messaging/company-notifications/bulk-delete
// @access  Private/Staff
const bulkDeleteCompanyNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No notifications selected' });
        }
        yield companyNotificationModel_1.CompanyNotification.deleteMany({ _id: { $in: ids } });
        res.json({ message: `${ids.length} notifications deleted successfully` });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.bulkDeleteCompanyNotifications = bulkDeleteCompanyNotifications;
// @desc    Delete multiple social notification templates
// @route   POST /api/team/messaging/social-notifications-temp/bulk-delete
// @access  Private/Staff
const bulkDeleteSocialNotificationTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No templates selected' });
        }
        yield socialNotificationTemplateModel_1.SocialNotificationTemplate.deleteMany({ _id: { $in: ids } });
        res.json({ message: `${ids.length} templates deleted successfully` });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.bulkDeleteSocialNotificationTemplates = bulkDeleteSocialNotificationTemplates;
// @desc    Delete multiple personal notification templates
// @route   POST /api/team/messaging/notifications-temp/bulk-delete
// @access  Private/Staff
const bulkDeleteNotificationTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No templates selected' });
        }
        yield notificationTemplateModel_1.NotificationTemplate.deleteMany({ _id: { $in: ids } });
        res.json({ message: `${ids.length} templates deleted successfully` });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.bulkDeleteNotificationTemplates = bulkDeleteNotificationTemplates;
