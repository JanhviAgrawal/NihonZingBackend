const statusCode = require('http-status-codes');
const PageContentService = require('../../services/content/pageContent.service');
const { errorResponse, successResponse } = require('../../utils/response');
const { MSG } = require('../../utils/msg');

const pageContentService = new PageContentService();

module.exports = {
    // GET /page-content/:pageKey — public, no auth (the landing page needs
    // to render before a visitor has logged in).
    get: async (req, res) => {
        try {
            const data = await pageContentService.get(req.params.pageKey);
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, MSG.DATA_FETCH_SUCCESS, data)
            );
        } catch (error) {
            console.log('Get Page Content Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    },

    // PUT /content/page-content/:pageKey — admin only.
    update: async (req, res) => {
        try {
            if (!req.admin) {
                return res.status(statusCode.FORBIDDEN).json(
                    errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS)
                );
            }
            const data = await pageContentService.upsert(req.params.pageKey, req.body.content ?? req.body);
            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, 'Saved successfully', data)
            );
        } catch (error) {
            console.log('Update Page Content Error: ', error);
            return res.status(statusCode.BAD_REQUEST).json(
                errorResponse(statusCode.BAD_REQUEST, true, error.message)
            );
        }
    }
};
