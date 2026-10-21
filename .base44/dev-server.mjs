// Sandbox dev server for the static site: serves the repo root on PORT and lets the
// page reload itself when a source file changes.
// Zero dependencies on purpose — the project has no build step or package manager.
//
// Change detection is a stat() poll rather than fs.watch: on this sandbox the bind
// mount does not deliver inotify events for host-side edits, so watch() never fires.
import { createServer } from 'node:http'
import { readFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { extname, join, normalize, resolve, sep } from 'node:path'

const ROOT = resolve(process.env.SERVE_ROOT || process.cwd())
const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

// Polled by the page once a second; a changed stamp means a source file changed.
const RELOAD_SNIPPET =
  `<script>(function(){var k;function p(){fetch('/__watch',{cache:'no-store'})` +
  `.then(function(r){return r.json()}).then(function(d){if(k===undefined){k=d.stamp}` +
  `else if(d.stamp!==k){location.reload()}}).catch(function(){})}` +
  `setInterval(p,1000);p()})()</script>`

const WATCHED = /\.(html|css|js|mjs|json|svg|png|jpe?g|webp|ico)$/i

async function collect(dir, acc) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await collect(path, acc)
    else if (WATCHED.test(entry.name)) {
      try {
        const info = await stat(path)
        acc.push(`${entry.name}:${info.size}:${info.mtimeMs}`)
      } catch {
        /* file vanished mid-scan */
      }
    }
  }
  return acc
}

async function stamp() {
  return createHash('sha1').update((await collect(ROOT, [])).sort().join('|')).digest('hex').slice(0, 12)
}

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  const target = normalize(join(ROOT, clean))
  if (!target.startsWith(ROOT + sep) && target !== ROOT) return null
  if (clean.split('/').some((seg) => seg.startsWith('.'))) return null
  try {
    const info = await stat(target)
    return info.isDirectory() ? join(target, 'index.html') : target
  } catch {
    return null
  }
}

const server = createServer(async (req, res) => {
  const urlPath = req.url || '/'

  if (urlPath === '/__watch') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ stamp: await stamp() }))
    return
  }

  const file = await resolveFile(urlPath)
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 Not Found')
    return
  }

  try {
    const ext = extname(file).toLowerCase()
    let body = await readFile(file)
    if (ext === '.html') {
      const html = body.toString('utf8')
      body = Buffer.from(
        html.includes('</body>') ? html.replace('</body>', `${RELOAD_SNIPPET}</body>`) : html + RELOAD_SNIPPET
      )
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('500 Internal Server Error')
  }
})

server.listen(PORT, HOST, () => console.log(`[dev-server] serving ${ROOT} on http://${HOST}:${PORT}`))
