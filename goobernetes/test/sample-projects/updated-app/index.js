const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from Basic App v2! This is an updated deployment!');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0' });
});

app.get('/new-feature', (req, res) => {
  res.json({
    message: 'This is a new feature in v2!',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Basic app v2 listening at http://localhost:${port}`);
});
