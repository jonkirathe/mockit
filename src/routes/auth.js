import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {validateCsrfToken} from "../middleware/validation.js";
import {logout, validateAccessToken} from "../middleware/auth.js";
import {authLimiter} from "../config/rate-limits.js";
import {generateTokens} from "../utils/tokens.js";
import {generateCsrfToken} from "../utils/csrf.js";

const router = express.Router();

// In-memory users database (for demonstration)
const users = [
    {
        id: 1,
        names: "John Doe",
        email: "user@example.com",
        address: "147 Nairobi Kenya",
        password: bcrypt.hashSync("password@123", 10),
        role: "user",
        date: 7845555
    },
    {
        id: 2,
        names: "Mary Ann",
        email: "user2@example.com",
        address: "10 Mombasa Kenya",
        password: bcrypt.hashSync("password@123", 10),
        role: "admin",
        date: 7845555
    }
];

router.get('/csrf-token', async (req, res) => {
    try {
        // Generate token only if not present
        if (!req.session.csrfToken) {
            req.session.csrfToken = generateCsrfToken();
            // Save session explicitly
            await req.session.save();
        }

        res.cookie('XSRF-TOKEN', req.session.csrfToken, {
            httpOnly: true,
            secure: false, // true in production
            sameSite: 'Lax',
            maxAge: 900000
        });

        res.json({ csrfToken: req.session.csrfToken });
    } catch (error) {
        console.error('CSRF Error:', error);
        res.status(500).json({ error: "CSRF failure", code: "csrf_failure" });
    }
});

router.post("/signin", validateCsrfToken, authLimiter, (req, res) => {
    try {
        if (Buffer.isBuffer(req.body)) {
            req.body = JSON.parse(req.body.toString());
        }
        const { email, password } = req.body;
        const user = users.find((u) => u.email === email);

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({
                error: "Authentication failed",
                code: "invalid_credentials"
            });
        }

        const userAgent = req.get("User-Agent") || "unknown";
        const clientIP = req.ip;
        const { accessToken, refreshToken, cookieOptions } = generateTokens(user, { userAgent, clientIP });

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

router.post("/signup", validateCsrfToken, authLimiter, (req, res) => {
    if (Buffer.isBuffer(req.body)) {
        req.body = JSON.parse(req.body.toString());
    }
    const { username, email, password, passwordConfirmation } = req.body;

    if (password !== passwordConfirmation) {
        return res.status(400).json({
            error: "Passwords do not match",
            code: "password_mismatch"
        });
    }

    // Validate password complexity
    const complexityRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!complexityRegex.test(password)) {
        return res.status(400).json({
            error:
                "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character",
            code: "weak_password"
        });
    }

    if (users.some((u) => u.email === email)) {
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

    const userAgent = req.get("User-Agent") || "unknown";
    const clientIP = req.ip;
    const { accessToken, refreshToken, cookieOptions } = generateTokens(newUser, { userAgent, clientIP });

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

router.post(
    "/logout",
    validateCsrfToken,
    validateAccessToken,
    async (req, res) => {
        try {
            console.log("User logout initiated:", {
                userId: req.user.id,
                ip: req.ip,
                userAgent: req.headers["user-agent"]
            });

            await logout(req, res);

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
    }
);

router.post("/refresh", validateCsrfToken, authLimiter, async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        const userAgent = req.get("User-Agent") || "unknown";
        const clientIP = req.ip;

        if (!refreshToken) {
            await logout(req, res);
            return res.status(401).json({
                error: "Authentication required",
                code: "missing_refresh_token"
            });
        }

        if (!refreshToken) {
            // Should not reach here; logic handled in auth middleware
        }

        const decoded = jwt.verify(refreshToken, process.env.SECRET_KEY);
        const user = users.find((u) => u.id === decoded.id);

        if (!user) {
            await logout(req, res);
            return res.status(401).json({
                error: "Invalid session",
                code: "user_not_found"
            });
        }

        if (decoded.userAgent !== userAgent || decoded.clientIP !== clientIP) {
            console.warn(`Token context mismatch for user ${user.id}`);
            await logout(req, res);
            return res.status(401).json({
                error: "Session security violation",
                code: "context_mismatch"
            });
        }

        const { accessToken, refreshToken: newRefreshToken, cookieOptions } =
            generateTokens(user, { userAgent, clientIP });

        res.cookie("accessToken", accessToken, {
            ...cookieOptions,
            sameSite: "Strict",
            secure: process.env.NODE_ENV === "production",
            httpOnly: true
        });

        res.cookie("refreshToken", newRefreshToken, {
            ...cookieOptions,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            sameSite: "Strict",
            secure: process.env.NODE_ENV === "production",
            httpOnly: true
        });

        const newCsrfToken = generateCsrfToken();
        req.session.csrfToken = newCsrfToken;

        res.status(200).json({
            csrfToken: newCsrfToken,
            accessTokenExpires: cookieOptions.expires,
            sessionDuration: "7 days"
        });
    } catch (error) {
        await logout(req, res);

        console.error(`Refresh token error: ${error.message}`, {
            error,
            clientIP: req.ip,
            userAgent: req.get("User-Agent")
        });

        const response =
            error.name === "TokenExpiredError"
                ? {
                    error: "Session expired - please reauthenticate",
                    code: "session_expired"
                }
                : {
                    error: "Invalid session - security violation",
                    code: "invalid_session"
                };

        res.status(401).json(response);
    }
});

router.get("/validate-session",validateCsrfToken, async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken;
        if (!accessToken) return res.json({ authenticated: false });

        const decoded = jwt.verify(accessToken, process.env.SECRET_KEY);
        const user = await users.find((u) => u.id === decoded.id);

        res.json({
            authenticated: !!user,
            needsRefresh: Date.now() > decoded.exp * 1000 - 300000 // 5 min buffer
        });
    } catch (error) {
        res.json({ valid: false });
    }
});

export default router;
