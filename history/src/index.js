const express = require('express');
const http = require('http');
const amqplib = require('amqplib');
const { MongoClient, ObjectId } = require('mongodb');

const { DB_HOST, DB_NAME, PORT, RABBIT } = process.env;
if (!DB_HOST || !DB_NAME || !PORT || !RABBIT) {
  throw new Error('Please set environment variables!');
}

/* Connect to RabbitMQ and create a messaging channel */
async function connectRabbit() {
  const messagingConnection = await amqplib.connect(RABBIT);
  return messagingConnection.createChannel();
}

/* Establish DB connection */
MongoClient.connect(DB_HOST).then((client) => {
  db = client.db(DB_NAME);
  const videosCollection = db.collection('video-history');

  /* Setup express application */
  const app = express();
  app.use(express.json());

  app.post('/viewed', async (req, res) => {
    const { videoPath } = req.body;
    try {
      await videosCollection.insertOne({ videoPath });
      console.log(`Added video ${videoPath} to history.`);
      res.sendStatus(200);
    } catch (err) {
      console.error(`Error adding video ${videoPath} to history.`);
      console.error(err);
      res.sendStatus(500);
    }
  });

  app.listen(parseInt(PORT), () => {
    console.log('History microservice online.');
  });
});
