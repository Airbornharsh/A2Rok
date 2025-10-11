import { Request, Response } from 'express'

class InstanceController {
  static async getHttp(req: Request, res: Response) {
    console.log('getHttp')
    res.json({
      success: true,
      message: 'HTTP fetched successfully',
    })
  }
}

export default InstanceController
