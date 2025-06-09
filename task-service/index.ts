import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import * as amqp from 'amqplib';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from './swagger.json';
import winston from 'winston';
import rateLimit from 'express-rate-limit';
import { Task } from './models/task';

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
        new winston.transports.File({ filename: 'task-service.log' })
    ]
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use(express.json());
app.use(limiter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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

// RabbitMQ connection management - Fixed types
let connection: any = null;
let channel: any = null;

const connectQueue = async (): Promise<void> => {
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        channel = await connection.createChannel();
        await channel.assertQueue('taskQueue');
        logger.info('RabbitMQ connected successfully');
    } catch (error) {
        logger.error('RabbitMQ connection error:', error);
        setTimeout(connectQueue, 5000);
    }
};
connectQueue();

// Enhanced token authentication
const authenticateToken = (req: any, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Access denied' });
            return;
        }
        
        jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
            if (err) {
                res.status(403).json({ error: 'Invalid token' });
                return;
            }
            req.user = user;
            next();
        });
    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// Create task with validation
app.post('/tasks', authenticateToken, async (req: any, res: Response): Promise<void> => {
    try {
        const { title, description } = req.body;
        
        if (!title || !description) {
            res.status(400).json({ error: 'Title and description are required' });
            return;
        }

        const task = new Task({ 
            title, 
            description, 
            userId: req.user.id, 
            status: 'pending' 
        });
        await task.save();
        
        if (channel) {
            await channel.sendToQueue('taskQueue', Buffer.from(JSON.stringify({
                id: task._id,
                title,
                description,
                userId: req.user.id
            })));
        }
        
        logger.info(`Task created: ${task._id}`);
        res.status(201).json({ id: task._id, status: 'pending' });
    } catch (error) {
        logger.error(`Task creation error: ${error}`);
        res.status(400).json({ error: 'Error creating task' });
    }
});

// Update task with enhanced validation
app.put('/tasks/:id', authenticateToken, async (req: any, res: Response): Promise<void> => {
    try {
        const { title, description, status } = req.body;
        const task = await Task.findOne({ _id: req.params.id, isDeleted: false });
        
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        if (req.user.role !== 'admin' && task.userId.toString() !== req.user.id) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        
        const updates: any = {};
        if (title) updates.title = title;
        if (description) updates.description = description;
        if (status) updates.status = status;
        
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        );
        
        if (channel && updatedTask) {
            await channel.sendToQueue('taskQueue', Buffer.from(JSON.stringify({
                id: task._id,
                ...updates
            })));
        }
        
        logger.info(`Task updated: ${task._id}`);
        if (updatedTask) {
            res.json({ id: updatedTask._id, status: updatedTask.status });
        } else {
            res.status(500).json({ error: 'Failed to update task' });
        }
    } catch (error) {
        logger.error(`Task update error: ${error}`);
        res.status(400).json({ error: 'Error updating task' });
    }
});

// Soft delete task
app.delete('/tasks/:id', authenticateToken, async (req: any, res: Response): Promise<void> => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        if (req.user.role !== 'admin' && task.userId.toString() !== req.user.id) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Update the task to set isDeleted flag
        await Task.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });

        if (channel) {
            await channel.sendToQueue('taskQueue', Buffer.from(JSON.stringify({
                id: task._id,
                operation: 'delete'
            })));
        }

        logger.info(`Task deleted: ${task._id}`);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        logger.error(`Task deletion error: ${error}`);
        res.status(400).json({ error: 'Error deleting task' });
    }
});

// Get task with blockchain status
app.get('/tasks/:id', authenticateToken, async (req: any, res: Response): Promise<void> => {
    try {
        const task = await Task.findOne({ _id: req.params.id, isDeleted: false });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        if (req.user.role !== 'admin' && task.userId.toString() !== req.user.id) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        res.json(task);
    } catch (error) {
        logger.error(`Task retrieval error: ${error}`);
        res.status(400).json({ error: 'Error retrieving task' });
    }
});

// List tasks with filtering and pagination
app.get('/tasks', authenticateToken, async (req: any, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = req.query.status;
        
        const query: any = { isDeleted: false };
        if (req.user.role !== 'admin') {
            query.userId = req.user.id;
        }
        if (status) {
            query.status = status;
        }
        
        const tasks = await Task.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });
            
        const total = await Task.countDocuments(query);
        
        res.json({
            tasks,
            pagination: {
                current: page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error(`Tasks retrieval error: ${error}`);
        res.status(400).json({ error: 'Error retrieving tasks' });
    }
});

// Batch update tasks (admin only)
app.post('/tasks/batch/status', authenticateToken, async (req: any, res: Response): Promise<void> => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const { taskIds, status } = req.body;
        if (!Array.isArray(taskIds) || !status) {
            res.status(400).json({ error: 'Invalid input' });
            return;
        }

        const result = await Task.updateMany(
            { _id: { $in: taskIds }, isDeleted: false },
            { $set: { status } }
        );

        if (channel) {
            await channel.sendToQueue('taskQueue', Buffer.from(JSON.stringify({
                taskIds,
                status,
                operation: 'batchUpdate'
            })));
        }

        logger.info(`Batch status update: ${taskIds.length} tasks`);
        res.json({ 
            message: 'Batch update successful',
            modified: result.modifiedCount
        });
    } catch (error) {
        logger.error(`Batch update error: ${error}`);
        res.status(400).json({ error: 'Error updating tasks' });
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
        await mongoose.connection.close();
    } catch (error) {
        logger.error('Error during graceful shutdown:', error);
    }
    process.exit(0);
});

app.listen(3001, () => logger.info('Task Service running on port 3001'));