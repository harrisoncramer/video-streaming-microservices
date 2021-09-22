const express = require('express');
const http = require('http');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();

if (!process.env.PORT) {
  throw new Error(
    'Please specify the port number for the HTTP server with the environment variable PORT.'
  );
}

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
const DB_HOST = process.env.DB_HOST;
const DB_NAME = process.env.DB_NAME;

(async () => {
  /* Connect to MongoDB */
  let db;
  try {
    const client = await MongoClient.connect(DB_HOST);
    db = client.db(DB_NAME);
  } catch (err) {
    console.error('Could not connect to DB.');
    throw err;
  }

  /* Create videos collection */
  const videos = db.collection('videos');

  app.get('/video', async (req, res) => {
    let record;
    console.log(`Searching for ${req.query.id}`);
    try {
      record = await videos.findOne({ _id: new ObjectId(req.query.id) });
    } catch (err) {
      console.error('Database query failed.');
      console.error(err);
      res.sendStatus(500);
      return;
    }

    if (!record) {
      res.sendStatus(404);
      return;
    }

    const forwardRequest = http.request(
      {
        host: VIDEO_STORAGE_HOST,
        port: VIDEO_STORAGE_PORT,
        path: `/video?path=${record.videoPath}`,
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
    console.log(`Video streaming microservice listening!`);
  });
})();
