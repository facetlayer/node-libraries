const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from Ignore Rules App!');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.listen(port, () => {
  console.log(`Ignore rules app listening at http://localhost:${port}`);
});
