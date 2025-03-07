import serverless from "serverless-http";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import cors from "cors";
import express, {Router} from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from 'bcryptjs';
import helmet from 'helmet';

dotenv.config();

const api = express();
const router = Router();
const port = process.env.PORT || 8080;
api.set("port", port);

const tokenBlacklist = new Set();

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    expires: new Date(Date.now() + 15 * 60 * 1000)
};

const allowedOrigins = [
    ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
    ...(process.env.NODE_ENV === 'development'
        ? ['https://localhost:3000', 'http://127.0.0.1:3000']
        : [])
];

// Middleware setup
if (process.env.NODE_ENV === 'development') {
    api.use(
        helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false
        })
    );
} else {
    api.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "trusted-cdn.example.com"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "cdn.example.com"],
                    connectSrc: ["'self'", "api.example.com"]
                }
            },
            hsts: {
                maxAge: 63072000,
                includeSubDomains: true,
                preload: true
            },
            referrerPolicy: {policy: 'same-origin'}
        })
    );
}

api.use(express.json());
api.use(express.urlencoded({ extended: true }));
api.use(cookieParser());
api.use(morgan("combined"));
// ALLOW ALL ORIGINS[all request from any domain]
api.use(
    cors({
        origin: (origin, callback) => {
            // Allow all origins but require HTTPS in production
            if (process.env.NODE_ENV === 'production' && origin && !origin.startsWith('https://')) {
                return callback(new Error('HTTPS required'));
            }
            callback(null, true);
        },
        credentials: true,
        optionsSuccessStatus: 200
    })
);
// ALL ONLY SPECIFIED domain to connect
/*api.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g., same-origin or non-browser clients)
            if (!origin) {
                return callback(null, process.env.NODE_ENV === 'development');
            }

            // Validate protocol in production
            if (process.env.NODE_ENV === 'production' && !origin.startsWith('https://')) {
                return callback(new Error('HTTPS required'));
            }

            const isAllowed = allowedOrigins.some(allowedOrigin => {
                if (allowedOrigin.startsWith('*.')) {
                    const domain = allowedOrigin.replace('*.', '');
                    return origin.endsWith(domain);
                }
                return origin === allowedOrigin;
            });

            if (isAllowed) {
                callback(null, true);
            } else {
                callback(new Error(`Origin ${origin} not allowed`));
            }
        },
        credentials: true,
        optionsSuccessStatus: 200
    })
);*/
api.use(
    session({
        secret: process.env.SECRET_KEY,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            // secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax" // Adjusted here
        }
    })
);
api.use("/api", router);
api.use(express.static("public"));

// if (process.env.NODE_ENV === 'production') {
//     api.use((req, res, next) => {
//         const userAgent = req.headers['user-agent'];
//         const blockedClients = [
//             'PostmanRuntime',
//             'curl',
//             'Insomnia',
//             'Thunder Client'
//         ];
//
//         if (blockedClients.some(client => userAgent?.includes(client))) {
//             return res.status(403).json({
//                 error: "API access not allowed through client tools",
//                 code: "client_tool_blocked"
//             });
//         }
//
//         next();
//     });
// }

const generateCsrfToken = () => crypto.randomBytes(32).toString("hex");

api.use((req, res, next) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = generateCsrfToken();
    }
    next();
});

// api.use((req, res, next) => {
//     if (Buffer.isBuffer(req.body)) {
//         req.body = JSON.parse(req.body.toString());
//     }
//     next();
// });

const authLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
    handler: (req, res) => {
        res.status(429).json({
            error: "Too many requests",
            code: "rate_limit_exceeded"
        });
    }
});

const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    handler: (req, res) => {
        res.status(429).json({
            error: "Too many requests",
            code: "rate_limit_exceeded"
        });
    }
});

const logSecurityEvent = (req, eventType) => {
    console.log(`Security Event: ${eventType}`, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        endpoint: req.originalUrl,
        timestamp: new Date().toISOString()
    });
};

const validateCsrfToken = (req, res, next) => {
    const csrfToken = req.headers["x-csrf-token"];

    if (!csrfToken || !req.session.csrfToken) {
        logSecurityEvent(req, "CSRF_TOKEN_MISSING");
        req.session.destroy();
        return res.status(403).json({
            error: "Security validation failed",
            code: "security_validation_error"
        });
    }

    if (!crypto.timingSafeEqual(
        Buffer.from(csrfToken),
        Buffer.from(req.session.csrfToken)
    )) {
        logSecurityEvent(req, "CSRF_TOKEN_MISMATCH");
        req.session.destroy();
        return res.status(403).json({
            error: "Security validation failed",
            code: "security_validation_error"
        });
    }
    next();
};

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        {id: user.id, email: user.email, role: user.role},
        process.env.SECRET_KEY,
        {expiresIn: "15m"}
    );

    const refreshToken = jwt.sign(
        {id: user.id},
        process.env.SECRET_KEY,
        {expiresIn: "7d"}
    );

    return {
        accessToken,
        refreshToken,
        cookieOptions: cookieOptions
    };
};

const validateAccessToken = (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(401).json({
            error: "Authentication required",
            code: "missing_access_token"
        });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return handleTokenRefresh(req, res, next);
            }
            return res.status(401).json({
                error: "Invalid token",
                code: "invalid_access_token"
            });
        }
        req.user = decoded;
        next();
    });
};

