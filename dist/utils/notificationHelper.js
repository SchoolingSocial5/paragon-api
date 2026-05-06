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
exports.sendCompanyNotification = exports.sendPersonalNotification = exports.sendNotification = void 0;
const socialNotificationModel_1 = require("../models/messages/socialNotificationModel");
const notificationTemplateModel_1 = require("../models/messages/notificationTemplateModel");
const socialNotificationTemplateModel_1 = require("../models/messages/socialNotificationTemplateModel");
const personalNotificationModel_1 = require("../models/messages/personalNotificationModel");
const companyNotificationModel_1 = require("../models/messages/companyNotificationModel");
const companyNotificationTemplateModel_1 = require("../models/messages/companyNotificationTemplateModel");
const socket_1 = require("../socket");
/**
 * Reusable function to send a notification based on a template.
 *
 * @param name Recipient's display name
 * @param username Recipient's username
 * @param placeholders Optional key-value pairs to replace in the template
 * @param picture Optional profile picture of the sender
 * @returns The created notification record
 */
const sendNotification = (name_1, username_1, templateName_1, ...args_1) => __awaiter(void 0, [name_1, username_1, templateName_1, ...args_1], void 0, function* (name, username, templateName, placeholders = {}, picture = "", routeValue = "", postId = "", reactingUsername = "") {
    try {
        // Fetch Template - Try personal first, then social
        let template = yield notificationTemplateModel_1.NotificationTemplate.findOne({ name: templateName });
        let isSocial = false;
        if (!template) {
            template = yield socialNotificationTemplateModel_1.SocialNotificationTemplate.findOne({ name: templateName });
            if (template) {
                isSocial = true;
            }
        }
        if (!template) {
            console.warn(`[sendNotification] Template "${templateName}" not found. Notification not sent.`);
            return null;
        }
        // Merge automatic placeholders with custom ones
        const allPlaceholders = Object.assign({ name,
            username, fullName: name }, placeholders);
        // Substitution function
        const replacePlaceholders = (text) => {
            if (!text)
                return '';
            return text.replace(/{{(\w+)}}/g, (match, key) => {
                return allPlaceholders[key] || match;
            });
        };
        let notification;
        const notificationData = {
            title: replacePlaceholders(template.title),
            greetings: replacePlaceholders(template.greetings),
            content: replacePlaceholders(template.content),
            unread: true,
            picture: picture || "",
        };
        if (isSocial) {
            // Create social notification record
            notification = new socialNotificationModel_1.SocialNotification(Object.assign(Object.assign({}, notificationData), { username: username, fullName: name, name: name, routeValue: routeValue || "", postId: postId || "", type: templateName, reactingUsername: reactingUsername || "" }));
        }
        else {
            // Create personal notification record
            notification = new personalNotificationModel_1.PersonalNotification(Object.assign(Object.assign({}, notificationData), { bioUserUsername: username, bioUserDisplayName: name, senderUsername: 'Schooling' }));
        }
        yield notification.save();
        // Emit via Socket.io
        const io = (0, socket_1.getIO)();
        if (io) {
            const socketIds = (0, socket_1.getUserSocketIds)(username);
            const [unreadCount, unreadPersonalCount] = yield Promise.all([
                socialNotificationModel_1.SocialNotification.countDocuments({ username, unread: true }),
                personalNotificationModel_1.PersonalNotification.countDocuments({ bioUserUsername: username, unread: true })
            ]);
            const eventName = isSocial ? 'new_notification' : 'new_personal_notification';
            socketIds.forEach(socketId => {
                io.to(socketId).emit(eventName, notification);
                io.to(socketId).emit('unread_count', {
                    social: unreadCount,
                    personal: unreadPersonalCount,
                    count: unreadCount + unreadPersonalCount
                });
            });
        }
        return notification;
    }
    catch (error) {
        console.error(`[sendNotification] Error sending notification "${templateName}" to ${username}:`, error);
        throw error;
    }
});
exports.sendNotification = sendNotification;
/**
 * Reusable function to send a personal notification based on a template.
 *
 * @param bioUserUsername Recipient's bioUserUsername
 * @param bioUserDisplayName Recipient's bioUserDisplayName
 * @param templateName Name of the notification template to use
 * @returns The created personal notification record
 */
