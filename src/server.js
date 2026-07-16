const express = require('require');
const express = require('express');
require('dotenv').config();

const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require("./config/db.config");

const app = express();

// --- CRITICAL FIX: CHANGED PORT TO 5005 ---
// If your .env file has PORT=5000, you must change it there too!
const PORT = process.env.PORT || 5005; 

// --- UPDATED CORS CONFIGURATION ---
// Accepting both origin formats ensures the preflight request won't fail.
app.use(cors({
    origin: [
        'https://nihon-zing.vercel.app', 
        'https://nihon-zing.vercel.app/'
    ],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/auth', authLimiter);
app.use('/api', require('./routes/index'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, (err) => {
    if (err) {
        console.error("Server Not Started...!", err);
    }
    console.log(`🚀 Server Started on PORT ${PORT}..`);
});