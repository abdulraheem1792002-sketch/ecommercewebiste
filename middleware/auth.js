/**
 * Authentication Middleware
 */

/**
 * Require user to be authenticated
 */
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please login to access this resource'
        });
    }
    next();
}

/**
 * Require user to be admin
 */
function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please login to access this resource'
        });
    }

    if (req.session.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Access denied',
            message: 'Admin privileges required'
        });
    }
    next();
}

/**
 * Optional auth - attaches user if logged in but doesn't require it
 */
function optionalAuth(req, res, next) {
    // Just pass through, session user will be available if logged in
    next();
}

module.exports = {
    requireAuth,
    requireAdmin,
    optionalAuth
};
