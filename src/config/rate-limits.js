import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
    handler: (req, res) => {
        res.status(429).json({
            error: "Too many requests",
            code: "rate_limit_exceeded"
        });
    }
});

export const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    handler: (req, res) => {
        res.status(429).json({
            error: "Too many requests",
            code: "rate_limit_exceeded"
        });
    }
});
