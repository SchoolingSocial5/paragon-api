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
exports.resolveReportedPost = exports.deleteReportedPost = exports.resolveReportedAccount = exports.deleteReportedAccount = exports.getReportedAccounts = exports.getReportedPosts = exports.getReportStats = void 0;
const reportedPostModel_1 = require("../../../models/post/reportedPostModel");
const reportedAccountModel_1 = require("../../../models/post/reportedAccountModel");
// @desc    Get report statistics
// @route   GET /api/team/posts/reports/stats
// @access  Private/Staff
const getReportStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [reportedPosts, reportedAccounts] = yield Promise.all([
            reportedPostModel_1.ReportedPost.countDocuments({ status: true }),
            reportedAccountModel_1.ReportedAccount.countDocuments({ status: true })
        ]);
        res.json({
            reportedPosts,
            reportedAccounts,
            totalReports: reportedPosts + reportedAccounts
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getReportStats = getReportStats;
// @desc    Get all reported posts
// @route   GET /api/team/posts/reports/posts
// @access  Private/Staff
const getReportedPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reports = yield reportedPostModel_1.ReportedPost.find({}).sort({ createdAt: -1 });
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getReportedPosts = getReportedPosts;
// @desc    Get all reported accounts
// @route   GET /api/team/posts/reports/accounts
// @access  Private/Staff
const getReportedAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reports = yield reportedAccountModel_1.ReportedAccount.find({}).sort({ createdAt: -1 });
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getReportedAccounts = getReportedAccounts;
// @desc    Delete a reported account
// @route   DELETE /api/team/posts/reports/accounts/:id
// @access  Private/Staff
const deleteReportedAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const report = yield reportedAccountModel_1.ReportedAccount.findByIdAndDelete(req.params.id);
        if (!report) {
            res.status(404).json({ message: 'Report not found' });
            return;
        }
        res.json({ message: 'Reported account record deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteReportedAccount = deleteReportedAccount;
// @desc    Resolve a reported account
// @route   PUT /api/team/posts/reports/accounts/:id/resolve
// @access  Private/Staff
const resolveReportedAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const report = yield reportedAccountModel_1.ReportedAccount.findByIdAndUpdate(req.params.id, { status: false }, { new: true });
        if (!report) {
            res.status(404).json({ message: 'Report not found' });
            return;
        }
        res.json({ message: 'Report resolved successfully', report });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.resolveReportedAccount = resolveReportedAccount;
// @desc    Delete a reported post
// @route   DELETE /api/team/posts/reports/posts/:id
// @access  Private/Staff
const deleteReportedPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const report = yield reportedPostModel_1.ReportedPost.findByIdAndDelete(req.params.id);
        if (!report) {
            res.status(404).json({ message: 'Report not found' });
            return;
        }
        res.json({ message: 'Reported post record deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteReportedPost = deleteReportedPost;
// @desc    Resolve a reported post
// @route   PUT /api/team/posts/reports/posts/:id/resolve
// @access  Private/Staff
const resolveReportedPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const report = yield reportedPostModel_1.ReportedPost.findByIdAndUpdate(req.params.id, { status: false }, { new: true });
        if (!report) {
            res.status(404).json({ message: 'Report not found' });
            return;
        }
        res.json({ message: 'Report resolved successfully', report });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.resolveReportedPost = resolveReportedPost;
