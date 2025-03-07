export const blockClientTools = (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
        const userAgent = req.headers["user-agent"];
        const blockedClients = [
            "PostmanRuntime",
            "curl",
            "Insomnia",
            "Thunder Client"
        ];
        if (blockedClients.some((client) => userAgent?.includes(client))) {
            return res.status(403).json({
                error: "API access not allowed through client tools",
                code: "client_tool_blocked"
            });
        }
    }
    next();
};
