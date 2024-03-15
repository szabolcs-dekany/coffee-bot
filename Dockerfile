FROM node:20.11.1

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY /src ./src

RUN npm run build

CMD [ "npm", "run", "start" ]