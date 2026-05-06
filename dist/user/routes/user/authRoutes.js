"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../../controllers/user/authController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/signup-status', authController_1.getSignupStatus);
router.post('/register', authController_1.registerUser);
router.post('/login', authController_1.authUser);
router.post('/social-login', authController_1.socialLogin);
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/verify-code', authController_1.verifyCode);
router.post('/reset-password', authController_1.resetPassword);
router.post('/switch', authMiddleware_1.protect, authController_1.switchAccount);
exports.default = router;
