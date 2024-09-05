// swaggerConfig.js
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
    apis: ['./netlify/functions/api.js'],
};
