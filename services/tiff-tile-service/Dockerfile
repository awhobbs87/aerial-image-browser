FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8788

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/server.js ./src/server.js

EXPOSE 8788

CMD ["node", "src/server.js"]
