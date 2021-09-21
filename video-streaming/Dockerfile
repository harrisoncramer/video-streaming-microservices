FROM node:12.18.1-alpine

WORKDIR /app
COPY . .
RUN npm install --only-production

CMD ["node", "index.js"]
