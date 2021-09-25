const express = require('express');
const http = require('http');
const path = require('path');
const amqplib = require('amqplib');
const { MongoClient, ObjectId } = require('mongodb');

const { PORT, VIDEO_STORAGE_HOST, VIDEO_STORAGE_PORT, DB_HOST, DB_NAME, RABBIT } = process.env;
if (!PORT || !VIDEO_STORAGE_PORT || !VIDEO_STORAGE_HOST || !DB_HOST || !DB_NAME || !RABBIT) {
  throw new Error('Please set environment variables!');
  console.log();
}

/* Establish DB connection */
async function connectToMongoDB(collectionName) {
  const client = await MongoClient.connect(DB_HOST);
  db = client.db(DB_NAME);
  const collection = db.collection(collectionName);
  return collection;
}

/* Create connection channel to RabbitMQ */
async function connectRabbit() {
  const messagingConnection = await amqplib.connect(RABBIT);
  return messagingConnection.createChannel();
}

function sendViewedMessage(messageChannel, videoPath) {
  const msg = { videoPath };
  const jsonMessage = JSON.stringify(msg);
  messageChannel.publish('', 'viewed', Buffer.from(jsonMessage));
}

async function main() {
  let videos;
  try {
    videos = await connectToMongoDB('videos');
  } catch (err) {
    console.error('Could not connect to MongoDB');
    throw err;
  }

  let messageChannel;
  try {
    messageChannel = await connectRabbit();
  } catch (err) {
    console.error('Could not connect to RabbitMQ');
    throw err;
  }

  const app = express();
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

    /* Emit message to RabbitMQ "published" queue, so that history microservice can log view */
    sendViewedMessage(messageChannel, record.videoPath);

    /* Pipe video data from azure-storage microservice to user */
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

  /* Global error handler */
  const defaultErrorObject = {
    status: 500,
    log: 'An uncaught error occured on the server.',
  };

  app.use((err, _req, res, _next) => {
    const errorObject = { ...defaultErrorObject, ...err };
    res.status(errorObject.status).send(errorObject.log);
  });

  /* Listen for inbound requests */
  app.listen(PORT, () => {
    console.log(`Video streaming microservice listening!`);
  });
}

main().catch((err) => {
  console.error('An error occured');
  console.error(err);
});
