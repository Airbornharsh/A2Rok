import mongoose from 'mongoose'

export interface IUser extends mongoose.Document {
  clerkId?: string
  name: string
  email: string
  provider: 'google' | 'email'
  imageUrl?: string
  admin?: boolean
  limit?: {
    total: number
    used: number
  }
  createdAt?: Date
  updatedAt?: Date
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    clerkId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    provider: {
      type: String,
      enum: ['google', 'email'],
      required: true,
    },
    imageUrl: {
      type: String,
      required: false,
    },
    admin: {
      type: Boolean,
      required: false,
    },
    limit: {
      type: {
        total: {
          type: Number,
          required: false,
        },
        used: {
          type: Number,
          required: false,
        },
      },
      default: {
        total: 10000,
        used: 0,
      },
    },
  },
  {
    timestamps: true,
  },
)

export default UserSchema
