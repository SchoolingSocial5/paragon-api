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
exports.initializeUserObjectives = exports.upsertUserObjective = exports.getUserObjectives = void 0;
const userObjectiveModel_1 = require("../../../models/exam/userObjectiveModel");
/**
 * @desc    Get all user objective records for a specific paper and user
 * @route   GET /api/exams/user-objectives/paper/:paperId
 * @access  Private
 */
const getUserObjectives = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { paperId } = req.params;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const objectives = yield userObjectiveModel_1.UserObjective.find({ bioUserId: userId, paperId });
        res.status(200).json(objectives);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
exports.getUserObjectives = getUserObjectives;
/**
 * @desc    Upsert a user objective record (Create if not exists, else update)
 * @route   POST /api/exams/user-objectives/upsert
 * @access  Private
 */
const upsertUserObjective = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { paperId, objectiveId, isClicked, isCorrect, question, options } = req.body;
        if (!paperId || !objectiveId) {
            return res.status(400).json({ message: 'paperId and objectiveId are required' });
        }
        // Use paperId, bioUserId, and objectiveId as the unique keys for checking
        const filter = { bioUserId: userId, paperId, objectiveId };
        const update = {
            isClicked,
            isCorrect,
            question,
            options,
            bioUserId: userId
        };
        const result = yield userObjectiveModel_1.UserObjective.findOneAndUpdate(filter, update, {
            new: true,
            upsert: true,
            runValidators: true
        });
        res.status(200).json(result);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.upsertUserObjective = upsertUserObjective;
/**
 * @desc    Initialize user objectives in bulk (Deprecated but kept for compatibility)
 * @route   POST /api/exams/user-objectives/initialize
 * @access  Private
 */
const initializeUserObjectives = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { paperId, objectives } = req.body;
        const results = yield Promise.all(objectives.map((obj) => userObjectiveModel_1.UserObjective.findOneAndUpdate({ bioUserId: userId, paperId, objectiveId: obj.objectiveId }, Object.assign(Object.assign({}, obj), { bioUserId: userId, paperId }), { new: true, upsert: true })));
        res.status(201).json(results);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.initializeUserObjectives = initializeUserObjectives;
