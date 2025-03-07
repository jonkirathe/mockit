export const logSecurityEvent = (req, eventType, extra = {}) => {
    const logEntry = {
        event: eventType,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        endpoint: req.originalUrl,
        userId: req.user?.id,
        ...extra
    };
    console.log("SECURITY EVENT:", logEntry);
};
