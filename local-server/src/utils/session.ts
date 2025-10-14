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
    try {
      fs.writeFileSync(sessionPath, JSON.stringify(session))
    } catch {}
  }

  static async deleteSession(): Promise<void> {
    try {
      fs.unlinkSync(sessionPath)
    } catch {}
  }
}

export default Session
