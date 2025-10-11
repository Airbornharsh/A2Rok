import mongoose from 'mongoose'

export interface IUser extends mongoose.Document {
  clerkId?: string
  name: string
  email: string
  provider: 'google' | 'email'
  imageUrl?: string
  admin?: boolean
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
  },
  {
    timestamps: true,
  },
)

export default UserSchema
