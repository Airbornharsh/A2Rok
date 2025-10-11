import dotenv from 'dotenv'
dotenv.config()
import mongoose, { Model } from 'mongoose'
import { MONGO_URL } from '../../config/config'
import UserSchema, { IUser } from './models/User.schema'
import TerminalSessionSchema, {
  ITerminalSession,
} from './models/Session.schema'

mongoose.set('strictQuery', false)

const dbUrl = MONGO_URL + '/db'

let db: Db | null = null
interface Db {
  UserModel: Model<IUser>
  TerminalSessionModel: Model<ITerminalSession>
}

const connectDB = async () => {
  try {
    const dbConnection = await mongoose.createConnection(dbUrl)

    if (dbConnection) {
      console.log('DB connected')
    }

    const UserModel = dbConnection.model<IUser>('User', UserSchema)
    const TerminalSessionModel = dbConnection.model<ITerminalSession>(
      'TerminalSession',
      TerminalSessionSchema,
    )

    db = {
      UserModel,
      TerminalSessionModel,
    }
  } catch (error: any) {
    console.log(error)
    throw new Error(error)
  }
}

const disconnectDB = async () => {
  try {
    await mongoose.connection.close()

    console.log('DB connections closed')
  } catch (error: any) {
    console.log('Error closing DB connections:', error)
  }
}

export { connectDB, disconnectDB, db }
