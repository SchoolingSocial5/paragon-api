import express from 'express'
import multer from 'multer'
import {
  createMarketing,
  getMarketing,
  getMarketings,
  searchMarketings,
  updateMarketing,
} from '../controllers/marketingController'
const upload = multer()

const router = express.Router()

router.route('/search').get(searchMarketings)
router.route('/:id').get(getMarketing).patch(upload.any(), updateMarketing)
router.route('/').get(getMarketings).post(upload.any(), createMarketing)

export default router
