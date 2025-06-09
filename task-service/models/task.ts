import mongoose, { Schema, Document } from 'mongoose';

interface ITask extends Document {
    title: string;
    description?: string;
    userId: string;
    status: 'pending' | 'confirmed';
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TaskSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    userId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirmed'], default: 'pending' },
    isDeleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

export const Task = mongoose.model<ITask>('Task', TaskSchema);