"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../../controllers/place/paymentController");
const transactionController_1 = require("../../controllers/place/transactionController");
const authMiddleware_1 = require("../../../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', paymentController_1.getPayments);
router.post('/', authMiddleware_1.protect, paymentController_1.createPayment);
router.put('/:id', authMiddleware_1.protect, paymentController_1.updatePayment);
router.delete('/:id', authMiddleware_1.protect, paymentController_1.deletePayment);
// Transactions
router.post('/transactions', authMiddleware_1.protect, transactionController_1.createTransaction);
router.get('/transactions/my', authMiddleware_1.protect, transactionController_1.getMyTransactions);
router.get('/transactions', authMiddleware_1.protect, transactionController_1.getTransactions);
exports.default = router;
