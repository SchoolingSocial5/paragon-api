"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const documentController_1 = require("../../controllers/place/documentController");
const router = express_1.default.Router();
router.get('/', documentController_1.getDocuments);
exports.default = router;
