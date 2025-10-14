import { Request, Response } from 'express'
import { db } from '../db/mongo/init'
import { ClerkService } from '../services/clerk.service'
import { v4 } from 'uuid'
import { IUser } from '../db/mongo/models/User.schema'
import JwtService from '../services/jwt.service'

class AuthController {
  static async getUser(req: Request, res: Response) {
    try {
      const { userId, clerkUser } = (req as any).user

      let user
      if (clerkUser) {
        // For Clerk users, sync and return the latest data
        user = await ClerkService.syncUserToDatabase(clerkUser)
      } else {
        // For legacy JWT users
        user = await db?.UserModel.findById(userId)
      }

      if (!user || !user._id) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        })
        return
      }

      const sessionId = user._id.toString() + ':' + v4()

      res.json({
        success: true,
        message: 'User fetched successfully',
        data: {
          sessionId,
          user: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            clerkId: user.clerkId,
            imageUrl: user.imageUrl,
            admin: user.admin,
            limit: (user as any).limit ?? { total: 0, used: 0 },
          },
        },
      })
    } catch (error) {
      console.error('Get user error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }

  static async createTerminalSession(req: Request, res: Response) {
    try {
      const uuid1 = v4()
      const uuid2 = v4()
      const uuid3 = v4()
      const token = uuid1 + ':' + uuid2 + ':' + uuid3
      const session = await db?.TerminalSessionModel.create({
        token,
      })

      if (!session || !session?._id) {
        res.status(500).json({
          success: false,
          message: 'Failed to create session',
        })
        return
      }

      res.json({
        success: true,
        message: 'Session created successfully',
        data: {
          sessionId: session._id.toString(),
          token,
        },
      })
    } catch (error) {
      console.error('Create session error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }

  static async completeTerminalSession(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId
      const token = req.params.token
      const session = await db?.TerminalSessionModel.findOne({ token }).lean()
      if (!session || !session?._id) {
        res.status(404).json({
          success: false,
          message: 'Session not found',
        })
        return
      }

      if (session.status === 'active') {
        res.status(400).json({
          success: false,
          message: 'Session already used',
        })
        return
      }

      await db?.TerminalSessionModel.updateOne(
        { _id: session._id },
        { $set: { userId, status: 'active' } },
      )

      res.json({
        success: true,
        message: 'Session validated successfully',
      })
    } catch (error) {
      console.error('Validate session error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }

  static async checkTerminalSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.sessionId
      const session =
        await db?.TerminalSessionModel.findById(sessionId).populate('userId')

      if (!session || !session?._id) {
        res.status(404).json({
          success: false,
          message: 'Session not found',
          data: {
            valid: 'inactive',
            email: '',
            token: '',
          },
        })
        return
      }

      if (!session.userId || !(session.userId as IUser).email) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          data: {
            valid: 'inactive',
            email: '',
            token: '',
          },
        })
        return
      }

      let token = ''
      if (session.status === 'active') {
        const generatedToken = await JwtService.generateToken({
          email: (session.userId as IUser).email,
          sessionId: session._id.toString(),
        })
        token = generatedToken
      }

      res.json({
        success: true,
        message: 'Session checked successfully',
        data: {
          valid: session.userId ? session.status : 'inactive',
          email: (session.userId as IUser).email,
          token,
        },
      })
    } catch (error) {
      console.error('Check session error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {
          valid: 'inactive',
          email: '',
          token: '',
        },
      })
    }
  }

  static async updateLimit(req: Request, res: Response) {
    try {
      const userId = (req as any)?.user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }

      const { total } = req.body as { total?: number }
      const allowedTotals = new Set([1000, 2000, 5000])

      if (!total || !allowedTotals.has(total)) {
        res.status(400).json({
          success: false,
          message: 'Invalid limit. Allowed totals: 1000, 2000, 5000',
        })
        return
      }

      // Ensure we do not set total below current used, and only increase
      const user = await db?.UserModel.findById(userId).lean()
      if (!user || !user._id) {
        res.status(404).json({ success: false, message: 'User not found' })
        return
      }

      const currentUsed = (user as any).limit?.used ?? 0
      const currentTotal = (user as any).limit?.total ?? 0
      const remaining = Math.max(0, currentTotal - currentUsed)

      if (total < currentUsed) {
        res.status(400).json({
          success: false,
          message: 'Total cannot be less than used quota',
        })
        return
      }

      if (total <= currentTotal) {
        res.status(400).json({
          success: false,
          message: 'New total must be greater than current total',
        })
        return
      }

      // Enforce remaining >= 100 before allowing increase
      if (remaining < 100) {
        res.status(400).json({
          success: false,
          message: 'You can only increase when remaining quota is at least 100',
        })
        return
      }

      await db?.UserModel.updateOne(
        { _id: userId },
        { $set: { 'limit.total': total } },
      )

      res.json({
        success: true,
        message: 'Limit updated successfully',
        data: {
          total,
          used: currentUsed,
          remaining: Math.max(0, total - currentUsed),
        },
      })
    } catch (error) {
      console.error('Update limit error:', error)
      res.status(500).json({ success: false, message: 'Internal server error' })
    }
  }
}

export default AuthController
