import serverless from "serverless-http";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import cors from "cors";
import express, { Router } from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import dotenv from "dotenv";
import session from "express-session";

dotenv.config();

const domain = process.env.DOMAIN;
const ORIGIN_DOMAIN = process.env.ORIGIN_DOMAIN;
const SECRET_KEY = process.env.SECRET_KEY

const api = express();
const router = Router();
const port = process.env.PORT || 8080;
api.set("port", port);

// Middleware setup
api.use(express.json());
api.use(cookieParser());
api.use(morgan("combined"));
api.use(
    cors({
        origin: ORIGIN_DOMAIN,
        credentials: true,
    })
);
api.use(express.static("public"));

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
api.use(limiter);

// CSRF token middleware
const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

api.use((req, res, next) => {
    let csrfToken = req.cookies.csrfToken;
    if (!csrfToken && !req.session?.csrfToken) {
        csrfToken = generateCsrfToken();
        if (req.session) {
            req.session.csrfToken = csrfToken;
        }
        res.cookie("csrfToken", csrfToken, { httpOnly: false, secure: false });
    }
    req.csrfToken = req.session?.csrfToken || csrfToken;
    next();
});

const validateCsrfToken = (req, res, next) => {
    const csrfToken = req.cookies.csrfToken;
    const csrfTokenFromHeader = req.headers["x-csrf-token"];
    const csrfTokenFromSession = req.session?.csrfToken;
    if ((csrfToken || csrfTokenFromHeader) !== csrfTokenFromSession) {
        return res.status(403).send("Invalid CSRF token");
    }
    next();
};

api.use(
    session({
        secret: SECRET_KEY,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
    })
);

// JWT token functions
const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        SECRET_KEY,
        { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        SECRET_KEY,
        { expiresIn: "7d" }
    );
    const accessTokenExpiresIn = new Date(Date.now() + 15 * 60 * 1000);
    const cookieAccessTokenExpiresIn = new Date(Date.now() + 20 * 60 * 1000);
    const refreshTokenExpiresIn = new Date(Date.now() + 7 * 24 * 60 * 1000);
    const cookieRefreshTokenExpiresIn = new Date(Date.now() + 8 * 24 * 60 * 1000);
    return {
        accessToken,
        refreshToken,
        accessTokenExpiresIn,
        cookieAccessTokenExpiresIn,
        refreshTokenExpiresIn,
        cookieRefreshTokenExpiresIn,
    };
};

const tokenBlacklist = new Set();

function logout(req, res) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.clearCookie("csrfToken");
    if (req.session) req.session.csrfToken = null;
}

const users = [
    {
        "id": 1,
        "names": "John Doe",
        "email": "user@example.com",
        "address": "147 Nairobi Kenya",
        "password": "password@123",
        "date": 7845555
    },
    {
        "id": 2,
        "names": "Mary Ann",
        "email": "user2@example.com",
        "address": "10 Mombasa Kenya",
        "password": "password@123",
        "date": 7845555
    }
];

// Routes

router.post("/signin", validateCsrfToken, (req, res) => {
    const { email, password } = req.body;
    const user = users.find(
        (u) => u.email === email && u.password === password
    );
    if (user) {
        const {
            accessToken,
            refreshToken,
            cookieAccessTokenExpiresIn,
            cookieRefreshTokenExpiresIn,
        } = generateTokens(user);
        req.session.accessToken = accessToken;
        req.session.refreshToken = refreshToken;
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            expires: cookieAccessTokenExpiresIn,
        });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            expires: cookieRefreshTokenExpiresIn,
        });
        res.status(200).json({ user });
    } else {
        res.status(401).json({ message: "Invalid email or password" });
    }
});

router.get("/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken });
});

router.post("/signup", validateCsrfToken, (req, res) => {
    const { username, email, password, passwordConfirmation } = req.body;
    if (password !== passwordConfirmation) {
        return res.status(400).json({ message: "Passwords do not match" });
    }
    const userExists = users.some((u) => u.email === email);
    if (userExists) {
        res.status(409).json({ message: "User already exists" });
    } else {
        const newUser = {
            id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1,
            username,
            email,
            password,
            role: "user",
        };
        users.push(newUser);
        const {
            accessToken,
            refreshToken,
            cookieAccessTokenExpiresIn,
            cookieRefreshTokenExpiresIn,
        } = generateTokens(newUser);
        req.session.accessToken = accessToken;
        req.session.refreshToken = refreshToken;
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            expires: cookieAccessTokenExpiresIn,
        });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            expires: cookieRefreshTokenExpiresIn,
        });
        res.status(201).json({ user: newUser, csrfToken: req.csrfToken });
    }
});

