/**
 * 本地更新测试服务器
 * 模拟 electron-updater generic provider 的远端行为
 *
 * 使用方法:
 * 1. 先执行一次构建生成文件:  npm run build:win
 *    这会生成 release/superconnectx Setup X.X.X.exe 和 .blockmap 文件
 * 2. 运行本脚本:             node scripts/test-update-server.js
 * 3. 在项目根目录创建或修改 dev-app-update.yml:
 *    provider: generic
 *    url: http://127.0.0.1:3080/
 * 4. 启动 Electron 开发模式，点击"检查更新"
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const PORT = 3080
const RELEASE_DIR = path.join(__dirname, '..', 'release')

// 扫描 release 目录找到安装包文件
function findReleaseFiles() {
  const files = fs.readdirSync(RELEASE_DIR)
  const result = {
    installer: null,    // .exe
    blockmap: null,     // .blockmap
    latestYml: null     // 我们将生成这个
  }

  for (const f of files) {
    const fullPath = path.join(RELEASE_DIR, f)
    if (fs.statSync(fullPath).isDirectory()) continue
    if (f.endsWith('.exe') && f.includes('Setup')) {
      result.installer = { name: f, path: fullPath }
    }
    if (f.endsWith('.exe.blockmap')) {
      result.blockmap = { name: f, path: fullPath }
    }
  }

  return result
}

// 生成 latest.yml (模拟 electron-builder 的输出格式)
function generateLatestYml(installerName, installerPath, blockmapPath) {
  const installerStats = fs.statSync(installerPath)

  // 计算安装包的 sha512
  const fileBuffer = fs.readFileSync(installerPath)
  const sha512 = crypto.createHash('sha512').update(fileBuffer).digest('base64')

  // 从文件名提取版本号: "superconnectx Setup 1.1.3.exe" -> "1.1.3"
  const versionMatch = installerName.match(/(\d+\.\d+\.\d+)/)
  const version = versionMatch ? versionMatch[1] : '0.0.0'

  const ymlLines = [
    `version: ${version}`,
    `releaseDate: '${new Date().toISOString()}'`,
    'files:',
    `  - url: ${installerName}`,
    `    sha512: ${sha512}`,
    `    size: ${installerStats.size}`
  ]

  if (blockmapPath) {
    const blockmapStats = fs.statSync(blockmapPath)
    const blockmapBuffer = fs.readFileSync(blockmapPath)
    const blockmapSha512 = crypto.createHash('sha512').update(blockmapBuffer).digest('base64')
    ymlLines.push(`  - url: ${path.basename(blockmapPath)}`)
    ymlLines.push(`    sha512: ${blockmapSha512}`)
    ymlLines.push(`    size: ${blockmapStats.size}`)
  }

  ymlLines.push(
    `path: ${installerName}`,
    `sha512: ${sha512}`
  )

  const ymlPath = path.join(RELEASE_DIR, 'latest.yml')
  fs.writeFileSync(ymlPath, ymlLines.join('\n'), 'utf-8')
  console.log(`[OK] Generated latest.yml (version: ${version}, sha512: ${sha512.substring(0, 16)}...)`)
  return { name: 'latest.yml', path: ymlPath }
}

// 启动 HTTP 服务器
function startServer(files) {
  const allFiles = { ...files }

  const server = http.createServer((req, res) => {
    // 打印请求日志
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)

    // CORS 头部
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // 去掉查询参数和开头的 /，并 URL 解码
    const urlObj = new URL(req.url, `http://127.0.0.1:${PORT}`)
    const rawFileName = urlObj.pathname.replace(/^\//, '') || 'latest.yml'
    const fileName = decodeURIComponent(rawFileName)

    // 处理 Range 请求 (断点续传)
    const filePath = allFiles[fileName]
    if (!filePath) {
      console.log(`  -> 404 Not Found: "${fileName}" (available: ${Object.keys(allFiles).join(', ')})`)
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
      return
    }

    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const range = req.headers.range

    if (range) {
      // 支持 Range 请求 (electron-updater 会使用)
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1

      console.log(`  -> 206 Range: bytes ${start}-${end}/${fileSize}`)

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': fileName.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream',
      })

      const stream = fs.createReadStream(filePath, { start, end })
      stream.pipe(res)
    } else {
      console.log(`  -> 200 OK (${fileSize} bytes)`)
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': fileName.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream',
        'Accept-Ranges': 'bytes',
      })
      fs.createReadStream(filePath).pipe(res)
    }
  })

  server.listen(PORT, '127.0.0.1', () => {
    console.log('')
    console.log('========================================')
    console.log('  Local Update Test Server')
    console.log(`  Listening on: http://127.0.0.1:${PORT}/`)
    console.log('========================================')
    console.log('')
    console.log('Serving files:')
    for (const [name, filePath] of Object.entries(allFiles)) {
      console.log(`  ${name} -> ${filePath}`)
    }
    console.log('')
    console.log('Now update dev-app-update.yml to:')
    console.log('  provider: generic')
    console.log(`  url: http://127.0.0.1:${PORT}/`)
    console.log('')
    console.log('Then run "npm run dev" and click "Check for Updates"')
    console.log('')
  })
}

// ========== Main ==========
const releaseFiles = findReleaseFiles()

if (!releaseFiles.installer) {
  console.error('[ERROR] No installer .exe found in release/ directory')
  console.error('Please run "npm run build:win" first to generate the installer')
  process.exit(1)
}

// 将文件注册为 { 文件名: 绝对路径 }
const fileMap = {
  'latest.yml': null
}

// 生成 latest.yml
const latestYml = generateLatestYml(
  releaseFiles.installer.name,
  releaseFiles.installer.path,
  releaseFiles.blockmap ? releaseFiles.blockmap.path : null
)
fileMap['latest.yml'] = latestYml.path

// 注册安装包
fileMap[releaseFiles.installer.name] = releaseFiles.installer.path

// 注册 blockmap (如果有)
if (releaseFiles.blockmap) {
  fileMap[releaseFiles.blockmap.name] = releaseFiles.blockmap.path
}

startServer(fileMap)
