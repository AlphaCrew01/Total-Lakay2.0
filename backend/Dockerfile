FROM node:18-alpine

WORKDIR /app/backend

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 5000

ENV NODE_ENV=production

CMD ["npm", "start"]
