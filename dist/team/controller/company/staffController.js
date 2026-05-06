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
exports.bulkCreateStaff = exports.getStaffProfile = exports.deleteStaff = exports.updateStaff = exports.createStaff = exports.getStaffs = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const staffModel_1 = require("../../../models/company/staffModel");
const positionModel_1 = require("../../../models/company/positionModel");
const bioUserModel_1 = __importDefault(require("../../../models/user/bioUserModel"));
const bioUserSchoolInfoModel_1 = __importDefault(require("../../../models/user/bioUserSchoolInfoModel"));
// @desc    Get all staff members
// @route   GET /api/team/staffs
// @access  Private/Staff
const getStaffs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search } = req.query;
        let query = {};
        if (search) {
            query = {
                $or: [
                    { bioUserDisplayName: { $regex: search, $options: 'i' } },
                    { bioUserUsername: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                ]
            };
        }
        const staffs = yield staffModel_1.Staff.find(query).sort({ level: -1 });
        res.json(staffs);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getStaffs = getStaffs;
// @desc    Create a new staff member
// @route   POST /api/team/staffs
// @access  Private/Staff
const createStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield staffModel_1.Staff.create(req.body);
        res.json(staff);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createStaff = createStaff;
// @desc    Update a staff member
// @route   PUT /api/team/staffs/:id
// @access  Private/Staff
const updateStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield staffModel_1.Staff.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!staff) {
            res.status(404).json({ message: 'Staff member not found' });
            return;
        }
        res.json(staff);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateStaff = updateStaff;
// @desc    Delete a staff member
// @route   DELETE /api/team/staffs/:id
// @access  Private/Staff
const deleteStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield staffModel_1.Staff.findByIdAndDelete(req.params.id);
        if (!staff) {
            res.status(404).json({ message: 'Staff member not found' });
            return;
        }
        res.json({ message: 'Staff member deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteStaff = deleteStaff;
// @desc    Get current staff profile
// @route   GET /api/team/staffs/me
// @access  Private/Staff
const getStaffProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bioUserId = req.user.bioUserId;
        if (!bioUserId) {
            res.status(400).json({ message: 'User does not have a linked bio account' });
            return;
        }
        const staff = yield staffModel_1.Staff.findOne({ bioUserId });
        if (!staff) {
            res.status(404).json({ message: 'Staff profile not found' });
            return;
        }
        res.json(staff);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getStaffProfile = getStaffProfile;
// @desc    Bulk create staff members from bio users
// @route   POST /api/team/staffs/bulk
// @access  Private/Staff
const bulkCreateStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bioUserIds, positionId } = req.body;
        if (!bioUserIds || !Array.isArray(bioUserIds) || bioUserIds.length === 0) {
            res.status(400).json({ message: 'Please provide an array of bioUserIds' });
            return;
        }
        if (!positionId) {
            res.status(400).json({ message: 'Please provide a positionId' });
            return;
        }
        const position = yield positionModel_1.Position.findById(positionId);
        if (!position) {
            res.status(404).json({ message: 'Position not found' });
            return;
        }
        // Resolve the incoming IDs to actual BioUser _id strings.
        // The frontend may send either BioUser._id or BioUserSchoolInfo._id values,
        // so we handle both: first cast valid ObjectIds and query BioUser directly;
        // if nothing is found, fall back to resolving through BioUserSchoolInfo.
        const toObjectId = (id) => {
            try {
                return new mongoose_1.default.Types.ObjectId(id);
            }
            catch (_a) {
                return null;
            }
        };
        const validObjectIds = bioUserIds.map(toObjectId).filter(Boolean);
        let resolvedBioUserIds = [];
        // Primary: treat IDs as BioUser._id values
        const directMatches = yield bioUserModel_1.default.find({ _id: { $in: validObjectIds } }).select('_id');
        if (directMatches.length > 0) {
            resolvedBioUserIds = directMatches.map(u => u._id.toString());
        }
        else {
            // Fallback: treat IDs as BioUserSchoolInfo._id values and resolve to bioUserId
            const schoolInfos = yield bioUserSchoolInfoModel_1.default.find({ _id: { $in: validObjectIds } }).select('bioUserId');
            resolvedBioUserIds = schoolInfos.map(s => s.bioUserId).filter(Boolean);
        }
        if (resolvedBioUserIds.length === 0) {
            res.status(404).json({ message: 'No valid bio users found for the provided IDs' });
            return;
        }
        // Check for existing staff records to avoid duplicates
        const existingStaff = yield staffModel_1.Staff.find({
            bioUserId: { $in: resolvedBioUserIds }
        }).select('bioUserId');
        const existingBioUserIds = existingStaff.map(s => s.bioUserId);
        const newBioUserIds = resolvedBioUserIds.filter(id => !existingBioUserIds.includes(id));
        if (newBioUserIds.length === 0) {
            res.status(400).json({ message: 'All selected users are already staff members' });
            return;
        }
        const bioUsers = yield bioUserModel_1.default.find({ _id: { $in: newBioUserIds.map(toObjectId).filter(Boolean) } });
        if (bioUsers.length === 0) {
            res.status(404).json({ message: 'No valid bio users found for the provided IDs' });
            return;
        }
        const staffRecords = bioUsers.map(user => ({
            bioUserId: user._id.toString(),
            bioUserDisplayName: user.bioUserDisplayName,
            bioUserUsername: user.bioUserUsername,
            firstName: user.firstName,
            lastName: user.lastName,
            middleName: user.middleName,
            picture: user.bioUserPicture,
            salary: position.salary,
            duties: position.duties,
            position: position.position,
            role: position.role || 'Staff',
            level: position.level || 1,
            isActive: true,
            createdAt: new Date()
        }));
        const createdStaff = yield staffModel_1.Staff.insertMany(staffRecords);
        res.status(201).json({
            message: `Successfully created ${createdStaff.length} staff records${existingBioUserIds.length > 0 ? `. ${existingBioUserIds.length} users were already staff.` : ''}`,
            count: createdStaff.length
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.bulkCreateStaff = bulkCreateStaff;
