import express from 'express';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { Server } from 'socket.io';
import http from 'http';
import { swaggerOptions } from '../swaggerConfig.js';

const index = express();
const port = 3500;

const server = http.createServer(index);
const io = new Server(server);

index.use(express.json());
index.use(morgan('combined', {
  stream: {
    write: (message) => {
      io.emit('log', message.trim());
    }
  }
})); // Log all requests
index.use(cors()); // Enable CORS for all routes

// Serve static files from the "public" directory
index.use(express.static('public'));

const users = [
  { id: 1, email: 'user@example.com', password: 'password', role: 'user' },
];

const SECRET_KEY = 'vW8nF/bLKidnpIHC2ngYZNbdOe+tbFcoZ7muV0vCRYk=';
const REFRESH_SECRET_KEY = '3cN5xXHOsKhB7qxoDzWQcEMrtR0DZ6leTrkyHYOqIro=';

const generateTokens = (user) => {
  const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, REFRESH_SECRET_KEY, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Swagger setup
const specs = swaggerJsdoc(swaggerOptions);
index.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /api/signin:
 *   post:
 *     summary: Sign in a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful sign in
 *       401:
 *         description: Invalid email or password
 */
index.post('/api/signin', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);

  if (user) {
    const tokens = generateTokens(user);
    res.status(200).json({ user, ...tokens });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

/**
 * @swagger
 * /api/signup:
 *   post:
 *     summary: Sign up a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       409:
 *         description: User already exists
 */
index.post('/api/signup', (req, res) => {
  const { email, password } = req.body;
  const userExists = users.some((u) => u.email === email);

  if (userExists) {
    res.status(409).json({ message: 'User already exists' });
  } else {
    const newUser = { id: users.length + 1, email, password, role: 'user' };
    users.push(newUser);
    const tokens = generateTokens(newUser);
    res.status(201).json({ user: newUser, ...tokens });
  }
});

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Get authenticated user details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       401:
 *         description: Invalid token
 *       404:
 *         description: User not found
 */
index.get('/api/user', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header is missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = users.find((u) => u.id === decoded.id);
    if (user) {
      res.status(200).json({ user });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

/**
 * @swagger
 * /api/refresh:
 *   post:
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
index.post('/api/refresh', (req, res) => {
  const { refreshToken } = req.body;
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET_KEY);
    const user = users.find((u) => u.id === decoded.id);
    if (user) {
      const tokens = generateTokens(user);
      res.status(200).json({ ...tokens });
    } else {
      res.status(401).json({ message: 'Invalid refresh token' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

/**
 * @swagger
 * /api/check:
 *   get:
 *     summary: Check if the server is working
 *     responses:
 *       200:
 *         description: Server is working
 */
index.get('/api/check', (req, res) => {
  res.status(200).json({ message: 'All working' });
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 */
index.get('/api/users', (req, res) => {
  res.status(200).json({ users });
});

server.listen(port, () => {
  console.log(`Mock API server running at http://localhost:${port}`);
});
