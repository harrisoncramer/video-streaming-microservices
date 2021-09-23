const express = require('express');
const http = require('http');

function setupHandlers(app) {}

function startHttpServer() {
  return new Promise((resolve) => {
    const app = express();
    setupHandlers(app);
    const port = parseInt(process.env.PORT) || 3000;
    app.listen(port, () => {
      resolve();
    });
  });
}

startHttpServer().then(() => console.log('History microservice online.'));