const handleTokenRefresh = (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            error: "Session expired",
            code: "missing_refresh_token"
        });
    }

    jwt.verify(refreshToken, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                error: "Session expired",
                code: "invalid_refresh_token"
            });
        }

        const user = users.find(u => u.id === decoded.id);
        if (!user) {
            return res.status(401).json({
                error: "User not found",
                code: "invalid_user_session"
            });
        }

        const {accessToken, cookieOptions} = generateTokens(user);
        res.cookie("accessToken", accessToken, cookieOptions);
        next();
    });
};

const validatePasswordComplexity = (password) => {
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!complexityRegex.test(password)) {
        throw new Error('Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character');
    }
};

router.use('/signin', authLimiter);
router.use('/signup', authLimiter);
router.use("/api", apiLimiter);

// In-memory databases
const users = [
    {
        "id": 1,
        "names": "John Doe",
        "email": "user@example.com",
        "address": "147 Nairobi Kenya",
        "password": bcrypt.hashSync("password@123", 10),
        "role": "user",
        "date": 7845555
    },
    {
        "id": 2,
        "names": "Mary Ann",
        "email": "user2@example.com",
        "address": "10 Mombasa Kenya",
        "password": bcrypt.hashSync("password@123", 10),
        "role": "admin",
        "date": 7845555
    }
];

