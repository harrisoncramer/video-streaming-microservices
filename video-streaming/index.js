const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

if (!process.env.PORT) {
  throw new Error(
    'Please specify the port number for the HTTP server with the environment variable PORT.'
  );
}

const PORT = process.env.PORT;

app.get('/', (req, res) => {
  res.status(200).send('Hello world!');
});

app.get('/video', (req, res) => {
  const vidPath = './videos/zoom_troll.mp4';
  fs.stat(vidPath, (err, stats) => {
    if (err) {
      res.sendStatus(500);
      return;
    }
    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(vidPath).pipe(res);
  });
});

app.listen(PORT, () => {
  console.log(`Microservice listening!`);
});
