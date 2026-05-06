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
exports.checkVerificationStatus = void 0;
const bioUserStateModel_1 = __importDefault(require("../models/user/bioUserStateModel"));
const bioUserModel_1 = __importDefault(require("../models/user/bioUserModel"));
const notificationHelper_1 = require("./notificationHelper");
/**
 * Checks if the user has fulfilled all verification requirements and sends a notification if so.
 *
 * @param bioUserId The ID of the bio user
 */
const checkVerificationStatus = (bioUserId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const state = yield bioUserStateModel_1.default.findOne({ bioUserId });
        if (!state)
            return;
        // Requirement: check if the bioUserState has all sections completed
        if (state.isBio === true &&
            state.isPublic === true &&
            state.isEducationHistory === true &&
            state.isEducationDocument === true &&
            state.isVerified === false &&
            state.isOnVerification === false) {
            // Update isOnVerification to true
            state.isOnVerification = true;
            yield state.save();
            // Create a notification for the user
            const bioUserUsername = state.bioUserUsername;
            // Sync isOnVerification to BioUser model using username
            const bioUser = yield bioUserModel_1.default.findOneAndUpdate({ bioUserUsername }, { isOnVerification: true }, { new: true });
            if (bioUser) {
                // Send personal notification (for the Personal tab)
                yield (0, notificationHelper_1.sendPersonalNotification)(bioUser.bioUserUsername, bioUser.bioUserDisplayName, 'verification_processing');
            }
        }
    }
    catch (error) {
        console.error(`[checkVerificationStatus] Error checking verification status for ${bioUserId}:`, error);
    }
});
exports.checkVerificationStatus = checkVerificationStatus;
