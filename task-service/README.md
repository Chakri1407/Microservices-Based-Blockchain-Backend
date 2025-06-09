# Task Service

A robust RESTful API service for managing tasks with blockchain integration. This service provides endpoints for task management, authentication, and real-time status updates.

## Overview

The Task Service provides:
- RESTful API endpoints for task management
- JWT-based authentication
- Rate limiting for API protection
- Swagger UI documentation
- Message queue integration for blockchain synchronization
- Comprehensive logging and error handling

## API Documentation

The service provides a Swagger UI interface for API documentation. Once the service is running, you can access it at `http://localhost:3000/api-docs`.

### API Overview
![Task Service API](ss/Task%20Service%20API.png)

### Available Endpoints

#### Health Check
![Health Status](ss/Health%20status.png)

#### Create Task (POST)
![Post Request](ss/Post%20request.png)

#### Get All Tasks (GET)
![All Tasks Request](ss/All%20tasks%20request.png)

#### Get Task by ID (GET)
![Get Request](ss/Get%20request.png)

#### Update Task (PUT)
![Update Request](ss/Update%20request.png)

#### Delete Task (DELETE)
![Delete Request](ss/Delete%20request.png)

## Features

- **Authentication**: JWT-based authentication for secure access
- **Rate Limiting**: Protection against abuse with request rate limiting
- **Task Management**: CRUD operations for tasks
- **Blockchain Integration**: Task synchronization with blockchain
- **Message Queue**: RabbitMQ integration for async processing
- **Database**: MongoDB for data persistence
- **Logging**: Comprehensive logging with Winston
- **API Documentation**: Swagger UI for API exploration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- RabbitMQ
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
MONGODB_URI=mongodb://localhost:27017/task-service
JWT_SECRET=your_jwt_secret
RABBITMQ_URL=amqp://localhost
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
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Task Endpoints

#### Create Task
```http
POST /tasks
Content-Type: application/json

{
    "title": "Task Title",
    "description": "Task Description"
}
```

#### Get All Tasks
```http
GET /tasks?page=1&limit=10&status=pending
```

#### Get Task by ID
```http
GET /tasks/:id
```

#### Update Task
```http
PUT /tasks/:id
Content-Type: application/json

{
    "title": "Updated Title",
    "description": "Updated Description",
    "status": "completed"
}
```

#### Delete Task
```http
DELETE /tasks/:id
```

## Error Handling

The service implements comprehensive error handling:
- Input validation
- Authentication errors
- Database errors
- Rate limiting
- Message queue errors

## Rate Limiting

The API implements rate limiting:
- 100 requests per 15 minutes per IP
- Configurable through environment variables

## Logging

The service provides comprehensive logging:
- Task operations
- Authentication attempts
- Error tracking
- Performance metrics

Logs are stored in:
- `task-service.log`: General service logs
- `error.log`: Error-specific logs

## Project Structure

```
task-service/
├── index.ts           # Main application entry point
├── models/           # Database models
├── tests/           # Test files
├── dist/            # Compiled TypeScript files
├── swagger.json     # API documentation
└── TaskStorage.json # Smart contract ABI
```

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB object modeling
- **jsonwebtoken**: JWT authentication
- **amqplib**: RabbitMQ client
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