import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from './swagger.json';
import winston from 'winston';

const app = express();

// Enhanced logging configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'blockchain-service.log' })
    ]
});

// Simple rate limiting middleware (alternative to express-rate-limit)
const rateLimitMap = new Map();
const rateLimit = (req: Request, res: Response, next: NextFunction) => {
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

app.use(express.json());
app.use(rateLimit);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Blockchain connection with retry logic
let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let contract: ethers.Contract;

const connectBlockchain = async () => {
    try {
        provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_NODE_URL || 'http://localhost:8545');
        wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY || '', provider);
        const contractAddress = process.env.CONTRACT_ADDRESS || '';
        const contractABI = require('./TaskStorage.json').abi;
        contract = new ethers.Contract(contractAddress, contractABI, wallet);
        
        // Test connection
        await provider.getBlockNumber();
        logger.info('Blockchain connected successfully');
    } catch (error) {
        logger.error('Blockchain connection error:', error);
        setTimeout(connectBlockchain, 5000);
    }
};
connectBlockchain();

// Middleware to check if blockchain is connected
const checkBlockchainConnection = (req: Request, res: Response, next: NextFunction) => {
    if (!contract) {
        return res.status(503).json({ error: 'Blockchain service unavailable' });
    }
    next();
};

app.use(checkBlockchainConnection);

// Create task on blockchain
app.post('/blockchain/tasks', async (req: Request, res: Response) => {
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
    } catch (error) {
        logger.error(`Blockchain task creation error: ${error}`);
        res.status(400).json({ error: 'Error storing task on blockchain' });
    }
});

// Update task on blockchain
app.put('/blockchain/tasks/:id', async (req: Request, res: Response) => {
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
    } catch (error) {
        logger.error(`Blockchain task update error: ${error}`);
        res.status(400).json({ error: 'Error updating task on blockchain' });
    }
});

// Soft delete task on blockchain
app.delete('/blockchain/tasks/:id', async (req: Request, res: Response) => {
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
    } catch (error) {
        logger.error(`Blockchain task deletion error: ${error}`);
        res.status(400).json({ error: 'Error deleting task on blockchain' });
    }
});

// Get task from blockchain
app.get('/blockchain/tasks/:id', async (req: Request, res: Response) => {
    try {
        const task = await contract.getTask(req.params.id);
        
        // Check if task is soft deleted
        if (task.isDeleted) {
            return res.status(404).json({ error: 'Task not found or deleted' });
        }
        
        res.json({
            id: task.id,
            title: task.title,
            description: task.description,
            userId: task.userId,
            status: task.status,
            timestamp: task.timestamp,
            isDeleted: task.isDeleted
        });
    } catch (error) {
        logger.error(`Blockchain task retrieval error: ${error}`);
        res.status(400).json({ error: 'Error retrieving task from blockchain' });
    }
});

// Batch create tasks on blockchain
app.post('/blockchain/tasks/batch', async (req: Request, res: Response) => {
    try {
        const { tasks } = req.body;
        
        if (!Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({ error: 'Invalid tasks array' });
        }
        
        // Prepare task data for batch operation
        const ids = [];
        const titles = [];
        const descriptions = [];
        const userIds = [];
        const statuses = [];
        
        for (const task of tasks) {
            if (!task.id || !task.title || !task.description || !task.userId) {
                return res.status(400).json({ error: 'Missing required fields in task' });
            }
            
            ids.push(task.id);
            titles.push(task.title);
            descriptions.push(task.description);
            userIds.push(task.userId);
            statuses.push(task.status || 'pending');
        }
        
        const tx = await contract.batchCreateTasks(ids, titles, descriptions, userIds, statuses);
        const receipt = await tx.wait();
        
        logger.info(`Batch created ${tasks.length} tasks on blockchain, txHash: ${tx.hash}`);
        res.status(201).json({ 
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            tasksCreated: tasks.length
        });
    } catch (error) {
        logger.error(`Blockchain batch task creation error: ${error}`);
        res.status(400).json({ error: 'Error storing tasks on blockchain' });
    }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
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