const tasks = [
    {
        "id": 1,
        "completed": false,
        "title": "Complete Angular tutorial",
        "description": "Finish the official Angular documentation tutorial.",
        "priority": "high",
        "dueDate": "2024-11-01"
    },
    {
        "id": 2,
        "completed": false,
        "title": "Task 2: Write unit tests for API",
        "description": "Description for task 2.",
        "priority": "medium",
        "dueDate": "2024-11-02"
    },
    {
        "id": 3,
        "completed": true,
        "title": "Task 3: Refactor user authentication",
        "description": "Description for task 3.",
        "priority": "low",
        "dueDate": "2024-11-03"
    },
    {
        "id": 4,
        "completed": false,
        "title": "Task 4: Design new landing page",
        "description": "Description for task 4.",
        "priority": "high",
        "dueDate": "2024-11-04"
    },
    {
        "id": 5,
        "completed": true,
        "title": "Task 5: Set up CI/CD pipeline",
        "description": "Description for task 5.",
        "priority": "medium",
        "dueDate": "2024-11-05"
    },
    {
        "id": 6,
        "completed": false,
        "title": "Task 6: Write blog post on web accessibility",
        "description": "Description for task 6.",
        "priority": "low",
        "dueDate": "2024-11-06"
    },
    {
        "id": 7,
        "completed": true,
        "title": "Task 7: Optimize image assets",
        "description": "Description for task 7.",
        "priority": "high",
        "dueDate": "2024-11-07"
    },
    {
        "id": 8,
        "completed": false,
        "title": "Task 8: Prepare client presentation",
        "description": "Description for task 8.",
        "priority": "medium",
        "dueDate": "2024-11-08"
    },
    {
        "id": 9,
        "completed": true,
        "title": "Task 9: Research on AI integration",
        "description": "Description for task 9.",
        "priority": "low",
        "dueDate": "2024-11-09"
    },
    {
        "id": 10,
        "completed": false,
        "title": "Task 10: Document API endpoints",
        "description": "Description for task 10.",
        "priority": "high",
        "dueDate": "2024-11-10"
    },
    {
        "id": 11,
        "completed": true,
        "title": "Task 11: Fix critical bugs in payment gateway",
        "description": "Description for task 11.",
        "priority": "medium",
        "dueDate": "2024-11-11"
    },
    {
        "id": 12,
        "completed": false,
        "title": "Task 12: Create test cases for frontend",
        "description": "Description for task 12.",
        "priority": "low",
        "dueDate": "2024-11-12"
    },
    {
        "id": 13,
        "completed": true,
        "title": "Task 13: Conduct usability testing",
        "description": "Description for task 13.",
        "priority": "high",
        "dueDate": "2024-11-13"
    },
    {
        "id": 14,
        "completed": false,
        "title": "Task 14: Write server migration plan",
        "description": "Description for task 14.",
        "priority": "medium",
        "dueDate": "2024-11-14"
    },
    {
        "id": 15,
        "completed": true,
        "title": "Task 15: Review pull requests",
        "description": "Description for task 15.",
        "priority": "low",
        "dueDate": "2024-11-15"
    },
    {
        "id": 16,
        "completed": false,
        "title": "Task 16: Upgrade database schema",
        "description": "Description for task 16.",
        "priority": "high",
        "dueDate": "2024-11-16"
    },
    {
        "id": 17,
        "completed": true,
        "title": "Task 17: Conduct team training session",
        "description": "Description for task 17.",
        "priority": "medium",
        "dueDate": "2024-11-17"
    },
    {
        "id": 18,
        "completed": false,
        "title": "Task 18: Improve caching mechanisms",
        "description": "Description for task 18.",
        "priority": "low",
        "dueDate": "2024-11-18"
    },
    {
        "id": 19,
        "completed": true,
        "title": "Task 19: Finalize project timeline",
        "description": "Description for task 19.",
        "priority": "high",
        "dueDate": "2024-11-19"
    },
    {
        "id": 20,
        "completed": false,
        "title": "Task 20: Update documentation",
        "description": "Description for task 20.",
        "priority": "medium",
        "dueDate": "2024-11-20"
    },
    {
        "id": 21,
        "completed": true,
        "title": "Task 21: Optimize database queries",
        "description": "Description for task 21.",
        "priority": "low",
        "dueDate": "2024-11-21"
    },
    {
        "id": 22,
        "completed": false,
        "title": "Task 22: Implement caching strategy",
        "description": "Description for task 22.",
        "priority": "high",
        "dueDate": "2024-11-22"
    },
    {
        "id": 23,
        "completed": true,
        "title": "Task 23: Code review session",
        "description": "Description for task 23.",
        "priority": "medium",
        "dueDate": "2024-11-23"
    },
    {
        "id": 24,
        "completed": false,
        "title": "Task 24: Update CI configuration",
        "description": "Description for task 24.",
        "priority": "low",
        "dueDate": "2024-11-24"
    },
    {
        "id": 25,
        "completed": true,
        "title": "Task 25: Fix UI bugs",
        "description": "Description for task 25.",
        "priority": "high",
        "dueDate": "2024-11-25"
    },
    {
        "id": 26,
        "completed": false,
        "title": "Task 26: Refactor legacy code",
        "description": "Description for task 26.",
        "priority": "medium",
        "dueDate": "2024-11-26"
    },
    {
        "id": 27,
        "completed": true,
        "title": "Task 27: Integrate third-party API",
        "description": "Description for task 27.",
        "priority": "low",
        "dueDate": "2024-11-27"
    },
    {
        "id": 28,
        "completed": false,
        "title": "Task 28: Write end-to-end tests",
        "description": "Description for task 28.",
        "priority": "high",
        "dueDate": "2024-11-28"
    },
    {
        "id": 29,
        "completed": true,
        "title": "Task 29: Improve error handling",
        "description": "Description for task 29.",
        "priority": "medium",
        "dueDate": "2024-11-29"
    },
    {
        "id": 30,
        "completed": false,
        "title": "Task 30: Update dependencies",
        "description": "Description for task 30.",
        "priority": "low",
        "dueDate": "2024-11-30"
    },
    {
        "id": 31,
        "completed": true,
        "title": "Task 31: Optimize assets",
        "description": "Description for task 31.",
        "priority": "high",
        "dueDate": "2024-11-31"
    },
    {
        "id": 32,
        "completed": false,
        "title": "Task 32: Improve security measures",
        "description": "Description for task 32.",
        "priority": "medium",
        "dueDate": "2024-11-32"
    },
    {
        "id": 33,
        "completed": true,
        "title": "Task 33: Add new features",
        "description": "Description for task 33.",
        "priority": "low",
        "dueDate": "2024-11-33"
    },
    {
        "id": 34,
        "completed": false,
        "title": "Task 34: Monitor performance",
        "description": "Description for task 34.",
        "priority": "high",
        "dueDate": "2024-11-34"
    },
    {
        "id": 35,
        "completed": true,
        "title": "Task 35: Refactor codebase",
        "description": "Description for task 35.",
        "priority": "medium",
        "dueDate": "2024-11-35"
    },
    {
        "id": 36,
        "completed": false,
        "title": "Task 36: Enhance UI design",
        "description": "Description for task 36.",
        "priority": "low",
        "dueDate": "2024-11-36"
    },
    {
        "id": 37,
        "completed": true,
        "title": "Task 37: Optimize build process",
        "description": "Description for task 37.",
        "priority": "high",
        "dueDate": "2024-11-37"
    },
    {
        "id": 38,
        "completed": false,
        "title": "Task 38: Update project roadmap",
        "description": "Description for task 38.",
        "priority": "medium",
        "dueDate": "2024-11-38"
    },
    {
        "id": 39,
        "completed": true,
        "title": "Task 39: Implement new API endpoints",
        "description": "Description for task 39.",
        "priority": "low",
        "dueDate": "2024-11-39"
    },
    {
        "id": 40,
        "completed": false,
        "title": "Task 40: Conduct stakeholder meeting",
        "description": "Description for task 40.",
        "priority": "high",
        "dueDate": "2024-11-40"
    },
    {
        "id": 41,
        "completed": true,
        "title": "Task 41: Deploy to staging",
        "description": "Description for task 41.",
        "priority": "medium",
        "dueDate": "2024-11-41"
    },
    {
        "id": 42,
        "completed": false,
        "title": "Task 42: Perform code audit",
        "description": "Description for task 42.",
        "priority": "low",
        "dueDate": "2024-11-42"
    },
    {
        "id": 43,
        "completed": true,
        "title": "Task 43: Update system architecture",
        "description": "Description for task 43.",
        "priority": "high",
        "dueDate": "2024-11-43"
    },
    {
        "id": 44,
        "completed": false,
        "title": "Task 44: Research new technologies",
        "description": "Description for task 44.",
        "priority": "medium",
        "dueDate": "2024-11-44"
    },
    {
        "id": 45,
        "completed": true,
        "title": "Task 45: Conduct market analysis",
        "description": "Description for task 45.",
        "priority": "low",
        "dueDate": "2024-11-45"
    },
    {
        "id": 46,
        "completed": false,
        "title": "Task 46: Improve user onboarding",
        "description": "Description for task 46.",
        "priority": "high",
        "dueDate": "2024-11-46"
    },
    {
        "id": 47,
        "completed": true,
        "title": "Task 47: Update testing strategy",
        "description": "Description for task 47.",
        "priority": "medium",
        "dueDate": "2024-11-47"
    },
    {
        "id": 48,
        "completed": false,
        "title": "Task 48: Finalize release notes",
        "description": "Description for task 48.",
        "priority": "low",
        "dueDate": "2024-11-48"
    },
    {
        "id": 49,
        "completed": true,
        "title": "Task 49: Optimize SEO",
        "description": "Description for task 49.",
        "priority": "high",
        "dueDate": "2024-11-49"
    },
    {
        "id": 50,
        "completed": false,
        "title": "Task 50: Review analytics data",
        "description": "Description for task 50.",
        "priority": "medium",
        "dueDate": "2024-11-50"
    }
];

