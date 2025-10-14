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
}

export default AuthController
