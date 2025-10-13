import zlib from 'zlib'

class CompressionService {
  static compressMessage(message: any) {
    const jsonMessage = JSON.stringify(message)
    const compressed = zlib.gzipSync(jsonMessage)
    return compressed
  }

  static decompressMessage(message: any) {
    const decompressed = zlib.gunzipSync(message).toString()
    const parsedDecompressed = JSON.parse(decompressed)
    return parsedDecompressed
  }
}

export default CompressionService