const pets = [
    {
        "id": 1,
        "name": "Pet 1",
        "breed": "Breed 1",
        "age": 2,
        "gender": "Male",
        "ownerId": 2,
        "description": "Description for pet 1.",
        "careSuggestions": "Care suggestions for pet 1.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet1.jpg"
    },
    {
        "id": 2,
        "name": "Pet 2",
        "breed": "Breed 2",
        "age": 3,
        "gender": "Female",
        "ownerId": 3,
        "description": "Description for pet 2.",
        "careSuggestions": "Care suggestions for pet 2.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet2.jpg"
    },
    {
        "id": 3,
        "name": "Pet 3",
        "breed": "Breed 3",
        "age": 4,
        "gender": "Male",
        "ownerId": 4,
        "description": "Description for pet 3.",
        "careSuggestions": "Care suggestions for pet 3.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet3.jpg"
    },
    {
        "id": 4,
        "name": "Pet 4",
        "breed": "Breed 4",
        "age": 5,
        "gender": "Female",
        "ownerId": 5,
        "description": "Description for pet 4.",
        "careSuggestions": "Care suggestions for pet 4.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet4.jpg"
    },
    {
        "id": 5,
        "name": "Pet 5",
        "breed": "Breed 5",
        "age": 6,
        "gender": "Male",
        "ownerId": 1,
        "description": "Description for pet 5.",
        "careSuggestions": "Care suggestions for pet 5.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet5.jpg"
    },
    {
        "id": 6,
        "name": "Pet 6",
        "breed": "Breed 6",
        "age": 7,
        "gender": "Female",
        "ownerId": 2,
        "description": "Description for pet 6.",
        "careSuggestions": "Care suggestions for pet 6.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet6.jpg"
    },
    {
        "id": 7,
        "name": "Pet 7",
        "breed": "Breed 7",
        "age": 8,
        "gender": "Male",
        "ownerId": 3,
        "description": "Description for pet 7.",
        "careSuggestions": "Care suggestions for pet 7.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet7.jpg"
    },
    {
        "id": 8,
        "name": "Pet 8",
        "breed": "Breed 8",
        "age": 9,
        "gender": "Female",
        "ownerId": 4,
        "description": "Description for pet 8.",
        "careSuggestions": "Care suggestions for pet 8.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet8.jpg"
    },
    {
        "id": 9,
        "name": "Pet 9",
        "breed": "Breed 9",
        "age": 10,
        "gender": "Male",
        "ownerId": 5,
        "description": "Description for pet 9.",
        "careSuggestions": "Care suggestions for pet 9.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet9.jpg"
    },
    {
        "id": 10,
        "name": "Pet 10",
        "breed": "Breed 10",
        "age": 1,
        "gender": "Female",
        "ownerId": 1,
        "description": "Description for pet 10.",
        "careSuggestions": "Care suggestions for pet 10.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet10.jpg"
    },
    {
        "id": 11,
        "name": "Pet 11",
        "breed": "Breed 11",
        "age": 2,
        "gender": "Male",
        "ownerId": 2,
        "description": "Description for pet 11.",
        "careSuggestions": "Care suggestions for pet 11.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet11.jpg"
    },
    {
        "id": 12,
        "name": "Pet 12",
        "breed": "Breed 12",
        "age": 3,
        "gender": "Female",
        "ownerId": 3,
        "description": "Description for pet 12.",
        "careSuggestions": "Care suggestions for pet 12.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet12.jpg"
    },
    {
        "id": 13,
        "name": "Pet 13",
        "breed": "Breed 13",
        "age": 4,
        "gender": "Male",
        "ownerId": 4,
        "description": "Description for pet 13.",
        "careSuggestions": "Care suggestions for pet 13.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet13.jpg"
    },
    {
        "id": 14,
        "name": "Pet 14",
        "breed": "Breed 14",
        "age": 5,
        "gender": "Female",
        "ownerId": 5,
        "description": "Description for pet 14.",
        "careSuggestions": "Care suggestions for pet 14.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet14.jpg"
    },
    {
        "id": 15,
        "name": "Pet 15",
        "breed": "Breed 15",
        "age": 6,
        "gender": "Male",
        "ownerId": 1,
        "description": "Description for pet 15.",
        "careSuggestions": "Care suggestions for pet 15.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet15.jpg"
    },
    {
        "id": 16,
        "name": "Pet 16",
        "breed": "Breed 16",
        "age": 7,
        "gender": "Female",
        "ownerId": 2,
        "description": "Description for pet 16.",
        "careSuggestions": "Care suggestions for pet 16.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet16.jpg"
    },
    {
        "id": 17,
        "name": "Pet 17",
        "breed": "Breed 17",
        "age": 8,
        "gender": "Male",
        "ownerId": 3,
        "description": "Description for pet 17.",
        "careSuggestions": "Care suggestions for pet 17.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet17.jpg"
    },
    {
        "id": 18,
        "name": "Pet 18",
        "breed": "Breed 18",
        "age": 9,
        "gender": "Female",
        "ownerId": 4,
        "description": "Description for pet 18.",
        "careSuggestions": "Care suggestions for pet 18.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet18.jpg"
    },
    {
        "id": 19,
        "name": "Pet 19",
        "breed": "Breed 19",
        "age": 10,
        "gender": "Male",
        "ownerId": 5,
        "description": "Description for pet 19.",
        "careSuggestions": "Care suggestions for pet 19.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet19.jpg"
    },
    {
        "id": 20,
        "name": "Pet 20",
        "breed": "Breed 20",
        "age": 1,
        "gender": "Female",
        "ownerId": 1,
        "description": "Description for pet 20.",
        "careSuggestions": "Care suggestions for pet 20.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet20.jpg"
    },
    {
        "id": 21,
        "name": "Pet 21",
        "breed": "Breed 21",
        "age": 2,
        "gender": "Male",
        "ownerId": 2,
        "description": "Description for pet 21.",
        "careSuggestions": "Care suggestions for pet 21.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet21.jpg"
    },
    {
        "id": 22,
        "name": "Pet 22",
        "breed": "Breed 22",
        "age": 3,
        "gender": "Female",
        "ownerId": 3,
        "description": "Description for pet 22.",
        "careSuggestions": "Care suggestions for pet 22.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet22.jpg"
    },
    {
        "id": 23,
        "name": "Pet 23",
        "breed": "Breed 23",
        "age": 4,
        "gender": "Male",
        "ownerId": 4,
        "description": "Description for pet 23.",
        "careSuggestions": "Care suggestions for pet 23.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet23.jpg"
    },
    {
        "id": 24,
        "name": "Pet 24",
        "breed": "Breed 24",
        "age": 5,
        "gender": "Female",
        "ownerId": 5,
        "description": "Description for pet 24.",
        "careSuggestions": "Care suggestions for pet 24.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet24.jpg"
    },
    {
        "id": 25,
        "name": "Pet 25",
        "breed": "Breed 25",
        "age": 6,
        "gender": "Male",
        "ownerId": 1,
        "description": "Description for pet 25.",
        "careSuggestions": "Care suggestions for pet 25.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet25.jpg"
    },
    {
        "id": 26,
        "name": "Pet 26",
        "breed": "Breed 26",
        "age": 7,
        "gender": "Female",
        "ownerId": 2,
        "description": "Description for pet 26.",
        "careSuggestions": "Care suggestions for pet 26.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet26.jpg"
    },
    {
        "id": 27,
        "name": "Pet 27",
        "breed": "Breed 27",
        "age": 8,
        "gender": "Male",
        "ownerId": 3,
        "description": "Description for pet 27.",
        "careSuggestions": "Care suggestions for pet 27.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet27.jpg"
    },
    {
        "id": 28,
        "name": "Pet 28",
        "breed": "Breed 28",
        "age": 9,
        "gender": "Female",
        "ownerId": 4,
        "description": "Description for pet 28.",
        "careSuggestions": "Care suggestions for pet 28.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet28.jpg"
    },
    {
        "id": 29,
        "name": "Pet 29",
        "breed": "Breed 29",
        "age": 10,
        "gender": "Male",
        "ownerId": 5,
        "description": "Description for pet 29.",
        "careSuggestions": "Care suggestions for pet 29.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet29.jpg"
    },
    {
        "id": 30,
        "name": "Pet 30",
        "breed": "Breed 30",
        "age": 1,
        "gender": "Female",
        "ownerId": 1,
        "description": "Description for pet 30.",
        "careSuggestions": "Care suggestions for pet 30.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet30.jpg"
    },
    {
        "id": 31,
        "name": "Pet 31",
        "breed": "Breed 31",
        "age": 2,
        "gender": "Male",
        "ownerId": 2,
        "description": "Description for pet 31.",
        "careSuggestions": "Care suggestions for pet 31.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet31.jpg"
    },
    {
        "id": 32,
        "name": "Pet 32",
        "breed": "Breed 32",
        "age": 3,
        "gender": "Female",
        "ownerId": 3,
        "description": "Description for pet 32.",
        "careSuggestions": "Care suggestions for pet 32.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet32.jpg"
    },
    {
        "id": 33,
        "name": "Pet 33",
        "breed": "Breed 33",
        "age": 4,
        "gender": "Male",
        "ownerId": 4,
        "description": "Description for pet 33.",
        "careSuggestions": "Care suggestions for pet 33.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet33.jpg"
    },
    {
        "id": 34,
        "name": "Pet 34",
        "breed": "Breed 34",
        "age": 5,
        "gender": "Female",
        "ownerId": 5,
        "description": "Description for pet 34.",
        "careSuggestions": "Care suggestions for pet 34.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet34.jpg"
    },
    {
        "id": 35,
        "name": "Pet 35",
        "breed": "Breed 35",
        "age": 6,
        "gender": "Male",
        "ownerId": 1,
        "description": "Description for pet 35.",
        "careSuggestions": "Care suggestions for pet 35.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet35.jpg"
    },
    {
        "id": 36,
        "name": "Pet 36",
        "breed": "Breed 36",
        "age": 7,
        "gender": "Female",
        "ownerId": 2,
        "description": "Description for pet 36.",
        "careSuggestions": "Care suggestions for pet 36.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet36.jpg"
    },
    {
        "id": 37,
        "name": "Pet 37",
        "breed": "Breed 37",
        "age": 8,
        "gender": "Male",
        "ownerId": 3,
        "description": "Description for pet 37.",
        "careSuggestions": "Care suggestions for pet 37.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet37.jpg"
    },
    {
        "id": 38,
        "name": "Pet 38",
        "breed": "Breed 38",
        "age": 9,
        "gender": "Female",
        "ownerId": 4,
        "description": "Description for pet 38.",
        "careSuggestions": "Care suggestions for pet 38.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet38.jpg"
    },
    {
        "id": 39,
        "name": "Pet 39",
        "breed": "Breed 39",
        "age": 10,
        "gender": "Male",
        "ownerId": 5,
        "description": "Description for pet 39.",
        "careSuggestions": "Care suggestions for pet 39.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet39.jpg"
    },
    {
        "id": 40,
        "name": "Pet 40",
        "breed": "Breed 40",
        "age": 1,
        "gender": "Female",
        "ownerId": 1,
        "description": "Description for pet 40.",
        "careSuggestions": "Care suggestions for pet 40.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet40.jpg"
    },
    {
        "id": 41,
        "name": "Pet 41",
        "breed": "Breed 41",
        "age": 2,
        "gender": "Male",
        "ownerId": 2,
        "description": "Description for pet 41.",
        "careSuggestions": "Care suggestions for pet 41.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet41.jpg"
    },
    {
        "id": 42,
        "name": "Pet 42",
        "breed": "Breed 42",
        "age": 3,
        "gender": "Female",
        "ownerId": 3,
        "description": "Description for pet 42.",
        "careSuggestions": "Care suggestions for pet 42.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet42.jpg"
    },
    {
        "id": 43,
        "name": "Pet 43",
        "breed": "Breed 43",
        "age": 4,
        "gender": "Male",
        "ownerId": 4,
        "description": "Description for pet 43.",
        "careSuggestions": "Care suggestions for pet 43.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet43.jpg"
    },
    {
        "id": 44,
        "name": "Pet 44",
        "breed": "Breed 44",
        "age": 5,
        "gender": "Female",
        "ownerId": 5,
        "description": "Description for pet 44.",
        "careSuggestions": "Care suggestions for pet 44.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet44.jpg"
    },
    {
        "id": 45,
        "name": "Pet 45",
        "breed": "Breed 45",
        "age": 6,
        "gender": "Male",
        "ownerId": 1,
        "description": "Description for pet 45.",
        "careSuggestions": "Care suggestions for pet 45.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet45.jpg"
    },
    {
        "id": 46,
        "name": "Pet 46",
        "breed": "Breed 46",
        "age": 7,
        "gender": "Female",
        "ownerId": 2,
        "description": "Description for pet 46.",
        "careSuggestions": "Care suggestions for pet 46.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet46.jpg"
    },
    {
        "id": 47,
        "name": "Pet 47",
        "breed": "Breed 47",
        "age": 8,
        "gender": "Male",
        "ownerId": 3,
        "description": "Description for pet 47.",
        "careSuggestions": "Care suggestions for pet 47.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet47.jpg"
    },
    {
        "id": 48,
        "name": "Pet 48",
        "breed": "Breed 48",
        "age": 9,
        "gender": "Female",
        "ownerId": 4,
        "description": "Description for pet 48.",
        "careSuggestions": "Care suggestions for pet 48.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet48.jpg"
    },
    {
        "id": 49,
        "name": "Pet 49",
        "breed": "Breed 49",
        "age": 10,
        "gender": "Male",
        "ownerId": 5,
        "description": "Description for pet 49.",
        "careSuggestions": "Care suggestions for pet 49.",
        "animalType": "Dog",
        "imageUrl": "https://example.com/pet49.jpg"
    },
    {
        "id": 50,
        "name": "Pet 50",
        "breed": "Breed 50",
        "age": 1,
        "gender": "Female",
        "ownerId": 1,
        "description": "Description for pet 50.",
        "careSuggestions": "Care suggestions for pet 50.",
        "animalType": "Cat",
        "imageUrl": "https://example.com/pet50.jpg"
    }
];

