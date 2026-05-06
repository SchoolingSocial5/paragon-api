"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const academicLevelController_1 = require("../../controllers/school/academicLevelController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, academicLevelController_1.getAcademicLevels);
router.post('/', authMiddleware_1.protect, academicLevelController_1.createAcademicLevel);
router.put('/:id', authMiddleware_1.protect, academicLevelController_1.updateAcademicLevel);
router.delete('/:id', authMiddleware_1.protect, academicLevelController_1.deleteAcademicLevel);
exports.default = router;
