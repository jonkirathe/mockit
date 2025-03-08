export const errorHandler = (err, req, res, next) => {
    console.error(err);

    // Guard: If response is not initialized, use default Express handler
    if (!res) {
        return next(err);
    }

    // Guard: Don't send response if headers already sent
    if (res.headersSent) {
        return next(err);
    }

    // Set JSON response
    res.setHeader('Content-Type', 'application/json');

    // Determine status and message
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    const code = err.code || 'internal_error';

    res.status(status).json({ error: message, code });
};