"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ethers_1 = require("ethers");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swaggerDocument = __importStar(require("./swagger.json"));
const winston_1 = __importDefault(require("winston"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Enhanced logging configuration
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'blockchain-service.log' })
    ]
});
// Simple rate limiting middleware
const rateLimitMap = new Map();
const rateLimit = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100;
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }
    const clientData = rateLimitMap.get(ip);
    if (now > clientData.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }
    if (clientData.count >= maxRequests) {
        return res.status(429).json({ error: 'Too many requests' });
    }
    clientData.count++;
    next();
};
app.use(express_1.default.json());
app.use(rateLimit);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
// Blockchain connection with retry logic
let provider;
let wallet;
let contract;
const connectBlockchain = async () => {
    try {
        console.log("ENV:", process.env.ETHEREUM_NODE_URL, process.env.ADMIN_PRIVATE_KEY, process.env.CONTRACT_ADDRESS); // Debug
        if (!process.env.ETHEREUM_NODE_URL || !process.env.ADMIN_PRIVATE_KEY || !process.env.CONTRACT_ADDRESS) {
            throw new Error('Missing required environment variables');
        }
        provider = new ethers_1.ethers.JsonRpcProvider(process.env.ETHEREUM_NODE_URL);
        wallet = new ethers_1.ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const contractABI = require('./TaskStorage.json').abi;
        contract = new ethers_1.ethers.Contract(contractAddress, contractABI, wallet);
        await provider.getBlockNumber();
        logger.info('Blockchain connected successfully');
    }
    catch (error) {
        logger.error('Blockchain connection error:', { message: error.message || 'Unknown error', stack: error.stack || 'No stack' });
        setTimeout(connectBlockchain, 5000);
    }
};
connectBlockchain();
// Middleware to check if blockchain is connected
const checkBlockchainConnection = (req, res, next) => {
    if (!contract) {
        return res.status(503).json({ error: 'Blockchain service unavailable' });
    }
    next();
};
app.use(checkBlockchainConnection);
// Create task on blockchain
app.post('/blockchain/tasks', async (req, res) => {
    try {
        const { id, title, description, userId, status } = req.body;
        if (!id || !title || !description || !userId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const tx = await contract.createTask(id, title, description, userId, status || 'pending');
        const receipt = await tx.wait();
        logger.info(`Task stored on blockchain: ${id}, txHash: ${tx.hash}`);
        res.status(201).json({
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        });
    }
    catch (error) {
        logger.error(`Blockchain task creation error: ${error.message || 'Unknown error'}`);
        res.status(400).json({ error: 'Error storing task on blockchain' });
    }
});
// Update task on blockchain
app.put('/blockchain/tasks/:id', async (req, res) => {
    try {
        const { title, description, status } = req.body;
        const id = req.params.id;
        if (!title || !description || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const tx = await contract.updateTask(id, title, description, status);
        const receipt = await tx.wait();
        logger.info(`Task updated on blockchain: ${id}, txHash: ${tx.hash}`);
        res.json({
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        });
    }
    catch (error) {
        logger.error(`Blockchain task update error: ${error.message || 'Unknown error'}`);
        res.status(400).json({ error: 'Error updating task on blockchain' });
    }
});
// Soft delete task on blockchain
app.delete('/blockchain/tasks/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const tx = await contract.softDeleteTask(id);
        const receipt = await tx.wait();
        logger.info(`Task deleted on blockchain: ${id}, txHash: ${tx.hash}`);
        res.json({
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        });
    }
    catch (error) {
        logger.error(`Blockchain task deletion error: ${error.message || 'Unknown error'}`);
        res.status(400).json({ error: 'Error deleting task on blockchain' });
    }
});
// Get task from blockchain
app.get('/blockchain/tasks/:id', async (req, res) => {
    try {
        const task = await contract.getTask(req.params.id);
        if (task.isDeleted) {
            return res.status(404).json({ error: 'Task not found or deleted' });
        }
        res.json({
            id: task.id.toString(), // Convert BigInt to string
            title: task.title,
            description: task.description,
            userId: task.userId,
            status: task.status,
            timestamp: task.timestamp.toString(), // Convert BigInt to string
            isDeleted: task.isDeleted
        });
    }
    catch (error) {
        logger.error(`Blockchain task retrieval error: ${error.message || 'Unknown error'}`);
        res.status(400).json({ error: 'Error retrieving task from blockchain' });
    }
});
// Health check endpoint
app.get('/health', (req, res) => {
    const health = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        blockchain: !!contract,
        provider: !!provider
    };
    res.json(health);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});
const server = app.listen(3002, () => logger.info('Blockchain Service running on port 3002'));
