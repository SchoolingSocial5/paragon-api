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
exports.sendEmail = void 0;
const resend_1 = require("resend");
const emailModel_1 = require("../models/messages/emailModel");
const EmailTemplate_1 = require("./EmailTemplate");
const companyModel_1 = require("../models/company/companyModel");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const sendEmail = (name_1, email_1, templateName_1, ...args_1) => __awaiter(void 0, [name_1, email_1, templateName_1, ...args_1], void 0, function* (name, email, templateName, placeholders = {}) {
    var _a, _b;
    try {
        // 1. Get template
        const template = yield emailModel_1.Email.findOne({ name: templateName });
        if (!template) {
            console.warn(`[sendEmail] Template "${templateName}" not found`);
            return null;
        }
        // 2. Prepare placeholders
        const allPlaceholders = Object.assign({ name,
            email, fullName: name }, placeholders);
        const replace = (text = "") => text.replace(/(?:\{\{|\{|\[)\s*(\w+)\s*(?:\}\}|\}|\])/g, (match, key) => {
            const val = allPlaceholders[key];
            return val !== undefined ? String(val) : match;
        });
        const subject = replace(template.title);
        const content = replace(template.content);
        let baseGreetings = replace(template.greetings);
        // Append user's name to greetings
        const greetings = name ? `${baseGreetings}, ${name}` : baseGreetings;
        // Fetch company domain to locate logo absolute URL
        const companyList = yield companyModel_1.Company.find();
        const companyDomain = ((_a = companyList[0]) === null || _a === void 0 ? void 0 : _a.domain) || "https://schoolingsocial.com";
        const logoUrl = `${companyDomain.replace(/\/$/, '')}/SchoolingLogo.png`;
        console.log("Logo URL is: ", logoUrl);
        const htmlBody = (0, EmailTemplate_1.getHtmlTemplate)(subject, greetings, content, logoUrl);
        // 3. Send email via Resend
        const response = yield resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: email,
            subject,
            html: htmlBody,
        });
        if (response.error) {
            console.error(`[sendEmail] Error:`, response.error.name, response.error.message);
        }
        else {
            console.log(`[sendEmail] Sent: ${(_b = response.data) === null || _b === void 0 ? void 0 : _b.id}`);
        }
        return response;
    }
    catch (error) {
        console.error(`[sendEmail] Error:`, error.message);
        throw error;
    }
});
exports.sendEmail = sendEmail;
