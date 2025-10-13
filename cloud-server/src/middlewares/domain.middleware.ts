import { NextFunction, Request, Response } from 'express'
import { db } from '../db/mongo/init'
import { WebSocketService } from '../services/websocket.service'
import { v4 as uuidv4 } from 'uuid'
import Cache from '../services/cache.service'

class DomainMiddleware {
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

      const pendingResponseId = uuidv4() + ':' + uuidv4()

      try {
        WebSocketService.getInstance().passRequest(
          domain.userId.toString(),
          subdomain,
          pendingResponseId,
          req,
        )

        while (true) {
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
                if (response.body !== undefined) {
                  if (typeof response.body === 'string') {
                    res.status(response.status).send(response.body)
                    console.log(
                      `✅ Response sent successfully for pendingResponseId: ${pendingResponseId}`,
                    )
                    return
                  } else {
                    if (Array.isArray(response.body)) {
                      res.status(response.status).json(response.body)
                      console.log(
                        `✅ Response sent successfully for pendingResponseId: ${pendingResponseId}`,
                      )
                      return
                    } else if (typeof response.body === 'object') {
                      res
                        .status(response.status)
                        .json({ ...response.body, A2Rok: true })
                      console.log(
                        `✅ Response sent successfully for pendingResponseId: ${pendingResponseId}`,
                      )
                      return
                    } else {
                      res.status(response.status).send(response.body)
                      console.log(
                        `✅ Response sent successfully for pendingResponseId: ${pendingResponseId}`,
                      )
                      return
                    }
                  }
                } else {
                  res.status(response.status).end()
                  console.log(
                    `✅ Response sent successfully for pendingResponseId: ${pendingResponseId}`,
                  )
                  return
                }
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
