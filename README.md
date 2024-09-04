# Mockit Server

Welcome to the Mockit Server! This is an open-source mock server designed to help developers simulate API endpoints for testing and development purposes.

## Table of Contents

- Introduction
- Features
- Getting Started
    - Prerequisites
    - Installation
    - Running the Server
- API Documentation
- Contributing
- License
- Contact

## Introduction

The Mock Server provides a simple and flexible way to create and manage mock API endpoints. It supports authentication, token refresh, and user management, making it ideal for testing and development. This project aims to help developers by providing a ready-to-use mock server that can be easily integrated into their workflow.

## Features

- **Easy to set up and use**: Get started quickly with minimal configuration.
- **Supports JWT authentication**: Secure your endpoints with JSON Web Tokens.
- **Real-time request logging**: View incoming requests in real-time.
- **Interactive API documentation**: Use Swagger UI for detailed API documentation and testing.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your machine:

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/your-repo/mock-server.git
    cd mock-server
    ```

2. Install the dependencies:
    ```bash
    npm install
    ```

### Running the Server

Start the server using `nodemon`:
```bash
nodemon app.js
