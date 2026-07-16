module.exports.isSuperAdmin = (req, res, next) => {
    // Assuming your authMiddleware attaches req.admin
    if (req.admin && req.admin.role === 'SUPER_ADMIN') {
        next();
    } else {
        return res.status(403).json({ error: "Access denied. Super Admins only." });
    }
};