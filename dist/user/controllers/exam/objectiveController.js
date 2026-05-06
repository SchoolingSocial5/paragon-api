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
exports.deleteObjective = exports.updateObjective = exports.getObjectivesByPaperId = exports.createObjective = void 0;
const objectiveModel_1 = require("../../../models/exam/objectiveModel");
const createObjective = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { paperId, question, options } = req.body;
        if (!paperId) {
            return res.status(400).json({ message: 'paperId is required' });
        }
        // Get the latest index for this paper
        const lastObjective = yield objectiveModel_1.Objective.findOne({ paperId }).sort({ index: -1 });
        const nextIndex = lastObjective ? lastObjective.index + 1 : 1;
        const objective = new objectiveModel_1.Objective(Object.assign(Object.assign({}, req.body), { index: nextIndex }));
        yield objective.save();
        res.status(201).json(objective);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createObjective = createObjective;
const getObjectivesByPaperId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { paperId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        if (!paperId) {
            return res.status(400).json({ message: 'paperId is required' });
        }
        const total = yield objectiveModel_1.Objective.countDocuments({ paperId });
        const objectives = yield objectiveModel_1.Objective.find({ paperId })
            .sort({ index: 1 })
            .skip(skip)
            .limit(limit);
        res.status(200).json({
            results: objectives,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getObjectivesByPaperId = getObjectivesByPaperId;
const updateObjective = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const objective = yield objectiveModel_1.Objective.findByIdAndUpdate(id, Object.assign({}, req.body), { new: true, runValidators: true });
        if (!objective) {
            return res.status(404).json({ message: 'Objective not found' });
        }
        res.status(200).json(objective);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateObjective = updateObjective;
const deleteObjective = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const objective = yield objectiveModel_1.Objective.findByIdAndDelete(id);
        if (!objective) {
            return res.status(404).json({ message: 'Objective not found' });
        }
        res.status(200).json({ message: 'Objective deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteObjective = deleteObjective;
