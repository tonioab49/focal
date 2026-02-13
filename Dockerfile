# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Stage 2: Build the application
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build
# Compile the hocuspocus server to JS
RUN npx tsc server/hocuspocus.ts --outDir dist-server --esModuleInterop --module commonjs --skipLibCheck

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=4000

RUN apk add --no-cache git

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/dist-server ./dist-server
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 4000
EXPOSE 1236

# Run both Next.js and Hocuspocus; exec ensures SIGTERM reaches both
CMD ["node", "-e", "\
const { spawn } = require('child_process');\
const next = spawn('node', ['server.js'], { stdio: 'inherit' });\
const ws = spawn('node', ['dist-server/hocuspocus.js'], { stdio: 'inherit' });\
const exit = () => { next.kill(); ws.kill(); process.exit(); };\
process.on('SIGTERM', exit);\
process.on('SIGINT', exit);\
next.on('exit', exit);\
ws.on('exit', exit);\
"]
