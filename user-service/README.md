# User Service

A secure RESTful API service for user management and authentication. This service provides endpoints for user registration, login, and profile management with JWT-based authentication.

## Overview

The User Service provides:
- User registration and authentication
- JWT-based secure access
- Role-based access control
- Swagger UI documentation
- Comprehensive logging
- MongoDB integration for user data

## API Documentation

The service provides a Swagger UI interface for API documentation. Once the service is running, you can access it at `http://localhost:3000/api-docs`.

### API Overview
![User Service API](ss/User%20service%20API.png)

### Available Endpoints

#### Health Check
![Health Status](ss/Health.png)

#### Register User (POST)
![Register Request](ss/Register%20request.png)

#### Login (POST)
![Login Request](ss/Login%20request.png)

#### Get User Profile (GET)
![Get Request](ss/Get%20request.png)

## Features

- **Authentication**: JWT-based authentication for secure access
- **Password Security**: Bcrypt password hashing
- **Role Management**: User roles (admin, user)
- **Profile Management**: User profile retrieval
- **Database**: MongoDB for user data persistence
- **Logging**: Comprehensive logging with Winston
- **API Documentation**: Swagger UI for API exploration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- TypeScript

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/user-service
JWT_SECRET=your_jwt_secret
```

## Running the Service

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### User Endpoints

#### Register User
```http
POST /register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securepassword",
    "role": "user"
}
```

#### Login
```http
POST /login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securepassword"
}
```

#### Get User Profile
```http
GET /users/:id
Authorization: Bearer <your_jwt_token>
```

## Security Features

- **Password Hashing**: Bcrypt for secure password storage
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Different permissions for admin and regular users
- **Input Validation**: Request data validation
- **Secure Headers**: Proper security headers implementation

## Error Handling

The service implements comprehensive error handling:
- Input validation
- Authentication errors
- Database errors
- Authorization checks
- Invalid token handling

## Logging

The service provides comprehensive logging:
- User registration
- Login attempts
- Profile access
- Error tracking
- Authentication failures

Logs are stored in:
- `user-service.log`: General service logs

## Project Structure

```
user-service/
├── index.ts           # Main application entry point
├── models/           # Database models
├── dist/            # Compiled TypeScript files
└── swagger.json     # API documentation
```

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB object modeling
- **jsonwebtoken**: JWT authentication
- **bcrypt**: Password hashing
- **winston**: Logging framework
- **swagger-ui-express**: API documentation
- **typescript**: Type safety

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License. 