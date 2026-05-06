"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const messagingController_1 = require("../../controller/messaging/messagingController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.route('/emails')
    .get(messagingController_1.getEmails)
    .post(messagingController_1.createEmail);
router.post('/emails/bulk-send', messagingController_1.sendBulkEmail);
router.route('/emails/:id')
    .patch(messagingController_1.updateEmail)
    .delete(messagingController_1.deleteEmail);
router.route('/notifications-temp')
    .get(messagingController_1.getNotificationTemplates)
    .post(messagingController_1.createNotificationTemplate);
router.route('/notifications-temp/:id')
    .patch(messagingController_1.updateNotificationTemplate)
    .delete(messagingController_1.deleteNotificationTemplate);
router.post('/notifications-temp/bulk-delete', messagingController_1.bulkDeleteNotificationTemplates);
router.route('/social-notifications-temp')
    .get(messagingController_1.getSocialNotificationTemplates)
    .post(messagingController_1.createSocialNotificationTemplate);
router.route('/social-notifications-temp/:id')
    .patch(messagingController_1.updateSocialNotificationTemplate)
    .delete(messagingController_1.deleteSocialNotificationTemplate);
router.post('/social-notifications-temp/bulk-delete', messagingController_1.bulkDeleteSocialNotificationTemplates);
router.route('/sms')
    .get(messagingController_1.getSms)
    .post(messagingController_1.createSms);
router.route('/sms/:id')
    .patch(messagingController_1.updateSms)
    .delete(messagingController_1.deleteSms);
router.get('/stats', messagingController_1.getMessagingStats);
router.route('/company-notifications-temp')
    .get(messagingController_1.getCompanyNotificationTemplates)
    .post(messagingController_1.createCompanyNotificationTemplate);
router.route('/company-notifications-temp/:id')
    .patch(messagingController_1.updateCompanyNotificationTemplate)
    .delete(messagingController_1.deleteCompanyNotificationTemplate);
router.route('/company-notifications')
    .get(messagingController_1.getCompanyNotifications);
router.patch('/company-notifications/:id/read', messagingController_1.markCompanyNotificationAsRead);
router.delete('/company-notifications/:id', messagingController_1.deleteCompanyNotification);
router.post('/company-notifications/bulk-delete', messagingController_1.bulkDeleteCompanyNotifications);
exports.default = router;
