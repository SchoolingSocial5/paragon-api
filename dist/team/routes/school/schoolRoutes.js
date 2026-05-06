"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const schoolController_1 = require("../../controller/school/schoolController");
const uploadMiddleware_1 = require("../../../middleware/uploadMiddleware");
const router = express_1.default.Router();
router.get('/', schoolController_1.getSchools);
router.get('/stats', schoolController_1.getSchoolStats);
router.post('/', uploadMiddleware_1.schoolUpload, schoolController_1.createSchool);
router.put('/:id', uploadMiddleware_1.schoolUpload, schoolController_1.updateSchool);
router.delete('/:id', schoolController_1.deleteSchool);
exports.default = router;
