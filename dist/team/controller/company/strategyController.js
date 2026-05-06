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
exports.toggleStrategyCompletion = exports.deleteStrategy = exports.updateStrategy = exports.createStrategy = exports.getStrategies = void 0;
const strategyModel_1 = require("../../../models/company/strategyModel");
// @desc    Get all strategies
// @route   GET /api/team/strategies
// @access  Private/Staff
const getStrategies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month } = req.query;
        let query = {};
        if (month) {
            query.month = month;
        }
        const strategies = yield strategyModel_1.Strategy.find(query).sort({ createdAt: -1 });
        res.json(strategies);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getStrategies = getStrategies;
// @desc    Create a new strategy
// @route   POST /api/team/strategies
// @access  Private/Staff
const createStrategy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const strategy = yield strategyModel_1.Strategy.create(req.body);
        res.json(strategy);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createStrategy = createStrategy;
// @desc    Update a strategy
// @route   PATCH /api/team/strategies/:id
// @access  Private/Staff
const updateStrategy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const strategy = yield strategyModel_1.Strategy.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!strategy) {
            res.status(404).json({ message: 'Strategy not found' });
            return;
        }
        res.json(strategy);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateStrategy = updateStrategy;
// @desc    Delete a strategy
// @route   DELETE /api/team/strategies/:id
// @access  Private/Staff
const deleteStrategy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const strategy = yield strategyModel_1.Strategy.findByIdAndDelete(req.params.id);
        if (!strategy) {
            res.status(404).json({ message: 'Strategy not found' });
            return;
        }
        res.json({ message: 'Strategy deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteStrategy = deleteStrategy;
// @desc    Toggle strategy completion status
// @route   PATCH /api/team/strategies/:id/toggle
// @access  Private/Staff
const toggleStrategyCompletion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const strategy = yield strategyModel_1.Strategy.findById(req.params.id);
        if (!strategy) {
            res.status(404).json({ message: 'Strategy not found' });
            return;
        }
        strategy.isCompleted = !strategy.isCompleted;
        yield strategy.save();
        res.json(strategy);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.toggleStrategyCompletion = toggleStrategyCompletion;
