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

/* Connect to RabbitMQ and create a messaging exchange */
async function connectRabbit() {
  const messagingConnection = await amqplib.connect(RABBIT);
  return messagingConnection.createChannel();
}

/* Setup express application. This keeps NodeJS from exiting */
function server() {
  const app = express();
  app.listen(parseInt(PORT), () => {
    console.log('History microservice online.');
  });
}

/*
 * This function connects to MongoDB, connects to RabbitMQ, and
 * processes the "viewed" queue. The microservice pulls from that
 * queue and writes the data to the database.
 */
async function main() {
  let videosCollection;
  try {
    videosCollection = await connectToMongoDB('recommendations');
  } catch (err) {
    console.error('Could not connect to MongoDB.');
    throw err;
  }

  /* Create "viewed" exchange for all microservices, and anonymous queue for this microservice */
  try {
    let messageChannel = await connectRabbit();
    await messageChannel.assertExchange('viewed', 'fanout');
    const { queue } = await messageChannel.assertQueue('', { exclusive: true });
    await messageChannel.bindQueue(queue, 'viewed', '');
    await messageChannel.consume(queue, (message) => {
      console.log('I got a message');
    });
  } catch (err) {
    console.error(`Could not create queue ${queue} and bind it it to viewed exchange`);
    throw err;
  }

  server();
}

main().catch((err) => {
  console.error('An error occured.');
  console.error(err);
});
