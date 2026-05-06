"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const staffController_1 = require("../../controller/company/staffController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/me', authMiddleware_1.protect, staffController_1.getStaffProfile);
router.post('/bulk', authMiddleware_1.protect, staffController_1.bulkCreateStaff);
router.route('/')
    .get(staffController_1.getStaffs)
    .post(staffController_1.createStaff);
router.route('/:id')
    .put(staffController_1.updateStaff)
    .delete(staffController_1.deleteStaff);
exports.default = router;
