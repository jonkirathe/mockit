import crypto from "crypto";
import { logSecurityEvent } from "../utils/securityLogger.js";

export const validateCsrfToken = (req, res, next) => {
    const csrfToken = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];

    // Log session ID and cookies
    console.log('Session ID:', req.sessionID);
    console.log('Cookies:', req.headers.cookie);
    console.log('Session:', req.session);

    if (!csrfToken || !req.session.csrfToken) {
        console.error('Missing CSRF token. Header:', csrfToken, 'Session:', req.session.csrfToken);
        logSecurityEvent(req, "CSRF_TOKEN_MISSING");
        return res.status(403).json({
            error: "Security validation failed",
            code: "security_validation_error"
        });
    }
    console.log('Comparing tokens <-> Header:', csrfToken, 'Session:', req.session.csrfToken);

    if (!crypto.timingSafeEqual(
        Buffer.from(csrfToken),
        Buffer.from(req.session.csrfToken)
    )) {
        console.error('CSRF mismatch. Session ID:', req.sessionID);
        logSecurityEvent(req, "CSRF_TOKEN_MISMATCH");
        return res.status(403).json({
            error: "Security validation failed",
            code: "security_validation_error"
        });
    }
    next();
};
