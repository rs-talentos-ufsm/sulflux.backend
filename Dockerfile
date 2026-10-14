# syntax=docker/dockerfile:1
# =========================
# ESTÁGIO 1: Build 
# =========================
FROM node:22-alpine AS builder

WORKDIR /app
RUN apk add --no-cache openssl libc6-compat git

# Copia apenas arquivos de configuração e o pacote compartilhado
COPY package*.json ./
COPY lib-shared*.tgz ./lib-shared.tgz
RUN sed -i '/"@lib\/shared"/d' package.json && rm -f package-lock.json && npm install --legacy-peer-deps
RUN mkdir -p node_modules/@lib/shared && tar -xzf lib-shared.tgz --strip-components=1 -C node_modules/@lib/shared

# Copia todo o código-fonte
COPY . .

# Gera o Prisma Client
ARG DATABASE_URL="postgresql://fake:fake@localhost:5432/db"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

# Faz o build do Backend
RUN npm run build

# =========================
# ESTÁGIO 2: Produção
# =========================
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

# Copia dependências compiladas e código
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 5001

CMD ["node", "dist/server.js"]