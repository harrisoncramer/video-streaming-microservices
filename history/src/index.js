const express = require('express');
const http = require('http');
const amqplib = require('amqplib');
const { MongoClient, ObjectId } = require('mongodb');

const { DB_HOST, DB_NAME, PORT, RABBIT } = process.env;
if (!DB_HOST || !DB_NAME || !PORT || !RABBIT) {
  throw new Error('Please set environment variables!');
}

/* Establish DB connection */
async function connectToMongoDB(collectionName) {
  const client = await MongoClient.connect(DB_HOST);
  db = client.db(DB_NAME);
  const collection = db.collection(collectionName);
  return collection;
}

/* Connect to RabbitMQ and create a messaging channel */
async function connectRabbit() {
  const messagingConnection = await amqplib.connect(RABBIT);
  return messagingConnection.createChannel();
}

/* Setup express application */
function server(videosCollection) {
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
}

async function main() {
  let videosCollection;
  try {
    videosCollection = await connectToMongoDB('video-history');
  } catch (err) {
    console.error('Could not connect to MongoDB.');
    throw err;
  }

  /* Callback for consuming RabbitMQ messages */
  async function consumeViewedMessage(msg) {
    const parsedMessage = JSON.parse(msg.content.toString());
    try {
      await videosCollection.insertOne({ videoPath: parsedMessage.videoPath });
    } catch (err) {
      console.error('Could not insert message into DB.');
      throw err;
    }
  }

  let messageChannel;
  try {
    messageChannel = await connectRabbit();
    await messageChannel.assertQueue('viewed', {});
    messageChannel.consume('viewed', consumeViewedMessage);
  } catch (err) {
    console.error('Could not connect to RabbitMQ');
    throw err;
  }

  server(videosCollection);
}

/*
 * This function connects to MongoDB, connects to RabbitMQ, and
 * starts up our Express server. When we recieve a request to /viewed on
 * our Express server, we insert
 * */
main().catch((err) => {
  console.error('An error occured.');
  console.error(err);
});
