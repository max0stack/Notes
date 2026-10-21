# Base44 sandbox notes

## What this project is
A single-page static notes board: `index.html` + `style.css` + `script.js`, plus two
image assets (`background.jpg`, `note.png`). There is **no build step, no package
manager, no bundler, no backend and no database** — notes live in the browser's
`localStorage` under the key `notes`.

## Running it here
`docker compose -f docker-compose.base44.yml up -d --build` (host port 3000).

The single `web` service is a `node:22-alpine` container running
`.base44/dev-server.mjs`, a zero-dependency static server that serves the repo
bind-mounted at `/app` and injects a polling snippet into HTML so the page reloads
on any source edit (it fetches `/__watch` once a second and reloads when the stamp
changes). The poll is deliberate: this sandbox's bind mount delivers no inotify
events for host-side edits, so `fs.watch` never fires — do not "simplify" it back to
a watcher. Because it is a plain static server that does not inspect `Host` or
`Origin`, no host/origin allowlist configuration is needed here, and the compose file
deliberately does not consume `BASE44_PREVIEW_MODE`.

Edits to `index.html`, `style.css`, `script.js` or the assets are picked up
immediately (no rebuild, no restart). Compose changes, the dev server itself or
dependency changes need `docker compose -f docker-compose.base44.yml up -d --build`.

## Verifying it works
- `curl -s http://localhost:3000/` returns `index.html` unmodified and
  `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/style.css` returns 200.
- The compose healthcheck already fetches `/` inside the container — `docker compose
  -f docker-compose.base44.yml ps` should read `(healthy)`.
- In the preview: typing text and clicking **Create** appends a `.note` card to
  `#notes`; the card's **X** button removes it. Both persist across reloads via
  `localStorage`.

## Known quirks (pre-existing, not sandbox-related)
- `style.css` has invalid declarations (`font-size: 20;`, `font size: 1rem;`) and a
  `.nontes-app button` selector that matches nothing, so the Create button is unstyled.
- `script.js` builds the default date as `...-0${today.getMonth()}-...`, which yields a
  month string that `input[type=date]` rejects (and is off by one).
- The markup uses duplicate `id`s (`text`, `date`, `time`) on the note cards while
  also using them as the form field ids.
- `createNote()` clears the fields with `innerHTML` on `<input>`/`<textarea>`, which
  has no visible effect on those elements.

## No credentials
No external service, API key or secret is used. `.base44/environment.json` records an
empty `secrets` list, so there is no `/run/base44/app.env` wiring in compose.
