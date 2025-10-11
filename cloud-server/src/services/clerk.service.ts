import { db } from '../db/mongo/init'
import { clerkClient } from '@clerk/express'
import { Request } from 'express'
import { IUser } from '../db/mongo/models/User.schema'

export class ClerkService {
  static async verifyToken(token: string) {
    try {
      // Decode the JWT token to get the user ID
      const decodedToken = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      )

      if (decodedToken && decodedToken.sub) {
        const user = await clerkClient.users.getUser(decodedToken.sub)
        return user
      }
      return null
    } catch (error) {
      console.error('Clerk token verification failed:', error)
      return null
    }
  }

  static async getUserFromToken(token: string) {
    try {
      // Decode the JWT token to get the user ID
      const decodedToken = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      )

      if (decodedToken && decodedToken.sub) {
        // Get the user using the userId from the decoded token
        const user = await clerkClient.users.getUser(decodedToken.sub)
        return user
      }
      return null
    } catch (error) {
      console.error('Failed to get user from Clerk:', error)
      return null
    }
  }

  static async extractUserFromRequest(req: Request) {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
      }

      const token = authHeader.substring(7)
      const user = await this.getUserFromToken(token)
      return user
    } catch (error) {
      console.error('Failed to extract user from request:', error)
      return null
    }
  }

  static async syncUserToDatabase(clerkUserId: string): Promise<IUser | null> {
    try {
      let user = await db?.UserModel.findOne({ clerkId: clerkUserId }).lean()

      if (!user) {
        const clerkUser = await clerkClient.users.getUser(clerkUserId)

        try {
          const newUser = new db!.UserModel({
            clerkId: clerkUser.id,
            name: clerkUser.fullName || clerkUser.firstName || 'User',
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            emailVerified:
              clerkUser.emailAddresses?.[0]?.verification?.status ===
              'verified',
            imageUrl: clerkUser.imageUrl,
            admin: false,
            provider:
              clerkUser.primaryEmailAddress?.verification?.status === 'verified'
                ? 'email'
                : 'google',
            createdAt: new Date(clerkUser.createdAt),
            updatedAt: new Date(),
          })
          await newUser.save()

          if (!newUser || !newUser._id) {
            throw new Error('Failed to create user in database.')
          }
          return newUser
        } catch (error) {
          // console.error('Failed to create user in database.')
          // console.log(clerkUserId)
          const newUser = await db?.UserModel.findOne({
            clerkId: clerkUserId,
          })
          return (newUser as IUser) || null
        }
      } else {
        return user as unknown as IUser
      }
    } catch (error) {
      console.error('Failed to sync user to database:', error)
      throw error
    }
  }
}
