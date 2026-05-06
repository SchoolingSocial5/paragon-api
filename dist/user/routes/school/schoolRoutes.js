"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const schoolController_1 = require("../../controllers/school/schoolController");
const pastSchoolController_1 = require("../../controllers/school/pastSchoolController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/explore', schoolController_1.exploreSchools);
router.get('/search', authMiddleware_1.protect, schoolController_1.searchSchools);
router.get('/profile/:username', schoolController_1.getSchoolByUsername);
router.get('/:id', authMiddleware_1.protect, schoolController_1.getSchoolById);
router.get('/:id/departments', authMiddleware_1.protect, schoolController_1.getDepartments);
// Past Schools
router.get('/past/:bioUserId', authMiddleware_1.protect, pastSchoolController_1.getPastSchools);
router.post('/past', authMiddleware_1.protect, pastSchoolController_1.addPastSchool);
router.put('/past/:id', authMiddleware_1.protect, pastSchoolController_1.updatePastSchool);
router.delete('/past/:id', authMiddleware_1.protect, pastSchoolController_1.deletePastSchool);
exports.default = router;
