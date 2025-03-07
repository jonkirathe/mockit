export const errorHandler = (err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
        code: err.code || "internal_error"
    });
};
