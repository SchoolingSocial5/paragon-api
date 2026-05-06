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
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const GEMINI_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
class GeminiService {
    constructor() {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY || '' });
    }
    isQuotaError(error) {
        var _a;
        const msg = (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : '';
        return msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate');
    }
    explainQuestion(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            let { question, options, userAnswer, correctAnswer } = data;
            // Strip base64 image data and HTML tags to prevent context length errors in Groq
            const stripHtml = (text) => {
                if (typeof text !== 'string')
                    return text;
                let stripped = text.replace(/src="data:image\/[^;]+;base64,[^"]+"/g, 'src="[IMAGE STRIPPED]"');
                stripped = stripped.replace(/<[^>]*>?/gm, ''); // Strip all HTML tags
                return stripped.trim();
            };
            question = stripHtml(question);
            userAnswer = stripHtml(userAnswer);
            correctAnswer = stripHtml(correctAnswer);
            // Also strip HTML from options to be safe
            const cleanOptions = (options || []).map((o) => stripHtml((o === null || o === void 0 ? void 0 : o.value) || o));
            const prompt = `
      You are an educational AI assistant helping a student understand their exam results.

      Question: ${question}
      Options: ${JSON.stringify(cleanOptions)}
      Student's Answer: ${userAnswer}
      Correct Answer: ${correctAnswer}

      Respond using EXACTLY one of the two formats below. Do not add any extra text, greetings, or labels outside these formats.

      If the student answered correctly:
      CORRECT\n
      [A concise, encouraging explanation of why the answer is correct. Max 3-4 sentences.]

      If the student answered incorrectly:
      FAILED\n
      [A kind, supportive explanation of why their answer was wrong and why the correct answer is right. Max 3-4 sentences.]\n
      ANSWER\n
      [The correct answer value only, exactly as provided above.]

      Rules:
      - Use plain text only (no markdown like **bold**).
      - The first line must be either CORRECT or FAILED — nothing else.
      - Each section must be separated by a line break as shown.
      - Do not include labels like "Explanation:" or "Correct Answer:" in your response.
    `;
            // Try Groq first (generous free tier — up to 14,400 req/day)
            if (process.env.GROQ_API_KEY) {
                for (const model of GROQ_MODELS) {
                    try {
                        console.log(`[AI] Trying Groq model: ${model}`);
                        const completion = yield this.groq.chat.completions.create({
                            model,
                            messages: [{ role: 'user', content: prompt }],
                            max_tokens: 300,
                            temperature: 0.3,
                        });
                        const text = (_d = (_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : '';
                        if (text)
                            return text;
                    }
                    catch (err) {
                        console.error(`[Groq Error] model=${model}`, err.message);
                        continue; // Try the next Groq model before falling back
                    }
                }
            }
            // Fallback to Gemini
            let lastError;
            for (const modelName of GEMINI_MODELS) {
                try {
                    console.log(`[AI] Falling back to Gemini model: ${modelName}`);
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = yield model.generateContent(prompt);
                    return result.response.text().trim() || 'No explanation generated.';
                }
                catch (error) {
                    console.error(`[Gemini Error] model=${modelName}`, error.message);
                    lastError = error;
                    if (this.isQuotaError(error))
                        continue;
                    break;
                }
            }
            if (this.isQuotaError(lastError)) {
                throw Object.assign(new Error('AI quota limit reached. Please try again in a few minutes.'), { status: 429 });
            }
            throw new Error((lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Failed to generate explanation from AI services.');
        });
    }
}
exports.GeminiService = GeminiService;
