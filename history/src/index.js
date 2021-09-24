const express = require('express');
const http = require('http');
const { MongoClient, ObjectId } = require('mongodb');

const { DB_HOST, DB_NAME, PORT } = process.env;
if (!DB_HOST || !DB_NAME || !PORT) {
  throw new Error('Please set environment variables!');
}

function startHttpServer(db) {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    const videosCollection = db.collection('video-history');

    app.post('/viewed', (req, res) => {
      const { videoPath } = req.body;
      videosCollection
        .insertOne({ videoPath })
        .then(() => {
          console.log(`Added video ${videoPath} to history.`);
          res.sendStatus(200);
        })
        .catch((err) => {
          console.error(`Error adding video ${videoPath} to history.`);
          console.error(err);
          res.sendStatus(500);
        });
    });

    app.listen(parseInt(PORT), () => {
      resolve();
    });
  });
}

MongoClient.connect(DB_HOST).then((client) => {
  db = client.db(DB_NAME);

  startHttpServer(db).then(() => console.log('History microservice online.'));
});
