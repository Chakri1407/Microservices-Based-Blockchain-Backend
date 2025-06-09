# Blockchain Service

A robust blockchain service that provides RESTful API endpoints for interacting with blockchain functionality. This service is built using TypeScript, Express.js, and integrates with various blockchain technologies.

## Features

- RESTful API endpoints for blockchain operations
- Swagger UI documentation for easy API exploration
- Secure authentication using JWT
- Message queue integration with AMQP
- Comprehensive logging with Winston
- TypeScript support for better type safety
- MongoDB integration for data persistence

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- RabbitMQ (for message queue functionality)
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
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
RABBITMQ_URL=your_rabbitmq_url
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

## API Documentation

The service provides a Swagger UI interface for API documentation. Once the service is running, you can access it at `http://localhost:3000/api-docs`.

### Available Endpoints

#### Health Check
![Health Check Endpoint](ss/Health%20Request.png)

#### Blockchain Service API Overview
![Blockchain Service API](ss/Blockchain%20service%20API.png)

#### Get Request
![Get Request](ss/Get%20request.png)

#### Put Request
![Put Request](ss/Put%20request.png)

#### Update Request
![Update Request](ss/Update%20request.png)

#### Delete Request
![Delete Request](ss/Delete%20request.png)

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB object modeling
- **ethers**: Ethereum library
- **amqplib**: RabbitMQ client
- **jsonwebtoken**: JWT authentication
- **winston**: Logging
- **swagger-ui-express**: API documentation
- **typescript**: Type safety
- **dotenv**: Environment variables management

## Project Structure

```
blockchain-service/
├── dist/           # Compiled TypeScript files
├── ss/            # Screenshots and documentation
├── index.ts       # Main application entry point
├── package.json   # Project dependencies and scripts
└── tsconfig.json  # TypeScript configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License. 