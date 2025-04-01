export const cookieOptions = {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    // sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    expires: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
};
