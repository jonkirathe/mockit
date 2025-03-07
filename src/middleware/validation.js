import crypto from "crypto";
import { logSecurityEvent } from "../utils/securityLogger.js";

export const validateCsrfToken = (req, res, next) => {
    const csrfToken = req.headers["x-csrf-token"];
    if (!csrfToken || !req.session.csrfToken) {
        logSecurityEvent(req, "CSRF_TOKEN_MISSING");
        req.session.destroy();
        return res.status(403).json({
            error: "Security validation failed",
            code: "security_validation_error"
        });
    }
    if (
        !crypto.timingSafeEqual(
            Buffer.from(csrfToken),
            Buffer.from(req.session.csrfToken)
        )
    ) {
        logSecurityEvent(req, "CSRF_TOKEN_MISMATCH");
        req.session.destroy();
        return res.status(403).json({
            error: "Security validation failed",
            code: "security_validation_error"
        });
    }
    next();
};
