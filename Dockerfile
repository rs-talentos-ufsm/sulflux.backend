# =========================
# ESTÁGIO 1: Build 
# =========================
FROM node:22-alpine AS builder

WORKDIR /app
RUN apk add --no-cache openssl libc6-compat git

# Copia apenas arquivos de configuração para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install

# Copia todo o código-fonte (agora a shared já vem com a 'dist' populada)
COPY . .

# Gera o Prisma (necessita do schema)
ARG DATABASE_URL="postgresql://fake:fake@localhost:5432/db"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

# Faz o build do Backend
# (Certifique-se de que seu 'npm run build' no backend 
# apenas execute 'tsc' e não tente buildar a shared)
RUN npm run build

# =========================
# ESTÁGIO 2: Produção
# =========================
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

# Instala apenas dependências de produção
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

# Copia os artefatos compilados
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# O comando de produção roda o JS compilado
CMD ["npm", "run", "start"]