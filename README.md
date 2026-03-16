# Hone Marketplace

Perry-compiled native binary serving the Hone plugin marketplace at `marketplace.hone.codes`.

SEO-optimized HTML pages + REST API + package downloads — single binary, no runtime dependencies.

## Architecture

- **Perry-compiled Fastify server** — same pattern as hone-auth (~2000 lines, single `src/app.ts`)
- **MySQL** for plugin metadata, publishers, ratings, versions
- **Server-rendered HTML** with per-page SEO (unique `<title>`, Open Graph, JSON-LD)
- **Dark/light theme**, mobile-responsive CSS
- **Client-side JS** — search autocomplete, click-to-copy install commands

## Build

```bash
perry compile src/app.ts --output hone-marketplace
```

## Run

```bash
./hone-marketplace   # reads marketplace.conf, listens on port 8446
```

## Test

```bash
bun test   # 70 tests
```

## Configuration

`marketplace.conf` (KEY=VALUE):

```
DB_HOST=webserver.skelpo.net
DB_USER=hone
DB_PASS=...
DB_NAME=hone_marketplace
PORT=8446
STATIC_DIR=./static
DATA_DIR=./data
```

## Routes

### HTML Pages
| Route | Description |
|-------|-------------|
| `GET /` | Homepage — featured, recent, categories, stats |
| `GET /plugins/:name` | Plugin detail with README, versions, capabilities tabs |
| `GET /search?q=...` | Search results with sort and pagination |
| `GET /categories/:name` | Category listing |
| `GET /publishers/:name` | Publisher profile |
| `GET /sitemap.xml` | XML sitemap |

### REST API
| Route | Description |
|-------|-------------|
| `GET /api/v1/plugins` | Search/list plugins (JSON) |
| `GET /api/v1/plugins/:name` | Plugin detail (JSON) |
| `GET /api/v1/plugins/:name/versions` | Version history |
| `POST /api/v1/plugins` | Publish plugin |
| `GET /api/v1/pkg/:name/:version` | Download compiled package |
| `GET /api/v1/categories` | List categories |
| `GET /api/v1/featured` | Featured plugins |
| `GET /api/v1/stats` | Marketplace statistics |

## Database

See `schema.sql` for the full schema. Tables: `publishers`, `plugins`, `pluginVersions`, `ratings`, `reports`, `pluginDownloads`, `buildJobs`.

## SEO

Every plugin page includes:
- Unique `<title>` and `<meta description>`
- Open Graph tags (og:title, og:description, og:url, og:image)
- JSON-LD SoftwareApplication structured data
- Canonical URLs
- XML sitemap with all plugins, publishers, and categories
