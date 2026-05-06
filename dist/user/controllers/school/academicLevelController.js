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
exports.deleteAcademicLevel = exports.updateAcademicLevel = exports.createAcademicLevel = exports.getAcademicLevels = void 0;
const academicLevelModel_1 = __importDefault(require("../../../models/school/academicLevelModel"));
// @desc    Get all academic levels with pagination
// @route   GET /api/academic-levels
// @access  Private
const getAcademicLevels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { country, inSchool, search, page, limit } = req.query;
        let query = {};
        if (country)
            query.country = country;
        if (inSchool !== undefined)
            query.inSchool = inSchool === 'true';
        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [{ levelName: regex }, { section: regex }, { certificateName: regex }];
        }
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        const [results, total] = yield Promise.all([
            academicLevelModel_1.default.find(query).sort({ level: 1 }).skip(skip).limit(limitNum),
            academicLevelModel_1.default.countDocuments(query)
        ]);
        res.json({
            results,
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
exports.getAcademicLevels = getAcademicLevels;
// @desc    Create an academic level
// @route   POST /api/academic-levels
// @access  Private
const createAcademicLevel = (_a, res_1) => __awaiter(void 0, [_a, res_1], void 0, function* ({ body }, res) {
    try {
        const academicLevel = new academicLevelModel_1.default(body);
        const created = yield academicLevel.save();
        res.status(201).json(created);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createAcademicLevel = createAcademicLevel;
// @desc    Update an academic level
// @route   PUT /api/academic-levels/:id
// @access  Private
const updateAcademicLevel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield academicLevelModel_1.default.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
        if (!updated) {
            res.status(404).json({ message: 'Academic level not found' });
            return;
        }
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateAcademicLevel = updateAcademicLevel;
// @desc    Delete an academic level
// @route   DELETE /api/academic-levels/:id
// @access  Private
const deleteAcademicLevel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield academicLevelModel_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            res.status(404).json({ message: 'Academic level not found' });
            return;
        }
        res.json({ message: 'Academic level deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteAcademicLevel = deleteAcademicLevel;
