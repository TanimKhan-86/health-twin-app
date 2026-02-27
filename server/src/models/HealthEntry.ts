import mongoose, { Document, Schema } from 'mongoose';

export interface IHealthEntry extends Document {
    userId: mongoose.Types.ObjectId;
    date: Date;
    steps: number;
    sleepHours: number;
    waterLitres: number;
    heartRate: number;
    energyScore?: number;
    weight?: number;
    notes?: string;
    createdAt: Date;
}

const HealthEntrySchema = new Schema<IHealthEntry>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        date: { type: Date, required: true },
        steps: { type: Number, default: 0, min: 0 },
        sleepHours: { type: Number, default: 0, min: 0, max: 24 },
        waterLitres: { type: Number, default: 0, min: 0 },
        heartRate: { type: Number, default: 0, min: 0 },
        energyScore: { type: Number, default: null, min: 0, max: 100 },
        weight: { type: Number, min: 0 },
        notes: { type: String, trim: true },
    },
    { timestamps: true }
);

export default mongoose.model<IHealthEntry>('HealthEntry', HealthEntrySchema);
