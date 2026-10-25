const statusCode = require('http-status-codes');
const ChallengeService = require('../../services/content/challenge.service');
const ChallengeParticipationService = require('../../services/content/challengeParticipation.service');
const { errorResponse, successResponse } = require('../../utils/response');
const { MSG } = require('../../utils/msg');

const challengeService = new ChallengeService();
const participationService = new ChallengeParticipationService();

module.exports = {
    // GET /content/challenges — admins with ?all=true see every status;
    // everyone else (regular logged-in users) sees published only.
    list: async (req, res) => {
        try {
            const items = (req.admin && req.query.all === 'true')
                ? await challengeService.listAll()
                : await challengeService.listPublished();
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, items)
            );
        } catch (error) {
            console.log('List Challenges Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    },

    getOne: async (req, res) => {
        try {
            const item = await challengeService.getById(req.params.id, { adminView: !!req.admin });
            if (!item) {
                return res.status(statusCode.NOT_FOUND).json(
                    errorResponse(statusCode.NOT_FOUND, true, MSG.DATA_NOT_FOUND)
                );
            }
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, item)
            );
        } catch (error) {
            console.log('Get Challenge Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    },

    create: async (req, res) => {
        try {
            if (!req.admin) {
                return res.status(statusCode.FORBIDDEN).json(
                    errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS)
                );
            }
            const created = await challengeService.create(req.body);
            return res.status(statusCode.CREATED).json(
                successResponse(statusCode.CREATED, false, 'Created successfully', created)
            );
        } catch (error) {
            console.log('Create Challenge Error: ', error);
            return res.status(statusCode.BAD_REQUEST).json(
                errorResponse(statusCode.BAD_REQUEST, true, error.message)
            );
        }
    },

    update: async (req, res) => {
        try {
            if (!req.admin) {
                return res.status(statusCode.FORBIDDEN).json(
                    errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS)
                );
            }
            const updated = await challengeService.update(req.params.id, req.body);
            if (!updated) {
                return res.status(statusCode.NOT_FOUND).json(
                    errorResponse(statusCode.NOT_FOUND, true, MSG.DATA_NOT_FOUND)
                );
            }
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, 'Updated successfully', updated)
            );
        } catch (error) {
            console.log('Update Challenge Error: ', error);
            return res.status(statusCode.BAD_REQUEST).json(
                errorResponse(statusCode.BAD_REQUEST, true, error.message)
            );
        }
    },

    remove: async (req, res) => {
        try {
            if (!req.admin) {
                return res.status(statusCode.FORBIDDEN).json(
                    errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS)
                );
            }
            const deleted = await challengeService.softDelete(req.params.id);
            if (!deleted) {
                return res.status(statusCode.NOT_FOUND).json(
                    errorResponse(statusCode.NOT_FOUND, true, MSG.DATA_NOT_FOUND)
                );
            }
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, 'Deleted successfully', deleted)
            );
        } catch (error) {
            console.log('Delete Challenge Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    },

    // PATCH /content/challenges/:id/status  { status: 'draft'|'published'|'completed' }
    setStatus: async (req, res) => {
        try {
            if (!req.admin) {
                return res.status(statusCode.FORBIDDEN).json(
                    errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS)
                );
            }
            const { status } = req.body;
            if (!['draft', 'published', 'completed'].includes(status)) {
                return res.status(statusCode.BAD_REQUEST).json(
                    errorResponse(statusCode.BAD_REQUEST, true, 'Invalid status.')
                );
            }
            const updated = await challengeService.setStatus(req.params.id, status);
            if (!updated) {
                return res.status(statusCode.NOT_FOUND).json(
                    errorResponse(statusCode.NOT_FOUND, true, MSG.DATA_NOT_FOUND)
                );
            }
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, `Status set to ${status}`, updated)
            );
        } catch (error) {
            console.log('Set Challenge Status Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    },

    // POST /content/challenges/:id/join — any logged-in user.
    join: async (req, res) => {
        try {
            if (!req.user) {
                return res.status(statusCode.FORBIDDEN).json(
                    errorResponse(statusCode.FORBIDDEN, true, 'Only logged-in users can join challenges.')
                );
            }
            const challenge = await challengeService.getById(req.params.id, { adminView: false });
            if (!challenge) {
                return res.status(statusCode.NOT_FOUND).json(
                    errorResponse(statusCode.NOT_FOUND, true, 'This challenge is not available.')
                );
            }
            const participation = await participationService.join(req.params.id, req.user._id);
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, 'Joined challenge', participation)
            );
        } catch (error) {
            console.log('Join Challenge Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    },

    // GET /content/challenges/:id/participation — current user's own status.
    myParticipation: async (req, res) => {
        try {
            if (!req.user) {
                return res.status(statusCode.OK).json(
                    successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, null)
                );
            }
            const participation = await participationService.getForUser(req.params.id, req.user._id);
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, participation)
            );
        } catch (error) {
            console.log('Get Participation Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    },

    // GET /content/challenges/:id/participants — admin only, basic list.
    participants: async (req, res) => {
        try {
            if (!req.admin) {
                return res.status(statusCode.FORBIDDEN).json(
                    errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS)
                );
            }
            const participants = await participationService.listForChallenge(req.params.id);
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, participants)
            );
        } catch (error) {
            console.log('List Participants Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    },

    // GET /content/challenges/mine — challenges the current user has joined.
    mine: async (req, res) => {
        try {
            if (!req.user) {
                return res.status(statusCode.OK).json(
                    successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, [])
                );
            }
            const items = await participationService.listForUser(req.user._id);
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, items)
            );
        } catch (error) {
            console.log('List My Challenges Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    }
};