// Routes
router.get('/csrf-token', (req, res) => {
    try {
        if (!req.session.csrfToken) {
            req.session.csrfToken = generateCsrfToken();
        }

        res.json({
            csrfToken: req.session.csrfToken,
            expires: new Date(Date.now() + 3600000) // 1 hour
        });
    } catch (error) {
        res.status(500).json({
            error: "CSRF token generation failed",
            code: "csrf_failure"
        });
    }
});

router.get("/check", validateCsrfToken, (req, res) => {
    res.status(200).json({message: "All working"});
});

router.post("/signin", validateCsrfToken, (req, res) => {
    try {
        if (Buffer.isBuffer(req.body)) {
            req.body = JSON.parse(req.body.toString());
        }
        const {email, password} = req.body;
        const user = users.find(u => u.email === email);

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({
                error: `Authentication failed`,
                code: "invalid_credentials"
            });
        }

        const {accessToken, refreshToken, cookieOptions} = generateTokens(user);
        res.cookie("accessToken", accessToken, cookieOptions);
        res.cookie("refreshToken", refreshToken, {
            ...cookieOptions,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        res.json({
            user: {
                id: user.id,
                names: user.names,
                email: user.email,
                address: user.address,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to login user: " + error,
            code: "failed_to_login_user"
        });
    }
});

router.post("/signup", validateCsrfToken, (req, res) => {
    if (Buffer.isBuffer(req.body)) {
        req.body = JSON.parse(req.body.toString());
    }
    const {username, email, password, passwordConfirmation} = req.body;

    if (password !== passwordConfirmation) {
        return res.status(400).json({
            error: "Passwords do not match",
            code: "password_mismatch"
        });
    }

    try {
        validatePasswordComplexity(password);
    } catch (err) {
        return res.status(400).json({
            error: err.message,
            code: "weak_password"
        });
    }

    if (users.some(u => u.email === email)) {
        return res.status(409).json({
            error: "User already exists",
            code: "user_exists"
        });
    }

    const newUser = {
        id: users.length + 1,
        names: username,
        email,
        password: bcrypt.hashSync(password, 10),
        role: "user"
    };

    users.push(newUser);
    const {accessToken, refreshToken, cookieOptions} = generateTokens(newUser);

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    res.status(201).json({
        user: {
            id: newUser.id,
            names: newUser.names,
            email: newUser.email,
            role: newUser.role
        },
        csrfToken: req.session.csrfToken
    });
});

router.post("/logout", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        console.log(`User logout initiated:`, {
            userId: req.user.id,
            ip: req.ip,
            userAgent: req.headers["user-agent"]
        });

        logout(req, res);

        res.status(200).json({
            success: true,
            code: "logout_success",
            message: "Successfully logged out"
        });
    } catch (error) {
        console.error("Logout failed:", {
            userId: req.user?.id,
            error: error.message,
            stack: error.stack
        });

        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        res.status(500).json({
            error: "Logout failed",
            code: "logout_failure",
            message: "Could not complete logout process"
        });
    }
});

