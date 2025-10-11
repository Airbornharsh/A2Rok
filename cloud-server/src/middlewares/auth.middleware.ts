import { Request, Response, NextFunction } from 'express'
import { ClerkService } from '../services/clerk.service'

class Middleware {
  static async authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.headers['x-session-id']
      const splitted = req.headers.authorization?.split(' ')
      if (!splitted) {
        res.status(401).json({
          success: false,
          message: 'No authorization token provided',
        })
        return
      }

      const token = splitted[1]
      if (!token) {
        res.status(401).json({
          success: false,
          message: 'No authorization token provided',
        })
        return
      }

      let clerkUserId = null
      try {
        const decodedToken = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        )

        if (decodedToken && decodedToken.sub) {
          clerkUserId = decodedToken.sub
        }
      } catch (error) {
        console.log(
          'Token is not a valid Clerk session, trying JWT authentication...',
        )
      }

      if (clerkUserId) {
        try {
          const dbUser = await ClerkService.syncUserToDatabase(clerkUserId)

          if (!dbUser) {
            res.status(500).json({
              success: false,
              message: 'Failed to sync user to database',
            })
            return
          }

          ;(req as any).user = {
            userId: dbUser._id?.toString(),
            email: dbUser.email,
            clerkId: clerkUserId,
            sessionId: sessionId || null,
            isAdmin: dbUser.admin || false,
            name: dbUser.name,
          }

          next()
          return
        } catch (syncError) {
          console.error('Failed to sync Clerk user to database:', syncError)
          res.status(500).json({
            success: false,
            message: 'User synchronization failed',
          })
          return
        }
      }

      res.status(401).json({
        success: false,
        message: 'Authentication failed',
      })
      return
    } catch (error) {
      console.error('Authentication error:', error)
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
      })
      return
    }
  }

  static async adminMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const token = req.headers.authorization?.split(' ')[1]
      if (!token) {
        res.status(401).json({
          success: false,
          message: 'No authorization token provided',
        })
        return
      }

      let clerkUserId = null
      try {
        const decodedToken = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        )

        if (decodedToken && decodedToken.sub) {
          clerkUserId = decodedToken.sub
        }
      } catch (error) {
        console.log(
          'Token is not a valid Clerk session, trying JWT authentication...',
        )
      }

      if (clerkUserId) {
        try {
          const dbUser = await ClerkService.syncUserToDatabase(clerkUserId)

          if (!dbUser) {
            res.status(500).json({
              success: false,
              message: 'Failed to sync user to database',
            })
            return
          }

          if (!dbUser.admin) {
            res.status(401).json({
              success: false,
              message: 'User is not an admin',
            })
            return
          }

          return next()
        } catch (syncError) {
          console.error('Failed to sync Clerk user to database:', syncError)
          res.status(500).json({
            success: false,
            message: 'User synchronization failed',
          })
          return
        }
      }

      res.status(401).json({
        success: false,
        message: 'Authentication failed',
      })
    } catch (error) {
      console.error('Authentication error:', error)
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
      })
    }
  }
}

export default Middleware
