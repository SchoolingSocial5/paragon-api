"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bioUserController_1 = require("../../controllers/user/bioUserController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/explored', authMiddleware_1.protect, bioUserController_1.getExploredBioUserSchoolInfo);
router.get('/username/:username/school-info', bioUserController_1.getBioUserSchoolInfoByUsername);
router.get('/:id', authMiddleware_1.protect, bioUserController_1.getBioUser);
router.get('/:id/state', authMiddleware_1.protect, bioUserController_1.getBioUserState);
router.get('/:id/school-info', authMiddleware_1.protect, bioUserController_1.getBioUserSchoolInfo);
router.put('/:id', authMiddleware_1.protect, bioUserController_1.updateBioUser);
router.put('/:id/school-info', authMiddleware_1.protect, bioUserController_1.updateBioUserSchoolInfo);
router.post('/:id/upload-document', authMiddleware_1.protect, bioUserController_1.uploadDocument);
router.post('/:id/verify', authMiddleware_1.protect, bioUserController_1.completeVerification);
exports.default = router;
