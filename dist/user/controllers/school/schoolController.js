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
exports.getSchoolById = exports.getSchoolByUsername = exports.getDepartments = exports.searchSchools = exports.exploreSchools = void 0;
const schoolModel_1 = require("../../../models/school/schoolModel");
// @desc    Explore schools with pagination
// @route   GET /api/schools/explore
// @access  Public
const exploreSchools = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q, page, limit } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        let query = {
            levels: { $exists: true, $not: { $size: 0 }, $elemMatch: { $ne: null } }
        };
        if (q && typeof q === 'string' && q.trim().length > 0) {
            const regex = new RegExp(q.trim(), 'i');
            query.$and = [
                { levels: { $exists: true, $not: { $size: 0 }, $elemMatch: { $ne: null } } },
                {
                    $or: [
                        { name: regex },
                        { username: regex },
                        { country: regex },
                        { state: regex },
                        { area: regex },
                    ]
                }
            ];
            // Clear the base query as we're using $and with the same condition for clarity
            delete query.levels;
        }
        const [results, total] = yield Promise.all([
            schoolModel_1.School.find(query)
                .select('name username logo media picture motto country state area address countryFlag countrySymbol continent ownershipType levels isVerified followers followings visits lat lng createdAt')
                .sort({ followers: -1, createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            schoolModel_1.School.countDocuments(query)
        ]);
        res.json({
            results,
            metadata: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: skip + results.length < total
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.exploreSchools = exploreSchools;
// @desc    Search schools
// @route   GET /api/schools/search
// @access  Private
const searchSchools = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q, country, state } = req.query;
        let query = {
            levels: { $exists: true, $not: { $size: 0 }, $elemMatch: { $ne: null } }
        };
        if (country && typeof country === 'string' && country.trim().length > 0) {
            query.country = { $regex: new RegExp(`^${country.trim()}$`, 'i') };
        }
        if (state && typeof state === 'string' && state.trim().length > 0) {
            query.state = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
        }
        if (q && typeof q === 'string' && q.trim().length > 0) {
            query.name = { $regex: q.trim(), $options: 'i' };
        }
        const schools = yield schoolModel_1.School.find(query).limit(20);
        res.json(schools);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.searchSchools = searchSchools;
const departmentModel_1 = require("../../../models/school/departmentModel");
// @desc    Get departments
// @route   GET /api/schools/:id/departments
// @access  Private
const getDepartments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { q } = req.query;
        const query = { schoolId: id };
        if (q && typeof q === 'string' && q.trim().length > 0) {
            query.name = { $regex: q.trim(), $options: 'i' };
        }
        const departments = yield departmentModel_1.Department.find(query).sort({ name: 1 }).limit(20);
        res.json(departments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getDepartments = getDepartments;
// @desc    Get school by username
// @route   GET /api/schools/profile/:username
// @access  Public
const getSchoolByUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school = yield schoolModel_1.School.findOne({ username: req.params.username });
        if (!school) {
            res.status(404).json({ message: 'School not found' });
            return;
        }
        res.json(school);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSchoolByUsername = getSchoolByUsername;
// @desc    Get school by id
// @route   GET /api/schools/:id
// @access  Public
const getSchoolById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school = yield schoolModel_1.School.findById(req.params.id);
        if (!school) {
            res.status(404).json({ message: 'School not found' });
            return;
        }
        res.json(school);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSchoolById = getSchoolById;
