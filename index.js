const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
let users = require('./users.json');
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'ALL_I_CARE_ABOUT_IS_JWT_SECRET';

users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json')));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Let’s learn about JWTs');
});

// Helper function to save users back to users.json
function saveUsers() {
  fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
}

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (name && email && password) {
    const user = { name: name, email: email, password: password };
    users.push(user);
    saveUsers(); // Save the updated users array back to users.json
    res.send(users);
  } else {
    res.status(400).send('Please provide all the fields');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((user) => user.email === email && user.password === password);

  if (user) {
    const token = jwt.sign({ email: user.email }, JWT_SECRET);
    res.send({ token });
  } else {
    res.status(401).send('Invalid Credentials');
  }
});

app.get('/me', (req, res) => {
  const token = req.headers.authorization;

  try {
    const userDetails = jwt.verify(token, JWT_SECRET);
    const email = userDetails.email;
    const user = users.find((user) => user.email === email);

    if (user) {
      res.send({ email: user.email });
    } else {
      res.status(401).send({ message: 'Unauthorized' });
    }
  } catch (error) {
    res.status(401).send({ message: 'Invalid or expired token' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});