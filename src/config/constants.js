import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 8080;

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    expires: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
};

export const ALLOWED_ORIGINS = [
    ...(process.env.ALLOWED_ORIGINS?.split(",") || []),
    ...(process.env.NODE_ENV === "development"
        ? ["https://localhost:3000", "http://127.0.0.1:3000"]
        : [])
];
