import { IS_PRODUCTION } from '@/config/config'

export const fullDomain = (subdomain: string) => {
  if (IS_PRODUCTION) {
    return `${subdomain}.a2rok-server.harshkeshri.com`
  }
  return `${subdomain}.localhost:6011`
}
