import mongoose from 'mongoose'
import { IUser } from './User.schema'

export interface ITerminalSession extends mongoose.Document {
  userId?: mongoose.Schema.Types.ObjectId | IUser
  token: string
  status: 'active' | 'expired' | 'deleted' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

const TerminalSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    token: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'deleted', 'inactive'],
      default: 'inactive',
    },
  },
  {
    timestamps: true,
  },
)

TerminalSessionSchema.index({ token: 1 }, { unique: true })

export default TerminalSessionSchema
