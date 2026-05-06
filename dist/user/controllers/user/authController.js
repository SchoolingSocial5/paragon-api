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
exports.switchAccount = exports.resetPassword = exports.verifyCode = exports.forgotPassword = exports.socialLogin = exports.authUser = exports.registerUser = exports.getSignupStatus = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
const bioUserModel_1 = __importDefault(require("../../../models/user/bioUserModel"));
const bioUserSchoolInfoModel_1 = __importDefault(require("../../../models/user/bioUserSchoolInfoModel"));
const bioUserSettingsModel_1 = __importDefault(require("../../../models/user/bioUserSettingsModel"));
const bioUserStateModel_1 = __importDefault(require("../../../models/user/bioUserStateModel"));
const bioUserBankModel_1 = __importDefault(require("../../../models/user/bioUserBankModel"));
const placeModel_1 = require("../../../models/place/placeModel");
const helperEmail_1 = require("../../../utils/helperEmail");
const staffModel_1 = require("../../../models/company/staffModel");
const companyModel_1 = require("../../../models/company/companyModel");
const generateToken = (id, username, bioUserId, personId) => {
    return jsonwebtoken_1.default.sign({ id, username, bioUserId, personId }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '90d'
    });
};
// @desc    Check if signup is allowed (public)
// @route   GET /api/auth/signup-status
const getSignupStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const company = yield companyModel_1.Company.findOne({});
        const allowSignUp = company ? company.allowSignUp !== false : true;
        const showPayment = company ? company.showPayment === true : false;
        const showUtils = company ? company.showUtils === true : false;
        res.json({ allowSignUp, showPayment, showUtils });
    }
    catch (_a) {
        res.json({ allowSignUp: true, showPayment: false, showUtils: false });
    }
});
exports.getSignupStatus = getSignupStatus;
// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    let { email, password, displayName } = req.body;
    if (email)
        email = email.toLowerCase();
    // Check if signup is allowed
    const company = yield companyModel_1.Company.findOne({});
    if (company && company.allowSignUp === false) {
        return res.status(403).json({ message: 'Sign up is not allowed at this moment. Please check back later.' });
    }
    const userExists = yield userModel_1.default.findOne({ email });
    const bioUserExists = yield bioUserModel_1.default.findOne({ email });
    if (userExists || bioUserExists) {
        return res.status(400).json({
            message: 'An account with this email already exists. Please sign in instead.',
            field: 'email'
        });
    }
    const signupCountry = req.country || 'Unknown';
    const signupIp = req.ipAddress || '127.0.0.1';
    try {
        // 1. Create BioUser
        const bioUser = new bioUserModel_1.default(Object.assign(Object.assign({}, req.body), { bioUserDisplayName: displayName || email.split('@')[0], signupIp,
            email // Ensure email is passed
         }));
        yield bioUser.save();
        // 2. Create related models
        yield bioUserSchoolInfoModel_1.default.create({ bioUserId: bioUser._id });
        yield bioUserSettingsModel_1.default.create({ bioUserId: bioUser._id });
        yield bioUserStateModel_1.default.create({ bioUserId: bioUser._id });
        yield bioUserBankModel_1.default.create({
            bioUserId: bioUser._id,
            bankCountry: signupCountry,
        });
        // 3. Find Place details
        const place = yield placeModel_1.Place.findOne({
            country: new RegExp(`^${signupCountry.trim()}\\s*$`, 'i'),
        });
        // 4. Create main User
        const newUser = new userModel_1.default({
            bioUserId: bioUser._id,
            email,
            signupIp,
            displayName: bioUser.bioUserDisplayName,
            country: ((_a = place === null || place === void 0 ? void 0 : place.country) === null || _a === void 0 ? void 0 : _a.trim()) || signupCountry,
            countryFlag: ((_b = place === null || place === void 0 ? void 0 : place.countryFlag) === null || _b === void 0 ? void 0 : _b.trim()) || '',
            countrySymbol: ((_c = place === null || place === void 0 ? void 0 : place.countrySymbol) === null || _c === void 0 ? void 0 : _c.trim()) || '',
            password: password,
            active: 'active',
            status: 'online'
        });
        yield newUser.save();
        if (newUser) {
            const userResponse = newUser.toObject();
            delete userResponse.password;
            // 5. Send Welcome Email (Non-blocking)
            // sendEmail(newUser.displayName, newUser.email, 'welcome').catch(err => {
            //     console.error('[registerUser] Failed to send welcome email:', err);
            // });
            (0, helperEmail_1.sendEmail)(newUser.displayName, newUser.email, 'welcome');
            res.status(201).json(Object.assign(Object.assign({}, userResponse), { token: generateToken(newUser._id, newUser.username, (_d = newUser.bioUserId) === null || _d === void 0 ? void 0 : _d.toString(), (_e = newUser.bioUserId) === null || _e === void 0 ? void 0 : _e.toString()) }));
        }
        else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    }
    catch (error) {
        console.error('Registration Error:', error);
        // Handle MongoDB Duplicate Key Error (E11000)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'general';
            return res.status(400).json({
                message: `An account with this ${field} already exists.`,
                field: field === 'email' ? 'email' : 'general'
            });
        }
        res.status(500).json({ message: error.message || 'Server error during registration' });
    }
});
exports.registerUser = registerUser;
// @desc    Authenticate user & get token
// @route   POST /api/auth/login
const authUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let { email, password } = req.body;
    if (email)
        email = email.toLowerCase();
    // Only allow login for Personal accounts (Associate accounts are accessed via switching)
    // Legacy accounts without accountType are treated as Personal
    const user = yield userModel_1.default.findOne({
        email,
        accountType: { $in: ['User', null] }
    });
    if (user && (yield user.matchPassword(password))) {
        // Block users who are on review
        if (user.active !== 'active') {
            return res.status(403).json({ message: 'Account is currently on review. Please wait for approval.' });
        }
        // Fetch all accounts linked to this BioUser for the switcher
        let accounts = [];
        if (user.bioUserId) {
            accounts = yield userModel_1.default.find({ bioUserId: user.bioUserId })
                .select('_id username displayName picture accountType bioUserId followers posts stats');
        }
        const userResponse = user.toObject();
        delete userResponse.password;
        userResponse.accounts = accounts;
        let staff = null;
        if (user.bioUserId) {
            staff = yield staffModel_1.Staff.findOne({ bioUserId: user.bioUserId.toString() });
        }
        res.json(Object.assign(Object.assign({}, userResponse), { staff, status: (staff === null || staff === void 0 ? void 0 : staff.isActive) ? 'Staff' : userResponse.status, token: generateToken(user._id, user.username, (_a = user.bioUserId) === null || _a === void 0 ? void 0 : _a.toString(), (_b = user.bioUserId) === null || _b === void 0 ? void 0 : _b.toString()) }));
    }
    else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
});
exports.authUser = authUser;
// @desc    Social Login (Google/Apple)
// @route   POST /api/auth/social-login
const socialLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    let { email, displayName, picture, provider } = req.body;
    if (email)
        email = email.toLowerCase();
    try {
        let user = yield userModel_1.default.findOne({ email });
        let bioUser = yield bioUserModel_1.default.findOne({ email });
        // Only block signup for new users — existing users can still log in via social
        if (!user && !bioUser) {
            const company = yield companyModel_1.Company.findOne({});
            if (company && company.allowSignUp === false) {
                return res.status(403).json({ message: 'Sign up is not allowed at this moment. Please check back later.' });
            }
        }
        if (!user) {
            // 1. Create BioUser if doesn't exist
            if (!bioUser) {
                bioUser = new bioUserModel_1.default({
                    email,
                    bioUserDisplayName: displayName || email.split('@')[0],
                    bioUserPicture: picture || '',
                    signupIp: req.ipAddress || '127.0.0.1'
                });
                yield bioUser.save();
                // Create related models
                yield bioUserSchoolInfoModel_1.default.create({ bioUserId: bioUser._id });
                yield bioUserSettingsModel_1.default.create({ bioUserId: bioUser._id });
                yield bioUserStateModel_1.default.create({ bioUserId: bioUser._id });
                yield bioUserBankModel_1.default.create({
                    bioUserId: bioUser._id,
                    bankCountry: req.country || 'Unknown',
                });
            }
            // 2. Find Place details for defaulting
            const signupCountry = req.country || 'Unknown';
            const place = yield placeModel_1.Place.findOne({
                country: new RegExp(`^${signupCountry.trim()}\\s*$`, 'i'),
            });
            // 3. Create main User
            user = new userModel_1.default({
                bioUserId: bioUser._id,
                email,
                signupIp: req.ipAddress || '127.0.0.1',
                displayName: displayName || bioUser.bioUserDisplayName,
                picture: picture || bioUser.bioUserPicture,
                country: ((_a = place === null || place === void 0 ? void 0 : place.country) === null || _a === void 0 ? void 0 : _a.trim()) || signupCountry,
                countryFlag: ((_b = place === null || place === void 0 ? void 0 : place.countryFlag) === null || _b === void 0 ? void 0 : _b.trim()) || '',
                countrySymbol: ((_c = place === null || place === void 0 ? void 0 : place.countrySymbol) === null || _c === void 0 ? void 0 : _c.trim()) || '',
                password: yield bcryptjs_1.default.hash(Math.random().toString(36).slice(-10), 10), // Random password for social users
                active: 'active',
                status: 'online'
            });
            yield user.save();
        }
        else {
            if (picture && !user.picture) {
                user.picture = picture;
                yield user.save();
            }
        }
        // Block users who are on review
        if (user.active !== 'active') {
            return res.status(403).json({ message: 'Account is currently on review. Please wait for approval.' });
        }
        // Fetch all linked accounts for the switcher
        let accounts = [];
        if (user.bioUserId) {
            accounts = yield userModel_1.default.find({ bioUserId: user.bioUserId })
                .select('_id username displayName picture accountType bioUserId followers posts stats');
        }
        const userResponse = user.toObject();
        delete userResponse.password;
        userResponse.accounts = accounts;
        let staff = null;
        try {
            if (user.bioUserId) {
                staff = yield staffModel_1.Staff.findOne({ bioUserId: user.bioUserId.toString() });
            }
        }
        catch (err) {
            console.error("[AUTH] Error finding staff by bioUserId:", err);
        }
        if (!staff && user.email) {
            try {
                const bioUser = yield bioUserModel_1.default.findOne({ email: user.email });
                if (bioUser) {
                    staff = yield staffModel_1.Staff.findOne({ bioUserId: bioUser._id.toString() });
                }
            }
            catch (err) {
                console.error("[AUTH] Error finding staff by email/bioUser:", err);
            }
        }
        const finalStatus = (staff === null || staff === void 0 ? void 0 : staff.isActive) ? 'Staff' : userResponse.status;
        res.json(Object.assign(Object.assign({}, userResponse), { staffPosition: (staff === null || staff === void 0 ? void 0 : staff.position) || '', staffRole: (staff === null || staff === void 0 ? void 0 : staff.role) || '', status: finalStatus, token: generateToken(user._id, user.username, (_d = user.bioUserId) === null || _d === void 0 ? void 0 : _d.toString(), (_e = user.bioUserId) === null || _e === void 0 ? void 0 : _e.toString()) }));
    }
    catch (error) {
        console.error('Social Login Error:', error);
        res.status(500).json({ message: error.message || 'Server error during social login' });
    }
});
exports.socialLogin = socialLogin;
// @desc    Forgot Password - Generate and send 8-digit code
// @route   POST /api/auth/forgot-password
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { email } = req.body;
    if (email)
        email = email.toLowerCase();
    try {
        // Only allow password reset for Personal accounts (Associates are managed via switching)
        // Legacy accounts without accountType are treated as Personal
        const user = yield userModel_1.default.findOne({
            email,
            accountType: { $in: ['User', null] }
        });
        // Generate 6-digit code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        if (user) {
            user.passwordResetCode = resetCode;
            // Code expires in 3 minutes
            user.passwordExpiresAt = new Date(Date.now() + 180000);
            yield user.save();
            // Send Email
            yield (0, helperEmail_1.sendEmail)(user.displayName, user.email, 'reset_password', {
                password_reset_code: resetCode,
                passsword_reset_code: resetCode, // Support for existing typo in database template
                reset_code: resetCode,
            });
        }
        // Always return the same message for security
        res.json({ message: 'If an account exists with that email, a reset code has been sent.' });
    }
    catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server error during forgot password' });
    }
});
exports.forgotPassword = forgotPassword;
// @desc    Verify reset code
// @route   POST /api/auth/verify-code
const verifyCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { email, code } = req.body;
    if (email)
        email = email.toLowerCase();
    try {
        const user = yield userModel_1.default.findOne({
            email,
            passwordResetCode: code,
            passwordExpiresAt: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }
        res.json({ message: 'Code verified successfully' });
    }
    catch (error) {
        console.error('Verify Code Error:', error);
        res.status(500).json({ message: 'Server error during code verification' });
    }
});
exports.verifyCode = verifyCode;
// @desc    Reset Password - Verify code and update password
// @route   POST /api/auth/reset-password
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { email, code, newPassword } = req.body;
    if (email)
        email = email.toLowerCase();
    try {
        const user = yield userModel_1.default.findOne({
            email,
            passwordResetCode: code,
            passwordExpiresAt: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }
        // Update password
        user.password = newPassword;
        user.passwordResetCode = undefined;
        user.passwordExpiresAt = undefined;
        yield user.save();
        res.json({ message: 'Password reset successful. You can now log in.' });
    }
    catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});
