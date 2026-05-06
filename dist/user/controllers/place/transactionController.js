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
exports.getTransactions = exports.getMyTransactions = exports.createTransaction = void 0;
const transactionModel_1 = require("../../../models/place/transactionModel");
// @desc    Create a new transaction record
// @route   POST /api/payments/transactions
// @access  Private
const createTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transaction = yield transactionModel_1.Transaction.create(req.body);
        res.status(201).json(transaction);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createTransaction = createTransaction;
// @desc    Get current user's transactions
// @route   GET /api/payments/transactions/my
// @access  Private
const getMyTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user || !user.email) {
            res.status(401).json({ message: 'Not authorized, no user email' });
            return;
        }
        const { page, limit } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;
        const [results, total] = yield Promise.all([
            transactionModel_1.Transaction.find({ email: user.email })
                .sort({ transactionDate: -1 })
                .skip(skip)
                .limit(limitNum),
            transactionModel_1.Transaction.countDocuments({ email: user.email })
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
exports.getMyTransactions = getMyTransactions;
// @desc    Get all transactions (for admin/staff)
// @route   GET /api/payments/transactions
// @access  Private/Staff
const getTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page, limit } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        const [results, total] = yield Promise.all([
            transactionModel_1.Transaction.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            transactionModel_1.Transaction.countDocuments()
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
exports.getTransactions = getTransactions;
