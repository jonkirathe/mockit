import express from "express";
import { validateCsrfToken } from "../middleware/validation.js";
import { validateAccessToken } from "../middleware/auth.js";

const router = express.Router();

let tasks = [
    {
        "id": 1,
        "completed": false,
        "title": "Complete Angular tutorial",
        "description": "Finish the official Angular documentation tutorial.",
        "priority": "high",
        "dueDate": "2024-11-01"
    },
    {
        "id": 2,
        "completed": false,
        "title": "Task 2: Write unit tests for API",
        "description": "Description for task 2.",
        "priority": "medium",
        "dueDate": "2024-11-02"
    },
    {
        "id": 3,
        "completed": true,
        "title": "Task 3: Refactor user authentication",
        "description": "Description for task 3.",
        "priority": "low",
        "dueDate": "2024-11-03"
    },
    {
        "id": 4,
        "completed": false,
        "title": "Task 4: Design new landing page",
        "description": "Description for task 4.",
        "priority": "high",
        "dueDate": "2024-11-04"
    },
    {
        "id": 5,
        "completed": true,
        "title": "Task 5: Set up CI/CD pipeline",
        "description": "Description for task 5.",
        "priority": "medium",
        "dueDate": "2024-11-05"
    },
    {
        "id": 6,
        "completed": false,
        "title": "Task 6: Write blog post on web accessibility",
        "description": "Description for task 6.",
        "priority": "low",
        "dueDate": "2024-11-06"
    },
    {
        "id": 7,
        "completed": true,
        "title": "Task 7: Optimize image assets",
        "description": "Description for task 7.",
        "priority": "high",
        "dueDate": "2024-11-07"
    },
    {
        "id": 8,
        "completed": false,
        "title": "Task 8: Prepare client presentation",
        "description": "Description for task 8.",
        "priority": "medium",
        "dueDate": "2024-11-08"
    },
    {
        "id": 9,
        "completed": true,
        "title": "Task 9: Research on AI integration",
        "description": "Description for task 9.",
        "priority": "low",
        "dueDate": "2024-11-09"
    },
    {
        "id": 10,
        "completed": false,
        "title": "Task 10: Document API endpoints",
        "description": "Description for task 10.",
        "priority": "high",
        "dueDate": "2024-11-10"
    },
    {
        "id": 11,
        "completed": true,
        "title": "Task 11: Fix critical bugs in payment gateway",
        "description": "Description for task 11.",
        "priority": "medium",
        "dueDate": "2024-11-11"
    },
    {
        "id": 12,
        "completed": false,
        "title": "Task 12: Create test cases for frontend",
        "description": "Description for task 12.",
        "priority": "low",
        "dueDate": "2024-11-12"
    },
    {
        "id": 13,
        "completed": true,
        "title": "Task 13: Conduct usability testing",
        "description": "Description for task 13.",
        "priority": "high",
        "dueDate": "2024-11-13"
    },
    {
        "id": 14,
        "completed": false,
        "title": "Task 14: Write server migration plan",
        "description": "Description for task 14.",
        "priority": "medium",
        "dueDate": "2024-11-14"
    },
    {
        "id": 15,
        "completed": true,
        "title": "Task 15: Review pull requests",
        "description": "Description for task 15.",
        "priority": "low",
        "dueDate": "2024-11-15"
    },
    {
        "id": 16,
        "completed": false,
        "title": "Task 16: Upgrade database schema",
        "description": "Description for task 16.",
        "priority": "high",
        "dueDate": "2024-11-16"
    },
    {
        "id": 17,
        "completed": true,
        "title": "Task 17: Conduct team training session",
        "description": "Description for task 17.",
        "priority": "medium",
        "dueDate": "2024-11-17"
    },
    {
        "id": 18,
        "completed": false,
        "title": "Task 18: Improve caching mechanisms",
        "description": "Description for task 18.",
        "priority": "low",
        "dueDate": "2024-11-18"
    },
    {
        "id": 19,
        "completed": true,
        "title": "Task 19: Finalize project timeline",
        "description": "Description for task 19.",
        "priority": "high",
        "dueDate": "2024-11-19"
    },
    {
        "id": 20,
        "completed": false,
        "title": "Task 20: Update documentation",
        "description": "Description for task 20.",
        "priority": "medium",
        "dueDate": "2024-11-20"
    },
    {
        "id": 21,
        "completed": true,
        "title": "Task 21: Optimize database queries",
        "description": "Description for task 21.",
        "priority": "low",
        "dueDate": "2024-11-21"
    },
    {
        "id": 22,
        "completed": false,
        "title": "Task 22: Implement caching strategy",
        "description": "Description for task 22.",
        "priority": "high",
        "dueDate": "2024-11-22"
    },
    {
        "id": 23,
        "completed": true,
        "title": "Task 23: Code review session",
        "description": "Description for task 23.",
        "priority": "medium",
        "dueDate": "2024-11-23"
    },
    {
        "id": 24,
        "completed": false,
        "title": "Task 24: Update CI configuration",
        "description": "Description for task 24.",
        "priority": "low",
        "dueDate": "2024-11-24"
    },
    {
        "id": 25,
        "completed": true,
        "title": "Task 25: Fix UI bugs",
        "description": "Description for task 25.",
        "priority": "high",
        "dueDate": "2024-11-25"
    },
    {
        "id": 26,
        "completed": false,
        "title": "Task 26: Refactor legacy code",
        "description": "Description for task 26.",
        "priority": "medium",
        "dueDate": "2024-11-26"
    },
    {
        "id": 27,
        "completed": true,
        "title": "Task 27: Integrate third-party API",
        "description": "Description for task 27.",
        "priority": "low",
        "dueDate": "2024-11-27"
    },
    {
        "id": 28,
        "completed": false,
        "title": "Task 28: Write end-to-end tests",
        "description": "Description for task 28.",
        "priority": "high",
        "dueDate": "2024-11-28"
    },
    {
        "id": 29,
        "completed": true,
        "title": "Task 29: Improve error handling",
        "description": "Description for task 29.",
        "priority": "medium",
        "dueDate": "2024-11-29"
    },
    {
        "id": 30,
        "completed": false,
        "title": "Task 30: Update dependencies",
        "description": "Description for task 30.",
        "priority": "low",
        "dueDate": "2024-11-30"
    },
    {
        "id": 31,
        "completed": true,
        "title": "Task 31: Optimize assets",
        "description": "Description for task 31.",
        "priority": "high",
        "dueDate": "2024-11-31"
    },
    {
        "id": 32,
        "completed": false,
        "title": "Task 32: Improve security measures",
        "description": "Description for task 32.",
        "priority": "medium",
        "dueDate": "2024-11-32"
    },
    {
        "id": 33,
        "completed": true,
        "title": "Task 33: Add new features",
        "description": "Description for task 33.",
        "priority": "low",
        "dueDate": "2024-11-33"
    },
    {
        "id": 34,
        "completed": false,
        "title": "Task 34: Monitor performance",
        "description": "Description for task 34.",
        "priority": "high",
        "dueDate": "2024-11-34"
    },
    {
        "id": 35,
        "completed": true,
        "title": "Task 35: Refactor codebase",
        "description": "Description for task 35.",
        "priority": "medium",
        "dueDate": "2024-11-35"
    },
    {
        "id": 36,
        "completed": false,
        "title": "Task 36: Enhance UI design",
        "description": "Description for task 36.",
        "priority": "low",
        "dueDate": "2024-11-36"
    },
    {
        "id": 37,
        "completed": true,
        "title": "Task 37: Optimize build process",
        "description": "Description for task 37.",
        "priority": "high",
        "dueDate": "2024-11-37"
    },
    {
        "id": 38,
        "completed": false,
        "title": "Task 38: Update project roadmap",
        "description": "Description for task 38.",
        "priority": "medium",
        "dueDate": "2024-11-38"
    },
    {
        "id": 39,
        "completed": true,
        "title": "Task 39: Implement new API endpoints",
        "description": "Description for task 39.",
        "priority": "low",
        "dueDate": "2024-11-39"
    },
    {
        "id": 40,
        "completed": false,
        "title": "Task 40: Conduct stakeholder meeting",
        "description": "Description for task 40.",
        "priority": "high",
        "dueDate": "2024-11-40"
    },
    {
        "id": 41,
        "completed": true,
        "title": "Task 41: Deploy to staging",
        "description": "Description for task 41.",
        "priority": "medium",
        "dueDate": "2024-11-41"
    },
    {
        "id": 42,
        "completed": false,
        "title": "Task 42: Perform code audit",
        "description": "Description for task 42.",
        "priority": "low",
        "dueDate": "2024-11-42"
    },
    {
        "id": 43,
        "completed": true,
        "title": "Task 43: Update system architecture",
        "description": "Description for task 43.",
        "priority": "high",
        "dueDate": "2024-11-43"
    },
    {
        "id": 44,
        "completed": false,
        "title": "Task 44: Research new technologies",
        "description": "Description for task 44.",
        "priority": "medium",
        "dueDate": "2024-11-44"
    },
    {
        "id": 45,
        "completed": true,
        "title": "Task 45: Conduct market analysis",
        "description": "Description for task 45.",
        "priority": "low",
        "dueDate": "2024-11-45"
    },
    {
        "id": 46,
        "completed": false,
        "title": "Task 46: Improve user onboarding",
        "description": "Description for task 46.",
        "priority": "high",
        "dueDate": "2024-11-46"
    },
    {
        "id": 47,
        "completed": true,
        "title": "Task 47: Update testing strategy",
        "description": "Description for task 47.",
        "priority": "medium",
        "dueDate": "2024-11-47"
    },
    {
        "id": 48,
        "completed": false,
        "title": "Task 48: Finalize release notes",
        "description": "Description for task 48.",
        "priority": "low",
        "dueDate": "2024-11-48"
    },
    {
        "id": 49,
        "completed": true,
        "title": "Task 49: Optimize SEO",
        "description": "Description for task 49.",
        "priority": "high",
        "dueDate": "2024-11-49"
    },
    {
        "id": 50,
        "completed": false,
        "title": "Task 50: Review analytics data",
        "description": "Description for task 50.",
        "priority": "medium",
        "dueDate": "2024-11-50"
    }
];

