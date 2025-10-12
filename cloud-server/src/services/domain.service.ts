import { db } from '../db/mongo/init'
import { wordLength, wordList } from '../utils/domain'

class DomainService {
  static async createDomain(userId: string) {
    const uniqueDomain = await this.createUniqueDomain()

    const domain = await db?.DomainModel.create({
      userId,
      domain: uniqueDomain,
    })
    return domain
  }

  static async createUniqueDomain(): Promise<string> {
    const getRandomWord = (): string => {
      const randomIndex = Math.floor(Math.random() * wordLength)
      return wordList[randomIndex]
    }

    const generateDomain = (): string => {
      const word1 = getRandomWord()
      const word2 = getRandomWord()
      const word3 = getRandomWord()
      return `${word1}-${word2}-${word3}`
    }

    let attempts = 0
    const maxAttempts = 100

    while (attempts < maxAttempts) {
      const domain = generateDomain()

      const existingDomain = await db?.DomainModel.findOne({ domain })

      if (!existingDomain) {
        return domain
      }

      attempts++
    }

    throw new Error(
      `Unable to generate unique domain after ${maxAttempts} attempts`,
    )
  }
}

export default DomainService
