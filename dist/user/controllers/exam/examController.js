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
exports.bulkUpdateExamStatus = exports.deleteExam = exports.updateExam = exports.getBookmarkedExams = exports.toggleExamBookmark = exports.getExamById = exports.searchExams = exports.createExam = exports.getExams = void 0;
const examModel_1 = require("../../../models/exam/examModel");
const examStatModel_1 = require("../../../models/exam/examStatModel");
const sanitize_1 = require("../../../utils/sanitize");
const s3_1 = require("../../../utils/s3");
// Helper to populate user interaction status
const populateUserInteractions = (exams, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId)
        return exams;
    const bookmarks = yield examStatModel_1.ExamBookmark.find({ userId, examId: { $in: exams.map(e => e._id) } });
    const bookmarkedIds = new Set(bookmarks.map(b => b.examId.toString()));
    return exams.map(e => {
        const obj = e.toObject ? e.toObject() : e;
        obj.bookmarked = bookmarkedIds.has(e._id.toString());
        return obj;
    });
});
const getExams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const status = req.query.status;
        const minYear = req.query.minYear ? parseInt(req.query.minYear) : undefined;
        const maxYear = req.query.maxYear ? parseInt(req.query.maxYear) : undefined;
        const userId = req.query.currentUserId || ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString());
        const subjectsRaw = req.query.subjects;
        const subjectFilter = subjectsRaw ? subjectsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
        let query = {};
        if (status)
            query.status = status;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { title: searchRegex },
                { subtitle: searchRegex },
                { instruction: searchRegex },
                { subject: searchRegex }
            ];
        }
        if (minYear !== undefined || maxYear !== undefined) {
            query.year = {};
            if (minYear !== undefined)
                query.year.$gte = minYear;
            if (maxYear !== undefined)
                query.year.$lte = maxYear;
        }
        if (subjectFilter.length > 0) {
            query.subject = { $in: subjectFilter };
        }
        // Get year range and all distinct subjects from published exams
        const baseQuery = status ? { status, year: { $gt: 0 } } : { year: { $gt: 0 } };
        const subjectsBaseQuery = status ? { status } : {};
        const [yearRangeResult, allSubjects, total, exams] = yield Promise.all([
            examModel_1.Exam.aggregate([
                { $match: baseQuery },
                { $group: { _id: null, min: { $min: '$year' }, max: { $max: '$year' } } }
            ]),
            examModel_1.Exam.distinct('subject', subjectsBaseQuery),
            examModel_1.Exam.countDocuments(query),
            examModel_1.Exam.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
        ]);
        const yearRange = yearRangeResult.length > 0
            ? { min: yearRangeResult[0].min, max: yearRangeResult[0].max }
            : { min: 2000, max: new Date().getFullYear() };
        const processedExams = yield populateUserInteractions(exams, userId);
        res.status(200).json({
            results: processedExams,
            metadata: {
                total,
                page,
                limit,
                hasMore: skip + exams.length < total,
                yearRange,
                subjects: allSubjects.filter(Boolean).sort()
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getExams = getExams;
const createExam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const examData = Object.assign(Object.assign({}, req.body), { title: (0, sanitize_1.xssClean)(req.body.title), subtitle: (0, sanitize_1.xssClean)(req.body.subtitle), instruction: (0, sanitize_1.xssClean)(req.body.instruction), subject: (0, sanitize_1.xssClean)(req.body.subject) });
        // Handle image uploads if they are base64
        if (examData.logo && examData.logo.startsWith('data:image')) {
            examData.logo = yield (0, s3_1.uploadToS3)(examData.logo, 'exam-logos');
        }
        if (examData.picture && examData.picture.startsWith('data:image')) {
            examData.picture = yield (0, s3_1.uploadToS3)(examData.picture, 'exam-pictures');
        }
        const newExam = new examModel_1.Exam(examData);
        const savedExam = yield newExam.save();
        res.status(201).json(savedExam);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createExam = createExam;
const searchExams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const query = req.query.q;
        const userId = req.query.currentUserId || ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString());
        if (!query) {
            return res.status(200).json([]);
        }
        const searchRegex = new RegExp(query, 'i');
        const status = req.query.status;
        const filter = {
            $or: [
                { title: searchRegex },
                { subtitle: searchRegex },
                { instruction: searchRegex },
                { subject: searchRegex }
            ]
        };
        if (status) {
            filter.status = status;
        }
        const exams = yield examModel_1.Exam.find(filter)
            .limit(10);
        const processedExams = yield populateUserInteractions(exams, userId);
        res.status(200).json(processedExams);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.searchExams = searchExams;
const getExamById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const examId = req.params.id;
        const userId = req.query.currentUserId || ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString());
        const exam = yield examModel_1.Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        const examObj = exam.toObject();
        if (userId) {
            const bookmark = yield examStatModel_1.ExamBookmark.findOne({ userId, examId });
            examObj.bookmarked = !!bookmark;
        }
        res.status(200).json(examObj);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getExamById = getExamById;
// @desc    Toggle bookmark on exam
// @route   POST /api/exams/:id/bookmark
// @access  Private
const toggleExamBookmark = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const examId = req.params.id;
        const userId = req.user._id;
        const exam = yield examModel_1.Exam.findById(examId);
        if (!exam) {
            res.status(404).json({ message: 'Exam not found' });
            return;
        }
        const existingBookmark = yield examStatModel_1.ExamBookmark.findOne({ userId: userId, examId: examId });
        if (existingBookmark) {
            yield examStatModel_1.ExamBookmark.deleteOne({ _id: existingBookmark._id });
            exam.bookmarks = Math.max(0, (exam.bookmarks || 1) - 1);
        }
        else {
            yield examStatModel_1.ExamBookmark.create({ userId: userId, examId: examId });
            exam.bookmarks = (exam.bookmarks || 0) + 1;
        }
        yield exam.save();
        res.json({ bookmarks: exam.bookmarks, bookmarked: !existingBookmark });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleExamBookmark = toggleExamBookmark;
// @desc    Get bookmarked exams
// @route   GET /api/exams/bookmarks
// @access  Private
const getBookmarkedExams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = req.query.currentUserId || ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        if (!userId) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        const bookmarks = yield examStatModel_1.ExamBookmark.find({ userId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        if (bookmarks.length === 0) {
            res.json([]);
            return;
        }
        const examIds = bookmarks.map(b => b.examId);
        const exams = yield examModel_1.Exam.find({ _id: { $in: examIds } });
        // Sort exams to match bookmark order (latest bookmarked first)
        const sortedExams = examIds.map(id => exams.find(e => e._id.toString() === id.toString())).filter(Boolean);
        const processedExams = yield populateUserInteractions(sortedExams, userId);
        res.json(processedExams);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBookmarkedExams = getBookmarkedExams;
// @desc    Update an exam
// @route   PUT /api/exams/:id
// @access  Private (Admin/Team)
const updateExam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const examId = req.params.id;
        const examData = Object.assign(Object.assign({}, req.body), { title: req.body.title ? (0, sanitize_1.xssClean)(req.body.title) : undefined, subtitle: req.body.subtitle ? (0, sanitize_1.xssClean)(req.body.subtitle) : undefined, instruction: req.body.instruction ? (0, sanitize_1.xssClean)(req.body.instruction) : undefined, subject: req.body.subject ? (0, sanitize_1.xssClean)(req.body.subject) : undefined, logo: req.body.logo, picture: req.body.picture });
        // Handle image uploads if they are base64
        if (examData.logo && examData.logo.startsWith('data:image')) {
            examData.logo = yield (0, s3_1.uploadToS3)(examData.logo, 'exam-logos');
        }
        if (examData.picture && examData.picture.startsWith('data:image')) {
            examData.picture = yield (0, s3_1.uploadToS3)(examData.picture, 'exam-pictures');
        }
        // Remove undefined fields to avoid overwriting with undefined
        Object.keys(examData).forEach(key => examData[key] === undefined && delete examData[key]);
        const updatedExam = yield examModel_1.Exam.findByIdAndUpdate(examId, examData, { new: true });
        if (!updatedExam) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        res.status(200).json(updatedExam);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateExam = updateExam;
// @desc    Delete an exam
// @route   DELETE /api/exams/:id
// @access  Private (Admin/Team)
const deleteExam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const examId = req.params.id;
        const exam = yield examModel_1.Exam.findByIdAndDelete(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        res.status(200).json({ message: 'Exam deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteExam = deleteExam;
const bulkUpdateExamStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids, status } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Exam IDs are required' });
        }
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        const updateData = { status };
        if (status === 'Published') {
            updateData.publishedAt = new Date();
        }
        const result = yield examModel_1.Exam.updateMany({ _id: { $in: ids } }, { $set: updateData });
        res.status(200).json({
            message: `${result.modifiedCount} exams updated successfully`,
            modifiedCount: result.modifiedCount
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.bulkUpdateExamStatus = bulkUpdateExamStatus;
