const express = require('express');
const path = require('path');
const cors = require('cors'); // Import cors middleware
const jwt = require('jsonwebtoken');
const fs = require('fs');
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.CRYPTR_SECRET || 'ALL_I_CARE_ABOUT_IS_CRYPTR_SECRET');
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'ALL_I_CARE_ABOUT_IS_JWT_SECRET';

let users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json')));
app.use(express.urlencoded({ extended: true })); // Handle form data
app.use(cors()); // Enable CORS for all routes

app.use(express.json());

function saveUsers() {
  fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/register', (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const encryptedPassword = cryptr.encrypt(password);
  const confirmPassword = req.body.confirmPassword;

  if (name && email && password && confirmPassword) {
    if (password !== confirmPassword) {
      return res.status(400).send('Passwords do not match');
    }
    const user = { name, email, encryptedPassword };
    users.push(user);
    saveUsers();
    res.send(users);
  } else {
    res.status(400).send('Please provide all the fields');
  }
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const user = users.find((user) => user.email === email && cryptr.decrypt(user.encryptedPassword) === password);

  if (user) {
    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '2 days' });
    res.send({ token });
  } else {
    res.status(401).send('Invalid Credentials');
  }
});

app.get('/me', (req, res) => {
  const token = req.headers.token;

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