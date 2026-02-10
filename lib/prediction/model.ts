/**
 * Prediction Service
 * 
 * Handles logic for "What-If" simulations.
 * Predicts energy scores and mood states based on input parameters.
 */

export interface PredictionResult {
    predictedEnergy: number;
    predictedMoodState: string;
    energyImpact: number; // difference from current
    narrative: string;
}

/**
 * Calculate predicted energy score based on sleep and steps
 * Formula: (Sleep/8 * 60) + (Steps/10000 * 40)
 * Max score capped at 100
 */
export const calculatePredictedEnergy = (sleepHours: number, steps: number): number => {
    const sleepComp = Math.min((sleepHours / 8) * 60, 60);
    const stepsComp = Math.min((steps / 10000) * 40, 40);

    // Add a small curve for diminishing returns or penalties?
    // For now, linear is easier to understand.

    return Math.round(sleepComp + stepsComp);
};

/**
 * Determine mood state based on inputs
 */
export const predictMoodState = (sleep: number, energy: number): string => {
    if (sleep >= 7.5 && energy >= 80) return "Radiant 🌟";
    if (sleep >= 7 && energy >= 70) return "Energetic 🚀";
    if (sleep >= 6 && energy >= 50) return "Balanced 😊";
    if (sleep < 5 && energy < 40) return "Exhausted 😫";
    if (sleep < 6) return "Tired 😴";
    return "Low Energy 🔋";
};

/**
 * Generate a short insight string
 */
export const generatePredictionInsight = (
    currentEnergy: number,
    predictedEnergy: number,
    sleepDiff: number,
    stepsDiff: number
): string => {
    const diff = predictedEnergy - currentEnergy;

    if (diff > 5) {
        if (sleepDiff > 0 && stepsDiff > 0) {
            return `Great choice! More rest and movement could boost your energy by ${diff} points.`;
        }
        if (sleepDiff > 0) {
            return `That extra sleep is powerful! It's contributing significantly to a +${diff} energy boost.`;
        }
        return `Moving more is paying off! Your activity increase adds ${diff} points to your score.`;
    }

    if (diff < -5) {
        return `Careful! Reducing your healthy habits could drop your energy by ${Math.abs(diff)} points.`;
    }

    return "Maintaining your current habits keeps your energy stable.";
};
