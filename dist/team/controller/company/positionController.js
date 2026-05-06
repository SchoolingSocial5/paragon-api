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
exports.deletePosition = exports.updatePosition = exports.createPosition = exports.getPositions = void 0;
const positionModel_1 = require("../../../models/company/positionModel");
// @desc    Get all positions
// @route   GET /api/team/positions
// @access  Private/Staff
const getPositions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const positions = yield positionModel_1.Position.find({}).sort({ level: -1 });
        res.json(positions);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPositions = getPositions;
// @desc    Create a new position
// @route   POST /api/team/positions
// @access  Private/Staff
const createPosition = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const position = yield positionModel_1.Position.create(req.body);
        res.json(position);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createPosition = createPosition;
// @desc    Update a position
// @route   PUT /api/team/positions/:id
// @access  Private/Staff
const updatePosition = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const position = yield positionModel_1.Position.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!position) {
            res.status(404).json({ message: 'Position not found' });
            return;
        }
        res.json(position);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updatePosition = updatePosition;
// @desc    Delete a position
// @route   DELETE /api/team/positions/:id
// @access  Private/Staff
const deletePosition = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const position = yield positionModel_1.Position.findByIdAndDelete(req.params.id);
        if (!position) {
            res.status(404).json({ message: 'Position not found' });
            return;
        }
        res.json({ message: 'Position deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deletePosition = deletePosition;
