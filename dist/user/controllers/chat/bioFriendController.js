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
exports.getUnreadBioChatCount = exports.updateBioOnlineStatusLogic = exports.getBioFriends = void 0;
const BioFriend_1 = __importDefault(require("../../../models/chat/BioFriend"));
const socket_1 = require("../../../socket");
const getBioFriends = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const bioUserUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        // Use aggregation to join with BioUserSchoolInfo
        const friends = yield BioFriend_1.default.aggregate([
            { $match: { senderBioUserUsername: bioUserUsername } },
            { $sort: { timeNumber: -1 } },
            { $limit: 100 },
            {
                $lookup: {
                    from: 'biouserschoolinfos', // Note: Check collection name (usually lowercase plural)
                    localField: 'bioUserId',
                    foreignField: 'bioUserId',
                    as: 'schoolInfo'
                }
            },
            { $unwind: { path: '$schoolInfo', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    // Spread schoolInfo fields into top level for easier mapping in BioUserListItem
                    schoolName: '$schoolInfo.schoolName',
                    schoolLevelName: '$schoolInfo.schoolLevelName',
                    schoolAcademicLevel: '$schoolInfo.schoolAcademicLevel',
                    schoolDepartment: '$schoolInfo.schoolDepartment',
                    schoolFaculty: '$schoolInfo.schoolFaculty',
                    schoolState: '$schoolInfo.schoolState',
                    schoolCountry: '$schoolInfo.schoolCountry',
                    isVerified: '$schoolInfo.isVerified',
                    inSchool: '$schoolInfo.inSchool',
                    schoolLogo: '$schoolInfo.schoolLogo'
                }
            },
            { $project: { schoolInfo: 0 } }
        ]);
        res.json(friends);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBioFriends = getBioFriends;
const updateBioOnlineStatusLogic = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { isOnline, bioUserUsername } = data;
        if (!bioUserUsername)
            return;
        // 0. Update the actual User model status
        const User = require('../../../models/user/userModel').default;
        yield User.findOneAndUpdate({ username: { $regex: new RegExp(`^${bioUserUsername}$`, 'i') } }, {
            $set: {
                online: !!isOnline,
                status: isOnline ? 'online' : 'offline'
            }
        });
        // 1. Update isOnline on ALL BioFriend docs
        yield BioFriend_1.default.updateMany({ bioUserUsername: { $regex: new RegExp(`^${bioUserUsername}$`, 'i') } }, { $set: { isOnline: !!isOnline } });
        // 1.5 Update isOnline on ALL Friend docs (for the Accounts tab)
        const Friend = require('../../../models/chat/Friend').default;
        yield Friend.updateMany({ username: { $regex: new RegExp(`^${bioUserUsername}$`, 'i') } }, { $set: { isOnline: !!isOnline } });
        // 2. RETRIEVE UPDATED DOCUMENTS
        const updatedBioDocs = yield BioFriend_1.default.find({
            bioUserUsername: { $regex: new RegExp(`^${bioUserUsername}$`, 'i') }
        });
        const updatedFriendDocs = yield Friend.find({
            username: { $regex: new RegExp(`^${bioUserUsername}$`, 'i') }
        });
        const io = (0, socket_1.getIO)();
        if (!io)
            return;
        // 3. Emit presence to bio contacts
        for (const doc of updatedBioDocs) {
            if (doc.senderBioUserUsername) {
                const eventName = `presence_updated_bio_${doc.senderBioUserUsername.toLowerCase()}`;
                io.emit(eventName, {
                    username: doc.bioUserUsername,
                    isOnline: doc.isOnline,
                    connection: doc.connection
                });
            }
        }
        // 3.5 Emit presence to standard contacts
        for (const doc of updatedFriendDocs) {
            if (doc.senderUsername) {
                const eventName = `presence_updated_${doc.senderUsername.toLowerCase()}`;
                io.emit(eventName, {
                    username: doc.username,
                    isOnline: doc.isOnline,
                    connection: doc.connection
                });
            }
        }
        // 4. Global broadcast
        io.emit('user_status_changed', {
            username: bioUserUsername,
            isOnline: !!isOnline,
        });
    }
    catch (error) {
        console.error('[UpdateBioOnlineStatus] Error:', error);
    }
});
exports.updateBioOnlineStatusLogic = updateBioOnlineStatusLogic;
const getUnreadBioChatCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const bioUserUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        const count = yield BioFriend_1.default.countDocuments({
            senderBioUserUsername: { $regex: new RegExp(`^${bioUserUsername}$`, 'i') },
            unread: { $gt: 0 }
        });
        res.json({ count });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getUnreadBioChatCount = getUnreadBioChatCount;
