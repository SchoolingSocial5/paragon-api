"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../../controller/user/userController");
const router = express_1.default.Router();
// All routes here should ideally be protected by a staff-only middleware
// For now, defining the routes
router.get('/', userController_1.getUsers);
router.get('/stats', userController_1.getUserStats);
router.get('/registrations', userController_1.getMonthlyRegistrations);
router.get('/persons', userController_1.getPersons);
router.get('/verifying', userController_1.getVerifyingPersons);
router.get('/dashboard-data', userController_1.getUsersDashboardData);
router.get('/username/:username', userController_1.getBioUserDetailsByUsername);
router.post('/verify/:id', userController_1.verifyUser);
router.post('/decline/:id', userController_1.declineVerification);
router.post('/admin/create', userController_1.adminCreateAccount);
router.delete('/persons/bulk-delete', userController_1.bulkDeletePersons);
router.delete('/:id', userController_1.adminDeleteUser);
exports.default = router;
