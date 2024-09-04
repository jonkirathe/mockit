/*import express, { Router } from 'express';
import serverless from 'serverless-http';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { Server } from 'socket.io';
import http from 'http';
import { swaggerOptions } from './swaggerConfig.js';

const api = express();
const router = Router();

const server = http.createServer(api);
const io = new Server(server);

api.use(express.json());
api.use(morgan('combined', {
  stream: {
    write: (message) => {
      io.emit('log', message.trim());
    }
  }
})); // Log all requests
api.use(cors()); // Enable CORS for all routes

// Serve static files from the "public" directory
// api.use(express.static('public'));

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
api.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

router.post('/signin', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);

  if (user) {
    const tokens = generateTokens(user);
    res.status(200).json({ user, ...tokens });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

router.post('/signup', (req, res) => {
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

router.get('/user', (req, res) => {
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

router.post('/refresh', (req, res) => {
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

router.get('/check', (req, res) => {
  res.status(200).json({ message: 'All working' });
});

router.get('/users', (req, res) => {
  res.status(200).json({ users });
});

api.use('/api/', router);

export const handler = serverless(api);*/



import express, { Router } from "express";
import serverless from "serverless-http";

const api = express();

const router = Router();
router.get("/hello", (req, res) => res.send("Hello World!"));

api.use("/api/", router);

export const handler = serverless(api);
