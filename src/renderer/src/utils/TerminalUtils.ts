/**
 * 将接收的原始数据格式化为带时间戳的多行文本。
 * 每行独立补时间戳，保证日志对齐。
 */
export function formatReceivedData(content: string, showTimestamp: boolean, timestamp?: string): string {
  if (!showTimestamp || !timestamp) {
    return `${content}\n`
  }

  const prefix = `[${timestamp}] `
  const lines = content.split(/\r?\n/).filter(line => line.length > 0)
  if (lines.length === 0) {
    return `${prefix}\n`
  }

  return `${lines.map(line => `${prefix}${line}`).join('\n')}\n`
}
