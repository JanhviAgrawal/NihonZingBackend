const express = require('express');
const router = express.Router();
const multer = require('multer');

const { imageStorage, audioStorage } = require('../../middleware/storage.middleware');
const { isAdmin } = require('../../middleware/checkRole');

const uploadImage = multer({ storage: imageStorage });
const uploadAudio = multer({ storage: audioStorage });

const kanaController = require('../../controller/content/kana.controller');
const kanjiController = require('../../controller/content/kanji.controller');
const flashcardController = require('../../controller/content/flashcard.controller');
const bookController = require('../../controller/content/book.controller');
const pageContentController = require('../../controller/content/pageContent.controller');
const challengeController = require('../../controller/content/challenge.controller');
const quizController = require('../../controller/content/quiz.controller');
const quizResultController = require('../../controller/content/quizResult.controller');

// This whole router is mounted behind the global authMiddleware (see
// routes/index.js), so every route below already requires a valid user or
// admin token. `isAdmin` additionally restricts writes to admin accounts.

// --- Kana (hiragana / katakana) ---
router.get('/kana', kanaController.list);
router.get('/kana/:id', kanaController.getOne);
router.post('/kana', isAdmin, kanaController.create);
router.put('/kana/:id', isAdmin, kanaController.update);
router.delete('/kana/:id', isAdmin, kanaController.remove);
router.patch('/kana/:id/toggle-active', isAdmin, kanaController.toggleActive);
router.post('/kana/:id/audio', isAdmin, uploadAudio.single('audio'), kanaController.uploadAudio);

// --- Kanji ---
router.get('/kanji', kanjiController.list);
router.get('/kanji/:id', kanjiController.getOne);
router.post('/kanji', isAdmin, kanjiController.create);
router.put('/kanji/:id', isAdmin, kanjiController.update);
router.delete('/kanji/:id', isAdmin, kanjiController.remove);
router.patch('/kanji/:id/toggle-active', isAdmin, kanjiController.toggleActive);

// --- Flashcard decks ---
router.get('/flashcards', flashcardController.list);
router.get('/flashcards/:id', flashcardController.getOne);
router.post('/flashcards', isAdmin, flashcardController.create);
router.put('/flashcards/:id', isAdmin, flashcardController.update);
router.delete('/flashcards/:id', isAdmin, flashcardController.remove);
router.patch('/flashcards/:id/toggle-active', isAdmin, flashcardController.toggleActive);
router.post('/flashcards/upload-image', isAdmin, uploadImage.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 400, error: true, message: 'No image uploaded.' });
    }
    return res.json({ status: 200, error: false, message: 'Uploaded', result: { url: req.file.path, publicId: req.file.filename } });
});

// --- Books (Shop / Study Materials) ---
router.get('/books', bookController.list);
router.get('/books/:id', bookController.getOne);
router.post('/books', isAdmin, bookController.create);
router.put('/books/:id', isAdmin, bookController.update);
router.delete('/books/:id', isAdmin, bookController.remove);
router.patch('/books/:id/toggle-active', isAdmin, bookController.toggleActive);
router.post('/books/upload-image', isAdmin, uploadImage.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 400, error: true, message: 'No image uploaded.' });
    }
    return res.json({ status: 200, error: false, message: 'Uploaded', result: { url: req.file.path, publicId: req.file.filename } });
});

// Reviews (drive Book.ratingAvg / ratingCount — see review.service.js).
// Any logged-in user can add/update their own review; nobody edits others'.
router.get('/books/:id/reviews', bookController.listReviews);
router.post('/books/:id/reviews', bookController.addReview);

// --- Page Content (UI Elements / Landing Page Management) ---
// GET is public (routes/content/pageContent.public.route.js, mounted before
// authMiddleware) — this PUT is the admin-only write side, reachable at
// /content/page-content/:pageKey.
router.put('/page-content/:pageKey', isAdmin, pageContentController.update);

// --- Challenges ---
router.get('/challenges', challengeController.list);
router.get('/challenges/mine', challengeController.mine);
router.get('/challenges/:id', challengeController.getOne);
router.post('/challenges', isAdmin, challengeController.create);
router.put('/challenges/:id', isAdmin, challengeController.update);
router.delete('/challenges/:id', isAdmin, challengeController.remove);
router.patch('/challenges/:id/status', isAdmin, challengeController.setStatus);
router.get('/challenges/:id/participants', isAdmin, challengeController.participants);
router.post('/challenges/:id/join', challengeController.join);
router.get('/challenges/:id/participation', challengeController.myParticipation);
router.post('/challenges/upload-banner', isAdmin, uploadImage.single('banner'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 400, error: true, message: 'No banner uploaded.' });
    }
    return res.json({ status: 200, error: false, message: 'Uploaded', result: { url: req.file.path, publicId: req.file.filename } });
});

// --- Quiz (1 question + 4 options + correct answer, per QuizPage.tsx's format) ---
router.get('/quiz', quizController.list);
router.get('/quiz/:id', quizController.getOne);
router.post('/quiz', isAdmin, quizController.create);
router.put('/quiz/:id', isAdmin, quizController.update);
router.delete('/quiz/:id', isAdmin, quizController.remove);
router.patch('/quiz/:id/toggle-active', isAdmin, quizController.toggleActive);

// --- Quiz Results ---
// /mine MUST be registered before /:id-style routes don't apply here (no
// dynamic id route exists on this sub-path), but kept as a distinct path
// for clarity and to make "these two are different concerns" obvious.
router.post('/quiz-results', quizResultController.save);
router.get('/quiz-results/mine', quizResultController.mine);

module.exports = router;
