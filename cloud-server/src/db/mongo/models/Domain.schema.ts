import mongoose, { ObjectId } from 'mongoose'
import { IUser } from './User.schema'

export interface IDomain extends mongoose.Document {
  userId: ObjectId | IUser
  domain: string
  createdAt: Date
  updatedAt: Date
}

const DomainSchema = new mongoose.Schema<IDomain>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    domain: { type: String, required: true, unique: true },
  },
  { timestamps: true },
)

export default DomainSchema
