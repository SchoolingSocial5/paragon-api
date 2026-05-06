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
exports.deletePastSchool = exports.updatePastSchool = exports.addPastSchool = exports.getPastSchools = void 0;
const pastSchoolModel_1 = require("../../../models/school/pastSchoolModel");
const schoolModel_1 = require("../../../models/school/schoolModel");
const departmentModel_1 = require("../../../models/school/departmentModel");
const bioUserStateModel_1 = __importDefault(require("../../../models/user/bioUserStateModel"));
const bioUserSchoolInfoModel_1 = __importDefault(require("../../../models/user/bioUserSchoolInfoModel"));
const s3_1 = require("../../../utils/s3");
const sanitize_1 = require("../../../utils/sanitize");
const verificationHelper_1 = require("../../../utils/verificationHelper");
// @desc    Get past schools for a bio user
// @route   GET /api/schools/past/:bioUserId
// @access  Private
const getPastSchools = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bioUserId } = req.params;
        const pastSchools = yield pastSchoolModel_1.PastSchool.find({ bioUserId }).sort({ admittedAt: -1 });
        res.json(pastSchools);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPastSchools = getPastSchools;
// @desc    Add a past school
// @route   POST /api/schools/past
// @access  Private
const addPastSchool = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = Object.assign({}, req.body);
        const { bioUserId } = data;
        // Handle manual school creation
        if (data.schoolName && !data.schoolId) {
            const newSchool = new schoolModel_1.School({
                name: (0, sanitize_1.xssClean)(data.schoolName),
                country: data.schoolCountry || '',
                state: data.schoolState || '',
                continent: data.schoolContinent || '',
                countryFlag: data.schoolCountryFlag || '',
                countrySymbol: data.schoolCountrySymbol || '',
                isVerified: false,
                isNewEntry: true
            });
            yield newSchool.save();
            data.schoolId = newSchool._id.toString();
        }
        // Handle manual department creation
        if (data.schoolDepartment && !data.schoolDepartmentId) {
            const newDepartment = new departmentModel_1.Department({
                name: (0, sanitize_1.xssClean)(data.schoolDepartment),
                schoolId: data.schoolId,
                isNewEntry: true
            });
            yield newDepartment.save();
            data.schoolDepartmentId = newDepartment._id.toString();
        }
        // Handle schoolCertificate upload if it's base64
        if (data.schoolCertificate && data.schoolCertificate.startsWith('data:image')) {
            data.schoolCertificate = yield (0, s3_1.uploadToS3)(data.schoolCertificate, 'school-certificates');
        }
        const pastSchool = new pastSchoolModel_1.PastSchool(data);
        const savedSchool = yield pastSchool.save();
        // Update BioUserState and BioUserSchoolInfo
        const bioUserState = yield bioUserStateModel_1.default.findOneAndUpdate({ bioUserId }, { isEducationHistory: true, hasPastSchool: true }, { returnDocument: 'after', runValidators: false });
        const bioUserSchoolInfo = yield bioUserSchoolInfoModel_1.default.findOneAndUpdate({ bioUserId }, { hasPastSchool: true }, { returnDocument: 'after', runValidators: false });
        // Check verification status after adding past school
        yield (0, verificationHelper_1.checkVerificationStatus)(bioUserId);
        res.status(201).json({
            savedSchool,
            bioUserState,
            bioUserSchoolInfo
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.addPastSchool = addPastSchool;
// @desc    Update a past school
// @route   PUT /api/schools/past/:id
// @access  Private
const updatePastSchool = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = Object.assign({}, req.body);
        // Handle schoolCertificate upload if it's base64
        if (updateData.schoolCertificate && updateData.schoolCertificate.startsWith('data:image')) {
            updateData.schoolCertificate = yield (0, s3_1.uploadToS3)(updateData.schoolCertificate, 'school-certificates');
        }
        const updatedSchool = yield pastSchoolModel_1.PastSchool.findByIdAndUpdate(id, Object.assign(Object.assign({}, updateData), { schoolName: updateData.schoolName ? (0, sanitize_1.xssClean)(updateData.schoolName) : undefined, schoolDepartment: updateData.schoolDepartment ? (0, sanitize_1.xssClean)(updateData.schoolDepartment) : undefined }), { returnDocument: 'after', runValidators: true });
        if (!updatedSchool) {
            res.status(404).json({ message: 'Past school record not found' });
            return;
        }
        // Update BioUserState if a certificate was uploaded
        if (updateData.schoolCertificate) {
            yield bioUserStateModel_1.default.findOneAndUpdate({ bioUserId: updatedSchool.bioUserId }, { isEducationHistory: true }, { runValidators: false });
        }
        // Check verification status after updating past school
        yield (0, verificationHelper_1.checkVerificationStatus)(updatedSchool.bioUserId);
        res.json(updatedSchool);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updatePastSchool = updatePastSchool;
// @desc    Delete a past school
// @route   DELETE /api/schools/past/:id
// @access  Private
const deletePastSchool = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedSchool = yield pastSchoolModel_1.PastSchool.findByIdAndDelete(id);
        if (!deletedSchool) {
            res.status(404).json({ message: 'Past school record not found' });
            return;
        }
        res.json({ message: 'Past school record removed' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deletePastSchool = deletePastSchool;
