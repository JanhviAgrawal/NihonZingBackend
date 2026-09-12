/**
 * Seeds the Kana / Kanji / FlashcardDeck / Book collections from the data
 * that used to be hardcoded in the frontend (src/data/*.ts).
 *
 * The JSON in ./seed-data was generated once by parsing those .ts files;
 * the actual audio clips and the one real flashcard image live in
 * ./seed-assets and get uploaded to Cloudinary here.
 *
 * Usage:
 *   cd backend
 *   node src/scripts/seed-content.js
 *
 * Safe to re-run: each collection is only seeded if it's currently empty.
 * Requires the same .env as the server (MONGO_URI, CLOUD_NAME,
 * CLOUD_API_KEY, CLOUD_API_SECRET).
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const Kana = require('../model/content/kana.model');
const Kanji = require('../model/content/kanji.model');
const FlashcardDeck = require('../model/content/flashcardDeck.model');

const DATA_DIR = path.join(__dirname, 'seed-data');
const AUDIO_DIR = path.join(__dirname, 'seed-assets', 'audios');
const IMAGE_DIR = path.join(__dirname, 'seed-assets', 'images');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    secure: true
});

function loadJson(name) {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

async function uploadAudio(fileName) {
    const filePath = path.join(AUDIO_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.warn(`  ! audio file not found, skipping upload: ${fileName}`);
        return { url: '', publicId: '' };
    }
    const result = await cloudinary.uploader.upload(filePath, {
        folder: 'Nihon-Zing/audio',
        resource_type: 'video', // Cloudinary's bucket for non-image media, incl. audio
        public_id: path.parse(fileName).name,
        overwrite: false
    });
    return { url: result.secure_url, publicId: result.public_id };
}

async function uploadImage(fileName) {
    const filePath = path.join(IMAGE_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.warn(`  ! image file not found, skipping upload: ${fileName}`);
        return { url: '', publicId: '' };
    }
    const result = await cloudinary.uploader.upload(filePath, {
        folder: 'Nihon-Zing',
        public_id: path.parse(fileName).name,
        overwrite: false
    });
    return { url: result.secure_url, publicId: result.public_id };
}

async function seedKana() {
    const existing = await Kana.countDocuments();
    if (existing > 0) {
        console.log(`Kana already has ${existing} docs, skipping.`);
        return;
    }

    const hiragana = loadJson('hiragana.json');
    const katakana = loadJson('katakana.json');
    const all = [...hiragana, ...katakana];

    console.log(`Seeding ${all.length} kana entries (uploading audio to Cloudinary)...`);

    let order = 0;
    for (const entry of all) {
        let audioUrl = '';
        let audioPublicId = '';
        if (entry.audioFile) {
            const uploaded = await uploadAudio(entry.audioFile);
            audioUrl = uploaded.url;
            audioPublicId = uploaded.publicId;
        }

        await Kana.create({
            character: entry.character,
            type: entry.type,
            romaji: entry.romaji,
            hindi: entry.hindi,
            strokes: entry.strokes,
            startPoints: entry.startPoints,
            audioUrl,
            audioPublicId,
            order: order++
        });
    }
    console.log('Kana seed complete.');
}

async function seedKanji() {
    const existing = await Kanji.countDocuments();
    if (existing > 0) {
        console.log(`Kanji already has ${existing} docs, skipping.`);
        return;
    }

    const kanji = loadJson('kanji.json');
    console.log(`Seeding ${kanji.length} kanji entries...`);

    const docs = kanji.map((entry, i) => ({
        character: entry.character,
        english: entry.english,
        hindi: entry.hindi,
        strokes: entry.strokes,
        startPoints: entry.startPoints,
        order: i
    }));
    await Kanji.insertMany(docs);
    console.log('Kanji seed complete.');
}

async function seedFlashcards() {
    const existing = await FlashcardDeck.countDocuments();
    if (existing > 0) {
        console.log(`FlashcardDeck already has ${existing} docs, skipping.`);
        return;
    }

    const decks = loadJson('flashcards.json');
    console.log(`Seeding ${decks.length} flashcard decks...`);

    // Cache uploads so the same local file (e.g. Flashcard1.png) isn't
    // re-uploaded once per card that references it.
    const uploadCache = new Map();
    const resolveImage = async (image) => {
        if (!image) return { url: '', publicId: '' };
        if (image.startsWith('http://') || image.startsWith('https://')) {
            // Already a real URL (the placehold.co dummy images) — keep as-is.
            return { url: image, publicId: '' };
        }
        if (uploadCache.has(image)) return uploadCache.get(image);
        const uploaded = await uploadImage(image);
        uploadCache.set(image, uploaded);
        return uploaded;
    };

    let order = 0;
    for (const deck of decks) {
        const cards = [];
        for (const card of deck.cards) {
            const { url, publicId } = await resolveImage(card.image);
            cards.push({
                image: url,
                imagePublicId: publicId,
                frontText: card.frontText,
                backText: card.backText,
                text3: card.text3 || '',
                text4: card.text4 || ''
            });
        }

        await FlashcardDeck.create({
            title: deck.title,
            order: order++,
            cards,
            quiz: (deck.quiz || []).map(q => ({
                question: q.question,
                options: q.options,
                correctAnswerIndex: q.correctAnswerIndex
            }))
        });
    }
    console.log('FlashcardDeck seed complete.');
}

async function run() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not set — copy .env.example to .env and fill it in first.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding.');

    await seedKana();
    await seedKanji();
    await seedFlashcards();

    console.log('\nAll done. Books/shop products were not seeded — there was no');
    console.log('existing book data to migrate (StudyMaterial.tsx used mock data');
    console.log('with price: 0 placeholders), so add real ones from the admin dashboard.');

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
