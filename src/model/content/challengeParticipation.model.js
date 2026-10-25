const mongoose = require("mongoose");

// Tracks a user's relationship to a challenge. coinsSpent/coinsEarned are
// future-facing fields (see Challenge model comment) — always 0 today.
const ChallengeParticipationSchema = new mongoose.Schema({
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['joined', 'completed'],
        default: 'joined'
    },
    joinedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },

    // --- Future coin/reward system architecture (not enforced yet) ---
    coinsSpent: { type: Number, default: 0 },
    coinsEarned: { type: Number, default: 0 }
}, { timestamps: true });

ChallengeParticipationSchema.index({ challenge: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("ChallengeParticipation", ChallengeParticipationSchema, "ChallengeParticipation");
