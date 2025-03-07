import express from "express";
import { validateCsrfToken } from "../middleware/validation.js";
import { validateAccessToken } from "../middleware/auth.js";

const router = express.Router();

// In-memory users (for demonstration)
const users = [
    {
        id: 1,
        names: "John Doe",
        email: "user@example.com",
        address: "147 Nairobi Kenya",
        role: "user"
    },
    {
        id: 2,
        names: "Mary Ann",
        email: "user2@example.com",
        address: "10 Mombasa Kenya",
        role: "admin"
    }
];

router.get("/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const user = users.find((u) => u.id === parseInt(req.params.id));
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                code: "user_not_found"
            });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({
            error: "Failed to retrieve user data",
            code: "user_data_retrieval_failed"
        });
    }
});

export default router;
