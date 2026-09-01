const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 login / OTP attempts per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Trop de tentatives de connexion/OTP. Par sécurité, réessayez dans 15 minutes.'
    }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Limite de requêtes atteinte. Veuillez patienter un instant.'
    }
});

module.exports = {
    authLimiter,
    apiLimiter
};
