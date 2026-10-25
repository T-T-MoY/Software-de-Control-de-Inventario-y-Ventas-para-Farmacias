# Cambiamos de node:18-alpine a node:22-alpine
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]