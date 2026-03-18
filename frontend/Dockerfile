FROM node:20-alpine

ENV NODE_ENV=development

WORKDIR /app/frontend

COPY package*.json ./

RUN npm install

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