router.post("/logout", validateCsrfToken, (req, res) => {
    logout(req, res);
    res.status(200).json({ message: "User logged out successfully" });
});

router.get("/user", validateCsrfToken, (req, res) => {
    const token = req.cookies.accessToken;
    if (tokenBlacklist.has(token)) {
        return res.status(401).json({ message: "Token has been invalidated" });
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = users.find((u) => u.id === decoded.id);
        if (user) {
            res.status(200).json({ user });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
});

router.post("/refresh", validateCsrfToken, (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        logout(req, res);
        return res.status(401).json({ message: "Refresh token is missing" });
    }
    try {
        const decoded = jwt.verify(refreshToken, SECRET_KEY);
        const user = users.find((u) => u.id === decoded.id);
        if (user) {
            const {
                accessToken,
                refreshToken,
                cookieAccessTokenExpiresIn,
                cookieRefreshTokenExpiresIn,
            } = generateTokens(user);
            res.cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "Strict",
                expires: cookieAccessTokenExpiresIn,
            });
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "Strict",
                expires: cookieRefreshTokenExpiresIn,
            });
            res.status(200).json({ csrfToken: req.csrfToken });
        } else {
            logout(req, res);
            res.status(401).json({ message: "Invalid refresh token" });
        }
    } catch (error) {
        logout(req, res);
        res.status(401).json({ message: "Invalid refresh token" });
    }
});

router.get("/check", validateCsrfToken, (req, res) => {
    res.status(200).json({ message: "All working" });
});

router.get("/users", validateCsrfToken, (req, res) => {
    res.status(200).json({ users });
});

// Pets Routes
router.post("/pet", validateCsrfToken, (req, res) => {
    const { name, breed, age, gender, ownerId, description, careSuggestions, animalType, imageUrl } = req.body;
    const newPet = {
        id: pets.length ? Math.max(...pets.map(p => p.id)) + 1 : 1,
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
    res.status(201).json({ pet: newPet });
});

router.get("/pets", validateCsrfToken, (req, res) => {
    res.status(200).json({ pets });
});

router.get("/pet/:id", validateCsrfToken, (req, res) => {
    const petId = parseInt(req.params.id, 10);
    const pet = pets.find((p) => p.id === petId);
    if (pet) {
        res.status(200).json({ pet });
    } else {
        res.status(404).json({ message: "Pet not found" });
    }
});

router.put("/pet/:id", validateCsrfToken, (req, res) => {
    const petId = parseInt(req.params.id, 10);
    const { name, breed, age, gender, ownerId, description, careSuggestions, animalType, imageUrl } = req.body;
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
        res.status(200).json({ pet: pets[petIndex] });
    } else {
        res.status(404).json({ message: "Pet not found" });
    }
});

router.delete("/pet/:id", validateCsrfToken, (req, res) => {
    const petId = parseInt(req.params.id, 10);
    const petIndex = pets.findIndex((p) => p.id === petId);
    if (petIndex !== -1) {
        const deletedPet = pets.splice(petIndex, 1);
        res.status(200).json({ pet: deletedPet[0] });
    } else {
        res.status(404).json({ message: "Pet not found" });
    }
});

// Tasks Routes
router.post("/task", validateCsrfToken, (req, res) => {
    const { completed, title, description, priority, dueDate } = req.body;
    const newTask = {
        id: tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
        completed,
        title,
        description,
        priority,
        dueDate
    };
    tasks.push(newTask);
    res.status(201).json({ task: newTask });
});

router.get("/tasks", validateCsrfToken, (req, res) => {
    res.status(200).json({ tasks });
});

router.get("/task/:id", validateCsrfToken, (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
        res.status(200).json({ task });
    } else {
        res.status(404).json({ message: "Task not found" });
    }
});

router.put("/task/:id", validateCsrfToken, (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const { completed, title, description, priority, dueDate } = req.body;
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex] = {
            id: taskId,
            completed,
            title,
            description,
            priority,
            dueDate
        };
        res.status(200).json({ task: tasks[taskIndex] });
    } else {
        res.status(404).json({ message: "Task not found" });
    }
});

router.delete("/task/:id", validateCsrfToken, (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
        const deletedTask = tasks.splice(taskIndex, 1);
        res.status(200).json({ task: deletedTask[0] });
    } else {
        res.status(404).json({ message: "Task not found" });
    }
});

api.use("/api/", router);

api.listen(port, () => {
    console.log("Server listening on port: " + port);
});

export const handler = serverless(api);

// In-memory database (initialized with your JSON data)


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
