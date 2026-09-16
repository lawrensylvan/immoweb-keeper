# Immoweb Keeper

Immoweb Keeper downloads Immoweb search results, stores their metadata in MongoDB, saves their pictures, and provides a React interface for exploring the collected data.

![Screenshot of the front-end](https://user-images.githubusercontent.com/25752900/138572515-7369734a-9727-4450-87e5-fa43db6b8b9c.png)

## Environments

Development and production are intentionally isolated:

| | Development | Production |
|---|---|---|
| Frontend | Native React development server | Compiled into the application image |
| Backend | Native Node.js with nodemon | Docker application container |
| MongoDB | Docker, exposed on loopback | Docker, not exposed to the host |
| Database | `immoweb_dev` | `immoweb_prod` |
| MongoDB volume | `immoweb_keeper_dev_mongodb` | `immoweb_keeper_prod_mongodb` |
| Images | `dev/images` in this repository | Host directory configured with `PROD_IMAGES_PATH` |
| Web address | `http://localhost:3000` | `http://localhost:8080` |

Production is currently loopback-only. Public exposure, a reverse proxy, and backup automation are outside this setup.

## Requirements

- Node.js and npm for development
- Docker Desktop for both MongoDB environments and the production application
- A persistent host directory for production images, on internal or external storage

## Install dependencies

From the repository root:

```sh
npm install
npm install --prefix server --legacy-peer-deps
npm install --prefix client
```

The server uses an older GraphQL dependency tree, which is why its install uses legacy peer-dependency resolution.

## Development

### First-time configuration

Create the ignored development server configuration:

```sh
cp server/config.env.example server/config.env
```

Replace the `JWT_SECRET` placeholder with a long random value. The defaults connect to the development MongoDB container, use database `immoweb_dev`, and save images under `dev/images`.

After signing in, configure the postal codes, property types, and schedule from the Routine administration page.

For quicker development runs, `MAX_ESTATES_PER_SEARCH` can be set to a positive integer in `server/config.env`. The cap applies independently to each postal-code/property-type search and is intentionally not exposed in the frontend. Leave it unset in production.

### Development commands

```sh
# Start MongoDB, the backend with nodemon, and the React development server
npm run dev

# Run the services separately
npm run dev:db:start
npm run dev:server
npm run dev:client

# Run the downloader against development data
npm run dev:routine

# Inspect or stop development MongoDB
npm run dev:status
npm run dev:db:logs
npm run dev:db:stop
```

Stopping the MongoDB container does not delete `immoweb_keeper_dev_mongodb`.

## Production

Production builds the React client and Node backend into one application image. MongoDB runs as a separate container with its own named volume. The application schedules routine child processes, while a one-off service remains available for command-line maintenance.

### First-time configuration

Choose an absolute host path for production images and put it in `deploy/config.prod.env`:

```text
PROD_IMAGES_PATH=/absolute/path/to/immoweb-keeper/images
```

The directory must already exist. It is mounted read-write in the application and routine so scheduled downloads can save images. Deployment fails if the configured path is unavailable, which also prevents Docker from silently creating a replacement directory when an external drive is disconnected.

Create the ignored production environment file:

```sh
cp deploy/config.prod.env.example deploy/config.prod.env
```

Replace `JWT_SECRET` with a long random value and set `PROD_IMAGES_PATH` to the absolute image directory on your host. `PROD_APP_PORT` defaults to `8080`.

After signing in, configure the production postal codes, property types, and schedule from the Routine administration page.

### Production commands

```sh
# Validate Docker, private configuration, searches, and image storage
npm run prod:check

# Build without starting services
npm run prod:build

# Validate, build, and start the app and MongoDB
npm run prod:deploy

# Run the production downloader once
npm run prod:routine

# Inspect the deployment
npm run prod:status
npm run prod:logs

# Restart or stop the application stack
npm run prod:restart
npm run prod:stop
```

After deployment, browse to [http://localhost:8080](http://localhost:8080).

`prod:stop` removes the containers and network but preserves `immoweb_keeper_prod_mongodb`. Do not add `--volumes` unless you explicitly intend to delete the production database.

## Container architecture

The production image is built with the root `Dockerfile`:

1. A build stage installs and compiles the React client.
2. A dependency stage installs server production dependencies.
3. The runtime stage combines the server and compiled client and runs as a non-root user.

`compose.prod.yaml` starts MongoDB first and waits for its health check before starting the application. The application is considered healthy only after it can connect to MongoDB. MongoDB has no published production port; the application is published only on `127.0.0.1`.

The application server manages the routine schedule and starts the downloader as a child process. The schedule is disabled by default and can be configured from the Routine admin page. `npm run prod:routine` remains available for deliberate command-line maintenance runs; do not use it while an application-managed run is active.

## Data model

MongoDB creates the required collections automatically. No migration or seed data is required.

The `estates` collection contains:

| Field | Description |
|---|---|
| `_id` | MongoDB document identifier |
| `immowebCode` | Immoweb listing identifier |
| `rawMetadata` | Complete metadata extracted from Immoweb |
| `fetchDate` | Time this version was downloaded |
| `lastModificationDate` | Immoweb modification time |
| `creationDate` | Immoweb creation time |
| `expirationDate` | Immoweb expiration time |
| `geolocation` | Normalized longitude and latitude when available |
| `images` | Locally stored image filenames |
| `lastSeen` | Last routine date on which the listing appeared |
| `disappearanceDate` | First routine date on which it no longer appeared |

The `users` collection stores application accounts and their liked and visited estate identifiers.

The singleton `routineSchedule` collection stores the schedule plus its canonical postal-code and property-type target set. Each `routineRuns` document snapshots that target set and records success, failure, and totals for every postal-code/property-type combination. Monitoring history is derived from these coverage entries rather than from Immoweb query URLs.

## Current scope

This repository setup intentionally does not yet:

- configure public DNS, HTTPS, or a reverse proxy;
- deduplicate historical test data or prevent concurrent routines;
- automate database or image backups.

Those concerns should be handled before retiring existing production services.
