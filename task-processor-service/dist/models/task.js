"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const taskSchema = new mongoose_1.default.Schema({
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
exports.Task = mongoose_1.default.model('Task', taskSchema);
