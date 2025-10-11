import { FetchClientInstance } from '../utils/client'

class InstanceApi {
  static async getHttp() {
    const response = await FetchClientInstance.get('/api/v1/instance/http')
    return response
  }
}

export default InstanceApi
