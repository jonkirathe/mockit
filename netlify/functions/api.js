import serverless from "serverless-http";
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import cors from 'cors';
import express, { Router } from "express";
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import dotenv from 'dotenv';
import session from "express-session";
import fs from 'fs';
import path from 'path';

dotenv.config();

const domain = process.env.DOMAIN;
const ORIGIN_DOMAIN = process.env.ORIGIN_DOMAIN;
const SECRET_KEY = process.env.SECRET_KEY;

const api = express();
const router = Router();
const port = process.env.PORT || 8080;
api.set('port', port);

// Data persistence helpers
const dataFilePath = path.join(process.cwd(), 'db.json');

function readData() {
    const jsonData = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(jsonData);
}

function writeData(data) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

// Middlewares
api.use(express.json());
api.use(cookieParser());
api.use(morgan('combined', {
    stream: {
        write: (message) => {
            // console.log(message);
        }
    }
}));
api.use(session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));
api.use(cookieParser());
api.use(morgan('combined'));
api.use(cors({
    origin: ORIGIN_DOMAIN,
    credentials: true
}));
api.use(express.static('public'));

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});
api.use(limiter);

// CSRF setup
const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

api.use((req, res, next) => {
    console.log('req.cookies.csrfToken:', req.cookies.csrfToken);
    let csrfToken = req.cookies.csrfToken;
    if (!csrfToken && !req.session.csrfToken) {
        csrfToken = generateCsrfToken();
        req.session.csrfToken = csrfToken;
        res.cookie('csrfToken', csrfToken, { httpOnly: false, secure: false });
        console.log('Generated new CSRF Token:', csrfToken);
    } else {
        console.log('Reusing existing CSRF Token:', csrfToken);
    }
    req.csrfToken = req.session.csrfToken;
    next();
});

const validateCsrfToken = (req, res, next) => {
    const csrfToken = req.cookies.csrfToken;
    const csrfTokenFromHeader = req.headers['x-csrf-token'];
    const csrfTokenFromSession = req.session.csrfToken;
    console.log('cookies.csrfToken: ', csrfToken);
    console.log('session.csrfToken: ', csrfTokenFromSession);
    if ((csrfToken || csrfTokenFromHeader) !== csrfTokenFromSession) {
        console.log('Invalid CSRF Token');
        return res.status(403).send('Invalid CSRF token');
    }
    console.log('CSRF Token is valid');
    next();
};

const validateAccessToken = async (req, res, next) => {
    const token = req.cookies.accessToken;
    if (!token) {
        return res.status(401).json({ message: 'Access token is missing' });
    }
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                const refreshToken = req.cookies.refreshToken;
                if (!refreshToken) {
                    logout(req, res);
                    return res.status(401).json({ message: 'Refresh token is missing' });
                }
                try {
                    const decodedRefreshToken = jwt.verify(refreshToken, SECRET_KEY);
                    const data = readData();
                    const user = data.user.find((u) => u.id === decodedRefreshToken.id);
                    if (user) {
                        const { accessToken, cookieAccessTokenExpiresIn } = generateTokens(user);
                        res.cookie('accessToken', accessToken, {
                            httpOnly: true,
                            secure: true,
                            sameSite: 'Strict',
                            expires: cookieAccessTokenExpiresIn
                        });
                        return next();
                    } else {
                        logout(req, res);
                        return res.status(401).json({ message: 'Invalid refresh token' });
                    }
                } catch (refreshErr) {
                    logout(req, res);
                    return res.status(401).json({ message: 'Invalid or expired refresh token' });
                }
            } else {
                return res.status(401).json({ message: 'Invalid access token' });
            }
        } else {
            req.user = decoded;
            next();
        }
    });
};

