import mongoose, { Document, Schema } from 'mongoose';

export type MoodType = 'happy' | 'sad' | 'stressed' | 'tired' | 'energetic' | 'neutral';

export interface IMoodEntry extends Document {
    userId: mongoose.Types.ObjectId;
    date: Date;
    mood: MoodType;
    energyLevel: number;   // 1–10
    stressLevel: number;   // 1–10
    notes?: string;
    createdAt: Date;
}

const MoodEntrySchema = new Schema<IMoodEntry>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        date: { type: Date, required: true },
        mood: {
            type: String,
            enum: ['happy', 'sad', 'stressed', 'tired', 'energetic', 'neutral'],
            required: true,
        },
        energyLevel: { type: Number, required: true, min: 1, max: 10 },
        stressLevel: { type: Number, required: true, min: 1, max: 10 },
        notes: { type: String, trim: true },
    },
    { timestamps: true }
);

export default mongoose.model<IMoodEntry>('MoodEntry', MoodEntrySchema);
