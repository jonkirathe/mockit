# 🚀 Mockit Server - Next-Gen API Simulation Platform

[![Netlify Status](https://api.netlify.com/api/v1/badges/f1c19406-e85e-49e5-91ff-389b85404107/deploy-status)](https://app.netlify.com/sites/mockit-server/deploys)
[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jonkirathe/mockit/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://makeapullrequest.com)

**Mockit Server** is your Swiss Army knife for API development - a feature-rich mock server with enterprise-grade security and real-time analytics. Perfect for testing, prototyping, and CI/CD pipelines!

👉 **Live Demo**: [https://mockit-server.netlify.app](https://mockit-server.netlify.app)



## 🌟 Why Mockit?

| Feature                | Mockit | JSON Server | Postman Mock | Mockoon |
|------------------------|--------|-------------|--------------|---------|
| JWT Authentication     | ✅      | ❌           | ❌            | ❌       |
| CSRF Protection        | ✅      | ❌           | ❌            | ❌       |
| Rate Limiting          | ✅      | ❌           | ❌            | ❌       |
| Interactive Docs       | ✅      | ❌           | ✅            | ❌       |
| Database Simulation    | ✅      | ✅           | ❌            | ✅       |
| CI/CD Ready            | ✅      | ✅           | ✅            | ✅       |

## 🛠️ Features That Spark Joy

### 🔒 Security First
- **Military-Grade Auth**: JWT + CSRF token dual protection
- **Rate Limiting**: Adaptive request throttling (10 req/min default)
- **CORS Management**: Whitelist domains with wildcard support
- **HTTPS Enforcement**: Auto-redirect HTTP in production

### 💡 Smart Simulation
- **Dynamic Response Mocking**
- **Relational Data Modeling** (Users → Pets → Tasks)
- **Request Validation** (400 Bad Request auto-handling)
- **Persistent Sessions** with cookie-based storage

### 📊 Observability
- Real-time request logging
- Error tracking dashboard
- Performance metrics (Response times, error rates)
- Automated API documentation (OpenAPI 3.0 compliant)

## 🚀 Getting Started in 60 Seconds

### Prerequisites
- Node.js 16+ (LTS recommended)
- npm 8+ or yarn 1.22+
- Redis (for production rate limiting)

### Installation
```bash
# Clone with depth 1 for faster download
git clone --depth 1 https://github.com/jonkirathe/mockit.git
cd mockit

# Install dependencies
npm install

# Configure environment
cp .env.example .env