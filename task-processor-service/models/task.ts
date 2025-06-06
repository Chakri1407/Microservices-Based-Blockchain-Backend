import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    description: { 
        type: String, 
        required: true,
        trim: true
    },
    userId: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'completed', 'failed'],
        default: 'pending'
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    blockchainTxHash: {
        type: String,
        sparse: true
    },
    retryCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ isDeleted: 1 });

export const Task = mongoose.model('Task', taskSchema);