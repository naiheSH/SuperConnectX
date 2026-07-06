import iconv from 'iconv-lite'

const NODE_ENCODINGS = new Set([
  'ascii',
  'base64',
  'base64url',
  'binary',
  'hex',
  'latin1',
  'ucs-2',
  'ucs2',
  'utf-8',
  'utf16le',
  'utf8'
])

export function decodeBuffer(buffer: Buffer, encoding: string, start?: number, end?: number): string {
  const normalizedEncoding = (encoding || 'utf8').toLowerCase()
  const chunk = start === undefined && end === undefined ? buffer : buffer.subarray(start ?? 0, end)

  if (NODE_ENCODINGS.has(normalizedEncoding)) {
    return chunk.toString(normalizedEncoding as BufferEncoding)
  }

  if (iconv.encodingExists(normalizedEncoding)) {
    return iconv.decode(chunk, normalizedEncoding)
  }

  return chunk.toString('utf8')
}

export function encodeBuffer(text: string, encoding: string): Buffer {
  const normalizedEncoding = (encoding || 'utf8').toLowerCase()

  if (NODE_ENCODINGS.has(normalizedEncoding)) {
    return Buffer.from(text, normalizedEncoding as BufferEncoding)
  }

  if (iconv.encodingExists(normalizedEncoding)) {
    return iconv.encode(text, normalizedEncoding)
  }

  return Buffer.from(text, 'utf8')
}
