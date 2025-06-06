"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("../index"));
const task_1 = require("../models/task");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
describe('Task Service API', () => {
    beforeAll(async () => {
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-service-test');
    });
    afterAll(async () => {
        await mongoose_1.default.connection.close();
    });
    const token = jsonwebtoken_1.default.sign({ id: 'test-user-id', role: 'user' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    it('should create a task', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/tasks')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Test Task', description: 'Test Description' });
        expect(response.status).toBe(201);
        expect(response.body.status).toBe('pending');
    });
    it('should retrieve tasks for a user', async () => {
        await new task_1.Task({ title: 'Test Task', description: 'Test Description', userId: 'test-user-id', status: 'pending' }).save();
        const response = await (0, supertest_1.default)(index_1.default)
            .get('/tasks')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
    });
});
