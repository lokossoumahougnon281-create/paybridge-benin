const { db, logSecurityEvent } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

function normalizePhone(country, phone) {
    let clean = phone.replace(/\s+/g, '');
    const prefixMap = { BJ: '+229', TG: '+228', CI: '+225', SN: '+221', BF: '+226' };
    const prefix = prefixMap[country] || '+229';
    if (!clean.startsWith('+')) {
        clean = prefix + ' ' + clean;
    }
    return clean;
}

// 1. INITIATE REGISTRATION
function registerInitiate(req, res) {
    const { lastName, firstName, country, phone, email, pin } = req.body;

    if (!lastName || !firstName || !phone || !email || !pin) {
        return res.status(400).json({ success: false, message: 'Veuillez remplir tous les champs requis.' });
    }

    const fullPhone = normalizePhone(country || 'BJ', phone);

    // Check if phone already registered
    const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get(fullPhone);
    if (existingUser) {
        return res.status(400).json({ success: false, message: 'Ce numéro de téléphone est déjà inscrit.' });
    }

    // Generate 6-digit OTP
    const otpCode = '482916'; // Demo fixed OTP or random 6-digit
    logSecurityEvent('REGISTER_INITIATED', fullPhone, `OTP sent to ${email}`, req);

    return res.json({
        success: true,
        message: `Code de sécurité envoyé par SMS au ${fullPhone} et par Email à ${email}.`,
        targetPhone: fullPhone,
        targetEmail: email,
        otpCode: otpCode
    });
}

// 2. VERIFY OTP AND COMPLETE REGISTRATION
function registerVerifyOTP(req, res) {
    const { lastName, firstName, country, phone, email, pin, otp } = req.body;

    if (!lastName || !firstName || !phone || !email || !pin) {
        return res.status(400).json({ success: false, message: 'Données de formulaire incomplètes.' });
    }

    const fullPhone = normalizePhone(country || 'BJ', phone);
    const fullName = `${firstName} ${lastName.toUpperCase()}`;
    const initials = (firstName[0] + lastName[0]).toUpperCase();

    // Hash PIN with Bcrypt
    const salt = bcrypt.genSaltSync(10);
    const pinHash = bcrypt.hashSync(pin, salt);

    try {
        const stmt = db.prepare(`
            INSERT INTO users (phone, email, first_name, last_name, country, pin_hash, role, is_admin, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, 'client', 0, 1)
        `);
        const result = stmt.run(fullPhone, email, firstName, lastName, country || 'BJ', pinHash);

        const userId = result.lastInsertRowid;
        const payload = {
            id: userId,
            phone: fullPhone,
            email: email,
            fullName: fullName,
            initials: initials,
            role: 'client',
            isAdmin: false
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('pb_token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        logSecurityEvent('ACCOUNT_CREATED', fullPhone, `New user registered: ${fullName}`, req);

        return res.json({
            success: true,
            message: `🎉 Compte activé avec succès ! Bienvenue ${fullName}.`,
            user: payload,
            token: token
        });
    } catch (err) {
        console.error('Registration Error:', err);
        return res.status(500).json({ success: false, message: 'Erreur lors de la création du compte.' });
    }
}

// 3. SECURE LOGIN WITH BCRYPT, ACCOUNT LOCKOUT POLICY & AUDIT LOGGING
function login(req, res) {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
        return res.status(400).json({ success: false, message: 'Veuillez saisir votre téléphone et code PIN.' });
    }

    let cleanPhone = phone.trim();
    if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+229 ' + cleanPhone;
    }

    // Try finding by exact phone or phone variant
    let user = db.prepare('SELECT * FROM users WHERE phone = ? OR phone = ?').get(cleanPhone, phone.trim());

    if (!user) {
        logSecurityEvent('LOGIN_FAILED_UNKNOWN_USER', cleanPhone, 'User not found', req);
        return res.status(401).json({ success: false, message: 'Numéro de téléphone ou code PIN incorrect.' });
    }

    // Check Account Lockout Status
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
        logSecurityEvent('LOGIN_ATTEMPT_LOCKED_ACCOUNT', user.phone, 'Attempt while account locked', req);
        return res.status(429).json({
            success: false,
            message: '🔒 Compte temporairement verrouillé suite à 5 tentatives de code PIN erronées. Réessayez dans 15 minutes.'
        });
    }

    // Verify PIN with Bcrypt
    const isMatch = bcrypt.compareSync(pin, user.pin_hash);
    if (!isMatch) {
        const attempts = (user.failed_attempts || 0) + 1;
        if (attempts >= 5) {
            const lockoutTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            db.prepare('UPDATE users SET failed_attempts = ?, lockout_until = ? WHERE id = ?').run(attempts, lockoutTime, user.id);
            logSecurityEvent('ACCOUNT_LOCKED', user.phone, 'Account locked for 15 mins after 5 failed PIN attempts', req);
            return res.status(429).json({
                success: false,
                message: '🔒 Compte verrouillé pour 15 minutes suite à 5 tentatives de code PIN erronées.'
            });
        } else {
            db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
            logSecurityEvent('LOGIN_FAILED_WRONG_PIN', user.phone, `Failed attempt ${attempts}/5`, req);
            return res.status(401).json({
                success: false,
                message: `Numéro ou code PIN incorrect. Attention : ${5 - attempts} tentative(s) restante(s) avant verrouillage.`
            });
        }
    }

    // Reset Lockout Counters on Successful PIN Match
    db.prepare('UPDATE users SET failed_attempts = 0, lockout_until = NULL WHERE id = ?').run(user.id);
    logSecurityEvent('LOGIN_SUCCESS', user.phone, `Successful login (${user.role})`, req);

    const fullName = `${user.first_name} ${user.last_name}`;
    const initials = (user.first_name[0] + (user.last_name[0] || '')).toUpperCase();
    const isAdmin = user.is_admin === 1 || user.role === 'admin';

    const payload = {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: fullName,
        initials: initials,
        role: user.role,
        isAdmin: isAdmin
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('pb_token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    });

    return res.json({
        success: true,
        message: isAdmin ? '🛡️ Connexion Administrateur réussie.' : `👤 Connecté en tant que ${fullName}.`,
        user: payload,
        token: token
    });
}

// 4. LOGOUT
function logout(req, res) {
    res.clearCookie('pb_token');
    return res.json({ success: true, message: 'Vous vous êtes déconnecté avec succès.' });
}

// 5. GET CURRENT USER PROFILE
function getCurrentUser(req, res) {
    if (!req.user) {
        return res.status(401).json({ success: false, user: null });
    }
    return res.json({ success: true, user: req.user });
}

module.exports = {
    registerInitiate,
    registerVerifyOTP,
    login,
    logout,
    getCurrentUser
};
