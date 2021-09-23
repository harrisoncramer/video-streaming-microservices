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