const sendPersonalNotification = (bioUserUsername_1, bioUserDisplayName_1, templateName_1, ...args_1) => __awaiter(void 0, [bioUserUsername_1, bioUserDisplayName_1, templateName_1, ...args_1], void 0, function* (bioUserUsername, bioUserDisplayName, templateName, placeholders = {}, senderUsername = 'Schooling') {
    try {
        // Fetch Template
        const template = yield notificationTemplateModel_1.NotificationTemplate.findOne({ name: templateName });
        if (!template) {
            console.warn(`[sendPersonalNotification] Template "${templateName}" not found. Notification not sent.`);
            return null;
        }
        // Merge automatic placeholders with custom ones
        const allPlaceholders = Object.assign({ bioUserUsername,
            bioUserDisplayName, name: bioUserDisplayName, fullName: bioUserDisplayName }, placeholders);
        // Substitution function
        const replacePlaceholders = (text) => {
            if (!text)
                return '';
            return text.replace(/{{(\w+)}}/g, (match, key) => {
                return allPlaceholders[key] || match;
            });
        };
        // Create notification record
        const notification = new personalNotificationModel_1.PersonalNotification({
            title: replacePlaceholders(template.title),
            greetings: replacePlaceholders(template.greetings),
            content: replacePlaceholders(template.content),
            bioUserUsername,
            bioUserDisplayName,
            senderUsername,
            unread: true,
            picture: "", // Optionally could be mapped from template if needed later
        });
        yield notification.save();
        // Emit via Socket.io
        const io = (0, socket_1.getIO)();
        if (io) {
            const socketIds = (0, socket_1.getUserSocketIds)(bioUserUsername);
            const [unreadCount, unreadPersonalCount] = yield Promise.all([
                socialNotificationModel_1.SocialNotification.countDocuments({ username: bioUserUsername, unread: true }),
                personalNotificationModel_1.PersonalNotification.countDocuments({ bioUserUsername: bioUserUsername, unread: true })
            ]);
            socketIds.forEach(socketId => {
                io.to(socketId).emit('new_personal_notification', notification);
                io.to(socketId).emit('unread_count', {
                    social: unreadCount,
                    personal: unreadPersonalCount,
                    count: unreadCount + unreadPersonalCount
                });
            });
        }
        return notification;
    }
    catch (error) {
        console.error(`[sendPersonalNotification] Error sending notification "${templateName}" to ${bioUserUsername}:`, error);
        throw error;
    }
});
exports.sendPersonalNotification = sendPersonalNotification;
/**
 * Reusable function to send a company notification based on a template.
 *
 * @param templateName Name of the notification template to use
 * @param placeholders Optional key-value pairs to replace in the template
 * @returns The created company notification record
 */
const sendCompanyNotification = (templateName_1, ...args_1) => __awaiter(void 0, [templateName_1, ...args_1], void 0, function* (templateName, placeholders = {}, picture = "") {
    try {
        // Fetch Template
        const template = yield companyNotificationTemplateModel_1.CompanyNotificationTemplate.findOne({ name: templateName });
        if (!template) {
            console.warn(`[sendCompanyNotification] Template "${templateName}" not found. Notification not sent.`);
            return null;
        }
        // Substitution function
        const replacePlaceholders = (text) => {
            if (!text)
                return '';
            return text.replace(/{{(\w+)}}/g, (match, key) => {
                return placeholders[key] || match;
            });
        };
        // Create notification record
        const notification = new companyNotificationModel_1.CompanyNotification({
            title: replacePlaceholders(template.title),
            greetings: replacePlaceholders(template.greetings),
            content: replacePlaceholders(template.content),
            unread: true,
            picture: picture || "",
            type: templateName,
            username: placeholders.username || "",
            fullName: placeholders.name || placeholders.fullName || "",
        });
        yield notification.save();
        // Emit via Socket.io to all connected staff members
        const io = (0, socket_1.getIO)();
        if (io) {
            // We broadcast company notifications to a specific room or to all users with 'Staff' status
            // For now, let's emit to the 'staff_room' if it exists, or just broadcast
            io.emit('new_company_notification', notification);
        }
        return notification;
    }
    catch (error) {
        console.error(`[sendCompanyNotification] Error sending company notification "${templateName}":`, error);
        throw error;
    }
});
exports.sendCompanyNotification = sendCompanyNotification;
