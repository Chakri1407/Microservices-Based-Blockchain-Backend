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
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const amqplib_1 = __importDefault(require("amqplib"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swaggerDocument = __importStar(require("./swagger.json"));
const winston_1 = __importDefault(require("winston"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const task_1 = require("./models/task");
const app = (0, express_1.default)();
// Enhanced logging configuration
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'task-service.log' })
    ]
});
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(express_1.default.json());
app.use(limiter);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
// MongoDB connection with retry logic
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-service');
        logger.info('MongoDB connected successfully');
    }
    catch (error) {
        logger.error('MongoDB connection error:', error);
        setTimeout(connectDB, 5000);
    }
};
connectDB();
// RabbitMQ connection management
let connection = null;
let channel = null;
const connectQueue = async () => {
    try {
        connection = await amqplib_1.default.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        channel = await connection.createChannel();
        await channel.assertQueue('taskQueue');
        logger.info('RabbitMQ connected successfully');
    }
    catch (error) {
        logger.error('RabbitMQ connection error:', error);
        setTimeout(connectQueue, 5000);
    }
};
connectQueue();
// Enhanced token authentication
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token)
            return res.status(401).json({ error: 'Access denied' });
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
            if (err)
                return res.status(403).json({ error: 'Invalid token' });
            req.user = user;
            next();
        });
    }
    catch (error) {
        logger.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};
// Create task with validation
app.post('/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }
        const task = new task_1.Task({
            title,
            description,
            userId: req.user.id,
            status: 'pending'
        });
        await task.save();
        if (channel) {
            channel.sendToQueue('taskQueue', Buffer.from(JSON.stringify({
                id: task._id,
                title,
                description,
                userId: req.user.id
            })));
        }
        logger.info(`Task created: ${task._id}`);
        res.status(201).json({ id: task._id, status: 'pending' });
    }
    catch (error) {
        logger.error(`Task creation error: ${error}`);
        res.status(400).json({ error: 'Error creating task' });
    }
});
// Update task with enhanced validation
app.put('/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { title, description, status } = req.body;
        const task = await task_1.Task.findOne({ _id: req.params.id, isDeleted: false });
        if (!task)
            return res.status(404).json({ error: 'Task not found' });
        if (req.user.role !== 'admin' && task.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const updates = {};
        if (title)
            updates.title = title;
        if (description)
            updates.description = description;
        if (status)
            updates.status = status;
        const updatedTask = await task_1.Task.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
        if (channel) {
            channel.sendToQueue('taskQueue', Buffer.from(JSON.stringify({
                id: task._id,
                ...updates
            })));
        }
        logger.info(`Task updated: ${task._id}`);
        res.json({ id: updatedTask._id, status: updatedTask.status });
    }
    catch (error) {
        logger.error(`Task update error: ${error}`);
        res.status(400).json({ error: 'Error updating task' });
    }
});
// Soft delete task
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const task = await task_1.Task.findById(req.params.id);
        if (!task)
            return res.status(404).json({ error: 'Task not found' });
        if (req.user.role !== 'admin' && task.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        task.isDeleted = true;
        await task.save();
        if (channel) {
            channel.sendToQueue('taskQueue', Buffer.from(JSON.stringify({
                id: task._id,
                operation: 'delete'
            })));
        }
        logger.info(`Task deleted: ${task._id}`);
        res.json({ message: 'Task deleted successfully' });
    }
    catch (error) {
        logger.error(`Task deletion error: ${error}`);
        res.status(400).json({ error: 'Error deleting task' });
    }
});
// Get task with blockchain status
app.get('/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const task = await task_1.Task.findOne({ _id: req.params.id, isDeleted: false });
        if (!task)
            return res.status(404).json({ error: 'Task not found' });
        if (req.user.role !== 'admin' && task.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(task);
    }
    catch (error) {
        logger.error(`Task retrieval error: ${error}`);
        res.status(400).json({ error: 'Error retrieving task' });
    }
});
// List tasks with filtering and pagination
app.get('/tasks', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const query = { isDeleted: false };
        if (req.user.role !== 'admin') {
            query.userId = req.user.id;
        }
        if (status) {
            query.status = status;
        }
        const tasks = await task_1.Task.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await task_1.Task.countDocuments(query);
        res.json({
            tasks,
            pagination: {
                current: page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        logger.error(`Tasks retrieval error: ${error}`);
        res.status(400).json({ error: 'Error retrieving tasks' });
    }
});
// Batch update tasks (admin only)
app.post('/tasks/batch/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { taskIds, status } = req.body;
        if (!Array.isArray(taskIds) || !status) {
            return res.status(400).json({ error: 'Invalid input' });
        }
        const result = await task_1.Task.updateMany({ _id: { $in: taskIds }, isDeleted: false }, { $set: { status } });
        if (channel) {
            channel.sendToQueue('taskQueue', Buffer.from(JSON.stringify({
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
    }
    catch (error) {
        logger.error(`Batch update error: ${error}`);
        res.status(400).json({ error: 'Error updating tasks' });
    }
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    if (channel)
        await channel.close();
    if (connection)
        await connection.close();
    await mongoose_1.default.connection.close();
    process.exit(0);
});
app.listen(3001, () => logger.info('Task Service running on port 3001'));
