require('dotenv').config();

const express = require('express');
const cors = require('cors');
const apiRouter = require('../src/routes/api');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', apiRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
