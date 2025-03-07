import jwt from "jsonwebtoken";
import {logSecurityEvent} from "../utils/securityLogger.js";
import {generateTokens} from "../utils/tokens.js";
import {generateCsrfToken} from "../utils/csrf.js";

const tokenBlacklist = new Set();

export const validateAccessToken = (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(401).json({
            error: "Authentication required",
            code: "missing_access_token"
        });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            if (err.name === "TokenExpiredError") {
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

export const handleTokenRefresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        const userAgent = req.get("User-Agent") || "unknown";
        const clientIP = req.ip;

        if (!refreshToken) {
            logSecurityEvent(req, "REFRESH_TOKEN_MISSING");
            await logout(req, res);
            return res.status(401).json({
                error: "Session expired - please reauthenticate",
                code: "session_expired"
            });
        }

        if (tokenBlacklist.has(refreshToken)) {
            logSecurityEvent(req, "REFRESH_TOKEN_REVOKED");
            await logout(req, res);
            return res.status(401).json({
                error: "Security violation detected",
                code: "token_revoked"
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.SECRET_KEY);

        if (decoded.userAgent !== userAgent || decoded.clientIP !== clientIP) {
            logSecurityEvent(req, "CONTEXT_MISMATCH", {
                storedAgent: decoded.userAgent,
                currentAgent: userAgent,
                storedIP: decoded.clientIP,
                currentIP: clientIP
            });
            await logout(req, res);
            return res.status(401).json({
                error: "Security violation - session context mismatch",
                code: "context_mismatch"
            });
        }

        tokenBlacklist.add(refreshToken);

        // For demonstration, reconstruct a simple user object.
        const user = { id: decoded.id, role: decoded.role || "user" };

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user, {
            userAgent,
            clientIP
        });

        const secureCookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
            path: "/",
            domain: process.env.COOKIE_DOMAIN || undefined
        };

        res.cookie("accessToken", accessToken, {
            ...secureCookieOptions,
            maxAge: 15 * 60 * 1000
        });

        res.cookie("refreshToken", newRefreshToken, {
            ...secureCookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const newCsrfToken = generateCsrfToken();
        req.session.csrfToken = newCsrfToken;

        req.user = user;
        next();
    } catch (error) {
        logSecurityEvent(req, "REFRESH_ERROR", {
            error: error.message,
            stack: error.stack
        });

        await logout(req, res);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                error: "Session expired - please login again",
                code: "session_expired"
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                error: "Invalid security credentials",
                code: "invalid_token"
            });
        }

        res.status(401).json({
            error: "Authentication failed",
            code: "authentication_failure"
        });
    }
};

export const logout = async (req, res) => {
    try {
        if (req.cookies.accessToken) {
            tokenBlacklist.add(req.cookies.accessToken);
        }
        if (req.cookies.refreshToken) {
            tokenBlacklist.add(req.cookies.refreshToken);
        }

        res.clearCookie("accessToken", {
            path: "/",
            domain: process.env.COOKIE_DOMAIN || undefined
        });
        res.clearCookie("refreshToken", {
            path: "/",
            domain: process.env.COOKIE_DOMAIN || undefined
        });

        if (req.session) {
            await new Promise((resolve, reject) => {
                req.session.destroy((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    } catch (error) {
        console.error("Logout error:", error);
    }
};
