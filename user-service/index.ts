import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from './swagger.json';
import winston from 'winston';
import { User } from './models/user';

// Extend the Request interface to include user property
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

const app = express();
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'user-service.log' })]
});

app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/user-service');

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).send('Access denied');
        return;
    }
        
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
        if (err) {
            res.status(403).send('Invalid token');
            return;
        }
        req.user = user;
        next();
    });
};

app.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword, role });
        await user.save();
        logger.info(`User registered: ${email}`);
        res.status(201).send('User registered');
    } catch (error) {
        logger.error(`Registration error: ${error}`);
        res.status(400).send('Error registering user');
    }
});

app.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !await bcrypt.compare(password, user.password)) {
            res.status(401).send('Invalid credentials');
            return;
        }
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        logger.info(`User logged in: ${email}`);
        res.json({ token });
    } catch (error) {
        logger.error(`Login error: ${error}`);
        res.status(400).send('Error logging in');
    }
});

app.get('/users/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || (req.user.role !== 'admin' && req.user.id !== req.params.id)) {
            res.status(403).send('Access denied');
            return;
        }
        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).send('User not found');
            return;
        }
        res.json({ email: user.email, role: user.role });
    } catch (error) {
        logger.error(`User retrieval error: ${error}`);
        res.status(400).send('Error retrieving user');
    }
});

app.listen(3000, () => logger.info('User Service running on port 3000'));