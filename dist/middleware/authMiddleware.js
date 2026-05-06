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
exports.extractUser = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = __importDefault(require("../models/user/userModel"));
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            const user = yield userModel_1.default.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            // Block users who are on review
            if (user.active !== 'active') {
                return res.status(403).json({ message: 'Account is currently on review. Authenticated actions are restricted.' });
            }
            user.personId = decoded.personId;
            req.user = user;
            return next();
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.error('[AuthMiddleware] Token expired at:', error.expiredAt);
            }
            else {
                console.error('[AuthMiddleware] Token verification failed:', error.message);
            }
            // Don't send the specific error to client for security, but log it on server
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
});
exports.protect = protect;
const extractUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            const user = yield userModel_1.default.findById(decoded.id).select('-password');
            if (user) {
                user.personId = decoded.personId;
                req.user = user;
            }
        }
        catch (error) {
            // Silently fail, user simply won't be on req
        }
    }
    next();
});
exports.extractUser = extractUser;
