import { NextFunction, Request, Response } from 'express'
import { db } from '../db/mongo/init'
import { WebSocketService } from '../services/websocket.service'
import { v4 as uuidv4 } from 'uuid'
import Cache from '../services/cache.service'

class DomainMiddleware {
  // Middleware to capture raw body before Express processing
  static async captureRawBody(req: Request, res: Response, next: NextFunction) {
    if (
      req.method === 'GET' ||
      req.method === 'HEAD' ||
      req.method === 'OPTIONS'
    ) {
      return next()
    }

    try {
      const chunks: Buffer[] = []

      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      req.on('end', () => {
        const rawBody = Buffer.concat(chunks)
        ;(req as any).rawBody = rawBody.toString('base64')
        next()
      })

      req.on('error', (error) => {
        console.error('Error capturing raw body:', error)
        next(error)
      })
    } catch (error) {
      console.error('Error in captureRawBody middleware:', error)
      next(error)
    }
  }

  static async domainMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const forwardedHost =
      req.get('x-forwarded-host') || req.get('x-original-host')
    const rawHost = (forwardedHost || req.get('host') || '').trim()

    const hostCandidate = rawHost.split(',')[0].trim()
    if (!hostCandidate) {
      next()
      return
    }

    const host = hostCandidate.replace(/:\d+$/, '')

    const isIPv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
    const isIPv6 = host.includes(':') && host.split(':').length > 2
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      isIPv4 ||
      isIPv6
    ) {
      next()
      return
    }

    const BASE_DOMAINS = [
      'a2rok-server.harshkeshri.com',
      'a2rok.onrender.com',
      'localhost',
    ]

    if (BASE_DOMAINS.includes(host)) {
      next()
      return
    }

    let subdomain: string | null = null
    for (const base of BASE_DOMAINS) {
      if (host.endsWith('.' + base)) {
        const left = host.slice(0, host.length - (base.length + 1))
        subdomain = left.split('.')[0]
        break
      }
    }

    if (!subdomain) {
      next()
      return
    }

    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(subdomain)) {
      next()
      return
    }

    if (
      subdomain &&
      subdomain !== 'localhost' &&
      subdomain !== '127.0.0.1' &&
      !subdomain.match(/^\d+\.\d+\.\d+\.\d+$/)
    ) {
      const cacheKey = `domain:${subdomain}`
      let domain: any = Cache.get(cacheKey)
      if (!domain) {
        domain = await db?.DomainModel.findOne({ domain: subdomain }).lean()
        if (domain) {
          Cache.set(cacheKey, domain, 60_000)
        }
      }
      if (!domain) {
        res.status(404).json({
          success: false,
          message: 'No domain found',
        })
        return
      }
      req.subdomain = subdomain
      req.domainInfo = domain as any

      // Enforce per-user request limits (bypass for specific admin email)
      try {
        const owner = await db?.UserModel.findById(domain.userId).lean()
        const isUnlimited = owner?.email === 'harshkeshriwork@gmail.com'

        if (!isUnlimited) {
          const updatedUser = await db?.UserModel.findOneAndUpdate(
            {
              _id: domain.userId,
              $expr: { $lt: ['$limit.used', '$limit.total'] },
            },
            { $inc: { 'limit.used': 1 } },
            { new: true },
          ).lean()

          if (!updatedUser) {
            res.status(429).json({
              success: false,
              message:
                'Request limit exceeded. Please upgrade your plan or try later.',
            })
            return
          }
        }
      } catch (err) {
        console.error('Error enforcing user limit:', err)
        res.status(500).json({
          success: false,
          message: 'Internal error while enforcing usage limits',
        })
        return
      }

      const pendingResponseId = uuidv4() + ':' + uuidv4()

      try {
        const rawBody = (req as any).rawBody || ''

        const preservedHeaders: Record<string, string> = {}
        if (req.rawHeaders) {
          for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const headerName = req.rawHeaders[i]
            const headerValue = req.rawHeaders[i + 1]
            if (headerName && headerValue) {
              preservedHeaders[headerName] = headerValue
            }
          }
        }

        const fullUrl = req.originalUrl || req.url
        const queryString = req.url.includes('?')
          ? req.url.substring(req.url.indexOf('?'))
          : ''
        const reconstructedPath = req.path + queryString

        const enhancedRequest = {
          ...req,
          rawBody: rawBody,
          preservedHeaders,
          fullUrl,
          reconstructedPath,
          originalHost: req.get('host'),
          originalProtocol: req.protocol,
          originalSecure: req.secure,
          timestamp: new Date().toISOString(),
        }

        WebSocketService.getInstance().passRequest(
          domain.userId.toString(),
          subdomain,
          pendingResponseId,
          enhancedRequest,
        )

        // Add 1-minute timeout
        const timeoutMs = 60000 // 1 minute
        const startTime = Date.now()

        while (Date.now() - startTime < timeoutMs) {
          if (
            WebSocketService.getInstance().hasStoredResponse(pendingResponseId)
          ) {
            const response =
              WebSocketService.getInstance().consumeStoredResponse(
                pendingResponseId,
              )

            WebSocketService.getInstance().deleteStoredResponse(
              pendingResponseId,
            )
            WebSocketService.getInstance().decreaseDomainOpn(subdomain)

            if (response) {
              try {
                if (response.contentType) {
                  try {
                    res.setHeader('Content-Type', response.contentType)
                  } catch {}
                }

                if (response.body === undefined || response.body === null) {
                  res.status(response.status).end()
                  return
                }

                if (response.isBase64) {
                  const buf = Buffer.from(response.body as string, 'base64')
                  res.status(response.status).send(buf)
                  return
                }

                if (typeof response.body === 'string') {
                  res.status(response.status).send(response.body)
                  return
                }

                res.status(response.status).json(response.body)
                return
              } catch (error) {
                console.error(
                  `❌ Error sending response for pendingResponseId ${pendingResponseId}:`,
                  error,
                )
                res.status(500).json({
                  success: false,
                  message: 'Error sending response',
                  pendingResponseId: pendingResponseId,
                })
              }
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        // Timeout reached
        WebSocketService.getInstance().deleteStoredResponse(pendingResponseId)
        WebSocketService.getInstance().decreaseDomainOpn(subdomain)

        res.status(504).json({
          success: false,
          message: 'Request timeout - no response from local server',
          timeout: timeoutMs,
          pendingResponseId: pendingResponseId,
        })
        return
      } catch (error) {
        console.error('Error passing request to WebSocket:', error)
        res.status(503).json({
          success: false,
          message: 'Service unavailable - connection error',
          subdomain: subdomain,
        })
        return
      }
    } else {
      next()
    }
  }
}

export default DomainMiddleware
