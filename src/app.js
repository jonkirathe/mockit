import express, {Router} from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import dotenv from "dotenv";
import {PORT} from "./config/constants.js";
// import {setupHelmet} from "./config/security.js";
// import {apiLimiter} from "./config/rate-limits.js";
import authRoutes from "./routes/auth.js";
import petRoutes from "./routes/pets.js";
import taskRoutes from "./routes/tasks.js";
import userRoutes from "./routes/users.js";
import * as rateLimits from "./config/rate-limits.js";
const { apiLimiter } = rateLimits;

dotenv.config();

const api = express();
api.set("port", PORT);

// Security headers
// setupHelmet(api);

api.use(express.json());
api.use(express.urlencoded({ extended: true }));
api.use(cookieParser());
api.use(morgan("combined"));
/*

// CORS configuration: allow all origins in development; in production, enforce HTTPS
api.use(
    cors({
        origin: (origin, callback) => {
            if (process.env.NODE_ENV === "production" && origin && !origin.startsWith("https://")) {
                return callback(new Error("HTTPS required"));
            }
            callback(null, true);
        },
        credentials: true,
        optionsSuccessStatus: 200
    })
);

api.use(
    session({
        secret: process.env.SECRET_KEY,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax"
        }
    })
);

// Initialize CSRF token if missing
api.use((req, res, next) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = generateCsrfToken();
    }
    next();
});
*/

// Mount routes under /api
const router = Router();
// router.use("/auth", authRoutes);
// router.use("/pets", petRoutes);
// router.use("/tasks", taskRoutes);
// router.use("/users", userRoutes);

router.get("/health", (req, res) => {
    res.status(200).json({message: "Health Ok"});
});

router.use(apiLimiter);

api.use("/api", router);

console.log("authRoutes type:", typeof authRoutes);
console.log("petRoutes type:", typeof petRoutes);
console.log("taskRoutes type:", typeof taskRoutes);
console.log("userRoutes type:", typeof userRoutes);
console.log("apiLimiter type:", typeof apiLimiter);

// Serve static files
api.use(express.static("public"));

api.listen(PORT, () => {
    console.log("Server listening on port: " + PORT);
});

export default api;
