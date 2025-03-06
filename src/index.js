/*
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import cors from 'cors';
import express, { Router } from "express";
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import http from "http";
import crypto from 'crypto';
import session from 'express-session';

const domain = process.env.DOMAIN;
const SECRET_KEY = process.env.SECRET_KEY;
const ORIGIN_DOMAIN = process.env.ORIGIN_DOMAIN;

const api = express();
const router = Router();
const port = 8080;
api.set('port', port);

api.use(express.json());
api.use(session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));
api.use(cookieParser());
api.use(morgan('combined'));
api.use(cors({
    origin: 'http://localhost:3000', // Replace with your frontend domain
    credentials: true
}));
api.use(express.static('public'));

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minute
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minute)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to all requests
api.use(limiter);

const users = [
    {id: 1, email: 'user@example.com', password: 'password@123', role: 'user', username: 'user1'},
];

const pets = [
    {
        id: 1,
        name: 'Buddy',
        breed: 'Golden Retriever',
        age: 3,
        gender: 'Male',
        ownerId: 1,
        description: 'Friendly and energetic',
        careSuggestions: 'Regular exercise and grooming',
        animalType: 'Dog',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 2,
        name: 'Mittens',
        breed: 'Siamese',
        age: 2,
        gender: 'Female',
        ownerId: 1,
        description: 'Affectionate and vocal',
        careSuggestions: 'Interactive play and mental stimulation',
        animalType: 'Cat',
        imageUrl: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
    },
    {
        id: 3,
        name: 'Max',
        breed: 'Labrador Retriever',
        age: 4,
        gender: 'Male',
        ownerId: 2,
        description: 'Loyal and playful',
        careSuggestions: 'Daily walks and socialization',
        animalType: 'Dog',
        imageUrl: 'https://images.unsplash.com/photo-1571566882372-1598d88abd90?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 4,
        name: 'Bella',
        breed: 'Persian',
        age: 3,
        gender: 'Female',
        ownerId: 2,
        description: 'Calm and gentle',
        careSuggestions: 'Regular brushing and quiet environment',
        animalType: 'Cat',
        imageUrl: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?q=80&w=1936&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 5,
        name: 'Charlie',
        breed: 'Beagle',
        age: 5,
        gender: 'Male',
        ownerId: 3,
        description: 'Curious and friendly',
        careSuggestions: 'Frequent exercise and mental challenges',
        animalType: 'Dog',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 6,
        name: 'Luna',
        breed: 'Maine Coon',
        age: 2,
        gender: 'Female',
        ownerId: 3,
        description: 'Playful and sociable',
        careSuggestions: 'Climbing spaces and interactive toys',
        animalType: 'Cat',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 7,
        name: 'Rocky',
        breed: 'Bulldog',
        age: 4,
        gender: 'Male',
        ownerId: 4,
        description: 'Calm and courageous',
        careSuggestions: 'Moderate exercise and cool environment',
        animalType: 'Dog',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 8,
        name: 'Daisy',
        breed: 'Ragdoll',
        age: 3,
        gender: 'Female',
        ownerId: 4,
        description: 'Gentle and affectionate',
        careSuggestions: 'Indoor play and regular grooming',
        animalType: 'Cat',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 9,
        name: 'Cooper',
        breed: 'Poodle',
        age: 6,
        gender: 'Male',
        ownerId: 5,
        description: 'Intelligent and active',
        careSuggestions: 'Mental stimulation and regular grooming',
        animalType: 'Dog',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 10,
        name: 'Molly',
        breed: 'Bengal',
        age: 2,
        gender: 'Female',
        ownerId: 5,
        description: 'Energetic and curious',
        careSuggestions: 'Climbing spaces and interactive play',
        animalType: 'Cat',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 11,
        name: 'Bailey',
        breed: 'Boxer',
        age: 5,
        gender: 'Male',
        ownerId: 6,
        description: 'Energetic and loyal',
        careSuggestions: 'Daily exercise and socialization',
        animalType: 'Dog',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 12,
        name: 'Lily',
        breed: 'Sphynx',
        age: 3,
        gender: 'Female',
        ownerId: 6,
        description: 'Affectionate and playful',
        careSuggestions: 'Warm environment and regular bathing',
        animalType: 'Cat',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 13,
        name: 'Toby',
        breed: 'Dachshund',
        age: 4,
        gender: 'Male',
        ownerId: 7,
        description: 'Curious and brave',
        careSuggestions: 'Moderate exercise and mental challenges',
        animalType: 'Dog',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 14,
        name: 'Chloe',
        breed: 'Scottish Fold',
        age: 2,
        gender: 'Female',
        ownerId: 7,
        description: 'Calm and affectionate',
        careSuggestions: 'Quiet environment and gentle play',
        animalType: 'Cat',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 15,
        name: 'Jack',
        breed: 'German Shepherd',
        age: 5,
        gender: 'Male',
        ownerId: 8,
        description: 'Loyal and intelligent',
        careSuggestions: 'Training and regular exercise',
        animalType: 'Dog',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 16,
        name: 'Nala',
        breed: 'Abyssinian',
        age: 3,
        gender: 'Female',
        ownerId: 8,
        description: 'Active and playful',
        careSuggestions: 'Interactive toys and climbing spaces',
        animalType: 'Cat',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 17,
        name: 'Oscar',
        breed: 'Cocker Spaniel',
        age: 4,
        gender: 'Male',
        ownerId: 9,
        description: 'Friendly and energetic',
        careSuggestions: 'Regular grooming and exercise',
        animalType: 'Dog',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 18,
        name: 'Zoe',
        breed: 'Birman',
        age: 2,
        gender: 'Female',
        ownerId: 9,
        description: 'Gentle and affectionate',
        careSuggestions: 'Indoor play and regular grooming',
        animalType: 'Cat',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 19,
        name: 'Buster',
        breed: 'Shih Tzu',
        age: 5,
        gender: 'Male',
        ownerId: 10,
        description: 'Friendly and alert',
        careSuggestions: 'Regular grooming and moderate exercise',
        animalType: 'Dog',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 20,
        name: 'Sophie',
        breed: 'Russian Blue',
        age: 3,
        gender: 'Female',
        ownerId: 10,
        description: 'Calm and gentle',
        careSuggestions: 'Quiet environment and gentle play',
        animalType: 'Cat',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664299749481-ac8dc8b49754?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
];
const tasks =  [
    {
        "id": "1",
        "completed": true,
        "title": "Complete Angular tutorial",
        "description": "Finish the official Angular documentation tutorial.",
        "priority": "high",
        "dueDate": "2024-11-01"
    },
    {
        "id": "2",
        "completed": true,
        "title": "Write unit tests for API",
        "description": "Ensure all backend endpoints have proper test coverage.",
        "priority": "medium",
        "dueDate": "2024-11-05"
    },
    {
        "id": "4",
        "completed": true,
        "title": "Refactor user authentication",
        "description": "Implement JWT tokens and improve security protocols.",
        "priority": "high",
        "dueDate": "2024-11-08"
    },
    {
        "id": "5",
        "completed": true,
        "title": "Design new landing page",
        "description": "Create a modern, responsive design for the homepage.",
        "priority": "medium",
        "dueDate": "2024-10-30"
    },
    {
        "id": "6",
        "completed": false,
        "title": "Set up CI/CD pipeline",
        "description": "Automate testing and deployment with GitHub Actions.",
        "priority": "high",
        "dueDate": "2024-11-07"
    },
    {
        "id": "7",
        "completed": false,
        "title": "Write blog post on web accessibility",
        "description": "Discuss best practices for making websites accessible.",
        "priority": "medium",
        "dueDate": "2024-11-15"
    },
    {
        "id": "8",
        "completed": false,
        "title": "Optimize image assets",
        "description": "Reduce image sizes for faster page loading times.",
        "priority": "low",
        "dueDate": "2024-11-10"
    },
    {
        "id": "9",
        "completed": true,
        "title": "Prepare client presentation",
        "description": "Finalize slides for the quarterly progress update.",
        "priority": "high",
        "dueDate": "2024-10-28"
    },
    {
        "id": "10",
        "completed": false,
        "title": "Research on AI integration",
        "description": "Explore possibilities of using AI for data analysis.",
        "priority": "medium",
        "dueDate": "2024-11-20"
    },
    {
        "id": "11",
        "completed": false,
        "title": "Document API endpoints",
        "description": "Write detailed documentation for all available APIs.",
        "priority": "low",
        "dueDate": "2024-11-18"
    },
    {
        "id": "12",
        "completed": true,
        "title": "Fix critical bugs in payment gateway",
        "description": "Resolve issues causing failed transactions.",
        "priority": "high",
        "dueDate": "2024-10-29"
    },
    {
        "id": "13",
        "completed": false,
        "title": "Create test cases for frontend",
        "description": "Cover edge cases in user interface components.",
        "priority": "medium",
        "dueDate": "2024-11-06"
    },
    {
        "id": "14",
        "completed": false,
        "title": "Conduct usability testing",
        "description": "Gather feedback from users on the beta version.",
        "priority": "medium",
        "dueDate": "2024-11-12"
    },
    {
        "id": "15",
        "completed": true,
        "title": "Write server migration plan",
        "description": "Plan migration to cloud infrastructure.",
        "priority": "low",
        "dueDate": "2024-10-25"
    },
    {
        "id": "16",
        "completed": false,
        "title": "Review pull requests",
        "description": "Ensure code quality and consistency.",
        "priority": "low",
        "dueDate": "2024-11-04"
    },
    {
        "id": "17",
        "completed": false,
        "title": "Upgrade database schema",
        "description": "Introduce support for new application features.",
        "priority": "high",
        "dueDate": "2024-11-11"
    },
    {
        "id": "18",
        "completed": true,
        "title": "Conduct team training session",
        "description": "Introduce team members to the new framework.",
        "priority": "medium",
        "dueDate": "2024-10-27"
    },
    {
        "id": "19",
        "completed": false,
        "title": "Improve caching mechanisms",
        "description": "Enhance performance by optimizing caching layers.",
        "priority": "high",
        "dueDate": "2024-11-09"
    },
    {
        "id": "20",
        "completed": false,
        "title": "Finalize project timeline",
        "description": "Define key milestones for the next quarter.",
        "priority": "medium",
        "dueDate": "2024-11-13"
    },
    {
        "id": "21",
        "completed": false,
        "title": "Update application logo",
        "description": "Redesign the logo to align with branding.",
        "priority": "low",
        "dueDate": "2024-11-14"
    }
];

const generateTokens = (user) => {
    const accessToken = jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
    }, SECRET_KEY, {expiresIn: '15m'});
    const refreshToken = jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
    // }, SECRET_KEY, {expiresIn: '2m'});
    }, SECRET_KEY, {expiresIn: '7d'});

    const accessTokenExpiresIn = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const cookieAccessTokenExpiresIn = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes
    const refreshTokenExpiresIn = new Date(Date.now() + 7 * 24 * 60 * 1000); // 7 days
    const cookieRefreshTokenExpiresIn = new Date(Date.now() + 8 * 24 * 60 * 1000); // 8 days

    return {accessToken, refreshToken, accessTokenExpiresIn, cookieAccessTokenExpiresIn, refreshTokenExpiresIn, cookieRefreshTokenExpiresIn};
};

const tokenBlacklist = new Set();

// Function to generate CSRF token
const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Middleware to set CSRF token in cookies
//add new CSRF token per session
api.use((req, res, next) => {
    console.log('req.cookies.csrfToken:', req.cookies.csrfToken);
    let csrfToken = req.cookies.csrfToken;

    if (!csrfToken && !req.session.csrfToken) {
        csrfToken = generateCsrfToken();
        req.session.csrfToken = csrfToken;
        res.cookie('csrfToken', csrfToken, { httpOnly: false, secure: false });
        console.log('Generated new CSRF Token:', csrfToken); // Log the generated CSRF token
    } else {
        console.log('Reusing existing CSRF Token:', csrfToken); // Log the existing CSRF token
    }
    req.csrfToken = csrfToken;
     req.csrfToken = req.session.csrfToken;
    next();
});

//add new CSRF token per request
/!*api.use((req, res, next) => {
    const csrfToken = generateCsrfToken();
    req.session.csrfToken = csrfToken;
    res.cookie('csrfToken', csrfToken, { httpOnly: false, secure: false });
    req.csrfToken = csrfToken;
    req.csrfToken = req.session.csrfToken;
    next();
});*!/

// Middleware to validate CSRF token
const validateCsrfToken = (req, res, next) => {
    const csrfToken = req.cookies.csrfToken;
    const csrfTokenFromHeader = req.headers['x-csrf-token'];

    const csrfTokenFromSession = req.session.csrfToken;
    console.log('cookies.csrfToken: ', csrfToken);
    console.log('session.csrfToken: ', csrfTokenFromSession);
    if ((csrfToken || csrfTokenFromHeader) !== csrfTokenFromSession) {
        console.log('Invalid CSRF Token'); // Log invalid token case
        return res.status(403).send('Invalid CSRF token');
    }
    console.log('CSRF Token is valid'); // Log valid token case
    next();
};

// Apply CSRF validation middleware globally
// api.use(validateCsrfToken);

// Middleware to validate access token and refresh if expired
const validateAccessToken = async (req, res, next) => {
    const token = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;
    if (!token){
        return res.status(401).json({ message: 'Access token is missing' });
    }

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) {
            // If access token is expired, try to refresh it
            if (err.name === 'TokenExpiredError') {
                const refreshToken = req.cookies.refreshToken;
                if (!refreshToken) {
                    logout(req, res);
                    return res.status(401).json({ message: 'Refresh token is missing' });
                }

                try {
                    const decodedRefreshToken = jwt.verify(refreshToken, SECRET_KEY);
                    const user = users.find((u) => u.id === decodedRefreshToken.id);
                    if (user) {
                        const { accessToken, cookieAccessTokenExpiresIn } = generateTokens(user);
                        res.cookie('accessToken', accessToken, {
                            httpOnly: true,
                            secure: true, // Use secure cookies in production
                            sameSite: 'Strict', // Adjust based on your needs
                            expires: cookieAccessTokenExpiresIn,
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

router.post('/signin', validateCsrfToken, (req, res) => {

    const {email, password} = req.body;
    const user = users.find((u) => u.email === email && u.password === password);

    if (user) {
        const {accessToken, refreshToken, cookieAccessTokenExpiresIn, cookieRefreshTokenExpiresIn} = generateTokens(user);
        req.session.accessToken = accessToken;
        req.session.refreshToken = refreshToken;
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true, // Use secure cookies in production
            sameSite: 'Strict', // Adjust based on your needs
            expires: cookieAccessTokenExpiresIn,
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true, // Use secure cookies in production
            sameSite: 'Strict', // Adjust based on your needs
            expires: cookieRefreshTokenExpiresIn,
        });
        res.status(200).json({user});
    } else {
        res.status(401).json({message: 'Invalid email or password'});
    }
});

router.get('/csrf-token', (req, res) => {
    console.log('Initial Fetching CSRF Token:', req.csrfToken); // Log the CSRF token being fetched
    res.json({csrfToken: req.csrfToken});
});

router.post('/signup', validateCsrfToken,(req, res) => {

    const {username, email, password, passwordConfirmation} = req.body;
    if (password !== passwordConfirmation) {
        return res.status(400).json({message: 'Passwords do not match'});
    }
    const userExists = users.some((u) => u.email === email);

    if (userExists) {
        res.status(409).json({message: 'User already exists'});
    } else {
        const newUser = {id: users.length + 1, username, email, password, role: 'user'};
        users.push(newUser);
        const {accessToken, refreshToken, cookieAccessTokenExpiresIn, cookieRefreshTokenExpiresIn} = generateTokens(user);
        req.session.accessToken = accessToken;
        req.session.refreshToken = refreshToken;

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true, // Use secure cookies in production
            sameSite: 'Strict', // Adjust based on your needs
            expires: cookieAccessTokenExpiresIn,
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true, // Use secure cookies in production
            sameSite: 'Strict', // Adjust based on your needs
            expires: cookieRefreshTokenExpiresIn,
        });
        res.status(201).json({user: newUser, csrfToken: req.csrfToken()});
    }
});

router.post('/logout', validateCsrfToken,validateAccessToken, (req, res) => {
    logout(req, res);
    res.status(200).json({ message: 'User logged out successfully' });
});

router.get('/user', validateCsrfToken,validateAccessToken, (req, res) => {

    const token = req.cookies.accessToken;
    if (tokenBlacklist.has(token)) {
        return res.status(401).json({message: 'Token has been invalidated'});
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = users.find((u) => u.id === decoded.id);
        if (user) {
            res.status(200).json({user});
        } else {
            res.status(404).json({message: 'User not found'});
        }
    } catch (error) {
        res.status(401).json({message: 'Invalid token'});
    }
});

router.post('/refresh', validateCsrfToken, (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        logout(req, res);
        return res.status(401).json({ message: 'Refresh token is missing' });
    }

    try {
        const decoded = jwt.verify(refreshToken, '3cN5xXHOsKhB7qxoDzWQcEMrtR0DZ6leTrkyHYOqIro=');
        const user = users.find((u) => u.id === decoded.id);
        if (user) {
            const {accessToken, refreshToken, cookieAccessTokenExpiresIn, cookieRefreshTokenExpiresIn} = generateTokens(user);

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: true, // Use secure cookies in production
                sameSite: 'Strict', // Adjust based on your needs
                expires: cookieAccessTokenExpiresIn,
            });
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true, // Use secure cookies in production
                sameSite: 'Strict', // Adjust based on your needs
                expires: cookieRefreshTokenExpiresIn,
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

router.get('/check', validateCsrfToken,(req, res) => {
    res.status(200).json({message: 'All working'});
});

router.get('/users', validateCsrfToken, validateAccessToken, (req, res) => {
    res.status(200).json({users});
});

// Add a new pet
router.post('/pet', validateCsrfToken, validateAccessToken, (req, res) => {
    const {name, breed, age, gender, ownerId, description, careSuggestions, animalType, imageUrl} = req.body;
    const newPet = {
        id: pets.length + 1,
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
    pets.push(newPet);
    res.status(201).json({pet: newPet});
});

// Get all pets
router.get('/pets', validateCsrfToken, validateAccessToken, (req, res) => {

    res.status(200).json({pets});
});

// Get a pet by ID
router.get('/pet/:id', validateCsrfToken, validateAccessToken, (req, res) => {

    const petId = parseInt(req.params.id, 10);
    const pet = pets.find((p) => p.id === petId);
    if (pet) {
        res.status(200).json({pet});
    } else {
        res.status(404).json({message: 'Pet not found'});
    }
});

// Update a pet by ID
router.put('/pet/:id', validateCsrfToken, validateAccessToken, (req, res) => {

    const petId = parseInt(req.params.id, 10);
    const {name, breed, age, gender, ownerId, description, careSuggestions, animalType, imageUrl} = req.body;
    const petIndex = pets.findIndex((p) => p.id === petId);
    if (petIndex !== -1) {
        pets[petIndex] = {
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
        res.status(200).json({pet: pets[petIndex]});
    } else {
        res.status(404).json({message: 'Pet not found'});
    }
});

// Delete a pet by ID
router.delete('/pet/:id', validateCsrfToken, validateAccessToken, (req, res) => {

    const petId = parseInt(req.params.id, 10);
    const petIndex = pets.findIndex((p) => p.id === petId);
    if (petIndex !== -1) {
        const deletedPet = pets.splice(petIndex, 1);
        res.status(200).json({pet: deletedPet[0]});
    } else {
        res.status(404).json({message: 'Pet not found'});
    }
});

api.use("/api/", router);

const server = http.createServer(api);

server.listen(port, () => {
    console.log('Server listening on port: ' + port);
});

function logout(req, res){
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('csrfToken');
    req.session.csrfToken = null;
}*/
