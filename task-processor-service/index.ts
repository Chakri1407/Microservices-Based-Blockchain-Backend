import * as amqp from 'amqplib';
import mongoose from 'mongoose';
import { ethers } from 'ethers';
import winston from 'winston';
import { Task } from './models/task';

// Enhanced logging configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'task-processor-service.log' })
    ]
});

// MongoDB connection with retry logic
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-service');
        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        setTimeout(connectDB, 5000);
    }
};
connectDB();

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

// RabbitMQ connection management - Fixed: Use any type to avoid conflicts
let rabbitmqConnection: any = null;
let rabbitmqChannel: any = null;

// Fixed: Renamed and corrected the RabbitMQ connection function
const connectRabbitMQ = async (): Promise<boolean> => {
    try { 
        rabbitmqConnection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost'); 
        rabbitmqChannel = await rabbitmqConnection.createChannel(); 
        await rabbitmqChannel.assertQueue('taskQueue'); 
        logger.info('RabbitMQ connected successfully'); 
        return true;
    } catch (error) {
        logger.error('RabbitMQ connection error:', error);
        return false;
    }
};

// Process a single task with retry logic
const processSingleTask = async (taskData: any) => {
    const { id, title, description, userId, status, operation } = taskData;
    
    try {
        // Find the task in the database
        const task = await Task.findById(id);
        if (!task) {
            logger.error(`Task not found: ${id}`);
            return false;
        }
        
        // Skip processing if task is already confirmed or completed
        if (task.status === 'confirmed' || task.status === 'completed') {
            logger.info(`Task already processed: ${id}, status: ${task.status}`);
            return true;
        }
        
        // Handle different operations
        let tx;
        if (operation === 'delete') {
            // Soft delete task
            tx = await contract.softDeleteTask(id);
        } else if (status && task.blockchainTxHash) {
            // Update existing task
            tx = await contract.updateTask(id, title, description, status);
        } else {
            // Create new task
            tx = await contract.createTask(id, title, description, userId, status || 'pending');
        }
        
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        
        // Update task status in database
        task.status = 'confirmed';
        task.blockchainTxHash = tx.hash;
        await task.save();
        
        logger.info(`Task processed on blockchain: ${id}, txHash: ${tx.hash}`);
        return true;
    } catch (error) {
        // Increment retry count
        const task = await Task.findById(id);
        if (task) {
            task.retryCount = (task.retryCount || 0) + 1;
            task.status = task.retryCount >= 3 ? 'failed' : 'pending';
            await task.save();
            
            logger.error(`Task processing error: ${id}, retry: ${task.retryCount}, error: ${error}`);
            return task.retryCount >= 3; // Return true if max retries reached to acknowledge message
        }
        return false;
    }
};

// Process batch of tasks
const processBatchTasks = async (taskData: any) => {
    const { taskIds, status, operation } = taskData;
    
    try {
        if (operation === 'batchUpdate') {
            // Get tasks from database
            const tasks = await Task.find({ _id: { $in: taskIds } });
            if (tasks.length === 0) {
                logger.error('No tasks found for batch update');
                return true;
            }
            
            // Prepare data for batch update
            const ids = [];
            const titles = [];
            const descriptions = [];
            const statuses = [];
            
            for (const task of tasks) {
                ids.push(task._id.toString());
                titles.push(task.title);
                descriptions.push(task.description);
                statuses.push(status);
            }
            
            // Execute batch update
            const tx = await contract.batchUpdateTasks(ids, titles, descriptions, statuses);
            const receipt = await tx.wait();
            
            // Update tasks in database
            await Task.updateMany(
                { _id: { $in: taskIds } },
                { $set: { status: 'confirmed', blockchainTxHash: tx.hash } }
            );
            
            logger.info(`Batch updated ${tasks.length} tasks, txHash: ${tx.hash}`);
            return true;
        }
        return false;
    } catch (error) {
        logger.error(`Batch processing error: ${error}`);
        return false;
    }
};

// Fixed: Main task processing function
const processTask = async () => {
    // Connect to RabbitMQ - Fixed: Use correct function name
    const connected = await connectRabbitMQ();
    if (!connected || !rabbitmqChannel) {
        logger.error('Failed to connect to RabbitMQ');
        return;
    }
    
    // Process messages from queue
    rabbitmqChannel.consume('taskQueue', async (msg: any) => {
        if (msg) {
            try {
                const taskData = JSON.parse(msg.content.toString());
                logger.info(`Received task: ${JSON.stringify(taskData)}`);
                
                let processed = false;
                
                // Check if it's a batch operation
                if (taskData.taskIds && Array.isArray(taskData.taskIds)) {
                    processed = await processBatchTasks(taskData);
                } else if (taskData.id) {
                    // Process single task
                    processed = await processSingleTask(taskData);
                }
                
                if (processed) {
                    rabbitmqChannel.ack(msg);
                } else {
                    // Requeue message for retry
                    rabbitmqChannel.nack(msg, false, true);
                }
            } catch (error) {
                logger.error(`Message processing error: ${error}`);
                rabbitmqChannel.nack(msg, false, true);
            }
        }
    });
};

// Fixed: Helper function to send messages to queue
const sendToQueue = async (queueName: string, taskData: any): Promise<boolean> => {
    if (rabbitmqChannel && rabbitmqConnection) {
        try {
            await rabbitmqChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(taskData)));
            return true;
        } catch (error) {
            logger.error('Failed to send message to queue:', error);
            return false;
        }
    } else {
        logger.error('RabbitMQ connection not established');
        return false;
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    if (rabbitmqChannel) await rabbitmqChannel.close();
    if (rabbitmqConnection) await rabbitmqConnection.close();
    await mongoose.connection.close();
    process.exit(0);
});

// Start processing
processTask();
logger.info('Task Processor Service running');