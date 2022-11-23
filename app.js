const express = require('express');

const PORT = process.env.PORT || '3000';

const jobRoutes = require('./routes');

let app = express();
app.use(express.json());
app.use('/job', jobRoutes);

// Serve the two static assets
/*app.get('/', (req, res) => res.sendFile('index.html', { root: __dirname }));
app.get('/client.js', (req, res) => res.sendFile('client.js', { root: __dirname }));


// Allows the client to query the state of a background job
app.get('/job/:id', async (req, res) => {
  let id = req.params.id;
  let job = await workQueue.getJob(id);

  if (job === null) {
    res.status(404).end();
  } else {
    let state = await job.getState();
    let progress = job._progress;
    let reason = job.failedReason;
    res.json({ id, state, progress, reason });
  }
});

workQueue.on('global:completed', (jobId, result) => {
  console.log(`Job ${jobId} completed with result ${result}`);
});
*/

app.listen(PORT, () => console.log("Server started!"));