const generateTokens = (user) => {
    const accessToken = jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
    }, SECRET_KEY, { expiresIn: '15m' });
    const refreshToken = jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
    }, SECRET_KEY, { expiresIn: '7d' });

    const accessTokenExpiresIn = new Date(Date.now() + 15 * 60 * 1000);
    const cookieAccessTokenExpiresIn = new Date(Date.now() + 20 * 60 * 1000);
    const refreshTokenExpiresIn = new Date(Date.now() + 7 * 24 * 60 * 1000);
    const cookieRefreshTokenExpiresIn = new Date(Date.now() + 8 * 24 * 60 * 1000);

    return { accessToken, refreshToken, accessTokenExpiresIn, cookieAccessTokenExpiresIn, refreshTokenExpiresIn, cookieRefreshTokenExpiresIn };
};

const tokenBlacklist = new Set();

function logout(req, res) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('csrfToken');
    req.session.csrfToken = null;
}

// Routes
router.post('/signin', validateCsrfToken, (req, res) => {
    const { email, password } = req.body;
    const data = readData();
    const user = data.user.find((u) => u.email === email && u.password === password);
    if (user) {
        const { accessToken, refreshToken, cookieAccessTokenExpiresIn, cookieRefreshTokenExpiresIn } = generateTokens(user);
        req.session.accessToken = accessToken;
        req.session.refreshToken = refreshToken;
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            expires: cookieAccessTokenExpiresIn
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            expires: cookieRefreshTokenExpiresIn
        });
        res.status(200).json({ user });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
});

router.get('/csrf-token', (req, res) => {
    console.log('Initial Fetching CSRF Token:', req.csrfToken);
    res.json({ csrfToken: req.csrfToken });
});

router.post('/signup', validateCsrfToken, (req, res) => {
    const { username, email, password, passwordConfirmation } = req.body;
    if (password !== passwordConfirmation) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }
    const data = readData();
    const userExists = data.user.some((u) => u.email === email);
    if (userExists) {
        res.status(409).json({ message: 'User already exists' });
    } else {
        const newUser = {
            id: data.user.length ? Math.max(...data.user.map(u => u.id)) + 1 : 1,
            username,
            email,
            password,
            role: 'user'
        };
        data.user.push(newUser);
        writeData(data);
        const { accessToken, refreshToken, cookieAccessTokenExpiresIn, cookieRefreshTokenExpiresIn } = generateTokens(newUser);
        req.session.accessToken = accessToken;
        req.session.refreshToken = refreshToken;
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            expires: cookieAccessTokenExpiresIn
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            expires: cookieRefreshTokenExpiresIn
        });
        res.status(201).json({ user: newUser, csrfToken: req.csrfToken });
    }
});

router.post('/logout', validateCsrfToken, validateAccessToken, (req, res) => {
    logout(req, res);
    res.status(200).json({ message: 'User logged out successfully' });
});

router.get('/user', validateCsrfToken, validateAccessToken, (req, res) => {
    const token = req.cookies.accessToken;
    if (tokenBlacklist.has(token)) {
        return res.status(401).json({ message: 'Token has been invalidated' });
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const data = readData();
        const user = data.user.find((u) => u.id === decoded.id);
        if (user) {
            res.status(200).json({ user });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

router.post('/refresh', validateCsrfToken, (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        logout(req, res);
        return res.status(401).json({ message: 'Refresh token is missing' });
    }
    try {
        const decoded = jwt.verify(refreshToken, SECRET_KEY);
        const data = readData();
        const user = data.user.find((u) => u.id === decoded.id);
        if (user) {
            const { accessToken, refreshToken, cookieAccessTokenExpiresIn, cookieRefreshTokenExpiresIn } = generateTokens(user);
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'Strict',
                expires: cookieAccessTokenExpiresIn
            });
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'Strict',
                expires: cookieRefreshTokenExpiresIn
            });
            res.status(200).json({ csrfToken: req.csrfToken });
        } else {
            logout(req, res);
            res.status(401).json({ message: 'Invalid refresh token' });
        }
    } catch (error) {
        logout(req, res);
        res.status(401).json({ message: 'Invalid refresh token' });
    }
});

router.get('/check', validateCsrfToken, (req, res) => {
    res.status(200).json({ message: 'All working' });
});

router.get('/users', validateCsrfToken, validateAccessToken, (req, res) => {
    const data = readData();
    res.status(200).json({ users: data.user });
});

