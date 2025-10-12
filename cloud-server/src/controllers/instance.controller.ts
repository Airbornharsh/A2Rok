import { Request, Response } from 'express'
import { db } from '../db/mongo/init'
import DomainService from '../services/domain.service'

class InstanceController {
  static async getHttp(req: Request, res: Response) {
    console.log('getHttp')
    res.json({
      success: true,
      message: 'HTTP fetched successfully',
    })
  }

  static async getDomains(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId
      const domains = await db?.DomainModel.find({ userId }).lean()

      if (!domains) {
        res.status(404).json({
          success: false,
          message: 'Domains not found',
        })
        return
      }

      if (domains.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Domains not found',
        })
        return
      }

      res.json({
        success: true,
        message: 'Domains fetched successfully',
        data: {
          domains,
        },
      })
    } catch (error) {
      console.error('Get domains error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }

  static async getDomain(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId
      const domain = await db?.DomainModel.findOne({
        _id: req.params.id,
        userId,
      }).lean()

      if (!domain) {
        res.status(404).json({
          success: false,
          message: 'Domain not found',
        })
        return
      }

      res.json({
        success: true,
        message: 'Domain fetched successfully',
        data: {
          domain,
        },
      })
    } catch (error) {
      console.error('Get domain error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }

  static async createDomain(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId
      const domain = await DomainService.createDomain(userId)

      res.json({
        success: true,
        message: 'Domain created successfully',
        data: {
          domain,
        },
      })
    } catch (error) {
      console.error('Create domain error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      })
    }
  }
}

export default InstanceController
