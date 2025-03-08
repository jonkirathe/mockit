import serverless from "serverless-http";
import api from "./app.js";

export const handler = serverless(api, { framework: "express" });
