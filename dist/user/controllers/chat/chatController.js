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
exports.searchChats = exports.markMediaAsSeenById = exports.markAsRead = exports.uploadChatMedia = exports.sendMessage = exports.markAsSeenLogic = exports.markAsDeliveredLogic = exports.bulkDeleteMessagesLogic = exports.deleteMessageLogic = exports.createChatLogic = exports.getMessages = exports.getTotalUnreadCount = void 0;
const Chat_1 = __importDefault(require("../../../models/chat/Chat"));
const Friend_1 = __importDefault(require("../../../models/chat/Friend"));
const socket_1 = require("../../../socket");
const s3_1 = require("../../../utils/s3");
const sanitize_1 = require("../../../utils/sanitize");
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
const BioChat_1 = __importDefault(require("../../../models/chat/BioChat"));
const BioFriend_1 = __importDefault(require("../../../models/chat/BioFriend"));
const blockModel_1 = require("../../../models/post/blockModel");
const getTotalUnreadCount = (username) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const count = yield Friend_1.default.countDocuments({
            senderUsername: username,
            unread: { $gt: 0 }
        });
        return count;
    }
    catch (error) {
        console.error('Error calculating total unread count:', error);
        return 0;
    }
});
exports.getTotalUnreadCount = getTotalUnreadCount;
// @desc    Get messages for a conversation
// @route   GET /api/chat/messages/:receiverUsername
// @access  Private
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { receiverUsername } = req.params;
        const senderUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        const { around, limit: limitQuery, page: pageQuery } = req.query;
        const limit = parseInt(limitQuery) || 20;
        if (around) {
            const connection = [senderUsername, receiverUsername].map(u => u.toLowerCase()).sort().join('');
            let centerTime;
            if (!isNaN(Number(around))) {
                centerTime = Number(around);
            }
            else {
                // Assume it's an _id
                const targetMsg = yield Chat_1.default.findById(around);
                if (!targetMsg) {
                    res.status(404).json({ message: 'Target message not found' });
                    return;
                }
                centerTime = targetMsg.timeNumber;
            }
            // Fetch roughly half before and half after the target time
            const halfLimit = Math.floor(limit / 2);
            const [before, after] = yield Promise.all([
                Chat_1.default.find({
                    connection,
                    timeNumber: { $lte: centerTime }
                })
                    .sort({ timeNumber: -1 })
                    .limit(halfLimit + 1), // +1 to ensure center message is included
                Chat_1.default.find({
                    connection,
                    timeNumber: { $gt: centerTime }
                })
                    .sort({ timeNumber: 1 })
                    .limit(halfLimit)
            ]);
            // Combine, sort, and return
            const merged = [...before, ...after].sort((a, b) => a.timeNumber - b.timeNumber);
            res.json(merged);
            return;
        }
        const page = parseInt(pageQuery) || 1;
        const skip = (page - 1) * limit;
        const messages = yield Chat_1.default.find({
            $or: [
                { senderUsername: senderUsername, receiverUsername: receiverUsername },
                { senderUsername: receiverUsername, receiverUsername: senderUsername }
            ]
        })
            .sort({ createdAt: -1 }) // Get latest messages first
            .skip(skip)
            .limit(limit);
        // Reverse to maintain chronological order for the client (ascending)
        res.json(messages.reverse());
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMessages = getMessages;
// @desc    Internal logic to create a message
const createChatLogic = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { repliedChat, friendChat, senderUsername, receiverUsername, timeNumber } = data;
        // Standardize connection ID: lowercase, sorted, joined
        if (!senderUsername || !receiverUsername) {
            throw new Error("Sender and Receiver usernames are required");
        }
        const connection = [senderUsername, receiverUsername].map(u => (u || '').toLowerCase()).sort().join('');
        // 0. Idempotency Check: Prevent duplicate messages from multi-flow sends (HTTP + Socket)
        // or network retries. We check for existing message by sender and timestamp.
        const existingMessage = yield Chat_1.default.findOne({
            timeNumber,
            senderUsername: { $regex: new RegExp(`^${senderUsername}$`, 'i') }
        });
        if (existingMessage) {
            return existingMessage;
        }
        // 0.1 Authorization Check: Is the sender allowed to chat the receiver?
        const [targetUser, senderUserFull, isBlockedByTarget, isTargetBlockedByMe] = yield Promise.all([
            userModel_1.default.findOne({ username: { $regex: new RegExp(`^${receiverUsername}$`, 'i') } }),
            userModel_1.default.findOne({ username: { $regex: new RegExp(`^${senderUsername}$`, 'i') } }),
            blockModel_1.Block.findOne({
                blockerUsername: { $regex: new RegExp(`^${receiverUsername}$`, 'i') },
                username: { $regex: new RegExp(`^${senderUsername}$`, 'i') }
            }),
            blockModel_1.Block.findOne({
                blockerUsername: { $regex: new RegExp(`^${senderUsername}$`, 'i') },
                username: { $regex: new RegExp(`^${receiverUsername}$`, 'i') }
            })
        ]);
        if (isBlockedByTarget) {
            throw new Error("You have been blocked by this user");
        }
        if (isTargetBlockedByMe) {
            throw new Error("You have blocked this user");
        }
        // 0.2 Normalize usernames to their exact database casing to prevent duplicate Friend records
        // due to case-sensitive finds in findOneAndUpdate
        const authorativeSender = senderUserFull ? senderUserFull.username : senderUsername;
        const authorativeReceiver = targetUser ? targetUser.username : receiverUsername;
        const isFriends = true; // Every message establishing a connection now forces friendship
        // Sanitize media early — used in Friend records AND Chat.create below.
        // The app sends size as a human-readable string (e.g. '101.04 KB') but
        // the schema expects a Number, so we strip/convert here.
        const sanitizedMedia = (data.media || []).map((item) => ({
            source: item.source || '',
            name: item.name || '',
            type: item.type || '',
            preview: item.preview || null,
            duration: typeof item.duration === 'number' ? item.duration : 0,
            size: typeof item.size === 'number'
                ? item.size
                : parseFloat(String(item.size || '0').replace(/[^0-9.]/g, '')) || 0,
        }));
        // 1. Update or create Friend record for the sender (Perspective: A sees B)
        const _a = friendChat || {}, { isOnline: _ignored } = _a, sanitizedFriendChat = __rest(_a, ["isOnline"]);
        let friendDoc = yield Friend_1.default.findOneAndUpdate({ connection, username: authorativeReceiver, senderUsername: authorativeSender }, Object.assign(Object.assign({}, sanitizedFriendChat), { username: authorativeReceiver, senderUsername: authorativeSender, displayName: targetUser ? targetUser.displayName : data.receiverDisplayName || authorativeReceiver, picture: targetUser ? targetUser.picture : data.receiverPicture, timeNumber: data.timeNumber, isFriends, isFriendRequest: false, status: 'sent', media: sanitizedMedia, content: data.content }), { upsert: true, new: true, returnDocument: 'after' });
        // 2. Update or create Friend record for the receiver (Perspective: B sees A)
        const receiverFriendDoc = yield Friend_1.default.findOneAndUpdate({ connection, username: authorativeSender, senderUsername: authorativeReceiver }, {
            $set: {
                content: data.content,
                username: authorativeSender,
                senderUsername: authorativeReceiver,
                displayName: senderUserFull ? senderUserFull.displayName : data.senderDisplayName || authorativeSender,
                picture: senderUserFull ? senderUserFull.picture : data.senderPicture,
                bioUserId: data.senderBioUserId || (senderUserFull ? senderUserFull.bioUserId : undefined),
                timeNumber: data.timeNumber,
                isFriends,
                isFriendRequest: false,
                status: 'received',
                media: sanitizedMedia
            },
            $inc: { unread: 1 }
        }, { upsert: true, new: true, returnDocument: 'after' });
        // If they just became friends, sync status across all previous records
        if (isFriends) {
            yield Friend_1.default.updateMany({ connection }, { $set: { isFriends: true } });
            yield Chat_1.default.updateMany({ connection }, { $set: { isFriends: true } });
        }
        // 3. Create the Chat message
        let newMessage;
        try {
            newMessage = yield Chat_1.default.create({
                from: data.senderUsername,
                content: data.content,
                message: data.content,
                day: data.day,
                connection,
                repliedChat,
                isFriends,
                senderUsername: data.senderUsername,
                senderPicture: data.senderPicture,
                receiverUsername: data.receiverUsername,
                receiverPicture: data.receiverPicture,
                senderTime: data.senderTime,
                timeNumber: data.timeNumber,
                isVerified: data.isVerified,
                media: sanitizedMedia,
                status: 'sent',
                createdAt: new Date(),
            });
        }
        catch (err) {
            // Handle race condition: Message already exists
            if (err.code === 11000) {
                console.warn(`[Sync Collision] Message already exists: ${senderUsername} at ${timeNumber}`);
                newMessage = yield Chat_1.default.findOne({
                    timeNumber,
                    senderUsername: { $regex: new RegExp(`^${senderUsername}$`, 'i') }
                });
                if (newMessage)
                    return newMessage;
            }
            throw err;
        }
        const io = (0, socket_1.getIO)();
        if (io) {
            const presence = {
                senderOnline: (senderUserFull === null || senderUserFull === void 0 ? void 0 : senderUserFull.online) || false,
                receiverOnline: (targetUser === null || targetUser === void 0 ? void 0 : targetUser.online) || false
            };
            io.emit(`friend_updated_${senderUsername.toLowerCase()}`, Object.assign(Object.assign({}, ((friendDoc === null || friendDoc === void 0 ? void 0 : friendDoc.toObject) ? friendDoc.toObject() : friendDoc || {})), presence));
            io.emit(`new_message_${senderUsername.toLowerCase()}`, Object.assign(Object.assign({}, newMessage.toObject()), presence));
            io.emit(`new_message_${receiverUsername.toLowerCase()}`, Object.assign(Object.assign({}, newMessage.toObject()), presence));
            io.emit(`friend_updated_${receiverUsername.toLowerCase()}`, Object.assign(Object.assign({}, ((receiverFriendDoc === null || receiverFriendDoc === void 0 ? void 0 : receiverFriendDoc.toObject) ? receiverFriendDoc.toObject() : receiverFriendDoc || {})), presence));
            // Emit total unread count for receiver
            const unreadCount = yield (0, exports.getTotalUnreadCount)(receiverUsername);
            io.emit(`unread_chat_count_${receiverUsername.toLowerCase()}`, { count: unreadCount });
            // Friend request counts are no longer used as every message establishes a direct friendship
        }
        return newMessage;
    }
    catch (error) {
        console.error('Error in createChatLogic:', error);
        throw error;
    }
});
exports.createChatLogic = createChatLogic;
// @desc    Internal logic to delete a message
const deleteMessageLogic = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { timeNumber, connection, username } = data;
        // 1. Fetch the message to check authorship
        const messageToUpdate = yield Chat_1.default.findOne({ timeNumber, connection });
        if (!messageToUpdate) {
            console.warn(`Socket: Message with timeNumber ${timeNumber} not found for deletion`);
            return;
        }
        // 2. Security Check: Only the sender can delete their own message
        if (messageToUpdate.senderUsername !== username) {
            console.error(`Socket: Unauthorized deletion attempt by ${username} on message sent by ${messageToUpdate.senderUsername}`);
            return;
        }
        // 3. Hard delete the message from MongoDB
        yield Chat_1.default.deleteOne({ timeNumber, connection, senderUsername: username });
        yield Chat_1.default.updateMany({ timeNumber, connection, receiverUsername: username }, { $set: { isDeleted: true } });
        // 4. Update Friend list last message with the PREVIOUS message
        const lastMessage = yield Chat_1.default.findOne({ connection }).sort({ createdAt: -1 });
        const participants = [messageToUpdate.senderUsername, messageToUpdate.receiverUsername];
        const io = (0, socket_1.getIO)();
        for (const user of participants) {
            // Find the friend doc where "user" is the owner (senderUsername)
            // and the other participant is the "username"
            const otherParticipant = user === participants[0] ? participants[1] : participants[0];
            const updatedFriend = yield Friend_1.default.findOneAndUpdate({ connection, senderUsername: user, username: otherParticipant }, {
                content: lastMessage ? (0, sanitize_1.xssClean)(lastMessage.content) : "No messages yet",
                timeNumber: lastMessage ? lastMessage.timeNumber : Date.now()
            }, { returnDocument: 'after' });
            if (io) {
                // Personalized emitters as requested
                io.emit(`message_deleted_${user.toLowerCase()}`, { timeNumber, connection });
                if (updatedFriend) {
                    io.emit(`friend_updated_${user.toLowerCase()}`, updatedFriend);
                }
            }
        }
    }
    catch (error) {
        console.error('Error in deleteMessageLogic:', error);
    }
});
exports.deleteMessageLogic = deleteMessageLogic;
// @desc    Internal logic to delete multiple messages
const bulkDeleteMessagesLogic = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { timeNumbers, connection, username } = data;
        // Use the authenticated socket user as the authoritative sender (cannot be spoofed)
        const senderUsername = username;
        if (!senderUsername) {
            console.error('[BulkDelete] No authenticated user found in socket context');
            return;
        }
        if (!Array.isArray(timeNumbers) || timeNumbers.length === 0)
            return;
        // Delete from Chat where senderUsername is the authenticated user and timeNumber is in the array
        const deletedResult = yield Chat_1.default.deleteMany({
            timeNumber: { $in: timeNumbers },
            connection,
            senderUsername: { $regex: new RegExp(`^${senderUsername}$`, 'i') }
        });
        yield Chat_1.default.updateMany({
            timeNumber: { $in: timeNumbers },
            connection,
            receiverUsername: { $regex: new RegExp(`^${senderUsername}$`, 'i') }
        }, { $set: { isDeleted: true } });
        if (deletedResult.deletedCount === 0)
            return;
        // Update Friend sidebar preview
        const lastMessage = yield Chat_1.default.findOne({ connection }).sort({ timeNumber: -1 });
        // Resolve participants
        const participants = yield Friend_1.default.find({ connection }).distinct('senderUsername');
        const io = (0, socket_1.getIO)();
        if (!io)
            return;
        for (const participant of participants) {
            const otherFriend = yield Friend_1.default.findOne({ connection, senderUsername: participant });
            if (!otherFriend)
                continue;
            const other = otherFriend.username;
            const updatedFriend = yield Friend_1.default.findOneAndUpdate({ connection, senderUsername: participant, username: other }, {
                content: lastMessage ? (0, sanitize_1.xssClean)(lastMessage.content) : 'No messages yet',
                timeNumber: lastMessage ? lastMessage.timeNumber : Date.now(),
                status: lastMessage ? lastMessage.status : 'sent'
            }, { returnDocument: 'after' });
            io.emit(`messages_deleted_${participant.toLowerCase()}`, { timeNumbers, connection });
            if (updatedFriend) {
                io.emit(`friend_updated_${participant.toLowerCase()}`, updatedFriend);
            }
        }
    }
    catch (error) {
        console.error('[BulkDelete] Error:', error);
    }
});
exports.bulkDeleteMessagesLogic = bulkDeleteMessagesLogic;
// @desc    Internal logic to mark messages as delivered
const markAsDeliveredLogic = (idsOrTimeNumbers) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!idsOrTimeNumbers || idsOrTimeNumbers.length === 0)
            return;
        // 1. Identify which identifyers we have (IDs vs timeNumbers)
        const mongoose = require('mongoose');
        const ids = idsOrTimeNumbers.filter(id => mongoose.Types.ObjectId.isValid(id));
        const timeNumbers = idsOrTimeNumbers.map(n => Number(n)).filter(n => !isNaN(n) && !ids.includes(String(n)));
        const query = { status: 'sent' };
        if (ids.length > 0 && timeNumbers.length > 0) {
            query.$or = [{ _id: { $in: ids } }, { timeNumber: { $in: timeNumbers } }];
        }
        else if (ids.length > 0) {
            query._id = { $in: ids };
        }
        else if (timeNumbers.length > 0) {
            query.timeNumber = { $in: timeNumbers };
        }
        else {
            return;
        }
        // 2. Update status to 'delivered'
        yield Chat_1.default.updateMany(query, { $set: { status: 'delivered' } });
        // 3. Fetch the updated messages to identify participants for emission
        const updatedMessages = yield Chat_1.default.find({
            $or: [
                { _id: { $in: ids } },
                { timeNumber: { $in: timeNumbers } }
            ]
        });
        const io = (0, socket_1.getIO)();
        if (io && updatedMessages.length > 0) {
            for (const msg of updatedMessages) {
                const [senderUser, receiverUser] = yield Promise.all([
                    userModel_1.default.findOne({ username: { $regex: new RegExp(`^${msg.senderUsername}$`, 'i') } }).select('online'),
                    userModel_1.default.findOne({ username: { $regex: new RegExp(`^${msg.receiverUsername}$`, 'i') } }).select('online')
                ]);
                const payload = {
                    _id: msg._id.toString(),
                    timeNumber: msg.timeNumber,
                    connection: msg.connection,
                    status: 'delivered',
                    senderOnline: (senderUser === null || senderUser === void 0 ? void 0 : senderUser.online) || false,
                    receiverOnline: (receiverUser === null || receiverUser === void 0 ? void 0 : receiverUser.online) || false
                };
                // Notify participants
                io.emit(`message_delivered_${msg.senderUsername.toLowerCase()}`, payload);
                io.emit(`message_delivered_${msg.receiverUsername.toLowerCase()}`, payload);
                // Update Friend preview if it's the latest message
                const latestMsg = yield Chat_1.default.findOne({ connection: msg.connection }).sort({ timeNumber: -1 });
                if (latestMsg && latestMsg.timeNumber === msg.timeNumber) {
                    yield Friend_1.default.updateMany({ connection: msg.connection, status: 'sent' }, { $set: { status: 'delivered' } });
                    // Emit friend update to both
                    const friends = yield Friend_1.default.find({ connection: msg.connection });
                    for (const f of friends) {
                        io.emit(`friend_updated_${f.senderUsername.toLowerCase()}`, f);
                    }
                }
            }
        }
    }
    catch (error) {
        console.error('Error in markAsDeliveredLogic:', error);
    }
});
exports.markAsDeliveredLogic = markAsDeliveredLogic;
// @desc    Internal logic to mark messages as seen
const markAsSeenLogic = (timeNumbers, currentUsername) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (timeNumbers.length === 0 || !currentUsername) {
            return;
        }
        // Ensure all are numbers
        const numbers = timeNumbers.map(n => Number(n)).filter(n => !isNaN(n));
        // 1. Update status to 'seen' for all given timeNumbers where current user is the receiver
        yield Chat_1.default.updateMany({
            timeNumber: { $in: numbers },
            receiverUsername: { $regex: new RegExp(`^${currentUsername}$`, 'i') },
            status: { $ne: 'seen' }
        }, { $set: { status: 'seen' } });
        // 2. Fetch the updated messages to determine connections and for emission
        const updatedMessages = yield Chat_1.default.find({
            timeNumber: { $in: numbers },
            receiverUsername: { $regex: new RegExp(`^${currentUsername}$`, 'i') }
        });
        if (updatedMessages.length === 0)
            return;
        const io = (0, socket_1.getIO)();
        const connections = [...new Set(updatedMessages.map(m => m.connection))];
        // 3. For each connection involved, reset the Friend unread count
        for (const connection of connections) {
            yield Friend_1.default.updateMany({
                connection,
                senderUsername: { $regex: new RegExp(`^${currentUsername}$`, 'i') }
            }, { $set: { unread: 0 } });
            // Sync Friend record status if the latest message is now seen
            const latestMsg = yield Chat_1.default.findOne({ connection }).sort({ timeNumber: -1 });
            if (latestMsg && latestMsg.status === 'seen') {
                yield Friend_1.default.updateMany({ connection }, { $set: { status: 'seen' } });
            }
            // Emit friend updates and unread counts
            if (io) {
                const friends = yield Friend_1.default.find({ connection });
                for (const f of friends) {
                    io.emit(`friend_updated_${f.senderUsername.toLowerCase()}`, f);
                }
                const unreadCount = yield (0, exports.getTotalUnreadCount)(currentUsername);
                io.emit(`unread_chat_count_${currentUsername.toLowerCase()}`, { count: unreadCount });
            }
        }
        // 4. Emit individual message status updates
        if (io) {
            for (const msg of updatedMessages) {
                const [senderUser, receiverUser] = yield Promise.all([
                    userModel_1.default.findOne({ username: { $regex: new RegExp(`^${msg.senderUsername}$`, 'i') } }).select('online'),
                    userModel_1.default.findOne({ username: { $regex: new RegExp(`^${msg.receiverUsername}$`, 'i') } }).select('online')
                ]);
                const payload = {
                    _id: msg._id.toString(),
                    timeNumber: msg.timeNumber,
                    connection: msg.connection,
                    status: 'seen',
                    senderOnline: (senderUser === null || senderUser === void 0 ? void 0 : senderUser.online) || false,
                    receiverOnline: (receiverUser === null || receiverUser === void 0 ? void 0 : receiverUser.online) || false
                };
                io.emit(`message_seen_${msg.senderUsername.toLowerCase()}`, payload);
                io.emit(`message_seen_${msg.receiverUsername.toLowerCase()}`, payload);
            }
        }
    }
    catch (error) {
        console.error('[MarkSeen] Error:', error);
    }
});
exports.markAsSeenLogic = markAsSeenLogic;
// @desc    Send a message (REST API)
// @route   POST /api/chat/messages
// @access  Private
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const message = yield (0, exports.createChatLogic)(req.body);
        res.status(201).json(message);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.sendMessage = sendMessage;
