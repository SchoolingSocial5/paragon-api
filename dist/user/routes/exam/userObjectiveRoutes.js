"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userObjectiveController_1 = require("../../controllers/exam/userObjectiveController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.get('/paper/:paperId', userObjectiveController_1.getUserObjectives);
router.post('/upsert', userObjectiveController_1.upsertUserObjective);
router.post('/initialize', userObjectiveController_1.initializeUserObjectives);
exports.default = router;
