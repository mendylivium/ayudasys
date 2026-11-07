# ── Frontend: Vue + Vite → dist/ ─────────────────────────────────────────────
FROM node:22-alpine AS frontend
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js jsconfig.json ./
COPY public ./public
COPY resources ./resources
RUN npm run build

# ── Backend: static Go binary ────────────────────────────────────────────────
FROM golang:1.27-alpine AS backend
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/go-mvc .

# ── Runtime: binary + dist/ folder ───────────────────────────────────────────
FROM gcr.io/distroless/static-debian12
WORKDIR /app
COPY --from=backend /out/go-mvc ./go-mvc
COPY --from=frontend /src/dist ./dist
COPY storage ./storage
ENV APP_ENV=production
EXPOSE 3000
ENTRYPOINT ["./go-mvc"]
CMD ["serve"]
