# Ship-It TODO

- [x] Create `/api/deploy` (or `/api/new`) endpoint
- [x] Create Deployment record in DB with status "queued"
- [x] Push deploymentId to Redis queue
- [x] Return response `{ projectId, deploymentId }`
- [x] Add S3 client inside shared package
- [x] Create helper `uploadFile()` in shared package

- [x] Add shared package `packages/redis`
- [x] Export Redis client, subscriber, queue instances

- [ ] In worker (shipyard): connect to Redis queue
- [ ] Implement infinite loop reading `deploy-queue`
- [ ] Fetch deployment + project details from DB
- [ ] Create temporary folder for build
- [ ] Clone repo using simple-git
- [ ] Checkout specified branch
- [ ] Publish log event: "Cloning repository..."
- [ ] Run install command (default: `npm install`)
- [ ] Publish log: "Installing dependencies..."
- [ ] Run build command (default: `npm run build`)
- [ ] Publish log: "Running build..."
- [ ] Validate output directory exists
- [ ] Publish log: "Build completed."
- [ ] Upload output folder to S3
- [ ] Publish log: "Uploading build to S3..."
- [ ] Update Deployment status to "completed"
- [ ] Save final `url` property in Deployment row
- [ ] Publish log: "Deployment complete."

- [ ] Create ws-server folder in apps/
- [ ] Initialize WebSocket server
- [ ] On connection, parse deploymentId from query
- [ ] Subscribe Redis: `logs:<deploymentId>`
- [ ] Forward every Redis message to WebSocket client
- [ ] Implement ping/pong to keep connection alive
- [ ] Close disconnected sockets

- [ ] Create deployment detail page on frontend
- [ ] Add WebSocket client for real-time logs
- [ ] Display logs in scrolling container
- [ ] Display deployment status (queued/building/failed/completed)
- [ ] Display preview URL after deployment completes

- [ ] Create Request Server (runtime hosting)
- [ ] Extract subdomain from incoming request
- [ ] Map subdomain → deploymentId
- [ ] Fetch file from S3: `production/<deploymentId>/<path>`
- [ ] Stream file through Express
- [ ] On SPA routes, fallback to `index.html`

- [ ] Create Dashboard page to list projects
- [ ] Fetch `/api/dashboard` for project list
- [ ] Show "New Project" button
- [ ] Show GitHub connected status
- [ ] Build project card UI

- [ ] Create New Project page UI
- [ ] Add form submission with Fetch or Axios
- [ ] Redirect to deployment detail after creation

- [ ] Protect all private routes using middleware
- [ ] Redirect unauthenticated users to login
- [ ] Redirect authenticated users with no project → dashboard

- [ ] Dockerize frontend
- [ ] Dockerize shipyard worker
- [ ] Dockerize request server
- [ ] Dockerize ws-server
- [ ] Create docker-compose for local development
- [ ] Add Redis + Postgres to docker-compose

- [ ] Deploy services to vm
- [ ] Configure NGINX reverse proxy
- [ ] Set up subdomains for deployment URLs
- [ ] Add SSL certificates
- [ ] Test full deployment flow end-to-end
