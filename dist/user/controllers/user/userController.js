"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.approveAccount = exports.getOnReviewAccounts = exports.getLinkedAccounts = exports.getUserAnalysis = exports.getInvitedUsers = exports.removeInvitation = exports.inviteUser = exports.getUserByUsername = exports.toggle2FA = exports.adminDeleteUser = exports.deleteAccount = exports.resetPassword = exports.updateProfile = exports.getProfile = exports.createAccount = exports.checkUsername = exports.completeOnboarding = exports.getUsers = void 0;
const mongoose = __importStar(require("mongoose"));
const crypto_1 = require("crypto");
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
const bioUserModel_1 = __importDefault(require("../../../models/user/bioUserModel"));
const bioUserSchoolInfoModel_1 = __importDefault(require("../../../models/user/bioUserSchoolInfoModel"));
const s3_1 = require("../../../utils/s3");
const sanitize_1 = require("../../../utils/sanitize");
const followerModel_1 = require("../../../models/post/followerModel");
const muteModel_1 = require("../../../models/post/muteModel");
const blockModel_1 = require("../../../models/post/blockModel");
const visitorModel_1 = require("../../../models/user/visitorModel");
const postModel_1 = __importDefault(require("../../../models/post/postModel"));
const Friend_1 = __importDefault(require("../../../models/chat/Friend"));
const Chat_1 = __importDefault(require("../../../models/chat/Chat"));
const postStatModel_1 = require("../../../models/post/postStatModel");
const pinPostModel_1 = require("../../../models/post/pinPostModel");
const commentModel_1 = __importDefault(require("../../../models/post/commentModel"));
const momentModel_1 = __importDefault(require("../../../models/post/momentModel"));
const InvitedFriend_1 = __importDefault(require("../../../models/chat/InvitedFriend"));
const examPostModel_1 = require("../../../models/exam/examPostModel");
const schoolModel_1 = require("../../../models/school/schoolModel");
const userHelper_1 = require("../../../utils/userHelper");
const socialNotificationModel_1 = require("../../../models/messages/socialNotificationModel");
const personalNotificationModel_1 = require("../../../models/messages/personalNotificationModel");
// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = req.query.search;
        const type = req.query.type; // 'accounts' or 'users'
        const country = req.query.country;
        const filter = { active: 'active' };
        if (query) {
            filter.$or = [
                { username: { $regex: query, $options: 'i' } },
                { displayName: { $regex: query, $options: 'i' } }
            ];
        }
        if (type === 'accounts') {
            if (filter.isVerified !== undefined)
                delete filter.isVerified;
            // When no search is active, narrow to same country for relevance
            if (!query && country) {
                filter.country = { $regex: `^${country}$`, $options: 'i' };
            }
        }
        else if (type === 'users') {
            filter.isVerified = false;
        }
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const currentUserId = req.query.currentUserId;
        const skip = (page - 1) * limit;
        // Sort accounts by highest followers; everything else by newest
        const sortStage = type === 'accounts' && !query
            ? { followers: -1 }
            : { createdAt: -1 };
        const users = yield userModel_1.default.aggregate([
            { $match: filter },
            { $sort: sortStage },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'biouserschoolinfos',
                    localField: 'bioUserId',
                    foreignField: 'bioUserId',
                    as: 'schoolInfo'
                }
            },
            {
                $addFields: {
                    schoolInfo: { $arrayElemAt: ['$schoolInfo', 0] }
                }
            },
            {
                $addFields: {
                    schoolName: '$schoolInfo.schoolName',
                    schoolCountry: '$schoolInfo.schoolCountry',
                    schoolState: '$schoolInfo.schoolState',
                    schoolLogo: '$schoolInfo.schoolLogo',
                    inSchool: '$schoolInfo.inSchool',
                    schoolAcademicLevel: '$schoolInfo.schoolAcademicLevel',
                    schoolDepartment: '$schoolInfo.schoolDepartment',
                    isAdvanced: '$schoolInfo.isAdvanced'
                }
            },
            {
                $project: {
                    schoolInfo: 0
                }
            }
        ]);
        if (currentUserId && users.length > 0) {
            const augmentedUsers = yield Promise.all(users.map((user) => __awaiter(void 0, void 0, void 0, function* () {
                const searchId = currentUserId.toString();
                const [mute, block, follow] = yield Promise.all([
                    muteModel_1.Mute.findOne({ muterId: searchId, userId: user._id.toString() }),
                    blockModel_1.Block.findOne({ blockerId: searchId, userId: user._id.toString() }),
                    followerModel_1.Follower.findOne({ followerId: searchId, userId: user._id.toString() })
                ]);
                return Object.assign(Object.assign({}, user), { followed: !!follow, muted: !!mute, blocked: !!block });
            })));
            res.json(augmentedUsers);
            return;
        }
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUsers = getUsers;
// @desc    Complete user onboarding
// @route   PUT /api/users/onboarding
// @access  Private
const completeOnboarding = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { username, displayName, picture, country, state, area, dateOfBirth } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const user = yield userModel_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Update main User model
        user.username = username;
        user.displayName = (0, sanitize_1.xssClean)(displayName);
        user.picture = picture;
        user.country = (0, sanitize_1.xssClean)(country);
        user.state = (0, sanitize_1.xssClean)(state);
        user.area = (0, sanitize_1.xssClean)(area);
        if (dateOfBirth)
            user.dateOfBirth = dateOfBirth;
        user.isFirstTime = false;
        yield user.save();
        res.json({
            user,
            message: 'Onboarding completed successfully'
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.completeOnboarding = completeOnboarding;
// @desc    Check if username is available
// @route   GET /api/users/check-username/:username
// @access  Public
const checkUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.params;
        const user = yield userModel_1.default.findOne({ username });
        const bioUser = yield bioUserModel_1.default.findOne({ bioUserUsername: username });
        if (user || bioUser) {
            res.json({ available: false });
        }
        else {
            res.status(200).json({ available: true });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.checkUsername = checkUsername;
// @desc    Create account (Final onboarding step)
// @route   POST /api/users/create-account
// @access  Public for onboarding (userId in body); Protected for new associate/business/official accounts
const createAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const { username, displayName, bio, picture, media, userId, country, state, area, dateOfBirth, lat, lng, bioUserId, accountType } = req.body;
    if (!picture) {
        res.status(400).json({ message: 'Profile picture is required to create an account' });
        return;
    }
    try {
        // --- New Account Creation (Associate / Business / Official) ---
        if (accountType && accountType !== 'User') {
            const currentUser = req.user;
            if (!currentUser) {
                res.status(401).json({ message: 'Authentication required to create an associate account' });
                return;
            }
            const parentBioUserId = bioUserId || ((_a = currentUser.bioUserId) === null || _a === void 0 ? void 0 : _a.toString());
            if (!parentBioUserId) {
                res.status(400).json({ message: 'Bio user ID is required' });
                return;
            }
            // Enforce account limit
            const bioUser = yield bioUserModel_1.default.findById(parentBioUserId);
            if (bioUser && (((_b = bioUser.accounts) === null || _b === void 0 ? void 0 : _b.length) || 0) >= 5) {
                res.status(400).json({ message: 'You have reached the maximum account limit (5 accounts).' });
                return;
            }
            let pictureUrl = picture;
            let mediaUrl = media;
            const signupIp = req.ip || req.socket.remoteAddress || "";
            if (picture && picture.startsWith('data:')) {
                pictureUrl = yield (0, s3_1.uploadToS3)(picture);
            }
            if (media && media.startsWith('data:')) {
                mediaUrl = yield (0, s3_1.uploadToS3)(media);
            }
            const fullCurrentUser = yield userModel_1.default.findById(currentUser._id);
            const newUser = new userModel_1.default({
                bioUserId: parentBioUserId,
                email: currentUser.email,
                username,
                displayName: (0, sanitize_1.xssClean)(displayName),
                intro: bio ? (0, sanitize_1.xssClean)(bio) : undefined,
                accountType,
                picture: pictureUrl,
                media: mediaUrl,
                country: country || (fullCurrentUser === null || fullCurrentUser === void 0 ? void 0 : fullCurrentUser.country),
                state: state || (fullCurrentUser === null || fullCurrentUser === void 0 ? void 0 : fullCurrentUser.state),
                area: area || (fullCurrentUser === null || fullCurrentUser === void 0 ? void 0 : fullCurrentUser.area),
                dateOfBirth: dateOfBirth || (fullCurrentUser === null || fullCurrentUser === void 0 ? void 0 : fullCurrentUser.dateOfBirth),
                isFirstTime: false,
                isFriendly: true,
                signupIp,
                active: 'active',
                status: 'online',
                password: (0, crypto_1.randomBytes)(20).toString('hex'),
            });
            yield newUser.save();
            yield (0, userHelper_1.recalculateUserStats)(newUser._id.toString());
            const userResponse = newUser.toObject();
            delete userResponse.password;
            res.json({
                user: userResponse,
                message: 'Account created successfully!'
            });
            return;
        }
        // --- Onboarding Completion (original flow: userId in body or from JWT) ---
        const targetBioUserId = bioUserId || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.bioUserId);
        if (targetBioUserId) {
            const bioUser = yield bioUserModel_1.default.findById(targetBioUserId);
            if (bioUser && bioUser.accounts && bioUser.accounts.length >= 5) {
                const currentUserId = userId || ((_d = req.user) === null || _d === void 0 ? void 0 : _d._id);
                const isExisting = bioUser.accounts.some((a) => a.userId === currentUserId.toString());
                if (!isExisting) {
                    res.status(400).json({ message: 'You have reached the maximum account limit (5 accounts).' });
                    return;
                }
            }
        }
        let pictureUrl = picture;
        const signupIp = req.ip || req.socket.remoteAddress || "";
        if (picture && picture.startsWith('data:')) {
            pictureUrl = yield (0, s3_1.uploadToS3)(picture);
        }
        const user = yield userModel_1.default.findOneAndUpdate({ _id: userId || ((_e = req.user) === null || _e === void 0 ? void 0 : _e._id) }, {
            picture: pictureUrl,
            displayName: (0, sanitize_1.xssClean)(displayName),
            isFirstTime: false,
            username: username,
            country: (0, sanitize_1.xssClean)(country),
            state: (0, sanitize_1.xssClean)(state),
            area: (0, sanitize_1.xssClean)(area),
            dateOfBirth: dateOfBirth,
            lat: lat || 0,
            lng: lng || 0,
            signupIp: signupIp,
            signupLocation: {
                lat: lat || 0,
                lng: lng || 0
            },
            isFriendly: true
        }, { returnDocument: 'after' });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        yield (0, userHelper_1.recalculateUserStats)(user._id.toString());
        res.json({
            user,
            message: 'Account created successfully! Welcome to the community.'
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createAccount = createAccount;
// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Recalculate stats on every profile fetch to ensure accuracy
        yield (0, userHelper_1.recalculateUserStats)(userId.toString());
        const user = yield userModel_1.default.findById(userId).lean();
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const personId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.personId) || user.bioUserId;
        const bioUser = yield bioUserModel_1.default.findById(personId).lean();
        const schoolInfo = yield bioUserSchoolInfoModel_1.default.findOne({ bioUserId: personId || user.bioUserId || userId.toString() }).lean();
        const schoolDetails = (schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolId) ? yield schoolModel_1.School.findById(schoolInfo.schoolId).lean() : null;
        const userObj = Object.assign(Object.assign({}, user), { accounts: (bioUser === null || bioUser === void 0 ? void 0 : bioUser.accounts) || [], bioUserId: user.bioUserId || (schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserId), 
            // Academic & Bio Fields for Persistence (PRIORITIZE schoolInfo)
            bioUserDisplayName: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserDisplayName, bioUserUsername: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserUsername, bioUserPicture: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserPicture, bioUserMedia: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserMedia, bioUserIntro: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserIntro, inSchool: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.inSchool, attendedSchool: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.attendedSchool, hasPastSchool: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.hasPastSchool, admittedAt: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.admittedAt, graduatedAt: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.graduatedAt, isAdvanced: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.isAdvanced, isSchoolVerified: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.isSchoolVerified, schoolId: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolId, schoolName: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolName, schoolUsername: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolUsername, schoolLogo: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolLogo, schoolState: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolState, schoolCountry: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolCountry, schoolArea: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolArea, schoolContinent: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolContinent, schoolDepartment: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolDepartment, schoolFaculty: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolFaculty, schoolArm: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolArm, schoolLevelName: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolLevelName, schoolCertificate: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolCertificate, 
            // Full School Details (Joined)
            schoolOwnershipType: schoolDetails === null || schoolDetails === void 0 ? void 0 : schoolDetails.ownershipType, schoolInstitutions: schoolDetails === null || schoolDetails === void 0 ? void 0 : schoolDetails.institutions, schoolCountryFlag: (schoolDetails === null || schoolDetails === void 0 ? void 0 : schoolDetails.countryFlag) || (schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolCountryFlag), schoolCountrySymbol: (schoolDetails === null || schoolDetails === void 0 ? void 0 : schoolDetails.countrySymbol) || (schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolCountrySymbol), bioUser: bioUser });
        res.json({
            user: userObj,
            message: 'Profile retrieved successfully'
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getProfile = getProfile;
// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { displayName, intro, picture, media, dateOfBirth } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const user = yield userModel_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (displayName)
            user.displayName = (0, sanitize_1.xssClean)(displayName);
        if (intro !== undefined)
            user.intro = (0, sanitize_1.xssClean)(intro);
        if (dateOfBirth)
            user.dateOfBirth = dateOfBirth;
        // Handle Profile Picture
        if (picture && picture.startsWith('data:')) {
            user.picture = yield (0, s3_1.uploadToS3)(picture);
        }
        else if (picture === "") {
            user.picture = "";
        }
        // Handle Cover Media
        if (media && media.startsWith('data:')) {
            user.media = yield (0, s3_1.uploadToS3)(media);
        }
        else if (media === "") {
            user.media = "";
        }
        if (req.body.isFriendly !== undefined) {
            user.isFriendly = req.body.isFriendly;
        }
        yield user.save();
        // Sync profile and cover media across all collections if updated
        if (picture !== undefined || media !== undefined) {
            const userIdStr = userId.toString();
            const newPicture = user.picture;
            const newMedia = user.media;
            // Use Promise.all to run updates in parallel
            Promise.all([
                picture !== undefined ? postModel_1.default.updateMany({ userId: userId }, { $set: { picture: newPicture } }) : Promise.resolve(),
                picture !== undefined ? commentModel_1.default.updateMany({ userId: userIdStr }, { $set: { picture: newPicture } }) : Promise.resolve(),
                picture !== undefined ? examPostModel_1.ExamPost.updateMany({ bioUserId: userId }, { $set: { bioUserPicture: newPicture } }) : Promise.resolve(),
                picture !== undefined ? Friend_1.default.updateMany({ bioUserId: userIdStr }, { $set: { picture: newPicture } }) : Promise.resolve(),
                picture !== undefined ? Friend_1.default.updateMany({ senderUsername: user.username }, { $set: { senderPicture: newPicture } }) : Promise.resolve(),
                picture !== undefined ? InvitedFriend_1.default.updateMany({ invitedUserId: userIdStr }, { $set: { invitedPicture: newPicture } }) : Promise.resolve(),
                picture !== undefined ? InvitedFriend_1.default.updateMany({ inviterUserId: userIdStr }, { $set: { inviterPicture: newPicture } }) : Promise.resolve(),
                user.bioUserId ? bioUserModel_1.default.findByIdAndUpdate(user.bioUserId, {
                    $set: Object.assign(Object.assign({}, (picture !== undefined && { bioUserPicture: newPicture })), (media !== undefined && { bioUserMedia: newMedia }))
                }) : Promise.resolve()
            ]).catch(err => console.error('Error syncing profile/media:', err));
        }
        res.json({
            user,
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateProfile = updateProfile;
// @desc    Reset password
// @route   PUT /api/users/reset-password
// @access  Private
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { currentPassword, newPassword } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const user = yield userModel_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const isMatch = yield user.matchPassword(currentPassword);
        if (!isMatch) {
            res.status(401).json({ message: 'Current password is incorrect' });
            return;
        }
        user.password = newPassword;
        yield user.save();
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.resetPassword = resetPassword;
// @desc    Delete account
// @route   DELETE /api/users
// @access  Private
const deleteAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const user = yield userModel_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const username = user.username;
        const userIdStr = userId.toString();
        // 1. BioUser Synchronization: Remove account from linked accounts list
        if (user.bioUserId) {
            yield bioUserModel_1.default.findByIdAndUpdate(user.bioUserId, {
                $pull: { accounts: { userId: userIdStr } }
            });
        }
        // 2. Delete Notification records
        if (username) {
            yield Promise.all([
                socialNotificationModel_1.SocialNotification.deleteMany({ username: username }),
                personalNotificationModel_1.PersonalNotification.deleteMany({
                    $or: [
                        { senderUsername: username },
                        { bioUserUsername: username }
                    ]
                })
            ]);
        }
        // 3. Delete Friend documents involvement
        if (username) {
            yield Friend_1.default.deleteMany({
                $or: [
                    { senderUsername: username },
                    { username: username }
                ]
            });
            // 4. Delete Chats sent by user
            yield Chat_1.default.deleteMany({ senderUsername: username });
            // 5. Delete InvitedFriend involvements
            yield InvitedFriend_1.default.deleteMany({
                $or: [
                    { inviterUsername: username },
                    { invitedUsername: username }
                ]
            });
        }
        // 6. Delete Conversations involvements (Posts, Comments, Moments, Exams)
        yield Promise.all([
            postModel_1.default.deleteMany({ userId: userId }),
            commentModel_1.default.deleteMany({ userId: userIdStr }),
            momentModel_1.default.deleteMany({ userId: userId }),
            examPostModel_1.ExamPost.deleteMany({ userId: userIdStr })
        ]);
        // 7. Delete interactions (Likes, Bookmarks, Hates, Pins, Follows, Mutes, Blocks, Visits)
        yield Promise.all([
            postStatModel_1.Like.deleteMany({ userId: userIdStr }),
            postStatModel_1.Bookmark.deleteMany({ userId: userIdStr }),
            postStatModel_1.Hate.deleteMany({ userId: userIdStr }),
            pinPostModel_1.Pin.deleteMany({ userId: userIdStr }),
            followerModel_1.Follower.deleteMany({
                $or: [
                    { followerId: userIdStr },
                    { userId: userIdStr }
                ]
            }),
            muteModel_1.Mute.deleteMany({ $or: [{ muterId: userIdStr }, { userId: userIdStr }] }),
            blockModel_1.Block.deleteMany({ $or: [{ blockerId: userIdStr }, { userId: userIdStr }] }),
            visitorModel_1.Visitor.deleteMany({ $or: [{ visitorId: userIdStr }, { userId: userIdStr }] }),
        ]);
        // 8. Finally delete the user account document
        yield userModel_1.default.findByIdAndDelete(userId);
        res.json({ message: 'Account deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteAccount = deleteAccount;
// @desc    Admin delete a user by ID (staff only)
// @route   DELETE /api/users/:id
// @access  Private
const adminDeleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const user = yield userModel_1.default.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const username = user.username;
        if (username) {
            yield Friend_1.default.deleteMany({
                $or: [
                    { senderUsername: username },
                    { username: username }
                ]
            });
            yield Chat_1.default.deleteMany({ senderUsername: username });
        }
        const userIdStr = id.toString();
        yield Promise.all([
            postModel_1.default.deleteMany({ userId: id }),
            commentModel_1.default.deleteMany({ userId: userIdStr }),
            momentModel_1.default.deleteMany({ userId: id })
        ]);
        yield Promise.all([
            postStatModel_1.Like.deleteMany({ userId: userIdStr }),
            postStatModel_1.Bookmark.deleteMany({ userId: userIdStr }),
            postStatModel_1.Hate.deleteMany({ userId: userIdStr }),
            pinPostModel_1.Pin.deleteMany({ userId: userIdStr }),
            followerModel_1.Follower.deleteMany({ $or: [{ followerId: userIdStr }, { userId: userIdStr }] }),
            muteModel_1.Mute.deleteMany({ $or: [{ muterId: userIdStr }, { userId: userIdStr }] }),
            blockModel_1.Block.deleteMany({ $or: [{ blockerId: userIdStr }, { userId: userIdStr }] }),
            visitorModel_1.Visitor.deleteMany({ $or: [{ visitorId: userIdStr }, { userId: userIdStr }] }),
        ]);
        yield userModel_1.default.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.adminDeleteUser = adminDeleteUser;
// @desc    Toggle 2FA
// @route   PUT /api/users/2fa
// @access  Private
const toggle2FA = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { enabled } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const user = yield userModel_1.default.findByIdAndUpdate(userId, { isTwoFactorEnabled: enabled }, { returnDocument: 'after' });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            isTwoFactorEnabled: user.isTwoFactorEnabled,
            message: `Two-Factor Authentication ${user.isTwoFactorEnabled ? 'enabled' : 'disabled'} successfully`
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.toggle2FA = toggle2FA;
// @desc    Get user by username
// @route   GET /api/users/username/:username
// @access  Public
const getUserByUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { username } = req.params;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Case-insensitive search for User
        let user = yield userModel_1.default.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }).lean();
        if (!user) {
            // Fallback to BioUser (case-insensitive)
            const bioUser = yield bioUserModel_1.default.findOne({ bioUserUsername: { $regex: new RegExp(`^${username}$`, 'i') } }).lean();
            if (bioUser) {
                // If we found a BioUser, check if there's a corresponding standard User
                const linkedUser = yield userModel_1.default.findOne({
                    $or: [
                        { bioUserId: bioUser._id.toString() },
                        { bioUserId: bioUser._id }
                    ]
                }).lean();
                if (linkedUser) {
                    user = linkedUser;
                }
                else {
                    // Create a virtual user object from BioUser if no standard User exists
                    user = Object.assign(Object.assign({}, bioUser), { username: bioUser.bioUserUsername, displayName: bioUser.bioUserDisplayName, picture: bioUser.bioUserPicture, intro: bioUser.bioUserIntro, media: bioUser.bioUserMedia, _id: bioUser._id, active: 'active' // Virtual users are active by default
                     });
                }
            }
        }
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Hide users on review from others
        if (user.active !== 'active' && ((_b = user._id) === null || _b === void 0 ? void 0 : _b.toString()) !== (currentUserId === null || currentUserId === void 0 ? void 0 : currentUserId.toString())) {
            res.status(403).json({ message: 'This account is currently on review and cannot be viewed.' });
            return;
        }
        const userId = user._id;
        const userObjId = new mongoose.Types.ObjectId(userId.toString());
        const currentUserObjId = currentUserId ? new mongoose.Types.ObjectId(currentUserId.toString()) : null;
        // Recalculate stats on visit to ensure consistency as requested
        const updatedUser = yield (0, userHelper_1.recalculateUserStats)(userId.toString());
        if (updatedUser) {
            user = updatedUser;
        }
        const [schoolInfo, mute, block, follow, invitation, followMe, postCount, mediaCount, blockedMe] = yield Promise.all([
            bioUserSchoolInfoModel_1.default.findOne({ bioUserId: user.bioUserId || userId.toString() }).lean(),
            currentUserId ? muteModel_1.Mute.findOne({ muterId: currentUserId.toString(), userId: userId.toString() }) : Promise.resolve(null),
            currentUserId ? blockModel_1.Block.findOne({ blockerId: currentUserId.toString(), userId: userId.toString() }) : Promise.resolve(null),
            currentUserId ? followerModel_1.Follower.findOne({ followerId: currentUserId.toString(), userId: userId.toString() }) : Promise.resolve(null),
            currentUserId ? InvitedFriend_1.default.findOne({
                $or: [
                    { invitedUserId: currentUserId.toString(), inviterUserId: userId.toString() },
                    { invitedUserId: userId.toString(), inviterUserId: currentUserId.toString() }
                ]
            }) : Promise.resolve(null),
            currentUserId ? followerModel_1.Follower.findOne({ userId: currentUserId.toString(), followerId: userId.toString() }) : Promise.resolve(null),
            postModel_1.default.countDocuments({
                $and: [
                    {
                        $or: [
                            { userId: userObjId },
                            { userId: userId.toString() },
                            { username: { $regex: new RegExp(`^${user.username}$`, 'i') } }
                        ]
                    },
                    {
                        $or: [
                            { replyToId: { $exists: false } },
                            { replyToId: null },
                            { replyToId: '' }
                        ]
                    }
                ]
            }),
            postModel_1.default.countDocuments({
                $and: [
                    {
                        $or: [
                            { userId: userObjId },
                            { userId: userId.toString() },
                            { username: { $regex: new RegExp(`^${user.username}$`, 'i') } }
                        ]
                    },
                    {
                        $or: [
                            { media: { $exists: true, $not: { $size: 0 } } },
                            { "sharedPost.media": { $exists: true, $not: { $size: 0 } } }
                        ]
                    }
                ]
            }),
            currentUserObjId ? blockModel_1.Block.findOne({ blockerId: userObjId, userId: currentUserObjId }) : Promise.resolve(null)
        ]);
        const isMine = currentUserId && (user._id.toString() === currentUserId.toString());
        const effectiveBioUserId = isMine ? (((_c = req.user) === null || _c === void 0 ? void 0 : _c.personId) || user.bioUserId) : user.bioUserId;
        const bioUser = yield bioUserModel_1.default.findById(effectiveBioUserId || userId.toString()).lean();
        const schoolDetails = (schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolId) ? yield schoolModel_1.School.findById(schoolInfo.schoolId).lean() : null;
        const isBlockedByTarget = !!blockedMe;
        if (isBlockedByTarget) {
            res.json({
                _id: user._id,
                username: user.username,
                displayName: user.displayName,
                blockedMe: true,
                message: `${user.displayName} has blocked you`
            });
            return;
        }
        const userObj = Object.assign(Object.assign({}, user), { accounts: (bioUser === null || bioUser === void 0 ? void 0 : bioUser.accounts) || [], followings: user.followings || 0, followers: user.followers || 0, posts: postCount, postMedia: mediaCount, totalPosts: postCount, totalMedia: mediaCount, followed: !!follow, muted: !!mute, blocked: !!block, isFriendly: user.isFriendly, invitationStatus: invitation ? 'pending' : 'none', isFollowedMe: !!followMe, bioUserId: user.bioUserId || (schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserId), 
            // Academic & Bio Fields for Persistence (PRIORITIZE schoolInfo)
            bioUserDisplayName: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserDisplayName, bioUserUsername: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserUsername, bioUserPicture: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserPicture, bioUserMedia: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserMedia, bioUserIntro: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.bioUserIntro, inSchool: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.inSchool, attendedSchool: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.attendedSchool, hasPastSchool: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.hasPastSchool, admittedAt: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.admittedAt, graduatedAt: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.graduatedAt, isAdvanced: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.isAdvanced, isSchoolVerified: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.isSchoolVerified, schoolId: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolId, schoolName: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolName, schoolUsername: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolUsername, schoolLogo: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolLogo, schoolState: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolState, schoolCountry: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolCountry, schoolArea: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolArea, schoolContinent: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolContinent, schoolDepartment: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolDepartment, schoolFaculty: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolFaculty, schoolArm: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolArm, schoolLevelName: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolLevelName, schoolCertificate: schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolCertificate, bioUser: bioUser, 
            // Full School Details (Joined)
            schoolOwnershipType: schoolDetails === null || schoolDetails === void 0 ? void 0 : schoolDetails.ownershipType, schoolInstitutions: schoolDetails === null || schoolDetails === void 0 ? void 0 : schoolDetails.institutions, schoolCountryFlag: (schoolDetails === null || schoolDetails === void 0 ? void 0 : schoolDetails.countryFlag) || (schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolCountryFlag), schoolCountrySymbol: (schoolDetails === null || schoolDetails === void 0 ? void 0 : schoolDetails.countrySymbol) || (schoolInfo === null || schoolInfo === void 0 ? void 0 : schoolInfo.schoolCountrySymbol) });
        res.json(userObj);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUserByUsername = getUserByUsername;
// @desc    Invite a user to chat (for private chat permission)
// @route   POST /api/users/:id/invite
// @access  Private
const inviteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const targetUserId = req.params.id;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (targetUserId === currentUserId.toString()) {
            res.status(400).json({ message: "You cannot invite yourself" });
            return;
        }
        const [targetUser, currentUser] = yield Promise.all([
            userModel_1.default.findById(targetUserId),
            userModel_1.default.findById(currentUserId)
        ]);
        if (!targetUser || !currentUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Check if already invited
        const existingInvite = yield InvitedFriend_1.default.findOne({
            invitedUserId: targetUserId,
            inviterUserId: currentUserId.toString()
        });
        if (existingInvite) {
            res.status(400).json({ message: "User is already invited" });
            return;
        }
        yield InvitedFriend_1.default.create({
            invitedUserId: targetUserId,
            invitedUsername: targetUser.username,
            invitedDisplayName: targetUser.displayName,
            invitedPicture: targetUser.picture,
            inviterUserId: currentUserId.toString(),
            inviterUsername: currentUser.username,
            inviterDisplayName: currentUser.displayName,
            inviterPicture: currentUser.picture
        });
        res.json({ message: `Invitation sent to ${targetUser.displayName}` });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.inviteUser = inviteUser;
// @desc    Remove a chat invitation
// @route   DELETE /api/users/:id/invite
// @access  Private
const removeInvitation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const targetUserId = req.params.id;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const result = yield InvitedFriend_1.default.findOneAndDelete({
            invitedUserId: targetUserId,
            inviterUserId: currentUserId.toString()
        });
        if (!result) {
            res.status(404).json({ message: "Invitation not found" });
            return;
        }
        res.json({ message: "Invitation removed successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.removeInvitation = removeInvitation;
// @desc    Get all users invited by the current user
// @route   GET /api/users/invites
// @access  Private
const getInvitedUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const invites = yield InvitedFriend_1.default.find({
            inviterUserId: currentUserId.toString()
        }).skip(skip).limit(limit).sort({ createdAt: -1 }).lean();
        // Map to a format compatible with UserListItem
        const users = invites.map(invite => ({
            _id: invite.invitedUserId,
            userId: invite.invitedUserId,
            username: invite.invitedUsername,
            displayName: invite.invitedDisplayName,
            picture: invite.invitedPicture,
            isInvited: true
        }));
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getInvitedUsers = getInvitedUsers;
// @desc    Get user analysis stats
// @route   GET /api/users/analysis
// @access  Private
const getUserAnalysis = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const userObjId = new mongoose.Types.ObjectId(userId.toString());
        const stats = yield postModel_1.default.aggregate([
            {
                $match: {
                    $or: [
                        { userId: userObjId },
                        { userId: userId.toString() }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalPosts: { $sum: 1 },
                    totalViews: { $sum: "$views" },
                    totalLikes: { $sum: "$likes" },
                    totalShares: { $sum: "$shares" },
                    totalBookmarks: { $sum: "$bookmarks" },
                    totalComments: { $sum: "$replies" }
                }
            }
        ]);
        const result = stats.length > 0 ? stats[0] : {
            totalPosts: 0,
            totalViews: 0,
            totalLikes: 0,
            totalShares: 0,
            totalBookmarks: 0,
            totalComments: 0
        };
        if (result._id)
            delete result._id;
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUserAnalysis = getUserAnalysis;
// @desc    Get all accounts linked to the current user's bio identity
// @route   GET /api/users/linked
// @access  Private
const getLinkedAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const currentUser = req.user;
        const bioUserId = (_a = currentUser === null || currentUser === void 0 ? void 0 : currentUser.bioUserId) === null || _a === void 0 ? void 0 : _a.toString();
        if (!bioUserId) {
            res.json([]);
            return;
        }
        const accounts = yield userModel_1.default.find({ bioUserId })
            .select('_id username displayName picture accountType bioUserId followers posts stats')
            .lean();
        const result = accounts.map((acc) => {
            var _a, _b;
            return ({
                userId: acc._id.toString(),
                username: acc.username,
                displayName: acc.displayName,
                accountType: (_a = acc.accountType) !== null && _a !== void 0 ? _a : 'User',
                picture: (_b = acc.picture) !== null && _b !== void 0 ? _b : '',
                followers: acc.followers || 0,
                posts: acc.posts || 0,
                active: acc.active || 'active'
            });
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getLinkedAccounts = getLinkedAccounts;
// @desc    Get accounts waiting for review
// @route   GET /api/users/review
// @access  Private (Admin/Staff only)
const getOnReviewAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const accounts = yield userModel_1.default.find({ active: 'onReview' })
            .select('_id username displayName picture accountType businessType businessEmail createdAt')
            .sort({ createdAt: -1 })
            .lean();
        res.json(accounts);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getOnReviewAccounts = getOnReviewAccounts;
// @desc    Approve or reject a business account
// @route   PUT /api/users/:id/approve
// @access  Private (Admin/Staff only)
const approveAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active' or 'rejected'
        if (!['active', 'rejected'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        const user = yield userModel_1.default.findByIdAndUpdate(id, { active: status }, { new: true });
        if (!user) {
            res.status(404).json({ message: 'Account not found' });
            return;
        }
        res.json({ message: `Account ${status === 'active' ? 'approved' : 'rejected'} successfully`, user });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.approveAccount = approveAccount;
