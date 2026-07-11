# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# VITE_* vars are baked in at build time. Override with --build-arg.
# Default empty = same-origin: nginx in this image proxies /api -> backend, so
# no CORS and it works behind a tunnel. (Cloudflare Pages builds via `npm run
# build`, not this Dockerfile, and sets its own VITE_API_BASE.)
ARG VITE_API_BASE=""
ARG VITE_CHEATS=true
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_CHEATS=$VITE_CHEATS
RUN npm run build

# --- serve stage ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
