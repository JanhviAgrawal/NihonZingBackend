const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
require('dotenv').config();
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');

require("./config/db.config");
const { initSocket } = require('./utils/socket');

const {
    securityHeaders, sanitizeInput, apiLimiter, loginLimiter, otpLimiter
} = require('./middleware/security.middleware');

// Fail fast if the token-signing secret is missing, and warn loudly if it is weak.
// (A short secret lets anyone who captures one token brute-force it offline and
// then forge admin tokens. Use 48+ random characters, e.g.:
//   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
if (!process.env.JWT_SECRET_KEY || !process.env.JWT_SECRET_KEY.trim()) {
    console.error('FATAL: JWT_SECRET_KEY is not set.');
    process.exit(1);
}
if (process.env.JWT_SECRET_KEY.trim().length < 32) {
    console.warn('\n⚠️  SECURITY WARNING: JWT_SECRET_KEY is shorter than 32 characters. Replace it with a long random value.\n');
}

const app = express();
const PORT = process.env.PORT || 5005;
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
// The app runs behind Render's proxy: trust exactly one hop so rate limiting
// sees each visitor's real IP instead of the proxy's.
app.set('trust proxy', 1);
app.use(securityHeaders);

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
            const err = new Error('Not allowed by CORS'); err.status = 403; callback(err);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // PATCH is used by the admin 'toggle active' endpoints
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(sanitizeInput);

// Rate limits: general API ceiling + much stricter limits on credential endpoints
app.use('/api', apiLimiter);
app.use(['/api/auth/user/login', '/api/auth/admin/login'], loginLimiter);
app.use([
    '/api/auth/user/register',
    '/api/auth/user/forgot-password',
    '/api/auth/user/verify-otp',
    '/api/auth/user/new-password',
    '/api/auth/admin/register',
    '/api/auth/admin/forgot-password',
    '/api/auth/admin/verify-otp',
    '/api/auth/admin/new-password',
], otpLimiter);

app.use('/api', require('./routes/index'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Bug fix: with no error-handling middleware, any error thrown outside a
// route's own try/catch (a rejected CORS origin, a multer/Cloudinary upload
// failure, a malformed request body, etc.) fell through to Express's default
// handler, which returns a raw HTML "Internal Server Error" page instead of
// JSON — breaking every frontend fetch() call that expects `.json()`.
// Unknown routes -> clean JSON 404
app.use((req, res) => {
    res.status(404).json({ status: 404, error: true, message: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) {
        return next(err);
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        status,
        error: true,
        // Never leak internal error details (stack, DB / library messages) to clients in production
        message: status >= 500 && isProd ? 'Internal Server Error' : (err.message || 'Internal Server Error')
    });
});

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
    console.log(`🚀 Server Started on PORT ${PORT}..`);
});