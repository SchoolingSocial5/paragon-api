"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const placeController_1 = require("../../controllers/place/placeController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', placeController_1.getPlaces);
router.post('/', authMiddleware_1.protect, placeController_1.createPlace);
router.put('/country/:name', authMiddleware_1.protect, placeController_1.updateCountry);
router.put('/state/:name', authMiddleware_1.protect, placeController_1.updateState);
router.delete('/country/:name', authMiddleware_1.protect, placeController_1.deleteCountry);
router.delete('/state/:name', authMiddleware_1.protect, placeController_1.deleteState);
exports.default = router;
