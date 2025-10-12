import { IDomain } from '../db/mongo/models/Domain.schema'

declare global {
  namespace Express {
    interface Request {
      subdomain?: string
      domainInfo?: IDomain & { userId: any }
    }
  }
}

export {}
