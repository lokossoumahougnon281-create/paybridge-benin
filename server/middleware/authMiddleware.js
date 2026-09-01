const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'PAYBRIDGE_BENIN_SECRET_JWT_KEY_2026_PROD';

function requireAuth(req, res, next) {
    let token = null;

    if (req.cookies && req.cookies.pb_token) {
        token = req.cookies.pb_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Accès non autorisé. Veuillez vous connecter.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Session expirée ou invalide. Veuillez vous re-connecter.' });
    }
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user && (req.user.role === 'admin' || req.user.isAdmin)) {
            next();
        } else {
            return res.status(403).json({ success: false, message: 'Accès interdit. Droits Administrateur requis.' });
        }
    });
}

module.exports = {
    JWT_SECRET,
    requireAuth,
    requireAdmin
};
