import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cluster from 'cluster'
import { createServer } from 'http'
import cors from 'cors'
import authRoutes from './routes/auth.routes'
import instanceRoutes from './routes/instance.routes'
import { PORT } from './config/config'
import { connectDB, db } from './db/mongo/init'
import { WebSocketService } from './services/websocket.service'
import { v4 as uuidv4 } from 'uuid'
import DomainMiddleware from './middlewares/domain.middleware'

const numCPUs = Number(process.env.CLUSTERS) || 1

if (cluster.isPrimary) {
  console.log(`Master process ${process.pid} is running`)

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }
} else {
  const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'sessionId',
      'X-Session-ID',
      'session-id',
      'x-session-id',
      'x-sessionid',
    ],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }

  const app = express()
  const server = createServer(app)

  WebSocketService.getInstance().initialize(server, '/ws')

  connectDB()

  app.set('trust proxy', true)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    next()
  })

  // Add raw body capture middleware BEFORE Express body parsing
  app.use(DomainMiddleware.captureRawBody)

  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: true }))
  app.use(cors(corsOptions))

  app.use(express.static('public'))

  app.use(DomainMiddleware.domainMiddleware)

  app.get('/', (req, res) => {
    res.send('Server is running')
  })
  app.get('/api/v1/health', (req, res) => {
    res.send('OK')
  })

  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/instance', instanceRoutes)

  server.listen(PORT, async () => {
    console.log(`Worker process ${process.pid} started on port ${PORT}`)
  })

  process.on('SIGINT', async () => {
    console.log('Shutting down server...')
    process.exit()
  })
}
