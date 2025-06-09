require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.static('public'));
app.use(express.json());

// Import main routes
const mainRoutes = require('./routes');
app.use('/', mainRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});