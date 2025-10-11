import express from 'express'
import AuthController from '../controllers/auth.controller'
import Middleware from '../middlewares/auth.middleware'
import type { Router } from 'express'

const router: Router = express.Router()

router.get('/user', Middleware.authMiddleware, AuthController.getUser)
router.post('/session', AuthController.createTerminalSession)
router.post(
  '/session/:sessionId',
  Middleware.authMiddleware,
  AuthController.completeTerminalSession,
)

export default router
