FROM node:20-alpine

RUN apk add --no-cache git python3 make g++

WORKDIR /app

RUN git clone https://github.com/nickvdyck/bgutil-ytdlp-pot-provider.git .

RUN npm ci

RUN npm run build 2>/dev/null || true

EXPOSE 4416

CMD ["node", "dist/server.js"]
