import InstanceApi from '../apis/instance'

const httpCommand = async () => {
  const http = await InstanceApi.getHttp()
  console.log(http)
}

export default httpCommand
