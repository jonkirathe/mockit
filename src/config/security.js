import helmet from "helmet";

export const setupHelmet = (app) => {
    if (process.env.NODE_ENV === "development") {
        app.use(
            helmet({
                contentSecurityPolicy: false,
                crossOriginEmbedderPolicy: false
            })
        );
    } else {
        app.use(
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        scriptSrc: ["'self'", "'unsafe-inline'", "trusted-cdn.example.com"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                        imgSrc: ["'self'", "data:", "cdn.example.com"],
                        connectSrc: ["'self'", "api.example.com"]
                    }
                },
                hsts: {
                    maxAge: 63072000,
                    includeSubDomains: true,
                    preload: true
                },
                referrerPolicy: { policy: "same-origin" }
            })
        );
    }
};
