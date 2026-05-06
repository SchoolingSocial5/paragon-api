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
exports.deleteNote = exports.updateNote = exports.getNotes = exports.createNote = void 0;
const Note_1 = __importDefault(require("../models/Note"));
const createNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { content, media } = req.body;
        const userId = req.user._id;
        const note = yield Note_1.default.create({
            userId,
            content,
            media
        });
        res.status(201).json(note);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.createNote = createNote;
const getNotes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const notes = yield Note_1.default.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(notes);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.getNotes = getNotes;
const updateNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { content, media } = req.body;
        const note = yield Note_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { content, media }, { new: true });
        if (!note)
            return res.status(404).json({ message: "Note not found" });
        res.status(200).json(note);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.updateNote = updateNote;
const deleteNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const note = yield Note_1.default.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!note)
            return res.status(404).json({ message: "Note not found" });
        res.status(200).json({ message: "Note deleted" });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.deleteNote = deleteNote;
