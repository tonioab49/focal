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
ENV NEXT_INTERNAL_PORT=3000
ENV HOCUSPOCUS_PORT=1236

RUN apk add --no-cache git nginx

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
RUN mkdir -p /var/lib/nginx /var/log/nginx /run/nginx && \
    chown -R nextjs:nodejs /var/lib/nginx /var/log/nginx /run/nginx /etc/nginx

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/dist-server ./dist-server
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs docker/start.js ./docker/start.js
COPY docker/nginx/default.conf.template /etc/nginx/http.d/default.conf.template

USER nextjs

CMD ["node", "docker/start.js"]
