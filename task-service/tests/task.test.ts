import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../index';
import { Task } from '../models/task';
import jwt from 'jsonwebtoken';

describe('Task Service API', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-service-test');
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    const token = jwt.sign({ id: 'test-user-id', role: 'user' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    it('should create a task', async () => {
        const response = await supertest(app)
            .post('/tasks')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Test Task', description: 'Test Description' });
        
        expect(response.status).toBe(201);
        expect(response.body.status).toBe('pending');
    });

    it('should retrieve tasks for a user', async () => {
        await new Task({ title: 'Test Task', description: 'Test Description', userId: 'test-user-id', status: 'pending' }).save();
        const response = await supertest(app)
            .get('/tasks')
            .set('Authorization', `Bearer ${token}`);
        
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
    });
});