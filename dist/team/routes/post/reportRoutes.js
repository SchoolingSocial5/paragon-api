"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reportController_1 = require("../../controller/post/reportController");
const router = express_1.default.Router();
router.get('/stats', reportController_1.getReportStats);
router.get('/posts', reportController_1.getReportedPosts);
router.get('/accounts', reportController_1.getReportedAccounts);
router.delete('/accounts/:id', reportController_1.deleteReportedAccount);
router.put('/accounts/:id/resolve', reportController_1.resolveReportedAccount);
router.delete('/posts/:id', reportController_1.deleteReportedPost);
router.put('/posts/:id/resolve', reportController_1.resolveReportedPost);
exports.default = router;
