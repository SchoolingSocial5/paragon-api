import express from 'express'
import multer from 'multer'
const upload = multer()
import {
  loginUser,
  getCurrentUser,
  updatePassword,
} from '../../controllers/users/authController'
import {
  getAUser,
  getUsers,
  updateUser,
  createUser,
  getExistingUsername,
  searchAccounts,
  updateUserStatus,
  MakeUserStaff,
  MakeStaffUser,
  deleteUser,
} from '../../controllers/users/userController'

const router = express.Router()
router.route('/create-account')
router.route('/username/:username').get(getExistingUsername)
router.route('/login').post(upload.any(), loginUser)

router.route('/auth').get(getCurrentUser)

router.route('/search').get(searchAccounts)
router.route('/suspend').get(searchAccounts)
router.route('/make-staff').patch(upload.any(), MakeUserStaff)
router.route('/staff').patch(upload.any(), updateUserStatus)

router
  .route('/:username')
  .get(getAUser)
  .patch(upload.any(), updateUser)
  .post(upload.any(), updatePassword)

router.route('/:id').patch(MakeStaffUser).delete(deleteUser)
router.route('/').get(getUsers).post(upload.any(), createUser)

export default router
