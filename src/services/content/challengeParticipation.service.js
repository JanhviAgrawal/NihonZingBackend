const ChallengeParticipation = require('../../model/content/challengeParticipation.model');

module.exports = class ChallengeParticipationService {
    async join(challengeId, userId) {
        // Idempotent — re-hitting "join" on an already-joined challenge just
        // returns the existing record instead of erroring.
        return ChallengeParticipation.findOneAndUpdate(
            { challenge: challengeId, user: userId },
            { $setOnInsert: { challenge: challengeId, user: userId, status: 'joined', joinedAt: new Date() } },
            { new: true, upsert: true }
        );
    }

    async getForUser(challengeId, userId) {
        return ChallengeParticipation.findOne({ challenge: challengeId, user: userId });
    }

    async listForUser(userId) {
        return ChallengeParticipation.find({ user: userId }).populate('challenge').sort({ joinedAt: -1 });
    }

    async listForChallenge(challengeId) {
        return ChallengeParticipation.find({ challenge: challengeId })
            .populate('user', 'first_name last_name email')
            .sort({ joinedAt: -1 });
    }
};
