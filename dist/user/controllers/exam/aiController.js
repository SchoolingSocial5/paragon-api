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
exports.explainQuestion = void 0;
const geminiService_1 = require("../../../services/geminiService");
const gemini = new geminiService_1.GeminiService();
const explainQuestion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { question, options, userAnswer, correctAnswer } = req.body;
        if (!question || !options || userAnswer === undefined || correctAnswer === undefined) {
            res.status(400).json({ message: 'Missing required fields: question, options, userAnswer, correctAnswer' });
            return;
        }
        const explanation = yield gemini.explainQuestion({ question, options, userAnswer, correctAnswer });
        res.json({ explanation });
    }
    catch (err) {
        const status = err.status || 500;
        res.status(status).json({ message: err.message || 'Failed to generate explanation' });
    }
});
exports.explainQuestion = explainQuestion;
