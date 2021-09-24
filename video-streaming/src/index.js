const express = require('express');
const http = require('http');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();

const { PORT, VIDEO_STORAGE_HOST, VIDEO_STORAGE_PORT, DB_HOST, DB_NAME } = process.env;
if (!PORT || !VIDEO_STORAGE_PORT || !VIDEO_STORAGE_HOST || !DB_HOST || !DB_NAME) {
  throw new Error('Please set environment variables!');
  console.log();
}

function sendViewedMessage(videoPath) {
  const postOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const requestBody = { videoPath };
  const request = http.request('http://history/viewed', postOptions);

  request.on('close', () => {});
  request.on('error', () => {});

  request.write(JSON.stringify(requestBody));
  request.end();
}

MongoClient.connect(DB_HOST)
  .then((client) => {
    db = client.db(DB_NAME);
    const videos = db.collection('videos');

    ///////////////////////
    // LISTEN FOR VIDEOS //
    ///////////////////////

    app.get('/video', async (req, res) => {
      let record;
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

      sendViewedMessage(record.videoPath);

      const forwardRequest = http.request(
        {
          host: VIDEO_STORAGE_HOST,
          port: parseInt(VIDEO_STORAGE_PORT),
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

    //////////////////////////
    // GLOBAL ERROR HANDLER //
    //////////////////////////

    const defaultErrorObject = {
      status: 500,
      log: 'An uncaught error occured on the server.',
    };

    app.use((err, _req, res, _next) => {
      const errorObject = { ...defaultErrorObject, ...err };
      res.status(errorObject.status).send(errorObject.log);
    });

    ////////////
    // LISTEN //
    ////////////

    app.listen(PORT, () => {
      console.log(`Video streaming microservice listening!`);
    });
  })
  .catch((err) => {
    console.error('Could not connect to DB.');
    console.error(err);
  });
