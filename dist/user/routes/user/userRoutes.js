"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../../controllers/user/userController");
const authController_1 = require("../../controllers/user/authController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const socialController_1 = require("../../controllers/post/socialController");
const router = express_1.default.Router();
router.route('/').get(userController_1.getUsers).delete(authMiddleware_1.protect, userController_1.deleteAccount);
router.route('/onboarding').put(authMiddleware_1.protect, userController_1.completeOnboarding);
router.route('/profile').get(authMiddleware_1.protect, userController_1.getProfile).put(authMiddleware_1.protect, userController_1.updateProfile);
router.route('/reset-password').put(authMiddleware_1.protect, userController_1.resetPassword);
router.route('/analysis').get(authMiddleware_1.protect, userController_1.getUserAnalysis);
router.route('/2fa').put(authMiddleware_1.protect, userController_1.toggle2FA);
router.route('/check-username/:username').get(userController_1.checkUsername);
router.route('/username/:username').get(authMiddleware_1.extractUser, userController_1.getUserByUsername);
router.route('/create-account').post(authMiddleware_1.extractUser, userController_1.createAccount);
router.route('/linked').get(authMiddleware_1.protect, userController_1.getLinkedAccounts);
router.route('/verify-code').post(authController_1.verifyCode);
// User Interactions
router.get('/blocks', authMiddleware_1.protect, socialController_1.getBlocks);
router.get('/mutes', authMiddleware_1.protect, socialController_1.getMutes);
router.post('/:id/follow', authMiddleware_1.protect, socialController_1.toggleFollow);
router.post('/:id/mute', authMiddleware_1.protect, socialController_1.toggleMute);
router.post('/:id/block', authMiddleware_1.protect, socialController_1.toggleBlock);
router.post('/:id/report', authMiddleware_1.protect, socialController_1.reportAccount);
router.get('/:id/followers', authMiddleware_1.extractUser, socialController_1.getFollowers);
router.get('/:id/following', authMiddleware_1.extractUser, socialController_1.getFollowings);
router.post('/:id/visit', authMiddleware_1.protect, socialController_1.recordVisit);
// Admin
router.get('/review', authMiddleware_1.protect, userController_1.getOnReviewAccounts);
router.put('/:id/approve', authMiddleware_1.protect, userController_1.approveAccount);
router.delete('/:id', authMiddleware_1.protect, userController_1.adminDeleteUser);
// Invitations
router.get('/invites', authMiddleware_1.protect, userController_1.getInvitedUsers);
router.route('/:id/invite')
    .post(authMiddleware_1.protect, userController_1.inviteUser)
    .delete(authMiddleware_1.protect, userController_1.removeInvitation);
exports.default = router;
