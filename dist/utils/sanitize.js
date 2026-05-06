"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xssCleanObject = exports.xssClean = exports.sanitize = void 0;
const mongo_sanitize_1 = __importDefault(require("mongo-sanitize"));
const xss_1 = __importDefault(require("xss"));
/**
 * Sanitize an object to prevent NoSQL injection.
 * Recursively removes any keys starting with '$' or containing '.'.
 */
const sanitize = (v) => {
    return (0, mongo_sanitize_1.default)(v);
};
exports.sanitize = sanitize;
/**
 * Sanitize a string to prevent XSS (Cross-Site Scripting).
 * Removes potentially dangerous HTML tags and attributes.
 */
const xssClean = (content) => {
    if (!content || typeof content !== 'string')
        return content;
    return (0, xss_1.default)(content);
};
exports.xssClean = xssClean;
/**
 * Clean all string properties in an object for XSS.
 */
const xssCleanObject = (obj) => {
    const cleaned = Object.assign({}, obj);
    for (const key in cleaned) {
        if (typeof cleaned[key] === 'string') {
            cleaned[key] = (0, exports.xssClean)(cleaned[key]);
        }
        else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
            cleaned[key] = (0, exports.xssCleanObject)(cleaned[key]);
        }
    }
    return cleaned;
};
exports.xssCleanObject = xssCleanObject;
