module.exports.isSuperAdmin = (req, res, next) => {
    // Assuming your authMiddleware attaches req.admin
    if (req.admin && req.admin.role === 'SUPER_ADMIN') {
        next();
    } else {
        return res.status(403).json({ error: "Access denied. Super Admins only." });
    }
};

// Any authenticated admin (SUPER_ADMIN or SUB_ADMIN) — used to gate writes
// on content management routes (kana/kanji/flashcards/books) while GETs stay
// open to any logged-in user or admin.
module.exports.isAdmin = (req, res, next) => {
    if (req.admin) {
        next();
    } else {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
};