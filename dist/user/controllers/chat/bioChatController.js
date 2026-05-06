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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markBioChatAsSeen = exports.markBioChatAsSeenLogic = exports.markBioChatAsDeliveredLogic = exports.uploadBioChatMedia = exports.sendMessage = exports.createBioChatLogic = exports.getBioUserByUsername = exports.getMessages = void 0;
const BioChat_1 = __importDefault(require("../../../models/chat/BioChat"));
const BioFriend_1 = __importDefault(require("../../../models/chat/BioFriend"));
const bioUserSchoolInfoModel_1 = __importDefault(require("../../../models/user/bioUserSchoolInfoModel"));
const socket_1 = require("../../../socket");
const s3_1 = require("../../../utils/s3");
const sanitize_1 = require("../../../utils/sanitize");
// @desc    Get messages for a conversation
// @route   GET /api/biochat/messages/:receiverBioUserUsername
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { receiverBioUserUsername } = req.params;
        const bioUserUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        const { around, limit: limitQuery, page: pageQuery } = req.query;
        const limit = parseInt(limitQuery) || 20;
        if (around) {
            const connection = [bioUserUsername, receiverBioUserUsername].sort().join('');
            let centerTime;
            if (!isNaN(Number(around))) {
                centerTime = Number(around);
            }
            else {
                // Assume it's an _id
                const targetMsg = yield BioChat_1.default.findById(around);
                if (!targetMsg) {
                    res.status(404).json({ message: 'Target message not found' });
                    return;
                }
                centerTime = targetMsg.timeNumber;
            }
            const halfLimit = Math.floor(limit / 2);
            const [before, after] = yield Promise.all([
                BioChat_1.default.find({
                    connection,
                    timeNumber: { $lte: centerTime }
                })
                    .sort({ timeNumber: -1 })
                    .limit(halfLimit + 1),
                BioChat_1.default.find({
                    connection,
                    timeNumber: { $gt: centerTime }
                })
                    .sort({ timeNumber: 1 })
                    .limit(halfLimit)
            ]);
            const merged = [...before, ...after].sort((a, b) => a.timeNumber - b.timeNumber);
            res.json(merged);
            return;
        }
        const page = parseInt(pageQuery) || 1;
        const skip = (page - 1) * limit;
        const messages = yield BioChat_1.default.find({
            $or: [
                { bioUserUsername: bioUserUsername, receiverBioUserUsername: receiverBioUserUsername },
                { bioUserUsername: receiverBioUserUsername, receiverBioUserUsername: bioUserUsername }
            ]
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        res.json(messages.reverse());
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMessages = getMessages;
// @desc    Get bio user info by username
// @route   GET /api/biochat/user/:username
const getBioUserByUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.params;
        const schoolInfo = yield bioUserSchoolInfoModel_1.default.findOne({ bioUserUsername: username });
        if (!schoolInfo) {
            res.status(404).json({ message: 'Bio user not found' });
            return;
        }
        res.json(schoolInfo);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBioUserByUsername = getBioUserByUsername;
const createBioChatLogic = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { connection, repliedChat, friendChat, bioUserUsername, receiverBioUserUsername, timeNumber } = data;
        const existingMessage = yield BioChat_1.default.findOne({
            timeNumber,
            bioUserUsername: { $regex: new RegExp(`^${bioUserUsername}$`, 'i') }
        });
        if (existingMessage)
            return existingMessage;
        const receiverSentMessage = yield BioChat_1.default.findOne({
            connection,
            bioUserUsername: receiverBioUserUsername
        });
        const isFriends = !!receiverSentMessage;
        const _a = friendChat || {}, { isOnline: _ignored } = _a, sanitizedFriendChat = __rest(_a, ["isOnline"]);
        let friendDoc = yield BioFriend_1.default.findOneAndUpdate({ connection, bioUserUsername: receiverBioUserUsername, senderBioUserUsername: bioUserUsername }, Object.assign(Object.assign({}, sanitizedFriendChat), { bioUserUsername: receiverBioUserUsername, senderBioUserUsername: bioUserUsername, bioUserDisplayName: data.receiverBioUserDisplayName, bioUserPicture: data.receiverBioUserPicture, senderBioUserDisplayName: data.bioUserDisplayName, senderBioUserPicture: data.bioUserPicture, timeNumber: data.timeNumber, isFriends, isFriendRequest: !isFriends, status: 'sent', media: data.media || [] }), { upsert: true, returnDocument: 'after' });
        let receiverFriendDoc = null;
        if (isFriends) {
            receiverFriendDoc = yield BioFriend_1.default.findOneAndUpdate({ connection, bioUserUsername: bioUserUsername, senderBioUserUsername: receiverBioUserUsername }, {
                $set: {
                    content: data.content,
                    bioUserUsername: bioUserUsername,
                    senderBioUserUsername: receiverBioUserUsername,
                    bioUserDisplayName: data.bioUserDisplayName,
                    bioUserPicture: data.bioUserPicture,
                    senderBioUserDisplayName: data.receiverBioUserDisplayName,
                    senderBioUserPicture: data.receiverBioUserPicture,
                    bioUserId: data.senderBioUserId,
                    timeNumber: data.timeNumber,
                    isFriends,
                    isFriendRequest: !isFriends,
                    status: 'received',
                    media: data.media || []
                },
                $inc: { unread: 1 }
            }, { upsert: true, new: true, returnDocument: 'after' });
            yield BioFriend_1.default.updateMany({ connection }, { $set: { isFriends: true } });
            yield BioChat_1.default.updateMany({ connection }, { $set: { isFriends: true } });
        }
        const message = yield BioChat_1.default.create({
            from: bioUserUsername,
            content: (0, sanitize_1.xssClean)(data.content),
            message: (0, sanitize_1.xssClean)(data.content),
            day: data.day,
            connection,
            repliedChat,
            isFriends,
            bioUserUsername,
            bioUserPicture: data.bioUserPicture,
            receiverBioUserUsername,
            receiverBioUserPicture: data.receiverBioUserPicture,
            senderTime: data.senderTime,
            timeNumber: data.timeNumber,
            isVerified: data.isVerified,
            media: data.media || [],
            status: 'sent',
            createdAt: new Date(),
        });
        const io = (0, socket_1.getIO)();
        if (io) {
            io.emit(`bio_friend_updated_${bioUserUsername.toLowerCase()}`, friendDoc);
            io.emit(`new_bio_message_${bioUserUsername.toLowerCase()}`, message);
            io.emit(`new_bio_message_${receiverBioUserUsername.toLowerCase()}`, message);
            io.emit(`bio_friend_updated_${receiverBioUserUsername.toLowerCase()}`, receiverFriendDoc);
        }
        return message;
    }
    catch (error) {
        console.error('Error in createBioChatLogic:', error);
        throw error;
    }
});
exports.createBioChatLogic = createBioChatLogic;
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const message = yield (0, exports.createBioChatLogic)(req.body);
        res.status(201).json(message);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.sendMessage = sendMessage;
const uploadBioChatMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files;
        const payload = JSON.parse(req.body.payload);
        const media = [];
        if (files && files.length > 0) {
            for (const file of files) {
                const s3Url = yield (0, s3_1.uploadBufferToS3)(file.buffer, file.originalname, file.mimetype);
                media.push({
                    source: s3Url,
                    name: file.originalname,
                    type: file.mimetype,
                    size: file.size,
                    duration: 0
                });
            }
        }
        const data = Object.assign(Object.assign({}, payload), { media: media.length > 0 ? media : (payload.media || []) });
        const result = yield (0, exports.createBioChatLogic)(data);
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.uploadBioChatMedia = uploadBioChatMedia;
const markBioChatAsDeliveredLogic = (ids) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!ids || ids.length === 0)
            return;
        yield BioChat_1.default.updateMany({ _id: { $in: ids }, status: 'sent' }, { $set: { status: 'delivered' } });
        const updatedMessages = yield BioChat_1.default.find({ _id: { $in: ids } });
        const io = (0, socket_1.getIO)();
        if (io && updatedMessages.length > 0) {
            const User = require('../../../models/User').default;
            for (const msg of updatedMessages) {
                const [senderUser, receiverUser] = yield Promise.all([
                    User.findOne({ username: { $regex: new RegExp(`^${msg.bioUserUsername}$`, 'i') } }).select('online'),
                    User.findOne({ username: { $regex: new RegExp(`^${msg.receiverBioUserUsername}$`, 'i') } }).select('online')
                ]);
                const payload = {
                    _id: msg._id.toString(),
                    timeNumber: msg.timeNumber,
                    connection: msg.connection,
                    status: 'delivered',
                    senderOnline: (senderUser === null || senderUser === void 0 ? void 0 : senderUser.online) || false,
                    receiverOnline: (receiverUser === null || receiverUser === void 0 ? void 0 : receiverUser.online) || false
                };
                io.emit(`bio_message_delivered_${msg.bioUserUsername.toLowerCase()}`, payload);
                io.emit(`bio_message_delivered_${msg.receiverBioUserUsername.toLowerCase()}`, payload);
            }
        }
    }
    catch (error) {
        console.error('Error in markBioChatAsDeliveredLogic:', error);
    }
});
exports.markBioChatAsDeliveredLogic = markBioChatAsDeliveredLogic;
const markBioChatAsSeenLogic = (connection, currentUsername) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!connection || !currentUsername)
            return;
        // 1. Update messages in BioChat model
        yield BioChat_1.default.updateMany({
            connection,
            receiverBioUserUsername: { $regex: new RegExp(`^${currentUsername}$`, 'i') },
            status: { $ne: 'seen' }
        }, { $set: { status: 'seen' } });
        // 2. Reset unread count for the receiver (currentUsername)
        yield BioFriend_1.default.updateMany({
            connection,
            senderBioUserUsername: { $regex: new RegExp(`^${currentUsername}$`, 'i') }
        }, { $set: { unread: 0 } });
        // 3. Sync BioFriend record status if the latest message is now seen
        const latestMsg = yield BioChat_1.default.findOne({ connection }).sort({ timeNumber: -1 });
        if (latestMsg && latestMsg.status === 'seen') {
            yield BioFriend_1.default.updateMany({ connection }, { $set: { status: 'seen' } });
        }
        const io = (0, socket_1.getIO)();
        if (io) {
            // Emit bio friend updates
            const friends = yield BioFriend_1.default.find({ connection });
            for (const f of friends) {
                io.emit(`bio_friend_updated_${f.senderBioUserUsername.toLowerCase()}`, f);
            }
            // Emit total unread count for receiver
            const count = yield BioFriend_1.default.countDocuments({
                senderBioUserUsername: { $regex: new RegExp(`^${currentUsername}$`, 'i') },
                unread: { $gt: 0 }
            });
            io.emit(`unread_bio_chat_count_${currentUsername.toLowerCase()}`, { count });
            // Emit message seen event to both
            const participants = [...new Set(friends.map(f => f.senderBioUserUsername))];
            for (const p of participants) {
                io.emit(`bio_message_seen_${p.toLowerCase()}`, {
                    connection,
                    status: 'seen'
                });
            }
        }
    }
    catch (error) {
        console.error('Error in markBioChatAsSeenLogic:', error);
    }
});
exports.markBioChatAsSeenLogic = markBioChatAsSeenLogic;
const markBioChatAsSeen = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { connection } = req.params;
        const currentUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        if (connection && currentUsername) {
            yield (0, exports.markBioChatAsSeenLogic)(connection, currentUsername);
        }
        res.json({ message: 'Messages marked as seen' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.markBioChatAsSeen = markBioChatAsSeen;
