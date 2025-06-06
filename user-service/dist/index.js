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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swaggerDocument = __importStar(require("./swagger.json"));
const winston_1 = __importDefault(require("winston"));
const user_1 = require("./models/user");
const app = (0, express_1.default)();
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    transports: [new winston_1.default.transports.File({ filename: 'user-service.log' })]
});
app.use(express_1.default.json());
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/user-service');
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).send('Access denied');
        return;
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) {
            res.status(403).send('Invalid token');
            return;
        }
        req.user = user;
        next();
    });
};
app.post('/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = new user_1.User({ email, password: hashedPassword, role });
        await user.save();
        logger.info(`User registered: ${email}`);
        res.status(201).send('User registered');
    }
    catch (error) {
        logger.error(`Registration error: ${error}`);
        res.status(400).send('Error registering user');
    }
});
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await user_1.User.findOne({ email });
        if (!user || !await bcrypt_1.default.compare(password, user.password)) {
            res.status(401).send('Invalid credentials');
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        logger.info(`User logged in: ${email}`);
        res.json({ token });
    }
    catch (error) {
        logger.error(`Login error: ${error}`);
        res.status(400).send('Error logging in');
    }
});
app.get('/users/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || (req.user.role !== 'admin' && req.user.id !== req.params.id)) {
            res.status(403).send('Access denied');
            return;
        }
        const user = await user_1.User.findById(req.params.id);
        if (!user) {
            res.status(404).send('User not found');
            return;
        }
        res.json({ email: user.email, role: user.role });
    }
    catch (error) {
        logger.error(`User retrieval error: ${error}`);
        res.status(400).send('Error retrieving user');
    }
});
app.listen(3000, () => logger.info('User Service running on port 3000'));
