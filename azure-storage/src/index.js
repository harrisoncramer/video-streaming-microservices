const express = require('express');
const azure = require('azure-storage');

const app = express();

const PORT = process.env.PORT;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;

/* Creates HTTP connection to video service
 * EG: http://localhost:3003/video?path=my_video.mp4
 */
function createBlobService() {
  const blobService = azure.createBlobService(STORAGE_ACCOUNT_NAME, STORAGE_ACCESS_KEY);
  return blobService;
}

app.get('/video', (req, res) => {
  const videoPath = req.query.path;
  const blobService = createBlobService();

  /* Hard-coded container name for videos inside of storage */
  const containerName = 'videos';

  console.log(`Request for ${containerName} container, path: ${videoPath}`);

  blobService.getBlobProperties(containerName, videoPath, (err, properties) => {
    if (err) {
      res.sendStatus(500);
      return;
    }

    res.writeHead(200, {
      'Content-Length': properties.contentLength,
      'Content-Type': 'video/mp4',
    });

    /* Streams video from storage to the HTTP response */
    blobService.getBlobToStream(containerName, videoPath, res, (err) => {
      if (err) {
        res.sendStatus(500);
        return;
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`azure-storage microservice online`);
});
