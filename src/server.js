const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
require('dotenv').config();
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');

require("./config/db.config");
const { initSocket } = require('./utils/socket');

const app = express();
const PORT = process.env.PORT || 5005;

// Matches production domain + any Vercel preview deploy for this project
const allowedOrigins = [
    'https://nihonzing.com',
    'https://nihon-zing.vercel.app',
    'http://localhost:5173'
];
const previewPattern = /^https:\/\/nihon-zing-[a-z0-9]+-janhvis-projects-[a-z0-9]+\.vercel\.app$/;

function isAllowedOrigin(origin) {
    if (!origin) return true; // non-browser requests (no Origin header)
    return allowedOrigins.includes(origin) || previewPattern.test(origin);
}

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', require('./routes/index'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Bug fix: with no error-handling middleware, any error thrown outside a
// route's own try/catch (a rejected CORS origin, a multer/Cloudinary upload
// failure, a malformed request body, etc.) fell through to Express's default
// handler, which returns a raw HTML "Internal Server Error" page instead of
// JSON — breaking every frontend fetch() call that expects `.json()`.
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) {
        return next(err);
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        status,
        error: true,
        message: err.message || 'Internal Server Error'
    });
});

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
    console.log(`🚀 Server Started on PORT ${PORT}..`);
});