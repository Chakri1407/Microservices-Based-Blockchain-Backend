# Task Processor Service

A robust microservice that processes task operations and synchronizes them with the blockchain. This service acts as a bridge between the application layer and the blockchain, ensuring reliable task processing and data consistency.

## Overview

The Task Processor Service is responsible for:
- Processing task operations (create, update, delete)
- Synchronizing task data with the blockchain
- Handling batch operations for improved efficiency
- Managing retry mechanisms for failed operations
- Providing reliable message queue processing

## Features

- **Blockchain Integration**: Seamless interaction with Ethereum smart contracts
- **Message Queue Processing**: Reliable task processing using RabbitMQ
- **Database Synchronization**: MongoDB integration for task state management
- **Retry Mechanism**: Automatic retry for failed operations
- **Batch Processing**: Efficient handling of multiple tasks
- **Comprehensive Logging**: Detailed logging with Winston
- **Graceful Shutdown**: Proper handling of service termination

## Architecture

```
task-processor-service/
├── index.ts           # Main service entry point
├── models/           # Database models
├── dist/            # Compiled TypeScript files
└── TaskStorage.json # Smart contract ABI
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- RabbitMQ
- Ethereum node (local or remote)
- TypeScript

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
MONGODB_URI=mongodb://localhost:27017/task-service
ETHEREUM_NODE_URL=http://localhost:8545
ADMIN_PRIVATE_KEY=your_private_key
CONTRACT_ADDRESS=your_contract_address
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

## Task Processing Flow

1. **Message Reception**
   - Service listens to the 'taskQueue' in RabbitMQ
   - Messages contain task operation details

2. **Operation Processing**
   - Single task operations (create, update, delete)
   - Batch operations for multiple tasks
   - Automatic retry mechanism for failed operations

3. **Blockchain Integration**
   - Transaction submission to Ethereum network
   - Confirmation waiting and status updates
   - Error handling and retry logic

4. **Database Synchronization**
   - Task status updates in MongoDB
   - Transaction hash storage
   - Retry count tracking

## Error Handling

The service implements comprehensive error handling:
- Connection retry logic for MongoDB, RabbitMQ, and blockchain
- Task processing retry mechanism (max 3 attempts)
- Failed task status tracking
- Detailed error logging

## Message Queue Operations

### Sending Tasks
```typescript
await sendToQueue('taskQueue', {
    id: 'taskId',
    title: 'Task Title',
    description: 'Task Description',
    userId: 'userId',
    status: 'pending',
    operation: 'create'
});
```

### Batch Operations
```typescript
await sendToQueue('taskQueue', {
    taskIds: ['id1', 'id2', 'id3'],
    status: 'completed',
    operation: 'batchUpdate'
});
```

## Dependencies

- **ethers**: Ethereum library for blockchain interaction
- **amqplib**: RabbitMQ client for message queue
- **mongoose**: MongoDB object modeling
- **winston**: Logging framework
- **typescript**: Type safety and modern JavaScript features

## Monitoring

The service provides comprehensive logging:
- Task processing status
- Blockchain transaction details
- Error tracking
- Connection status
- Performance metrics

Logs are stored in:
- `task-processor-service.log`: General service logs
- `error.log`: Error-specific logs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License. 