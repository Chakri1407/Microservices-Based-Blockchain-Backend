# Microservices-Based Blockchain Backend

## Overview
This project implements a decentralized task management application using a microservices architecture with a private Ethereum blockchain (Polygon network). It includes four microservices: User Service, Task Service, Task Processor Service, and Blockchain Service. The system uses RESTful APIs, RabbitMQ for asynchronous communication, MongoDB for data storage, and a Solidity smart contract for task storage on the blockchain.
## Prerequisites

- Node.js (v16+)
- MongoDB
- RabbitMQ
- Polygon Ethereum node (e.g., local Hardhat or Infura)
- Docker (optional for containerized deployment)

## Setup Instructions

### Clone the Repository
```bash
git clone <repository-url>
cd <repository-directory>
```

### Install Dependencies
For each service (user-service, task-service, task-processor-service, blockchain-service):
```bash
cd <service-directory>
npm install
```

### Configure Environment Variables
Create a `.env` file in each service directory with the following:
```
MONGODB_URI=mongodb://localhost:27017/<service-name>
JWT_SECRET=your_jwt_secret
RABBITMQ_URL=amqp://localhost
ETHEREUM_NODE_URL=<your-polygon-node-url>
ADMIN_PRIVATE_KEY=<your-admin-private-key>
CONTRACT_ADDRESS=<deployed-contract-address>
```

### Deploy Smart Contract

1. Use Hardhat or Remix to deploy `TaskStorage.sol` to the Polygon network.
2. Update `CONTRACT_ADDRESS` in .env files with the deployed contract address.
3. Ensure the admin private key corresponds to the admin address used in the contract.

### Run Services
For each service:
```bash
cd <service-directory>
npm start
```

- **User Service**: Runs on port 3000
- **Task Service**: Runs on port 3001
- **Blockchain Service**: Runs on port 3002
- **Task Processor Service**: Runs in the background


## Access Swagger UI

- User Service: http://localhost:3000/api-docs
- Task Service: http://localhost:3001/api-docs
- Blockchain Service: http://localhost:3002/api-docs

## Example API Calls (Postman)

### Register User
```http
POST http://localhost:3000/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

### Login
```http
POST http://localhost:3000/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Create Task
```http
POST http://localhost:3001/tasks
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "title": "Sample Task",
  "description": "This is a sample task"
}
```

### Update Task
```http
PUT http://localhost:3001/tasks/:taskId
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "title": "Updated Task",
  "description": "This is an updated task",
  "status": "completed"
}
```

### Soft Delete Task
```http
DELETE http://localhost:3001/tasks/:taskId
Authorization: Bearer <jwt-token>
```

### Batch Update Tasks (Admin Only)
```http
POST http://localhost:3001/tasks/batch
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "taskIds": ["taskId1", "taskId2", "taskId3"],
  "status": "completed"
}
```




## Security

### Secure Admin Private Keys

- Store admin private keys in .env files.
- Ensure .env files are not committed to version control (use .gitignore).
- Use a secrets manager for production environments.

### Additional Security Features

- Rate limiting implemented on all services to prevent abuse
- Robust error handling and logging for security monitoring
- Connection retry mechanisms for resilience against service disruptions
- Graceful shutdown procedures to prevent data loss

## Testing
Unit tests for Task Service are located in task-service/tests/. Run tests with:
```bash
cd task-service
npm test
```

## Project Structure

- **user-service/**: Handles user registration, authentication, and profile retrieval.
- **task-service/**: Manages task creation, updates, retrieval, and soft deletion of tasks.
- **task-processor-service/**: Processes tasks asynchronously via RabbitMQ and submits to blockchain with retry logic.
- **blockchain-service/**: Interacts with the Ethereum blockchain, providing endpoints for task operations.
- **TaskStorage.sol**: Enhanced Solidity smart contract for task storage with soft delete, batch operations, and access control.

## Enhanced Features

### Smart Contract Enhancements
- Soft delete functionality to maintain data history
- Batch operations for efficient task management
- Improved status tracking and validation
- Events for all operations for better auditability

### Service Enhancements
- Robust connection management with retry logic
- Enhanced error handling and logging
- Health check endpoints for monitoring
- Graceful shutdown procedures
- Rate limiting for API protection

## Notes

- Ensure MongoDB and RabbitMQ are running before starting services.
- Use a Polygon testnet or local Hardhat node for development.
- Implement additional security measures (e.g., HTTPS) for production.
- Monitor service health endpoints for system status.