function logout(req, res) {
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    if (req.session) {
        req.session.destroy(err => {
            if (err) console.error("Session destruction error:", err);
        });
    }

    if (req.cookies.accessToken) {
        tokenBlacklist.add(req.cookies.accessToken);
    }
    if (req.cookies.refreshToken) {
        tokenBlacklist.add(req.cookies.refreshToken);
    }
}

router.get("/user/:id", validateCsrfToken,validateAccessToken, (req, res) => {
    try {
        const user = users.find((u) => u.id === Number(req.params.id));

        if (!user) {
            return res.status(404).json({
                error: "User not found",
                code: "user_not_found"
            });
        }

        const userData = {
            id: user.id,
            names: user.names,
            email: user.email,
            role: user.role,
            address: user.address
        };

        res.status(200).json({user: userData});
    } catch (error) {
        res.status(500).json({
            error: "Failed to retrieve user data",
            code: "user_data_retrieval_failed"
        });
    }
});

router.post("/refresh", validateCsrfToken, (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            logout(req, res);
            return res.status(401).json({
                error: "Session expired",
                code: "missing_refresh_token"
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.SECRET_KEY);
        const user = users.find((u) => u.id === decoded.id);

        if (!user) {
            logout(req, res);
            return res.status(401).json({
                error: "Invalid session",
                code: "invalid_user_session"
            });
        }

        const {accessToken, refreshToken: newRefreshToken, cookieOptions} = generateTokens(user);

        res.cookie("accessToken", accessToken, cookieOptions);
        res.cookie("refreshToken", newRefreshToken, {
            ...cookieOptions,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        res.status(200).json({
            csrfToken: req.session.csrfToken,
            accessTokenExpires: cookieOptions.expires
        });
    } catch (error) {
        logout(req, res);

        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                error: "Session expired",
                code: "refresh_token_expired"
            });
        }

        res.status(401).json({
            error: "Invalid refresh token",
            code: "invalid_refresh_token"
        });
    }
});

