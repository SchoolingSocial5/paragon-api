"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cloudController_1 = require("../../controllers/cloud/cloudController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Applying protect to all cloud routes for security
router.use(authMiddleware_1.protect);
router.post('/', cloudController_1.createCloud);
router.get('/', cloudController_1.getClouds);
router.put('/:id', cloudController_1.updateCloud);
router.delete('/:id', cloudController_1.deleteCloud);
exports.default = router;
