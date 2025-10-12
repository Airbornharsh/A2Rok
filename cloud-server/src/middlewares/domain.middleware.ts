import { NextFunction, Request, Response } from 'express'
import { db } from '../db/mongo/init'
import { WebSocketService } from '../services/websocket.service'
import { v4 as uuidv4 } from 'uuid'

class DomainMiddleware {
  static async domainMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const host = req.get('host') || req.get('x-forwarded-host') || ''
    if (!host.includes('.')) {
      next()
      return
    }
    const subdomain = host.split('.')[0]

    if (
      subdomain &&
      subdomain !== 'localhost' &&
      subdomain !== '127.0.0.1' &&
      !subdomain.match(/^\d+\.\d+\.\d+\.\d+$/)
    ) {
      const domain = await db?.DomainModel.findOne({ domain: subdomain }).lean()
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