router.post("/", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        if (Buffer.isBuffer(req.body)) {
            req.body = JSON.parse(req.body.toString());
        }
        const { title, description, priority, dueDate } = req.body;

        if (!title) {
            return res.status(400).json({
                error: "Missing required title",
                code: "missing_required_field"
            });
        }

        const newTask = {
            id: tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1,
            title,
            description,
            priority: priority || "medium",
            dueDate,
            completed: false,
            ownerId: req.user.id,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        res.status(201).json({ task: newTask });
    } catch (error) {
        res.status(500).json({
            error: "Failed to create task",
            code: "task_creation_failed"
        });
    }
});

router.get("/", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        res.json({ tasks });
    } catch (error) {
        res.status(500).json({
            error: "Failed to retrieve tasks",
            code: "task_retrieval_failed"
        });
    }
});

router.get("/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const task = tasks.find((t) => t.id === parseInt(req.params.id));
        if (!task) {
            return res.status(404).json({
                error: "Task not found",
                code: "task_not_found"
            });
        }
        res.json({ task });
    } catch (error) {
        res.status(500).json({
            error: "Failed to retrieve task",
            code: "task_retrieval_failed"
        });
    }
});

router.put("/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        if (Buffer.isBuffer(req.body)) {
            req.body = JSON.parse(req.body.toString());
        }
        const taskIndex = tasks.findIndex(
            (t) => t.id === parseInt(req.params.id) && t.ownerId === req.user.id
        );
        if (taskIndex === -1) {
            return res.status(404).json({
                error: "Task not found",
                code: "task_not_found"
            });
        }
        const updatedTask = {
            ...tasks[taskIndex],
            ...req.body,
            id: parseInt(req.params.id),
            ownerId: tasks[taskIndex].ownerId
        };

        tasks[taskIndex] = updatedTask;
        res.json({ task: updatedTask });
    } catch (error) {
        res.status(500).json({
            error: "Failed to update task",
            code: "task_update_failed"
        });
    }
});

router.delete("/:id", validateCsrfToken, validateAccessToken, (req, res) => {
    try {
        const taskIndex = tasks.findIndex(
            (t) => t.id === parseInt(req.params.id) && t.ownerId === req.user.id
        );
        if (taskIndex === -1) {
            return res.status(404).json({
                error: "Task not found",
                code: "task_not_found"
            });
        }
        const [deletedTask] = tasks.splice(taskIndex, 1);
        res.json({ task: deletedTask });
    } catch (error) {
        res.status(500).json({
            error: "Failed to delete task",
            code: "task_deletion_failed"
        });
    }
});

export default router;
