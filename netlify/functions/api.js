import serverless from "serverless-http";
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import cors from 'cors';
import express, {Router} from "express";
// import {io} from "socket.io-client";

const api = express();
const router = Router();

api.use(express.json());
api.use(morgan('combined', {
    stream: {
        write: (message) => {
            console.log(message);
        }
    }
}));
api.use(cors());
api.use(express.static('public'));

const users = [
    { id: 1, email: 'user@example.com', password: 'password@123', role: 'user', username: 'user1' },
];

const SECRET_KEY = 'vW8nF/bLKidnpIHC2ngYZNbdOe+tbFcoZ7muV0vCRYk=';
const REFRESH_SECRET_KEY = '3cN5xXHOsKhB7qxoDzWQcEMrtR0DZ6leTrkyHYOqIro=';

const generateTokens = (user) => {
    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, REFRESH_SECRET_KEY, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

const tokenBlacklist = new Set();

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
    const { username, email, password, passwordConfirmation } = req.body;
    if (password !== passwordConfirmation) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }
    const userExists = users.some((u) => u.email === email);

    if (userExists) {
        res.status(409).json({ message: 'User already exists' });
    } else {
        const newUser = { id: users.length + 1, username, email, password, role: 'user' };
        users.push(newUser);
        const tokens = generateTokens(newUser);
        res.status(201).json({ user: newUser, ...tokens });
    }
});

router.get('/user', (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    if (tokenBlacklist.has(token)) {
        return res.status(401).json({ message: 'Token has been invalidated' });
    }
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
    if (tokenBlacklist.has(refreshToken)) {
        return res.status(401).json({ message: 'Refresh token has been invalidated' });
    }
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

router.post('/logout', (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    tokenBlacklist.add(token);
    res.status(200).json({ message: 'User logged out successfully' });
});

router.get('/check', (req, res) => {
    res.status(200).json({ message: 'All working' });
});

router.get('/users', (req, res) => {
    res.status(200).json({ users });
});

api.use("/api/", router);

export const handler = serverless(api);
