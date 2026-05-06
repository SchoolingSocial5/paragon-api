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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSchool = exports.updateSchool = exports.createSchool = exports.getSchoolStats = exports.getSchools = void 0;
const schoolModel_1 = require("../../../models/school/schoolModel");
const s3_1 = require("../../../utils/s3");
// @desc    Get all schools for team dashboard
// @route   GET /api/team/schools
// @access  Private/Staff
const getSchools = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, page, limit, country, state } = req.query;
        let query = {};
        if (country && typeof country === 'string' && country.trim()) {
            query.country = { $regex: `^${country.trim()}$`, $options: 'i' };
        }
        if (state && typeof state === 'string' && state.trim()) {
            query.state = { $regex: `^${state.trim()}$`, $options: 'i' };
        }
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { state: searchRegex },
                { area: searchRegex },
                { country: searchRegex },
                { username: searchRegex }
            ];
        }
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        const [schools, total] = yield Promise.all([
            schoolModel_1.School.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            schoolModel_1.School.countDocuments(query)
        ]);
        res.json({
            results: schools,
            metadata: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSchools = getSchools;
// @desc    Get school statistics
// @route   GET /api/team/schools/stats
// @access  Private/Staff
const getSchoolStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalSchools = yield schoolModel_1.School.countDocuments({});
        const verifiedSchools = yield schoolModel_1.School.countDocuments({ isVerified: true });
        const newSchools = yield schoolModel_1.School.countDocuments({ isNewEntry: true });
        res.json({
            totalSchools,
            verifiedSchools,
            newSchools
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSchoolStats = getSchoolStats;
// @desc    Create a school
// @route   POST /api/team/schools
// @access  Private/Staff
const createSchool = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = Object.assign({}, req.body);
        const files = req.files;
        if (files) {
            if (files['logo']) {
                body.logo = yield (0, s3_1.uploadBufferToS3)(files['logo'][0].buffer, files['logo'][0].originalname, files['logo'][0].mimetype, 'school/logos');
            }
            if (files['media']) {
                body.media = yield (0, s3_1.uploadBufferToS3)(files['media'][0].buffer, files['media'][0].originalname, files['media'][0].mimetype, 'school/media');
            }
        }
        // Parse levels if they come as a string (from FormData)
        if (typeof body.levels === 'string') {
            try {
                body.levels = JSON.parse(body.levels);
            }
            catch (e) {
                body.levels = [];
            }
        }
        const school = new schoolModel_1.School(body);
        const created = yield school.save();
        res.status(201).json(created);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createSchool = createSchool;
// @desc    Update a school
// @route   PUT /api/team/schools/:id
// @access  Private/Staff
const updateSchool = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = Object.assign({}, req.body);
        const files = req.files;
        if (files) {
            if (files['logo']) {
                body.logo = yield (0, s3_1.uploadBufferToS3)(files['logo'][0].buffer, files['logo'][0].originalname, files['logo'][0].mimetype, 'school/logos');
            }
            if (files['media']) {
                body.media = yield (0, s3_1.uploadBufferToS3)(files['media'][0].buffer, files['media'][0].originalname, files['media'][0].mimetype, 'school/media');
            }
        }
        // Parse levels if they come as a string
        if (typeof body.levels === 'string') {
            try {
                body.levels = JSON.parse(body.levels);
            }
            catch (e) {
                // Keep existing levels if parse fails? 
                // Usually FormData stringifies it.
            }
        }
        const updated = yield schoolModel_1.School.findByIdAndUpdate(req.params.id, { $set: body }, { new: true, runValidators: true });
        if (!updated) {
            res.status(404).json({ message: 'School not found' });
            return;
        }
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateSchool = updateSchool;
// @desc    Delete a school
// @route   DELETE /api/team/schools/:id
// @access  Private/Staff
const deleteSchool = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school = yield schoolModel_1.School.findByIdAndDelete(req.params.id);
        if (!school) {
            res.status(404).json({ message: 'School not found' });
            return;
        }
        res.json({ message: 'School deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteSchool = deleteSchool;
