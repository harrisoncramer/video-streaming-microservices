const express = require('express');
const http = require('http');
const path = require('path');

const app = express();

if (!process.env.PORT) {
  throw new Error(
    'Please specify the port number for the HTTP server with the environment variable PORT.'
  );
}

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);

app.get('/video', (req, res) => {
  const forwardRequest = http.request(
    {
      host: VIDEO_STORAGE_HOST,
      port: VIDEO_STORAGE_PORT,
      path: `/video?path=${req.query.path}`,
      method: 'GET',
      headers: req.headers,
    },
    (forwardResponse) => {
      res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
      forwardResponse.pipe(res);
    }
  );

  req.pipe(forwardRequest);
});

app.listen(PORT, () => {
  console.log(`Microservice listening!`);
});
