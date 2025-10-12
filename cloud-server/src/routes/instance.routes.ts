import { Router } from 'express'
import InstanceController from '../controllers/instance.controller'
import Middleware from '../middlewares/auth.middleware'

const instanceRoutes: Router = Router()

instanceRoutes.get(
  '/http',
  Middleware.authMiddleware,
  InstanceController.getHttp,
)
instanceRoutes.get(
  '/domains',
  Middleware.authMiddleware,
  InstanceController.getDomains,
)
instanceRoutes.get(
  '/domains/:id',
  Middleware.authMiddleware,
  InstanceController.getDomain,
)
instanceRoutes.post(
  '/domains',
  Middleware.authMiddleware,
  InstanceController.createDomain,
)

export default instanceRoutes
