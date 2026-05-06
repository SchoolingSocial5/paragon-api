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
exports.adminCreateAccount = exports.adminDeleteUser = exports.bulkDeletePersons = exports.declineVerification = exports.verifyUser = exports.getBioUserDetailsByUsername = exports.getUsersDashboardData = exports.getVerifyingPersons = exports.getPersons = exports.getMonthlyRegistrations = exports.getUserStats = exports.getUsers = void 0;
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
const bioUserSchoolInfoModel_1 = __importDefault(require("../../../models/user/bioUserSchoolInfoModel"));
const bioUserModel_1 = __importDefault(require("../../../models/user/bioUserModel"));
const pastSchoolModel_1 = require("../../../models/school/pastSchoolModel");
const bioUserStateModel_1 = __importDefault(require("../../../models/user/bioUserStateModel"));
const postModel_1 = __importDefault(require("../../../models/post/postModel"));
const momentModel_1 = __importDefault(require("../../../models/post/momentModel"));
const Chat_1 = __importDefault(require("../../../models/chat/Chat"));
const Friend_1 = __importDefault(require("../../../models/chat/Friend"));
const BioChat_1 = __importDefault(require("../../../models/chat/BioChat"));
const BioFriend_1 = __importDefault(require("../../../models/chat/BioFriend"));
const followerModel_1 = require("../../../models/post/followerModel");
const blockModel_1 = require("../../../models/post/blockModel");
const muteModel_1 = require("../../../models/post/muteModel");
const repostModel_1 = require("../../../models/post/repostModel");
const commentModel_1 = __importDefault(require("../../../models/post/commentModel"));
const postStatModel_1 = require("../../../models/post/postStatModel");
const pinPostModel_1 = require("../../../models/post/pinPostModel");
const socialNotificationModel_1 = require("../../../models/messages/socialNotificationModel");
const personalNotificationModel_1 = require("../../../models/messages/personalNotificationModel");
const InvitedFriend_1 = __importDefault(require("../../../models/chat/InvitedFriend"));
const examPostModel_1 = require("../../../models/exam/examPostModel");
const visitorModel_1 = require("../../../models/user/visitorModel");
const bioUserSettingsModel_1 = __importDefault(require("../../../models/user/bioUserSettingsModel"));
const bioUserBankModel_1 = __importDefault(require("../../../models/user/bioUserBankModel"));
// @desc    Get all users for team dashboard
// @route   GET /api/team/users
// @access  Private/Staff
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [users, totalUsers] = yield Promise.all([
            userModel_1.default.find({}).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
            userModel_1.default.countDocuments({})
        ]);
        res.json({
            users,
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUsers = getUsers;
// @desc    Get user statistics (total and online)
// @route   GET /api/team/users/stats
// @access  Private/Staff
const getUserStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalUsers = yield userModel_1.default.countDocuments({});
        const onlineUsers = yield userModel_1.default.countDocuments({ online: true });
        res.json({
            totalUsers,
            onlineUsers
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUserStats = getUserStats;
// @desc    Get monthly user registrations for current year
// @route   GET /api/team/users/registrations
// @access  Private/Staff
const getMonthlyRegistrations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
        const registrations = yield userModel_1.default.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startOfYear,
                        $lte: endOfYear
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);
        // Map to 12 months ensuring all months are present
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const data = registrations.find(r => r._id === month);
            return {
                month,
                count: data ? data.count : 0
            };
        });
        res.json(monthlyData);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMonthlyRegistrations = getMonthlyRegistrations;
// @desc    Get all verified persons
// @route   GET /api/team/users/persons
// @access  Private/Staff
const getPersons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        let query = { isVerified: true };
        if (search) {
            query.$or = [
                { bioUserDisplayName: { $regex: search, $options: 'i' } },
                { bioUserUsername: { $regex: search, $options: 'i' } },
                { schoolName: { $regex: search, $options: 'i' } }
            ];
        }
        const [personsData, total] = yield Promise.all([
            bioUserSchoolInfoModel_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            bioUserSchoolInfoModel_1.default.countDocuments(query)
        ]);
        const bioUserIds = personsData.map(p => p.bioUserId);
        const bioUsers = yield bioUserModel_1.default.find({ _id: { $in: bioUserIds } }).select('email _id').lean();
        const persons = personsData.map(p => {
            var _a;
            return (Object.assign(Object.assign({}, p), { email: ((_a = bioUsers.find(bu => bu._id.toString() === p.bioUserId.toString())) === null || _a === void 0 ? void 0 : _a.email) || '' }));
        });
        res.json({
            persons,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPersons = getPersons;
// @desc    Get all users in verifying state
// @route   GET /api/team/users/verifying
// @access  Private/Staff
const getVerifyingPersons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        let query = { isOnVerification: true };
        if (search) {
            query.$or = [
                { bioUserDisplayName: { $regex: search, $options: 'i' } },
                { bioUserUsername: { $regex: search, $options: 'i' } }
            ];
        }
        const [verifyingRaw, total] = yield Promise.all([
            bioUserModel_1.default.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
            bioUserModel_1.default.countDocuments(query)
        ]);
        // Fetch school info for these users
        const bioUserIds = verifyingRaw.map(u => u._id);
        const schoolInfos = yield bioUserSchoolInfoModel_1.default.find({ bioUserId: { $in: bioUserIds } }).lean();
        const verifying = verifyingRaw.map(user => {
            const info = schoolInfos.find(s => s.bioUserId.toString() === user._id.toString());
            return {
                _id: user._id,
                bioUserDisplayName: user.bioUserDisplayName,
                bioUserUsername: user.bioUserUsername,
                bioUserPicture: user.bioUserPicture,
                firstName: user.firstName || '',
                middleName: user.middleName || '',
                lastName: user.lastName || '',
                stateOfOrigin: user.homeState || '',
                email: user.email || '',
                phone: user.phone || '',
                schoolName: (info === null || info === void 0 ? void 0 : info.schoolName) || '',
                schoolCertificate: (info === null || info === void 0 ? void 0 : info.schoolCertificate) || '',
                schoolTranscript: (info === null || info === void 0 ? void 0 : info.schoolTranscript) || '',
                createdAt: (info === null || info === void 0 ? void 0 : info.createdAt) || user.updatedAt,
                isVerifying: true
            };
        });
        res.json({
            verifying,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getVerifyingPersons = getVerifyingPersons;
// @desc    Get Users Dashboard summary data
// @route   GET /api/team/users/dashboard-data
// @access  Private/Staff
const getUsersDashboardData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [totalUsers, onlineUsers, verifiedPersons, verifyingPersons, totalBioUsers] = yield Promise.all([
            userModel_1.default.countDocuments({}),
            userModel_1.default.countDocuments({ online: true }),
            bioUserSchoolInfoModel_1.default.countDocuments({ isVerified: true }),
            bioUserModel_1.default.countDocuments({ isOnVerification: true }),
            bioUserModel_1.default.countDocuments({})
        ]);
        res.json({
            totalUsers,
            onlineUsers,
            verifiedPersons,
            verifyingPersons,
            totalBioUsers
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUsersDashboardData = getUsersDashboardData;
// @desc    Get bio-user details including school info by username
// @route   GET /api/team/users/username/:username
// @access  Private/Staff
const getBioUserDetailsByUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.params;
        const cleanUsername = username.replace(/^@/, '');
        // Fetch BioUser
        const bioUser = yield bioUserModel_1.default.findOne({ bioUserUsername: cleanUsername }).lean();
        if (!bioUser) {
            res.status(404).json({ message: 'BioUser not found' });
            return;
        }
        // Fetch BioUserSchoolInfo
        const schoolInfo = yield bioUserSchoolInfoModel_1.default.findOne({ bioUserId: bioUser._id }).lean();
        // Fetch PastSchools
        const pastSchools = yield pastSchoolModel_1.PastSchool.find({ bioUserId: bioUser._id.toString() }).sort({ admittedAt: -1 }).lean();
        res.json(Object.assign(Object.assign({}, bioUser), { schoolInfo: schoolInfo || null, pastSchools: pastSchools || [] }));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBioUserDetailsByUsername = getBioUserDetailsByUsername;
// @desc    Verify user and update related models
// @route   POST /api/team/users/verify/:id
// @access  Private/Staff
const verifyUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // 1. Update BioUser by its own ID
        const bioUser = yield bioUserModel_1.default.findByIdAndUpdate(id, { isVerified: true, isOnVerification: false }, { new: true });
        if (!bioUser) {
            res.status(404).json({ message: 'BioUser not found' });
            return;
        }
        const bioUserUsername = bioUser.bioUserUsername;
        // 2. Update all BioUser-level records in parallel
        yield Promise.all([
            // Extra safety sync via username
            bioUserModel_1.default.findOneAndUpdate({ bioUserUsername }, { isVerified: true, isOnVerification: false }),
            bioUserSchoolInfoModel_1.default.findOneAndUpdate({ bioUserId: id }, { isVerified: true, isVerifying: false }),
            bioUserStateModel_1.default.findOneAndUpdate({ bioUserId: id }, { isVerified: true, isOnVerification: false, verifiedAt: new Date() }),
            // BioFriend records owned by this BioUser
            BioFriend_1.default.updateMany({ bioUserId: id }, { isVerified: true }),
            // BioChat messages sent by this BioUser
            BioChat_1.default.updateMany({ bioUserUsername }, { isVerified: true }),
        ]);
        // 3. Find all associated User accounts and cascade to their records
        const associatedUsers = yield userModel_1.default.find({ bioUserId: id });
        if (associatedUsers.length > 0) {
            const cascadePromises = associatedUsers.flatMap(user => {
                const userId = user._id;
                const username = user.username;
                return [
                    // User account itself
                    userModel_1.default.findByIdAndUpdate(userId, { isVerified: true }),
                    // Posts authored by this user
                    postModel_1.default.updateMany({ userId }, { isVerified: true }),
                    // Embedded sharedPost snapshot when this user's post was shared
                    postModel_1.default.updateMany({ 'sharedPost.username': username }, { 'sharedPost.isVerified': true }),
                    // Comments by this user
                    commentModel_1.default.updateMany({ userId: userId.toString() }, { isVerified: true }),
                    // Moments by this user
                    momentModel_1.default.updateMany({ userId }, { isVerified: true }),
                    // Reposts made by this user
                    repostModel_1.Repost.updateMany({ userId: userId.toString() }, { isVerified: true }),
                    // Follower records — as the person being followed
                    followerModel_1.Follower.updateMany({ userId }, { isVerified: true }),
                    // Follower records — as the follower
                    followerModel_1.Follower.updateMany({ followerId: userId }, { followerIsVerified: true }),
                    // Block records — as the blocked person
                    blockModel_1.Block.updateMany({ userId }, { isVerified: true }),
                    // Block records — as the blocker
                    blockModel_1.Block.updateMany({ blockerId: userId }, { blockerIsVerified: true }),
                    // Mute records — as the muted person
                    muteModel_1.Mute.updateMany({ userId }, { isVerified: true }),
                    // Mute records — as the muter
                    muteModel_1.Mute.updateMany({ muterId: userId }, { muterIsVerified: true }),
                    // Friend records where this user is the displayed friend or sender
                    Friend_1.default.updateMany({ $or: [{ username }, { senderUsername: username }] }, { isVerified: true }),
                    // Chat messages sent by this user
                    Chat_1.default.updateMany({ senderUsername: username }, { isVerified: true }),
                ];
            });
            yield Promise.all(cascadePromises);
        }
        res.json({ message: 'User successfully verified across all records', bioUser });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.verifyUser = verifyUser;
// @desc    Decline user verification and reset state
// @route   POST /api/team/users/decline/:id
// @access  Private/Staff
const declineVerification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        // Reset verification flags in SchoolInfo and BioUserState
        yield bioUserSchoolInfoModel_1.default.findOneAndUpdate({ bioUserId: id }, { isVerifying: false });
        const bioUserState = yield bioUserStateModel_1.default.findOneAndUpdate({ bioUserId: id }, { isOnVerification: false });
        // Sync to BioUser using username from state if available, or direct ID
        const lookup = (bioUserState === null || bioUserState === void 0 ? void 0 : bioUserState.bioUserUsername) ?
            { bioUserUsername: bioUserState.bioUserUsername } :
            { _id: id };
        yield bioUserModel_1.default.findOneAndUpdate(lookup, { isOnVerification: false });
        res.json({ message: 'Verification declined and state reset' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.declineVerification = declineVerification;
// @desc    Bulk delete persons and all related records
// @route   DELETE /api/team/users/persons/bulk-delete
// @access  Private/Staff
const bulkDeletePersons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body; // Array of bioUserIds
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ message: 'No IDs provided for deletion' });
            return;
        }
        for (const bioUserId of ids) {
            // 1. Get BioUser to get the username
            const bioUser = yield bioUserModel_1.default.findById(bioUserId);
            if (!bioUser)
                continue;
            const bioUserUsername = bioUser.bioUserUsername;
            // 2. Find all User records associated with this bioUserId
            const associatedUsers = yield userModel_1.default.find({ bioUserId });
            for (const user of associatedUsers) {
                const username = user.username;
                const userId = user._id;
                // 3. Delete records tied to individual accounts (username/userId)
                yield Promise.all([
                    postModel_1.default.deleteMany({ $or: [{ userId }, { username }] }),
                    momentModel_1.default.deleteMany({ $or: [{ userId }, { username }] }),
                    Chat_1.default.deleteMany({ $or: [{ senderUsername: username }, { receiverUsername: username }] }),
                    Friend_1.default.deleteMany({ $or: [{ username }, { senderUsername: username }] }),
                    followerModel_1.Follower.deleteMany({ $or: [{ username }, { followerUsername: username }] }),
                    userModel_1.default.findByIdAndDelete(userId)
                ]);
            }
            // 4. Delete records tied to the BioUser (bioUserId/bioUserUsername)
            yield Promise.all([
                BioChat_1.default.deleteMany({ $or: [{ bioUserUsername: bioUserUsername }, { receiverBioUserUsername: bioUserUsername }] }),
                BioFriend_1.default.deleteMany({ $or: [{ bioUserUsername: bioUserUsername }, { senderBioUserUsername: bioUserUsername }] }),
                bioUserSchoolInfoModel_1.default.deleteMany({ bioUserId }),
                bioUserStateModel_1.default.deleteMany({ bioUserId }),
                pastSchoolModel_1.PastSchool.deleteMany({ bioUserId: bioUserId.toString() }),
                bioUserModel_1.default.findByIdAndDelete(bioUserId)
            ]);
        }
        res.json({ message: `Successfully deleted ${ids.length} persons and all their associated records.` });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.bulkDeletePersons = bulkDeletePersons;
// @desc    Delete user account (Simple or Complete)
// @route   DELETE /api/team/users/:id
// @access  Private/Staff
const adminDeleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { type } = req.query; // 'simple' or 'complete'
        const user = yield userModel_1.default.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const userId = user._id;
        const username = user.username;
        const bioUserId = user.bioUserId;
        const userIdStr = userId.toString();
        if (type === 'complete' && bioUserId) {
            // COMPLETE DELETE: Handles BioUser and ALL associated accounts
            const associatedUsers = yield userModel_1.default.find({ bioUserId });
            for (const assocUser of associatedUsers) {
                const assocUsername = assocUser.username;
                const assocUserId = assocUser._id;
                const assocUserIdStr = assocUserId.toString();
                yield Promise.all([
                    postModel_1.default.deleteMany({ $or: [{ userId: assocUserId }, { username: assocUsername }] }),
                    momentModel_1.default.deleteMany({ $or: [{ userId: assocUserId }, { username: assocUsername }] }),
                    Chat_1.default.deleteMany({ $or: [{ senderUsername: assocUsername }, { receiverUsername: assocUsername }] }),
                    Friend_1.default.deleteMany({ $or: [{ username: assocUsername }, { senderUsername: assocUsername }] }),
                    followerModel_1.Follower.deleteMany({ $or: [{ username: assocUsername }, { followerUsername: assocUsername }] }),
                    commentModel_1.default.deleteMany({ $or: [{ userId: assocUserIdStr }, { username: assocUsername }] }),
                    postStatModel_1.Like.deleteMany({ userId: assocUserIdStr }),
                    postStatModel_1.Bookmark.deleteMany({ userId: assocUserIdStr }),
                    postStatModel_1.Hate.deleteMany({ userId: assocUserIdStr }),
                    pinPostModel_1.Pin.deleteMany({ userId: assocUserIdStr }),
                    socialNotificationModel_1.SocialNotification.deleteMany({ username: assocUsername }),
                    personalNotificationModel_1.PersonalNotification.deleteMany({ $or: [{ senderUsername: assocUsername }, { bioUserUsername: assocUsername }] }),
                    InvitedFriend_1.default.deleteMany({ $or: [{ inviterUsername: assocUsername }, { invitedUsername: assocUsername }] }),
                    examPostModel_1.ExamPost.deleteMany({ userId: assocUserIdStr }),
                    visitorModel_1.Visitor.deleteMany({ $or: [{ visitorId: assocUserIdStr }, { userId: assocUserIdStr }] }),
                    muteModel_1.Mute.deleteMany({ $or: [{ muterId: assocUserIdStr }, { userId: assocUserIdStr }] }),
                    blockModel_1.Block.deleteMany({ $or: [{ blockerId: assocUserIdStr }, { userId: assocUserIdStr }] }),
                    userModel_1.default.findByIdAndDelete(assocUserId)
                ]);
            }
            const bioUser = yield bioUserModel_1.default.findById(bioUserId);
            if (bioUser) {
                const bioUserUsername = bioUser.bioUserUsername;
                yield Promise.all([
                    BioChat_1.default.deleteMany({ $or: [{ bioUserUsername: bioUserUsername }, { receiverBioUserUsername: bioUserUsername }] }),
                    BioFriend_1.default.deleteMany({ $or: [{ bioUserUsername: bioUserUsername }, { senderBioUserUsername: bioUserUsername }] }),
                    bioUserSchoolInfoModel_1.default.deleteMany({ bioUserId }),
                    bioUserStateModel_1.default.deleteMany({ bioUserId }),
                    pastSchoolModel_1.PastSchool.deleteMany({ bioUserId: bioUserId.toString() }),
                    bioUserModel_1.default.findByIdAndDelete(bioUserId)
                ]);
            }
            res.json({ message: 'Account and all associated personal data deleted completely' });
        }
        else {
            // SIMPLE DELETE: Only handles this specific User account and its social data
            yield Promise.all([
                postModel_1.default.deleteMany({ $or: [{ userId }, { username }] }),
                momentModel_1.default.deleteMany({ $or: [{ userId }, { username }] }),
                Chat_1.default.deleteMany({ $or: [{ senderUsername: username }, { receiverUsername: username }] }),
                Friend_1.default.deleteMany({ $or: [{ username }, { senderUsername: username }] }),
                followerModel_1.Follower.deleteMany({ $or: [{ username }, { followerUsername: username }] }),
                commentModel_1.default.deleteMany({ $or: [{ userId: userIdStr }, { username }] }),
                postStatModel_1.Like.deleteMany({ userId: userIdStr }),
                postStatModel_1.Bookmark.deleteMany({ userId: userIdStr }),
                postStatModel_1.Hate.deleteMany({ userId: userIdStr }),
                pinPostModel_1.Pin.deleteMany({ userId: userIdStr }),
                socialNotificationModel_1.SocialNotification.deleteMany({ username }),
                personalNotificationModel_1.PersonalNotification.deleteMany({ $or: [{ senderUsername: username }, { bioUserUsername: username }] }),
                InvitedFriend_1.default.deleteMany({ $or: [{ inviterUsername: username }, { invitedUsername: username }] }),
                examPostModel_1.ExamPost.deleteMany({ userId: userIdStr }),
                visitorModel_1.Visitor.deleteMany({ $or: [{ visitorId: userIdStr }, { userId: userIdStr }] }),
                muteModel_1.Mute.deleteMany({ $or: [{ muterId: userIdStr }, { userId: userIdStr }] }),
                blockModel_1.Block.deleteMany({ $or: [{ blockerId: userIdStr }, { userId: userIdStr }] }),
                userModel_1.default.findByIdAndDelete(userId)
            ]);
            if (bioUserId) {
                yield bioUserModel_1.default.findByIdAndUpdate(bioUserId, {
                    $pull: { accounts: { userId: userIdStr } }
                });
            }
            res.json({ message: 'Account and associated social records deleted successfully' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.adminDeleteUser = adminDeleteUser;
// @desc    Admin create account (Manual provisioning)
// @route   POST /api/team/users/admin/create
// @access  Private/Staff
const adminCreateAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, username, displayName, password, intro, country, state, area, picture, accountType, active } = req.body;
        // Check if account already exists
        const userExists = yield userModel_1.default.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            res.status(400).json({ message: 'User with this email or username already exists' });
            return;
        }
        // 1. Create BioUser first
        const bioUser = new bioUserModel_1.default({
            email,
            bioUserDisplayName: displayName,
            bioUserUsername: username,
            bioUserPicture: picture,
            bioUserIntro: intro,
            signupIp: req.ip || req.socket.remoteAddress || "127.0.0.1"
        });
        yield bioUser.save();
        // 2. Create related BioUser models
        yield Promise.all([
            bioUserSchoolInfoModel_1.default.create({ bioUserId: bioUser._id, bioUserDisplayName: displayName, bioUserUsername: username, bioUserPicture: picture }),
            bioUserSettingsModel_1.default.create({ bioUserId: bioUser._id }),
            bioUserStateModel_1.default.create({ bioUserId: bioUser._id }),
            bioUserBankModel_1.default.create({ bioUserId: bioUser._id, bankCountry: country || 'Unknown' })
        ]);
        // 3. Create the actual User account
        const newUser = new userModel_1.default({
            bioUserId: bioUser._id,
            email,
            username,
            displayName,
            password, // Will be hashed by pre-save hook
            intro,
            picture,
            country,
            state,
            area,
            accountType: accountType || 'User',
            active: active || 'active',
            isFirstTime: false,
            isFriendly: true,
            status: 'offline',
            signupIp: bioUser.signupIp
        });
        yield newUser.save();
        // 4. Update BioUser's accounts array
        yield bioUserModel_1.default.findByIdAndUpdate(bioUser._id, {
            $push: { accounts: { userId: newUser._id.toString(), username: newUser.username, displayName: newUser.displayName, picture: newUser.picture, accountType: newUser.accountType } }
        });
        res.status(201).json({
            message: `${accountType} account created successfully`,
            user: newUser
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.adminCreateAccount = adminCreateAccount;