// ======================
// Pets Routes
// ======================
router.post("/pet", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        if (Buffer.isBuffer(req.body)) {
            req.body = JSON.parse(req.body.toString());
        }
        const {name, breed, age, gender, ownerId, description, careSuggestions, animalType} = req.body;

        if (!name || !animalType) {
            return res.status(400).json({
                error: "Missing required fields",
                code: "missing_required_fields"
            });
        }

        const newPet = {
            id: pets.length ? Math.max(...pets.map(p => p.id)) + 1 : 1,
            name,
            breed,
            age,
            gender,
            ownerId: ownerId || req.user.id, // Default to current user
            description,
            careSuggestions,
            animalType,
            createdAt: new Date().toISOString()
        };

        pets.push(newPet);
        res.status(201).json({pet: newPet});
    } catch (error) {
        res.status(500).json({
            error: "Failed to create pet",
            code: "pet_creation_failed"
        });
    }
});

router.get("/pets", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const userPets = pets.filter(pet => pet.ownerId === req.user.id);
        res.json({pets: userPets});
    } catch (error) {
        res.status(500).json({
            error: "Failed to retrieve pets",
            code: "pet_retrieval_failed"
        });
    }
});

router.get("/pet/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const pet = pets.find(p =>
            p.id === parseInt(req.params.id) &&
            p.ownerId === req.user.id
        );

        if (!pet) {
            return res.status(404).json({
                error: "Pet not found",
                code: "pet_not_found"
            });
        }

        res.json({pet});
    } catch (error) {
        res.status(500).json({
            error: "Failed to retrieve pet",
            code: "pet_retrieval_failed"
        });
    }
});

