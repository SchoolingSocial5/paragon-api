"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const strategyController_1 = require("../../controller/company/strategyController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.route('/')
    .get(strategyController_1.getStrategies)
    .post(strategyController_1.createStrategy);
router.route('/:id')
    .patch(strategyController_1.updateStrategy)
    .delete(strategyController_1.deleteStrategy);
router.patch('/:id/toggle', strategyController_1.toggleStrategyCompletion);
exports.default = router;
