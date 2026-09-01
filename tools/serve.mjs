/* Winziger statischer Server fuer die lokale Vorschau.
   Aufruf: node tools/serve.mjs [port]
   Es gibt keinen Build-Schritt - die Dateien werden 1:1 ausgeliefert,
   genau wie spaeter auf GitHub Pages. */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.argv[2] || 8080)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

createServer(async (req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0])
  if (rel === '/') rel = '/index.html'

  // Pfadausbrueche (../) unterbinden
  const file = join(ROOT, normalize(rel).replace(/^([/\\])+/, ''))
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden')
    return
  }

  try {
    await stat(file)
    const body = await readFile(file)
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store', // beim Entwickeln nie cachen
    })
    res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404')
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`))
