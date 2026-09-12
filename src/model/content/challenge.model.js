const mongoose = require("mongoose");

// Kept deliberately simple per spec ("do not overcomplicate the challenge
// model at this stage"). entryFeeCoins/rewardCoins exist now purely as
// architecture for a future coin system — nothing reads or enforces them
// yet, so adding real coin logic later won't require a schema migration.
const ChallengeSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    banner: { type: String, default: '' },
    bannerPublicId: { type: String, default: '' },
    category: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    rules: { type: String, default: '' },
    status: {
        type: String,
        enum: ['draft', 'published', 'completed'],
        default: 'draft'
    },
    order: { type: Number, default: 0 },

    // --- Future coin/reward system architecture (not enforced yet) ---
    entryFeeCoins: { type: Number, default: 0 },
    rewardCoins: { type: Number, default: 0 },

    isDelete: { type: Boolean, default: false }
}, { timestamps: true });

ChallengeSchema.index({ isDelete: 1, status: 1, order: 1 });

module.exports = mongoose.model("Challenge", ChallengeSchema, "Challenge");
