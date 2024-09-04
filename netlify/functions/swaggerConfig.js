import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Mockit Server API',
            version: '1.0.0',
            description: 'API documentation for the Mockit Server',
        },
        servers: [
            {
                url: 'https://mockit-server.netlify.app',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [path.join(__dirname, './api.js')], // Path to the API docs
    // apis: ['./routes/*.js'], // Path to the API docs
};
