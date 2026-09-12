const KanaService = require('../../services/content/kana.service');
const { makeCrudController } = require('./crud.factory');
const statusCode = require('http-status-codes');
const { errorResponse, successResponse } = require('../../utils/response');
const { MSG } = require('../../utils/msg');

const kanaService = new KanaService();

const baseController = makeCrudController(kanaService, {
    buildListFilter: (req) => {
        const filter = {};
        if (req.query.type === 'hiragana' || req.query.type === 'katakana') {
            filter.type = req.query.type;
        }
        return filter;
    }
});

module.exports = {
    ...baseController,

    // POST /content/kana/:id/audio  (multipart, field name "audio")
    // Cloudinary upload already ran via multer before this handler executes;
    // req.file.path is the secure URL, req.file.filename is the public_id.
    uploadAudio: async (req, res) => {
        try {
            if (!req.admin) {
                return res.status(statusCode.FORBIDDEN).json(
                    errorResponse(statusCode.FORBIDDEN, true, MSG.UNAUTHORIZED_ACCESS)
                );
            }
            if (!req.file) {
                return res.status(statusCode.BAD_REQUEST).json(
                    errorResponse(statusCode.BAD_REQUEST, true, 'No audio file uploaded.')
                );
            }

            const updated = await kanaService.update(req.params.id, {
                audioUrl: req.file.path,
                audioPublicId: req.file.filename
            });

            if (!updated) {
                return res.status(statusCode.NOT_FOUND).json(
                    errorResponse(statusCode.NOT_FOUND, true, MSG.DATA_NOT_FOUND)
                );
            }

            return res.status(statusCode.OK).json(
                successResponse(statusCode.OK, false, 'Audio uploaded successfully', updated)
            );
        } catch (error) {
            console.log('Upload Audio Error: ', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
                errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, error.message)
            );
        }
    }
};
