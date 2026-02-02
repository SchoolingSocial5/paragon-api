import express from 'express'
import multer from 'multer'

import {
  createExpense,
  getExpense,
  getExpenses,
  updateExpense,
} from '../controllers/expenseController'
const upload = multer()

const router = express.Router()

router.route('/:id').get(getExpense).patch(upload.any(), updateExpense)
router.route('/').get(getExpenses).post(upload.any(), createExpense)

export default router
