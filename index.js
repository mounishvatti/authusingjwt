import express, { urlencoded, json } from 'express';
import { join } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import pkg from 'jsonwebtoken';
const { sign, verify } = pkg;
import { existsSync, readFileSync, writeFileSync } from 'fs';
import Cryptr from 'cryptr';

const cryptr = new Cryptr(process.env.CRYPTR_SECRET || 'ALL_I_CARE_ABOUT_IS_CRYPTR_SECRET');
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'ALL_I_CARE_ABOUT_IS_JWT_SECRET';

// File paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const usersFilePath = join(__dirname, 'users.json');

// Ensure users.json exists
if (!existsSync(usersFilePath)) {
  writeFileSync(usersFilePath, '{"users": []}', 'utf8'); // Initialize structure
}

// Load users from JSON
let usersData;

try {
  const data = readFileSync(usersFilePath, 'utf8');
  usersData = JSON.parse(data || '{"users": []}');
} catch (error) {
  console.error('Error reading or parsing users.json:', error);
  usersData = { users: [] }; // Default structure
}

const users = usersData.users; // Extract users array

// Middleware
app.use(urlencoded({ extended: true }));
app.use(cors());
app.use(json());

// Helper function to save users
function saveUsers() {
  writeFileSync(usersFilePath, JSON.stringify({ users }, null, 2));
}

// Routes
app.post('/register', (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (name && email && password && confirmPassword) {
    if (password !== confirmPassword) {
      return res.status(400).send('Passwords do not match');
    }

    const encryptedPassword = cryptr.encrypt(password);
    const newUser = { name, email, encryptedPassword };
    users.push(newUser);
    saveUsers();
    return res.status(201).send({ message: 'User registered successfully', users });
  }

  res.status(400).send('Please provide all the required fields');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    (u) => u.email === email && cryptr.decrypt(u.encryptedPassword) === password
  );

  if (user) {
    const token = sign({ email: user.email }, JWT_SECRET, { expiresIn: '2 days' });
    return res.status(200).send({ token });
  }

  res.status(401).send('Invalid Credentials');
});

app.get('/me', (req, res) => {
  const token = req.headers.token;

  try {
    const userDetails = verify(token, JWT_SECRET);
    const user = users.find((u) => u.email === userDetails.email);

    if (user) {
      return res.status(200).send({ email: user.email });
    }

    res.status(401).send({ message: 'Unauthorized' });
  } catch (error) {
    res.status(401).send({ message: 'Invalid or expired token' });
  }
});

// Start server
app.listen(3001, () => {
  console.log('Server is running on http://localhost:3001');
});