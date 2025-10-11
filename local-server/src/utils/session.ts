import path from 'path'
import os from 'os'
import fs from 'fs'

const sessionPath = path.join(os.homedir(), '.a2rok_session')

class Session {
  static async getSession(): Promise<{ email: string; token: string } | null> {
    try {
      const session = await fs.promises.readFile(sessionPath, 'utf8')
      return JSON.parse(session)
    } catch (error) {
      return null
    }
  }

  static async setSession(session: {
    email: string
    token: string
  }): Promise<void> {
    fs.writeFileSync(sessionPath, JSON.stringify(session))
  }

  static async deleteSession(): Promise<void> {
    fs.unlinkSync(sessionPath)
  }
}

export default Session