exports.resetPassword = resetPassword;
// @desc    Switch account (Internal transition between linked identities)
// @route   POST /api/auth/switch
const switchAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { userId } = req.body;
    const currentUser = req.user;
    if (!currentUser) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    try {
        // 1. Find the target user
        const targetUser = yield userModel_1.default.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Target account not found' });
        }
        // Block switching to accounts on review
        if (targetUser.active !== 'active') {
            return res.status(403).json({ message: 'Target account is currently on review.' });
        }
        // 2. Security Check: Target user MUST belong to the same bioUserId
        if (((_a = targetUser.bioUserId) === null || _a === void 0 ? void 0 : _a.toString()) !== ((_b = currentUser.bioUserId) === null || _b === void 0 ? void 0 : _b.toString())) {
            return res.status(403).json({ message: 'You do not have permission to switch to this account' });
        }
        // 3. Mark current user as offline before switching
        yield userModel_1.default.findByIdAndUpdate(currentUser.id, {
            status: 'offline',
            online: false
        });
        // 4. Issue a fresh token for the target identity
        const token = generateToken(targetUser._id, targetUser.username, (_c = targetUser.bioUserId) === null || _c === void 0 ? void 0 : _c.toString(), currentUser.personId || ((_d = currentUser.bioUserId) === null || _d === void 0 ? void 0 : _d.toString()));
        // 5. Fetch all accounts linked to this BioUser for the switcher
        const accounts = yield userModel_1.default.find({ bioUserId: targetUser.bioUserId })
            .select('_id username displayName picture accountType bioUserId followers posts stats');
        const userResponse = targetUser.toObject();
        delete userResponse.password;
        userResponse.accounts = accounts;
        res.json(Object.assign(Object.assign({}, userResponse), { token }));
    }
    catch (error) {
        console.error('Switch Account Error:', error);
        res.status(500).json({ message: error.message || 'Server error during account switch' });
    }
});
exports.switchAccount = switchAccount;
