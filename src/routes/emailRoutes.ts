import express from 'express'
import multer from 'multer'
const upload = multer()

import {
  getEmailById,
  getEmails,
  updateEmail,
  deleteEmail,
  createEmail,
  sendEmailToUsers,
} from '../controllers/message/emailController'
import {
  createNotificationTemplate,
  getNotificationTemplateById,
  getNotificationTemplates,
  updateNotificationTemplate,
} from '../controllers/message/notificationTemplateController'

const router = express.Router()

router.route('/').get(getEmails).post(upload.any(), createEmail)
router.route('/send/:id').post(upload.any(), sendEmailToUsers)

router
  .route('/templates')
  .get(getNotificationTemplates)
  .post(upload.any(), createNotificationTemplate)

router
  .route('/templates/:id')
  .get(getNotificationTemplateById)
  .patch(upload.any(), updateNotificationTemplate)

router
  .route('/:id')
  .get(getEmailById)
  .patch(upload.any(), updateEmail)
  .delete(deleteEmail)

export default router
