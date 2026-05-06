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
exports.updatePayment = exports.deletePayment = exports.createPayment = exports.getPayments = void 0;
const paymentModel_1 = require("../../../models/place/paymentModel");
// @desc    Get all payment methods for a country
// @route   GET /api/payments
// @access  Public
const getPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { country, search, page, limit } = req.query;
        let query = {};
        if (country)
            query.country = country;
        if (search)
            query.name = new RegExp(search, 'i');
        // Determine client type and default limit
        const isTeamRequest = req.originalUrl.includes('/team/');
        const defaultLimit = isTeamRequest ? 20 : 10;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || defaultLimit));
        const skip = (pageNum - 1) * limitNum;
        const isFull = req.query.full === 'true';
        const [results, total] = yield Promise.all([
            paymentModel_1.Payment.find(query)
                .select(isFull
                ? 'name amount country type logo picture description countryFlag createdAt'
                : 'name amount country type logo countryFlag createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            paymentModel_1.Payment.countDocuments(query)
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
exports.getPayments = getPayments;
// @desc    Create a new payment method
// @route   POST /api/payments
// @access  Private/Staff
const createPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payment = yield paymentModel_1.Payment.create(req.body);
        res.status(201).json(payment);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createPayment = createPayment;
// @desc    Delete a payment method
// @route   DELETE /api/payments/:id
// @access  Private/Staff
const deletePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield paymentModel_1.Payment.findByIdAndDelete(id);
        res.json({ message: "Payment method deleted successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.deletePayment = deletePayment;
// @desc    Update a payment method
// @route   PUT /api/payments/:id
// @access  Private/Staff
const updatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const payment = yield paymentModel_1.Payment.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!payment) {
            res.status(404).json({ message: "Payment method not found" });
            return;
        }
        res.json(payment);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updatePayment = updatePayment;