router.put("/pet/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        if (Buffer.isBuffer(req.body)) {
            req.body = JSON.parse(req.body.toString());
        }
        const petIndex = pets.findIndex(p =>
            p.id === parseInt(req.params.id) &&
            p.ownerId === req.user.id
        );

        if (petIndex === -1) {
            return res.status(404).json({
                error: "Pet not found",
                code: "pet_not_found"
            });
        }

        const updatedPet = {
            ...pets[petIndex],
            ...req.body,
            id: parseInt(req.params.id), // Prevent ID modification
            ownerId: pets[petIndex].ownerId // Prevent owner reassignment
        };

        pets[petIndex] = updatedPet;
        res.json({pet: updatedPet});
    } catch (error) {
        res.status(500).json({
            error: "Failed to update pet",
            code: "pet_update_failed"
        });
    }
});

router.delete("/pet/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const petIndex = pets.findIndex(p =>
            p.id === parseInt(req.params.id) &&
            p.ownerId === req.user.id
        );

        if (petIndex === -1) {
            return res.status(404).json({
                error: "Pet not found",
                code: "pet_not_found"
            });
        }

        const [deletedPet] = pets.splice(petIndex, 1);
        res.json({pet: deletedPet});
    } catch (error) {
        res.status(500).json({
            error: "Failed to delete pet",
            code: "pet_deletion_failed"
        });
    }
});

// ======================
// Tasks Routes
// ======================
router.post("/task", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        if (Buffer.isBuffer(req.body)) {
            req.body = JSON.parse(req.body.toString());
        }
        const {title, description, priority, dueDate} = req.body;

        if (!title) {
            return res.status(400).json({
                error: "Missing required title",
                code: "missing_required_field"
            });
        }

        const newTask = {
            id: tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
            title,
            description,
            priority: priority || "medium",
            dueDate,
            completed: false,
            ownerId: req.user.id,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        res.status(201).json({task: newTask});
    } catch (error) {
        res.status(500).json({
            error: "Failed to create task",
            code: "task_creation_failed"
        });
    }
});

router.get("/tasks", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        // const userTasks = tasks.filter(task => task.ownerId === req.user.id);
        res.json({tasks: tasks});
    } catch (error) {
        res.status(500).json({
            error: "Failed to retrieve tasks",
            code: "task_retrieval_failed"
        });
    }
});

router.get("/task/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const task = tasks.find(t =>
            t.id === parseInt(req.params.id) &&
            t.ownerId === req.user.id
        );

        if (!task) {
            return res.status(404).json({
                error: "Task not found",
                code: "task_not_found"
            });
        }

        res.json({task});
    } catch (error) {
        res.status(500).json({
            error: "Failed to retrieve task",
            code: "task_retrieval_failed"
        });
    }
});

router.put("/task/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        if (Buffer.isBuffer(req.body)) {
            req.body = JSON.parse(req.body.toString());
        }
        const taskIndex = tasks.findIndex(t =>
            t.id === parseInt(req.params.id) &&
            t.ownerId === req.user.id
        );

        if (taskIndex === -1) {
            return res.status(404).json({
                error: "Task not found",
                code: "task_not_found"
            });
        }

        const updatedTask = {
            ...tasks[taskIndex],
            ...req.body,
            id: parseInt(req.params.id), // Prevent ID modification
            ownerId: tasks[taskIndex].ownerId // Prevent owner reassignment
        };

        tasks[taskIndex] = updatedTask;
        res.json({task: updatedTask});
    } catch (error) {
        res.status(500).json({
            error: "Failed to update task",
            code: "task_update_failed"
        });
    }
});

router.delete("/task/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const taskIndex = tasks.findIndex(t =>
            t.id === parseInt(req.params.id) &&
            t.ownerId === req.user.id
        );

        if (taskIndex === -1) {
            return res.status(404).json({
                error: "Task not found",
                code: "task_not_found"
            });
        }

        const [deletedTask] = tasks.splice(taskIndex, 1);
        res.json({task: deletedTask});
    } catch (error) {
        res.status(500).json({
            error: "Failed to delete task",
            code: "task_deletion_failed"
        });
    }
});

// api.use("/api/", router);

api.listen(port, () => {
    console.log("Server listening on port: " + port);
});

export const handler = serverless(api);