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
exports.completeVerification = exports.getBioUserSchoolInfoByUsername = exports.getExploredBioUserSchoolInfo = exports.updateBioUserSchoolInfo = exports.uploadDocument = exports.updateBioUser = exports.getBioUserSchoolInfo = exports.getBioUserState = exports.getBioUser = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bioUserModel_1 = __importDefault(require("../../../models/user/bioUserModel"));
const bioUserStateModel_1 = __importDefault(require("../../../models/user/bioUserStateModel"));
const bioUserSchoolInfoModel_1 = __importDefault(require("../../../models/user/bioUserSchoolInfoModel"));
const userModel_1 = __importDefault(require("../../../models/user/userModel"));
const documentModel_1 = require("../../../models/place/documentModel");
const schoolModel_1 = require("../../../models/school/schoolModel");
const departmentModel_1 = require("../../../models/school/departmentModel");
const s3_1 = require("../../../utils/s3");
const followerModel_1 = require("../../../models/post/followerModel");
const muteModel_1 = require("../../../models/post/muteModel");
const blockModel_1 = require("../../../models/post/blockModel");
const sanitize_1 = require("../../../utils/sanitize");
const verificationHelper_1 = require("../../../utils/verificationHelper");
// @desc    Get BioUser information
// @route   GET /api/bio-users/:id
// @access  Private
const getBioUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Invalid BioUser ID format' });
        return;
    }
    try {
        const bioUser = yield bioUserModel_1.default.findById(id);
        if (!bioUser) {
            res.status(404).json({ message: 'BioUser not found' });
            return;
        }
        res.json(bioUser);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBioUser = getBioUser;
// @desc    Get BioUser verification state
// @route   GET /api/bio-users/:id/state
// @access  Private
const getBioUserState = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const bioUserId = req.params.id;
    try {
        const state = yield bioUserStateModel_1.default.findOne({ bioUserId });
        if (!state) {
            res.status(404).json({ message: 'BioUser state not found' });
            return;
        }
        res.json(state);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBioUserState = getBioUserState;
// @desc    Get BioUser school information
// @route   GET /api/bio-users/:id/school-info
// @access  Private
const getBioUserSchoolInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const bioUserId = req.params.id;
    try {
        const schoolInfo = yield bioUserSchoolInfoModel_1.default.findOne({ bioUserId }).lean();
        if (!schoolInfo) {
            res.status(404).json({ message: 'School information not found' });
            return;
        }
        // Attach bioUser details for consistent rendering in profile
        schoolInfo.bioUser = yield bioUserModel_1.default.findById(schoolInfo.bioUserId).lean();
        res.json(schoolInfo);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBioUserSchoolInfo = getBioUserSchoolInfo;
const checkBioCompletion = (bioUserId) => __awaiter(void 0, void 0, void 0, function* () {
    const state = yield bioUserStateModel_1.default.findOne({ bioUserId });
    if (!state)
        return null;
    if (state.isPersonal && state.isOrigin && state.isContact && state.isRelated && state.isDocument) {
        return yield bioUserStateModel_1.default.findOneAndUpdate({ bioUserId }, { isBio: true }, { returnDocument: 'after', runValidators: false });
    }
    return state;
});
// @desc    Update BioUser information
// @route   PUT /api/bio-users/:id
// @access  Private
const updateBioUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _a = req.body, { _id, __v, firstName, lastName, middleName, gender, dateOfBirth, passport } = _a, updateData = __rest(_a, ["_id", "__v", "firstName", "lastName", "middleName", "gender", "dateOfBirth", "passport"]);
    const bioUserId = req.params.id;
    if (!mongoose_1.default.Types.ObjectId.isValid(bioUserId)) {
        res.status(400).json({ message: 'Invalid BioUser ID format' });
        return;
    }
    try {
        const bioUser = yield bioUserModel_1.default.findById(bioUserId);
        if (!bioUser) {
            res.status(404).json({ message: 'BioUser not found' });
            return;
        }
        const tab = req.body.tab;
        // 1) Personal information tab logic
        if (tab === 'Bio') {
            // 3) create bioUserDisplayName: initial of first name, initial of middle name and last name
            const firstInitial = firstName.charAt(0).toUpperCase();
            const middleInitial = middleName.charAt(0).toUpperCase();
            const displayName = `${firstInitial}. ${middleInitial}. ${lastName}`;
            // Update BioUser details
            bioUser.firstName = (0, sanitize_1.xssClean)(firstName);
            bioUser.lastName = (0, sanitize_1.xssClean)(lastName);
            bioUser.middleName = (0, sanitize_1.xssClean)(middleName);
            bioUser.gender = gender;
            bioUser.dateOfBirth = new Date(dateOfBirth);
            bioUser.passport = passport; // No S3 upload as per request
            bioUser.bioUserDisplayName = (0, sanitize_1.xssClean)(displayName);
            yield bioUser.save();
            // 5) Update other models
            yield bioUserSchoolInfoModel_1.default.findOneAndUpdate({ bioUserId: bioUserId }, {
                bioUserUsername: bioUser.bioUserUsername,
                bioUserPicture: bioUser.bioUserPicture,
                bioUserMedia: bioUser.bioUserMedia,
                bioUserDisplayName: bioUser.bioUserDisplayName,
                bioUserIntro: bioUser.bioUserIntro,
                phoneNumber: req.body.phone || req.body.phoneNumber || undefined,
            }, {
                returnDocument: 'after',
                runValidators: false,
            });
            yield userModel_1.default.updateMany({ bioUserId: bioUserId }, {
                username: bioUser.bioUserUsername,
                bioUserUsername: bioUser.bioUserUsername,
            }, {
                runValidators: false,
            });
            // 2) when the validation is successful add isPersonal true and tab: "Bio"
            // Requirement 5 also mentions updating BioUserState with req.body
            const bioUserState = yield bioUserStateModel_1.default.findOneAndUpdate({ bioUserId: bioUserId }, Object.assign(Object.assign({}, updateData), { isPersonal: true }), {
                returnDocument: 'after',
                runValidators: false,
            });
            // Check and update isBio status
            const finalBioUserState = yield checkBioCompletion(bioUserId);
            // Trigger verification check
            yield (0, verificationHelper_1.checkVerificationStatus)(bioUserId);
            res.json({
                bioUser,
                bioUserState: finalBioUserState || bioUserState,
                message: 'Bio information updated successfully'
            });
            return;
        }
        // 2) Consolidated logic for Origin, Contact, and Related tabs
        const tabFlags = {
            'Origin': 'isOrigin',
            'Contact': 'isContact',
            'Related': 'isRelated'
        };
        if (tabFlags[tab]) {
            // Update BioUser
            const updatedBioUser = yield bioUserModel_1.default.findByIdAndUpdate(bioUserId, updateData, { returnDocument: 'after' });
            const flag = tabFlags[tab];
            const updatedBioUserState = yield bioUserStateModel_1.default.findOneAndUpdate({ bioUserId: bioUserId }, Object.assign(Object.assign({}, updateData), { [flag]: true }), { returnDocument: 'after', runValidators: false });
            // Sync phone to BioUserSchoolInfo if present
            if (req.body.phone || req.body.phoneNumber) {
                yield bioUserSchoolInfoModel_1.default.findOneAndUpdate({ bioUserId: bioUserId }, { phoneNumber: req.body.phone || req.body.phoneNumber }, { runValidators: false });
            }
            // Check and update isBio status
            const finalBioUserState = yield checkBioCompletion(bioUserId);
            // Trigger verification check
            yield (0, verificationHelper_1.checkVerificationStatus)(bioUserId);
            res.json({
                bioUser: updatedBioUser,
                bioUserState: finalBioUserState || updatedBioUserState,
                message: `${tab} information updated successfully`
            });
            return;
        }
        // 5) Public tab logic
        if (tab === 'Public') {
            const { bioUserUsername, bioUserIntro, bioUserMedia, bioUserPicture } = req.body;
            const bioUser = yield bioUserModel_1.default.findById(bioUserId);
            if (!bioUser) {
                res.status(404).json({ message: 'BioUser not found' });
                return;
            }
            // Handle image uploads if they are base64
            if (bioUserPicture && bioUserPicture.startsWith('data:image')) {
                bioUser.bioUserPicture = yield (0, s3_1.uploadToS3)(bioUserPicture, 'profile-pictures');
            }
            else if (bioUserPicture) {
                bioUser.bioUserPicture = bioUserPicture;
            }
            if (bioUserMedia && bioUserMedia.startsWith('data:image')) {
                bioUser.bioUserMedia = yield (0, s3_1.uploadToS3)(bioUserMedia, 'profile-banners');
            }
            else if (bioUserMedia) {
                bioUser.bioUserMedia = bioUserMedia;
            }
            bioUser.bioUserUsername = bioUserUsername || bioUser.bioUserUsername;
            bioUser.bioUserDisplayName = (0, sanitize_1.xssClean)(req.body.bioUserDisplayName || bioUser.bioUserDisplayName);
            bioUser.bioUserIntro = (0, sanitize_1.xssClean)(bioUserIntro || bioUser.bioUserIntro);
            yield bioUser.save();
            // Sync with other models
            yield bioUserSchoolInfoModel_1.default.findOneAndUpdate({ bioUserId: bioUserId }, {
                bioUserUsername: bioUser.bioUserUsername,
                bioUserPicture: bioUser.bioUserPicture,
                bioUserMedia: bioUser.bioUserMedia,
                bioUserDisplayName: bioUser.bioUserDisplayName,
                bioUserIntro: bioUser.bioUserIntro,
                phoneNumber: req.body.phone || req.body.phoneNumber || undefined,
            }, { returnDocument: 'after', runValidators: false });
            yield userModel_1.default.updateMany({ bioUserId: bioUserId }, {
                username: bioUser.bioUserUsername,
                bioUserUsername: bioUser.bioUserUsername,
                picture: bioUser.bioUserPicture, // Sync picture to main User model
            }, { runValidators: false });
            const updatedBioUserState = yield bioUserStateModel_1.default.findOneAndUpdate({ bioUserId: bioUserId }, Object.assign(Object.assign({}, updateData), { isPublic: true }), { returnDocument: 'after', runValidators: false });
            // Check and update isBio status
            const finalBioUserState = yield checkBioCompletion(bioUserId);
            // Trigger verification check
            yield (0, verificationHelper_1.checkVerificationStatus)(bioUserId);
            // Sync isFriendly to BioUserSchoolInfo
            if (req.body.isFriendly !== undefined) {
                yield bioUserSchoolInfoModel_1.default.findOneAndUpdate({ bioUserId: bioUserId }, { isFriendly: req.body.isFriendly }, { runValidators: false });
            }
            res.json({
                bioUser,
                bioUserState: finalBioUserState || updatedBioUserState,
                message: 'Public profile updated successfully'
            });
            return;
        }
        // Generic update for other tabs or partial updates
        const updatedBioUser = yield bioUserModel_1.default.findByIdAndUpdate(bioUserId, updateData, { returnDocument: 'after' });
        const updatedBioUserState = yield bioUserStateModel_1.default.findOneAndUpdate({ bioUserId: bioUserId }, updateData, { returnDocument: 'after', runValidators: false });
        // Trigger verification check
        yield (0, verificationHelper_1.checkVerificationStatus)(bioUserId);
        res.json({
            bioUser: updatedBioUser,
            bioUserState: updatedBioUserState,
            message: 'Information updated successfully'
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateBioUser = updateBioUser;
// @desc    Upload user document for verification
// @route   POST /api/bio-users/:id/upload-document
// @access  Private
const uploadDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { docId, documentImage } = req.body;
    const bioUserId = req.params.id;
    if (!docId || !documentImage) {
        res.status(400).json({ message: 'Document ID and image are required' });
        return;
    }
    try {
        // Find the document requirement to get its name
        const docRequirement = yield documentModel_1.DocumentModel.findById(docId);
        if (!docRequirement) {
            res.status(404).json({ message: 'Document requirement not found' });
            return;
        }
        // Upload to S3
        const s3Url = yield (0, s3_1.uploadToS3)(documentImage, 'verification-documents');
        // Update BioUser
        const bioUser = yield bioUserModel_1.default.findById(bioUserId);
        if (!bioUser) {
            res.status(404).json({ message: 'BioUser not found' });
            return;
        }
        // Add or update the document in BioUser.documents array
        const existingDocIndex = bioUser.documents.findIndex((d) => d.docId === docId);
        if (existingDocIndex > -1) {
            bioUser.documents[existingDocIndex].doc = s3Url;
            bioUser.documents[existingDocIndex].name = docRequirement.name;
        }
        else {
            bioUser.documents.push({
                name: docRequirement.name,
                doc: s3Url,
                docId: docId,
                tempDoc: ''
            });
        }
        yield bioUser.save();
        // Update BioUserState - mark isDocument as true since at least one document is uploaded
        const bioUserState = yield bioUserStateModel_1.default.findOneAndUpdate({ bioUserId: bioUserId }, { isDocument: true }, { returnDocument: 'after', runValidators: false });
        // Check and update isBio status
        const finalBioUserState = yield checkBioCompletion(bioUserId);
        // Trigger verification check
        yield (0, verificationHelper_1.checkVerificationStatus)(bioUserId);
        res.json({
            bioUser,
            bioUserState: finalBioUserState || bioUserState,
            message: `${docRequirement.name} uploaded successfully`,
            s3Url
        });
    }
    catch (error) {
        console.error('Document Upload Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.uploadDocument = uploadDocument;
// @desc    Update BioUser school information
// @route   PUT /api/bio-users/:id/school-info
// @access  Private
const updateBioUserSchoolInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const bioUserId = req.params.id;
    const _a = req.body, { tab } = _a, updateData = __rest(_a, ["tab"]);
    try {
        // Handle manual school creation
        if (updateData.schoolName && !updateData.schoolId) {
            const newSchool = new schoolModel_1.School({
                name: updateData.schoolName,
                country: updateData.schoolCountry || '',
                state: updateData.schoolState || '',
                continent: updateData.schoolContinent || '',
                countryFlag: updateData.schoolCountryFlag || '',
                countrySymbol: updateData.schoolCountrySymbol || '',
                isVerified: false,
                isNewEntry: true
            });
            yield newSchool.save();
            updateData.schoolId = newSchool._id.toString();
        }
        // Handle manual department creation
        if (updateData.schoolDepartment && !updateData.schoolDepartmentId) {
            const newDepartment = new departmentModel_1.Department({
                name: updateData.schoolDepartment,
                schoolId: updateData.schoolId,
                isNewEntry: true
            });
            yield newDepartment.save();
            updateData.schoolDepartmentId = newDepartment._id.toString();
        }
        // Handle schoolCertificate upload if it's base64
        if (updateData.schoolCertificate && updateData.schoolCertificate.startsWith('data:image')) {
            updateData.schoolCertificate = yield (0, s3_1.uploadToS3)(updateData.schoolCertificate, 'school-certificates');
        }
        // Handle schoolTranscript upload if it's base64
        if (updateData.schoolTranscript && updateData.schoolTranscript.startsWith('data:image')) {
            updateData.schoolTranscript = yield (0, s3_1.uploadToS3)(updateData.schoolTranscript, 'school-transcripts');
        }
        const schoolInfo = yield bioUserSchoolInfoModel_1.default.findOneAndUpdate({ bioUserId }, Object.assign({}, updateData), { returnDocument: 'after', runValidators: false });
        if (!schoolInfo) {
            res.status(404).json({ message: 'School information not found' });
            return;
        }
        // Update BioUserState flags based on tab and inSchool status
        const updateFlags = {};
        if (tab === 'School')
            updateFlags.isEducation = true;
        if (tab === 'SchoolHistory')
            updateFlags.isEducationHistory = true;
        if (tab === 'SchoolDocument') {
            updateFlags.isEducationDocument = true;
            updateFlags.isEducationHistory = true;
        }
        // Set inSchool status in BioUserState
        if (req.body.inSchool !== undefined) {
            updateFlags.inSchool = req.body.inSchool;
        }
        // Set hasPastSchool status in BioUserState
        if (req.body.hasPastSchool !== undefined) {
            updateFlags.hasPastSchool = req.body.hasPastSchool;
            // If user has no past school, satisfy history and document requirements
            if (req.body.hasPastSchool === false) {
                updateFlags.isEducationHistory = true;
                // If they also confirmed they are not currently in school, then they are done with school section
                if (schoolInfo.inSchool === false) {
                    updateFlags.isEducationDocument = true;
                    // Update school info to reflect they never attended school
                    schoolInfo.attendedSchool = false;
                    schoolInfo.isVerifying = true;
                    yield schoolInfo.save();
                }
            }
        }
        const bioUserState = yield bioUserStateModel_1.default.findOneAndUpdate({ bioUserId }, Object.assign({}, updateFlags), { returnDocument: 'after', runValidators: false });
        // Check verification status after all updates
        yield (0, verificationHelper_1.checkVerificationStatus)(bioUserId);
        res.json({
            bioUserSchoolInfo: schoolInfo,
            bioUserState,
            message: 'School information updated successfully'
        });
    }
    catch (error) {
        console.error('Update School Info Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.updateBioUserSchoolInfo = updateBioUserSchoolInfo;
// @desc    Get explored bio user school info (verified users only, skip self)
// @route   GET /api/bio-users/explored
// @access  Private
const getExploredBioUserSchoolInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bioUserId, currentUserId, page = 1, limit = 20, search } = req.query;
        const targetBioUserId = bioUserId;
        const authUserId = currentUserId;
        const baseQuery = { isVerified: true };
        if (targetBioUserId) {
            baseQuery.bioUserId = { $ne: targetBioUserId };
        }
        if (search) {
            baseQuery.$or = [
                { bioUserUsername: { $regex: search, $options: 'i' } },
                { bioUserDisplayName: { $regex: search, $options: 'i' } }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        // Join with User to get full user objects
        const schoolInfos = yield bioUserSchoolInfoModel_1.default.aggregate([
            { $match: baseQuery },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: 'users',
                    localField: 'bioUserId',
                    foreignField: 'bioUserId',
                    as: 'mainUser'
                }
            },
            { $unwind: '$mainUser' }
        ]);
        const total = yield bioUserSchoolInfoModel_1.default.countDocuments(baseQuery);
        // Augment schoolInfos with interaction status if currentUserId is provided
        let augmentedSchoolInfos = schoolInfos;
        if (authUserId && schoolInfos.length > 0) {
            augmentedSchoolInfos = yield Promise.all(schoolInfos.map((info) => __awaiter(void 0, void 0, void 0, function* () {
                const searchId = authUserId.toString();
                const user = info.mainUser;
                const [mute, block, follow] = yield Promise.all([
                    muteModel_1.Mute.findOne({ muterId: searchId, userId: user._id.toString() }),
                    blockModel_1.Block.findOne({ blockerId: searchId, userId: user._id.toString() }),
                    followerModel_1.Follower.findOne({ followerId: searchId, userId: user._id.toString() })
                ]);
                return Object.assign(Object.assign({}, info), { mainUser: Object.assign(Object.assign({}, user), { followed: !!follow, muted: !!mute, blocked: !!block }) });
            })));
        }
        const augmentedUsers = augmentedSchoolInfos.map((info) => info.mainUser);
        res.json({
            users: augmentedUsers,
            schoolInfos: augmentedSchoolInfos,
            total,
            hasMore: total > skip + schoolInfos.length
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getExploredBioUserSchoolInfo = getExploredBioUserSchoolInfo;
// @desc    Get BioUser school information by username
// @route   GET /api/bio-users/username/:username/school-info
// @access  Public
const getBioUserSchoolInfoByUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username } = req.params;
    try {
        const schoolInfo = yield bioUserSchoolInfoModel_1.default.findOne({ bioUserUsername: username }).lean();
        if (!schoolInfo) {
            res.status(404).json({ message: 'School information not found for this username' });
            return;
        }
        // Attach bioUser details for consistent rendering in profile
        schoolInfo.bioUser = yield bioUserModel_1.default.findById(schoolInfo.bioUserId).lean();
        res.json(schoolInfo);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBioUserSchoolInfoByUsername = getBioUserSchoolInfoByUsername;
// @desc    Manually trigger verification check
// @route   POST /api/bio-users/:id/verify
// @access  Private
const completeVerification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const bioUserId = req.params.id;
    try {
        yield (0, verificationHelper_1.checkVerificationStatus)(bioUserId);
        const updatedState = yield bioUserStateModel_1.default.findOne({ bioUserId });
        res.json({
            bioUserState: updatedState,
            message: (updatedState === null || updatedState === void 0 ? void 0 : updatedState.isOnVerification)
                ? 'Verification process started successfully'
                : 'Verification check completed'
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.completeVerification = completeVerification;
