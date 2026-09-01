const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const db = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const transferRoutes = require('./routes/transferRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false // Allow inline SVG and icons
}));
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply Rate Limiter to API routes
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transfer', transferRoutes);
app.use('/api/v1/admin', adminRoutes);

// Serve Static Frontend Assets
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

// Health Check Endpoint for Cloud Deployments (Render / Railway / Heroku)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', service: 'PayBridge Benin API' });
});

// Fallback to index.html for single page app
app.use((req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        res.status(404).json({ success: false, message: 'Endpoint API non trouvé.' });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur PayBridge Bénin démarré sur port ${PORT}`);
    console.log(`🔒 Sécurité activée : Bcrypt + JWT Cookies + SQLite DB + Rate Limiter.`);
});
