ARG PORT

FROM node:20.6-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE $PORT


CMD ["npm", "start"]