import express from 'express'
import multer from 'multer'
import {
  createRating,
  getRating,
  getRatings,
  searchRatings,
  updateRating,
} from '../controllers/reviewController'
const upload = multer()

const router = express.Router()

router.route('/search').get(searchRatings)
router.route('/:username').get(getRating).patch(upload.any(), updateRating)
router.route('/').get(getRatings).post(upload.any(), createRating)

export default router
