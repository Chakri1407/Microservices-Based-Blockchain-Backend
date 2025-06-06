"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const taskSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true },
    description: { type: String },
    userId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirmed'], default: 'pending' }
});
exports.Task = mongoose_1.default.model('Task', taskSchema);
