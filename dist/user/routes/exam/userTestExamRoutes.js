"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userTestExamController_1 = require("../../controllers/exam/userTestExamController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/paper/:id/participants', authMiddleware_1.extractUser, userTestExamController_1.getParticipantsByPaperId);
router.get('/debug/version', userTestExamController_1.getDebugVersion);
router.use(authMiddleware_1.protect); // Secure all other user exam routes
router.get('/', userTestExamController_1.getUserTestExams);
router.get('/:id', userTestExamController_1.getUserTestExamByPaperId);
router.post('/', userTestExamController_1.createUserTestExam);
router.patch('/:id', userTestExamController_1.updateUserTestExam);
exports.default = router;
