import crypto from "crypto";

export const generateCsrfToken = () =>
    crypto.randomBytes(32).toString("hex");
