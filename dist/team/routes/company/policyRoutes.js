"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const policyController_1 = require("../../controller/company/policyController");
const router = express_1.default.Router();
router.route('/')
    .get(policyController_1.getPolicies)
    .post(policyController_1.createPolicy);
router.route('/:id')
    .get(policyController_1.getPolicyById)
    .put(policyController_1.updatePolicy)
    .delete(policyController_1.deletePolicy);
exports.default = router;
