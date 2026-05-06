"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const positionController_1 = require("../../controller/company/positionController");
const router = express_1.default.Router();
router.route('/')
    .get(positionController_1.getPositions)
    .post(positionController_1.createPosition);
router.route('/:id')
    .put(positionController_1.updatePosition)
    .delete(positionController_1.deletePosition);
exports.default = router;