// Pets Routes
router.post('/pet', validateCsrfToken, validateAccessToken, (req, res) => {
    const data = readData();
    const { name, breed, age, gender, ownerId, description, careSuggestions, animalType, imageUrl } = req.body;
    const newPet = {
        id: data.pets.length ? Math.max(...data.pets.map(p => p.id)) + 1 : 1,
        name,
        breed,
        age,
        gender,
        ownerId,
        description,
        careSuggestions,
        animalType,
        imageUrl
    };
    data.pets.push(newPet);
    writeData(data);
    res.status(201).json({ pet: newPet });
});

router.get('/pets', validateCsrfToken, validateAccessToken, (req, res) => {
    const data = readData();
    res.status(200).json({ pets: data.pets });
});

router.get('/pet/:id', validateCsrfToken, validateAccessToken, (req, res) => {
    const petId = parseInt(req.params.id, 10);
    const data = readData();
    const pet = data.pets.find((p) => p.id === petId);
    if (pet) {
        res.status(200).json({ pet });
    } else {
        res.status(404).json({ message: 'Pet not found' });
    }
});

router.put('/pet/:id', validateCsrfToken, validateAccessToken, (req, res) => {
    const petId = parseInt(req.params.id, 10);
    const { name, breed, age, gender, ownerId, description, careSuggestions, animalType, imageUrl } = req.body;
    const data = readData();
    const petIndex = data.pets.findIndex((p) => p.id === petId);
    if (petIndex !== -1) {
        data.pets[petIndex] = {
            id: petId,
            name,
            breed,
            age,
            gender,
            ownerId,
            description,
            careSuggestions,
            animalType,
            imageUrl
        };
        writeData(data);
        res.status(200).json({ pet: data.pets[petIndex] });
    } else {
        res.status(404).json({ message: 'Pet not found' });
    }
});

router.delete('/pet/:id', validateCsrfToken, validateAccessToken, (req, res) => {
    const petId = parseInt(req.params.id, 10);
    const data = readData();
    const petIndex = data.pets.findIndex((p) => p.id === petId);
    if (petIndex !== -1) {
        const deletedPet = data.pets.splice(petIndex, 1);
        writeData(data);
        res.status(200).json({ pet: deletedPet[0] });
    } else {
        res.status(404).json({ message: 'Pet not found' });
    }
});

// Tasks Routes
router.post('/task', validateCsrfToken, validateAccessToken, (req, res) => {
    const data = readData();
    const { completed, title, description, priority, dueDate } = req.body;
    const newTask = {
        id: data.tasks.length ? Math.max(...data.tasks.map(t => t.id)) + 1 : 1,
        completed,
        title,
        description,
        priority,
        dueDate
    };
    data.tasks.push(newTask);
    writeData(data);
    res.status(201).json({ task: newTask });
});

router.get('/tasks', validateCsrfToken, validateAccessToken, (req, res) => {
    const data = readData();
    res.status(200).json({ tasks: data.tasks });
});

router.get('/task/:id', validateCsrfToken, validateAccessToken, (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const data = readData();
    const task = data.tasks.find((t) => t.id === taskId);
    if (task) {
        res.status(200).json({ task });
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

router.put('/task/:id', validateCsrfToken, validateAccessToken, (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const { completed, title, description, priority, dueDate } = req.body;
    const data = readData();
    const taskIndex = data.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
        data.tasks[taskIndex] = {
            id: taskId,
            completed,
            title,
            description,
            priority,
            dueDate
        };
        writeData(data);
        res.status(200).json({ task: data.tasks[taskIndex] });
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

router.delete('/task/:id', validateCsrfToken, validateAccessToken, (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const data = readData();
    const taskIndex = data.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
        const deletedTask = data.tasks.splice(taskIndex, 1);
        writeData(data);
        res.status(200).json({ task: deletedTask[0] });
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

api.use("/api/", router);

api.listen(port, () => {
    console.log('Server listening on port: ' + port);
});

export const handler = serverless(api);
