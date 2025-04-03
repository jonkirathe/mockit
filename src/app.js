import express, {Router} from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import {PORT} from "./config/constants.js";
import {setupHelmet} from "./config/security.js";
import {apiLimiter, healthCheckLimiter} from "./config/rate-limits.js";
import authRoutes from "./routes/auth.js";
import petRoutes from "./routes/pets.js";
import taskRoutes from "./routes/tasks.js";
import userRoutes from "./routes/users.js";
import {errorHandler} from "./middleware/errorHandler.js";

dotenv.config();

const api = express();
api.set("port", PORT);

// Security headers
setupHelmet(api);

api.use(express.json());
api.use(express.urlencoded({ extended: true }));
api.use(cookieParser());
api.use(morgan("combined"));
// api.use(blockClientTools);
// CORS configuration: allow all origins in development; in production, enforce HTTPS
api.use(
    cors({
        origin: (origin, callback) => {
            // Allow all origins but require HTTPS in production
            // if (process.env.NODE_ENV === "production" && origin && !origin.startsWith("https://")) {
            //     return callback(new Error("HTTPS required"));
            // }
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

            const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => {
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
api.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // Session expiration
    }
}));

// Mount routes under /api
const router = Router();
router.use("/auth", authRoutes);
router.use("/pets", petRoutes);
router.use("/tasks", taskRoutes);
router.use("/users", userRoutes);

router.get("/health", healthCheckLimiter,(req, res) => {
    res.status(200).json({message: "Health Ok"});
});

router.use(apiLimiter);

api.use("/api", router);

api.use(errorHandler);

// Serve static files
api.use(express.static("public"));

api.listen(PORT, () => {
    console.log("Server listening on port: " + PORT);
});

export default api;
