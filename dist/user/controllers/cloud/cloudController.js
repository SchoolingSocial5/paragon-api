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
exports.deleteCloud = exports.updateCloud = exports.getClouds = exports.createCloud = void 0;
const cloudModel_1 = __importDefault(require("../../../models/cloud/cloudModel"));
const createCloud = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cloud = yield cloudModel_1.default.create(req.body);
        res.status(201).json(cloud);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.createCloud = createCloud;
const getClouds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clouds = yield cloudModel_1.default.find().sort({ createdAt: -1 });
        res.status(200).json(clouds);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.getClouds = getClouds;
const updateCloud = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cloud = yield cloudModel_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!cloud)
            return res.status(404).json({ message: "Cloud service not found" });
        res.status(200).json(cloud);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.updateCloud = updateCloud;
const deleteCloud = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cloud = yield cloudModel_1.default.findByIdAndDelete(req.params.id);
        if (!cloud)
            return res.status(404).json({ message: "Cloud service not found" });
        res.status(200).json({ message: "Cloud service deleted" });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.deleteCloud = deleteCloud;