// @desc    Upload media and send message
// @route   POST /api/chat/upload
// @access  Private
const uploadChatMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files;
        const payload = JSON.parse(req.body.payload); // Metadata sent as a stringified JSON in FormData
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
        const result = yield (0, exports.createChatLogic)(data);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Upload Chat Media Error:', error);
        res.status(400).json({ message: error.message });
    }
});
exports.uploadChatMedia = uploadChatMedia;
// @desc    Mark messages as read
// @route   PUT /api/chat/messages/read/:senderUsername
// @access  Private
const markAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { senderUsername } = req.params;
        const receiverUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        yield Chat_1.default.updateMany({ senderUsername, receiverUsername, isRead: false }, { $set: { isRead: true, status: 'seen' } });
        // Reset Friend unread count
        const connection = [senderUsername, receiverUsername].map(u => u.toLowerCase()).sort().join('');
        yield Friend_1.default.updateMany({
            connection,
            senderUsername: { $regex: new RegExp(`^${receiverUsername}$`, 'i') }
        }, { $set: { unread: 0, status: 'seen' } });
        // Emit unread count update
        const io = (0, socket_1.getIO)();
        if (io) {
            const unreadCount = yield (0, exports.getTotalUnreadCount)(receiverUsername);
            io.emit(`unread_chat_count_${receiverUsername.toLowerCase()}`, { count: unreadCount });
            const updatedFriend = yield Friend_1.default.findOne({ connection, senderUsername: receiverUsername });
            if (updatedFriend) {
                io.emit(`friend_updated_${receiverUsername.toLowerCase()}`, updatedFriend);
            }
        }
        res.json({ message: 'Messages marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.markAsRead = markAsRead;
// @desc    Mark a specific media message as seen
// @route   PUT /api/chat/messages/seen/:id
// @access  Private
const markMediaAsSeenById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const currentUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        // Find the message and ensure it's delivered to the current user
        const message = yield Chat_1.default.findOne({
            _id: id,
            receiverUsername: { $regex: new RegExp(`^${currentUsername}$`, 'i') },
            status: { $ne: 'seen' }
        });
        if (!message) {
            res.status(404).json({ message: 'Message not found or already seen' });
            return;
        }
        message.status = 'seen';
        yield message.save();
        const io = (0, socket_1.getIO)();
        if (io) {
            const payload = {
                _id: message._id.toString(),
                timeNumber: message.timeNumber,
                connection: message.connection,
                status: 'seen'
            };
            io.emit(`message_seen_${message.senderUsername.toLowerCase()}`, payload);
            io.emit(`message_seen_${message.receiverUsername.toLowerCase()}`, payload);
            // Update Friend list: reset unread to 0 as they are viewing the chat
            yield Friend_1.default.updateMany({
                connection: message.connection,
                senderUsername: { $regex: new RegExp(`^${currentUsername}$`, 'i') }
            }, { $set: { unread: 0, status: 'seen' } });
            const updatedFriend = yield Friend_1.default.findOne({
                connection: message.connection,
                senderUsername: { $regex: new RegExp(`^${currentUsername}$`, 'i') }
            });
            if (updatedFriend) {
                io.emit(`friend_updated_${currentUsername.toLowerCase()}`, updatedFriend);
            }
            const unreadCount = yield (0, exports.getTotalUnreadCount)(currentUsername);
            io.emit(`unread_chat_count_${currentUsername.toLowerCase()}`, { count: unreadCount });
        }
        res.json(message);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.markMediaAsSeenById = markMediaAsSeenById;
// @desc    Search for conversations by name or message content
// @route   GET /api/chat/search
// @access  Private
const searchChats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { q } = req.query;
        const currentUsername = (_a = req.user) === null || _a === void 0 ? void 0 : _a.username;
        if (!q || typeof q !== 'string') {
            res.json([]);
            return;
        }
        const query = q.trim();
        const searchRegex = new RegExp(query, 'i');
        // Results array
        const results = [];
        const seenConnections = new Set();
        const seenBioConnections = new Set();
        // 1. Search Standard Chats/Friends
        const matchingChats = yield Chat_1.default.find({
            $or: [
                { senderUsername: currentUsername },
                { receiverUsername: currentUsername }
            ],
            content: { $regex: searchRegex }
        }).sort({ timeNumber: -1 }).limit(30);
        for (const chat of matchingChats) {
            if (seenConnections.has(chat.connection))
                continue;
            if (results.length >= 10)
                break;
            const isMe = chat.senderUsername.toLowerCase() === currentUsername.toLowerCase();
            const otherUsername = isMe ? chat.receiverUsername : chat.senderUsername;
            const friendInfo = yield Friend_1.default.findOne({
                senderUsername: currentUsername,
                username: otherUsername
            });
            results.push({
                _id: chat._id,
                connection: chat.connection,
                content: chat.content,
                username: otherUsername,
                displayName: (friendInfo === null || friendInfo === void 0 ? void 0 : friendInfo.displayName) || otherUsername,
                picture: (friendInfo === null || friendInfo === void 0 ? void 0 : friendInfo.picture) || (isMe ? chat.receiverPicture : chat.senderPicture),
                timeNumber: chat.timeNumber,
                media: chat.media,
                isBio: false
            });
            seenConnections.add(chat.connection);
        }
        // Standard Friends by name fallback
        if (results.length < 10) {
            const matchingFriends = yield Friend_1.default.find({
                senderUsername: currentUsername,
                connection: { $nin: Array.from(seenConnections) },
                $or: [
                    { displayName: { $regex: searchRegex } },
                    { username: { $regex: searchRegex } }
                ]
            }).sort({ timeNumber: -1 }).limit(10 - results.length);
            for (const f of matchingFriends) {
                results.push({
                    _id: f._id,
                    connection: f.connection,
                    content: f.content,
                    username: f.username,
                    displayName: f.displayName,
                    picture: f.picture,
                    timeNumber: f.timeNumber,
                    media: f.media,
                    isBio: false
                });
                seenConnections.add(f.connection);
            }
        }
        // 2. Search Bio Chats / Friends (if room)
        if (results.length < 10) {
            const matchingBioChats = yield BioChat_1.default.find({
                $or: [
                    { bioUserUsername: currentUsername },
                    { receiverBioUserUsername: currentUsername }
                ],
                content: { $regex: searchRegex }
            }).sort({ timeNumber: -1 }).limit(30);
            for (const bc of matchingBioChats) {
                if (seenBioConnections.has(bc.connection))
                    continue;
                if (results.length >= 10)
                    break;
                const isMe = bc.bioUserUsername.toLowerCase() === currentUsername.toLowerCase();
                const otherUsername = isMe ? bc.receiverBioUserUsername : bc.bioUserUsername;
                const bioFriendInfo = yield BioFriend_1.default.findOne({
                    senderBioUserUsername: currentUsername,
                    bioUserUsername: otherUsername
                });
                results.push({
                    _id: bc._id,
                    connection: bc.connection,
                    content: bc.content,
                    bioUserUsername: otherUsername,
                    bioUserDisplayName: (bioFriendInfo === null || bioFriendInfo === void 0 ? void 0 : bioFriendInfo.bioUserDisplayName) || otherUsername,
                    bioUserPicture: (bioFriendInfo === null || bioFriendInfo === void 0 ? void 0 : bioFriendInfo.bioUserPicture) || (isMe ? bc.receiverBioUserPicture : bc.bioUserPicture),
                    displayName: (bioFriendInfo === null || bioFriendInfo === void 0 ? void 0 : bioFriendInfo.bioUserDisplayName) || otherUsername, // fallback for UI compatibility
                    picture: (bioFriendInfo === null || bioFriendInfo === void 0 ? void 0 : bioFriendInfo.bioUserPicture) || (isMe ? bc.receiverBioUserPicture : bc.bioUserPicture),
                    timeNumber: bc.timeNumber,
                    media: bc.media,
                    isBio: true
                });
                seenBioConnections.add(bc.connection);
            }
        }
        // Bio Friends by name fallback
        if (results.length < 10) {
            const matchingBioFriends = yield BioFriend_1.default.find({
                senderBioUserUsername: currentUsername,
                connection: { $nin: Array.from(seenBioConnections) },
                $or: [
                    { bioUserDisplayName: { $regex: searchRegex } },
                    { bioUserUsername: { $regex: searchRegex } }
                ]
            }).sort({ timeNumber: -1 }).limit(10 - results.length);
            for (const bf of matchingBioFriends) {
                results.push({
                    _id: bf._id,
                    connection: bf.connection,
                    content: bf.content,
                    bioUserUsername: bf.bioUserUsername,
                    bioUserDisplayName: bf.bioUserDisplayName,
                    bioUserPicture: bf.bioUserPicture,
                    displayName: bf.bioUserDisplayName,
                    picture: bf.bioUserPicture,
                    timeNumber: bf.timeNumber,
                    media: bf.media,
                    isBio: true
                });
                seenBioConnections.add(bf.connection);
            }
        }
        res.json(results.slice(0, 10));
    }
    catch (error) {
        console.error('Search Chats Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.searchChats = searchChats;
