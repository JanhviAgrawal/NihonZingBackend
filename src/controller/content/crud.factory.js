const statusCode = require('http-status-codes');
const { MSG } = require('../../utils/msg');
const { errorResponse, successResponse } = require('../../utils/response');

/**
 * Builds a standard set of REST handlers around a CRUD service instance.
 * `buildListFilter` lets a specific resource add query-param filtering
 * (e.g. Kana filtering by ?type=hiragana) without re-writing the whole
 * controller.
 */
function makeCrudController(service, { buildListFilter } = {}) {
    return {
        list: async (req, res) => {
            try {
                const filter = buildListFilter ? buildListFilter(req) : {};
                // Admins (and only admins) can request inactive/hidden items too,
                // e.g. so the admin dashboard table shows everything.
                const includeInactive = !!req.admin && req.query.all === 'true';
                const items = await service.list(filter, { includeInactive });
                return res.status(statusCode.OK).json(
                    successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, items)
                );
            } catch (error) {
                console.log('List Error: ', error);
                return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                    errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
                );
            }
        },

        getOne: async (req, res) => {
            try {
                const item = await service.getById(req.params.id);
                if (!item) {
                    return res.status(statusCode.NOT_FOUND).json(
                        errorResponse(statusCode.NOT_FOUND, true, MSG.DATA_NOT_FOUND)
                    );
                }
                return res.status(statusCode.OK).json(
                    successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, item)
                );
            } catch (error) {
                console.log('Get One Error: ', error);
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
                const created = await service.create(req.body);
                return res.status(statusCode.CREATED).json(
                    successResponse(statusCode.CREATED, false, 'Created successfully', created)
                );
            } catch (error) {
                console.log('Create Error: ', error);
                const isDup = error.code === 11000;
                return res.status(isDup ? statusCode.CONFLICT : statusCode.BAD_REQUEST).json(
                    errorResponse(
                        isDup ? statusCode.CONFLICT : statusCode.BAD_REQUEST,
                        true,
                        isDup ? 'This entry already exists.' : error.message
                    )
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
                const updated = await service.update(req.params.id, req.body);
                if (!updated) {
                    return res.status(statusCode.NOT_FOUND).json(
                        errorResponse(statusCode.NOT_FOUND, true, MSG.DATA_NOT_FOUND)
                    );
                }
                return res.status(statusCode.OK).json(
                    successResponse(statusCode.OK, false, 'Updated successfully', updated)
                );
            } catch (error) {
                console.log('Update Error: ', error);
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
                const deleted = await service.softDelete(req.params.id);
                if (!deleted) {
                    return res.status(statusCode.NOT_FOUND).json(
                        errorResponse(statusCode.NOT_FOUND, true, MSG.DATA_NOT_FOUND)
                    );
                }
                return res.status(statusCode.OK).json(
                    successResponse(statusCode.OK, false, 'Deleted successfully', deleted)
                );
            } catch (error) {
                console.log('Delete Error: ', error);
                return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                    errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
                );
            }
        },

        toggleActive: async (req, res) => {
            try {
                if (!req.admin) {
                    return res.status(statusCode.FORBIDDEN).json(
                        errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS)
                    );
                }
                const updated = await service.toggleActive(req.params.id);
                if (!updated) {
                    return res.status(statusCode.NOT_FOUND).json(
                        errorResponse(statusCode.NOT_FOUND, true, MSG.DATA_NOT_FOUND)
                    );
                }
                return res.status(statusCode.OK).json(
                    successResponse(statusCode.OK, false, `Now ${updated.isActive ? 'active' : 'inactive'}`, updated)
                );
            } catch (error) {
                console.log('Toggle Active Error: ', error);
                return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                    errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
                );
            }
        }
    };
}

module.exports = { makeCrudController };
