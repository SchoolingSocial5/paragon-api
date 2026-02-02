import express from 'express'
import multer from 'multer'
const upload = multer()

import {
  createBlog,
  getABlog,
  getBlogs,
  searchBlogs,
  updateBlog,
} from '../controllers/blogController'

const router = express.Router()

router.route('/search').get(searchBlogs)
router.route('/:id').get(getABlog).patch(upload.any(), updateBlog)
router.route('/').get(getBlogs).post(upload.any(), createBlog)

export default router
