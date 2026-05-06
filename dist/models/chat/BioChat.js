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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const MediaSchema = new mongoose_1.Schema({
    source: { type: String },
    name: { type: String },
    type: { type: String },
    duration: { type: Number },
    size: { type: Number }
}, { _id: false });
const RepliedChatSchema = new mongoose_1.Schema({
    content: { type: String },
    received: { type: Boolean },
    userId: { type: String },
    bioUserUsername: { type: String },
    bioUserPicture: { type: String },
    media: [MediaSchema],
    receiverBioUserUsername: { type: String },
    receiverBioUserPicture: { type: String },
    receiverId: { type: String },
    createdAt: { type: Date }
}, { _id: true });
const BioChatSchema = new mongoose_1.Schema({
    from: { type: String },
    content: { type: String },
    status: { type: String },
    friendChat: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BioFriend' },
    action: { type: String },
    bioUserUsername: { type: String },
    bioUserPicture: { type: String },
    media: [MediaSchema],
    message: { type: String },
    connection: { type: String },
    deletedUsername: { type: String },
    senderTime: { type: Date },
    receiverTime: { type: Date },
    timeNumber: { type: Number },
    unreadUser: { type: Number, default: 0 },
    unreadReceiver: { type: Number, default: 0 },
    receiverBioUserUsername: { type: String },
    receiverBioUserPicture: { type: String },
    repliedChat: RepliedChatSchema,
    isFriends: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    day: { type: String },
    isPinned: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
}, {
    timestamps: true
});
BioChatSchema.index({ connection: 1, createdAt: -1 });
BioChatSchema.index({ bioUserUsername: 1, receiverBioUserUsername: 1, createdAt: -1 });
BioChatSchema.index({ receiverBioUserUsername: 1, bioUserUsername: 1, createdAt: -1 });
BioChatSchema.index({ timeNumber: 1 });
BioChatSchema.index({ bioUserUsername: 1, timeNumber: 1 });
BioChatSchema.index({ status: 1 });
exports.default = mongoose_1.default.models.BioChat || mongoose_1.default.model('BioChat', BioChatSchema);
