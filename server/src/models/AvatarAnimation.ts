import mongoose, { Document, Schema } from 'mongoose';

export type StateType = 'happy' | 'sad' | 'sleepy' | 'stressed' | 'neutral';

export interface IAvatarAnimation extends Document {
    userId: mongoose.Types.ObjectId;
    stateType: StateType;
    videoUrl: string;
    duration?: number;
    createdAt: Date;
    updatedAt: Date;
}

const AvatarAnimationSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        stateType: {
            type: String,
            enum: ['happy', 'sad', 'sleepy', 'stressed', 'neutral'],
            required: true,
        },
        videoUrl: { type: String, required: true },
        duration: { type: Number },
    },
    { timestamps: true }
);

// Compound index to quickly find a specific user's specific state
AvatarAnimationSchema.index({ userId: 1, stateType: 1 }, { unique: true });

export const AvatarAnimation = mongoose.models.AvatarAnimation || mongoose.model<IAvatarAnimation>('AvatarAnimation', AvatarAnimationSchema);
