const express = require('express');
const router = express.Router();
const pageContentController = require('../../controller/content/pageContent.controller');

// Public — no authMiddleware — so the landing/intro page can render before
// a visitor logs in. Mounted in routes/index.js BEFORE authMiddleware.
router.get('/:pageKey', pageContentController.get);

module.exports = router;
