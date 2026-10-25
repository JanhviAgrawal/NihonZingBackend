// Security middleware — implemented with built-ins and the already-installed
// `express-rate-limit`, so no new dependencies are needed.
const rateLimit = require('express-rate-limit');

// ---------------------------------------------------------------------------
// 1. Security headers (the same protections `helmet` provides)
// ---------------------------------------------------------------------------
module.exports.securityHeaders = (req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // the API is called from nihonzing.com
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    // This server only returns JSON — lock the response down completely.
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    // API responses (tokens, profile data) must never be cached by browsers/proxies
    res.setHeader('Cache-Control', 'no-store');
    next();
};

// ---------------------------------------------------------------------------
// 2. NoSQL-injection / prototype-pollution sanitiser
//    Strips keys that start with "$" (Mongo operators like {"$ne": null}) or
//    contain "." and the prototype-pollution keys from body, query and params.
// ---------------------------------------------------------------------------
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function clean(value, depth = 0) {
    if (depth > 10) return value;
    if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
    if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
        const out = {};
        for (const key of Object.keys(value)) {
            if (key.startsWith('$') || key.includes('.') || FORBIDDEN_KEYS.has(key)) continue;
            out[key] = clean(value[key], depth + 1);
        }
        return out;
    }
    return value;
}

module.exports.sanitizeInput = (req, res, next) => {
    if (req.body && typeof req.body === 'object') req.body = clean(req.body);
    // Express 5 computes req.query on every access, so assign a sanitised copy as an own property
    Object.defineProperty(req, 'query', { value: clean({ ...req.query }), writable: true, configurable: true, enumerable: true });
    if (req.params && typeof req.params === 'object') req.params = clean(req.params);
    next();
};

// ---------------------------------------------------------------------------
// 3. Rate limiting (brute-force / spam protection)
// ---------------------------------------------------------------------------
const tooMany = (message) => ({ status: 429, error: true, message });

// Everything under /api: generous, stops scripted floods
module.exports.apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many requests. Please slow down and try again shortly.'),
});

// Login endpoints: 10 failed attempts per 15 minutes per IP (successful logins don't count)
module.exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many login attempts. Please try again in 15 minutes.'),
});

// Anything that sends an email / checks an OTP / resets a password
module.exports.otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: tooMany('Too many attempts. Please wait a few minutes and try again.'),
});
