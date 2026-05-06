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
exports.getDocuments = void 0;
const documentModel_1 = require("../../../models/place/documentModel");
// @desc    Get all documents (optionally filtered by country)
// @route   GET /api/documents
// @access  Private/Public
const getDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { country } = req.query;
        let query = {};
        if (country) {
            query.country = country;
        }
        const documents = yield documentModel_1.DocumentModel.find(query).sort({ createdAt: -1 });
        res.json(documents);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getDocuments = getDocuments;
