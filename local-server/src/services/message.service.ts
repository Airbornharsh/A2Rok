import ReqMessageService from './reqMessage.service'
import WsMessageService from './wsMessage.service'

let domainMetadata = {
  ttl: 0,
  opn: 0,
  domain: '',
}

class MessageService {
  static handleRequestMessage(message: { type: string; data: any }, ws: any) {
    switch (message.type) {
      case 'connection_established':
        domainMetadata.domain = message.data.domain
        break
      case 'subdomain_request':
        ReqMessageService.handleSubdomainRequest(message.data, ws)
        break
      case 'domain_metadata':
        domainMetadata.ttl = message.data.ttl || 0
        domainMetadata.opn = message.data.opn || 0
        break
      case 'pending_incoming_ws_connection':
        WsMessageService.getInstance().handlePendingIncomingWsConnection(
          message.data,
          ws,
        )
        break
      case 'ws_incoming_message':
        WsMessageService.getInstance().handleWsIncomingMessage(message.data)
        break
    }
  }

  static getDomainMetadata() {
    return domainMetadata
  }
}

export default MessageService
