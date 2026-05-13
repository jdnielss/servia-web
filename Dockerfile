# Build static frontend files
FROM node:25-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

COPY frontend .

RUN apk add pnpm && \
    CI=true pnpm install && \
    pnpm build

# Build backend image that also serves frontend (stored in `/app/frontend-dist`)
FROM python:3.14-alpine3.22
# Install uv via pip to avoid ghcr.io auth issues
RUN pip install uv

RUN apk add --no-cache gcc musl-dev libgcc
RUN rm -rf /var/cache/apk/*

COPY backend /app
WORKDIR /app

# -- Install dependencies:
RUN addgroup --system bracket && \
    adduser --system bracket --ingroup bracket && \
    chown -R bracket:bracket /app
USER bracket

RUN uv sync --no-dev --locked

COPY --from=builder /app/dist /app/frontend-dist

EXPOSE 8400

CMD [ \
    "uv", \
    "run", \
    "--no-dev", \
    "--locked", \
    "--", \
    "gunicorn", \
    "-k", \
    "uvicorn.workers.UvicornWorker", \
    "bracket.app:app", \
    "--bind", \
    "0.0.0.0:8400", \
    "--workers", \
    "1" \
]