FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY dist/ ./dist/

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
