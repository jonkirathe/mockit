import path from 'path';
import { fileURLToPath } from 'url';

console.log('import.meta.url:', import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('__filename:', __filename);
console.log('__dirname:', __dirname);

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
};

