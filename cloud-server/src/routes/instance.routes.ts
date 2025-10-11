import { Router } from 'express'
import InstanceController from '../controllers/instance.controller'
import Middleware from '../middlewares/auth.middleware'

const instanceRoutes: Router = Router()

instanceRoutes.get(
  '/http',
  Middleware.authMiddleware,
  InstanceController.getHttp,
)

export default instanceRoutes
