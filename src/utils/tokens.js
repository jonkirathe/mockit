import jwt from "jsonwebtoken";
import { cookieOptions } from "./cookies.js";

export const generateTokens = (user, context = {}) => {
    const accessToken = jwt.sign(
        {
            id: user.id,
            role: user.role,
            ...context
        },
        process.env.SECRET_KEY,
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        {
            id: user.id,
            ...context
        },
        process.env.SECRET_KEY,
        { expiresIn: "7d" }
    );

    return { accessToken, refreshToken, cookieOptions };
};
