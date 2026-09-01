const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Ensure writable data directory exists for cloud environments (Render / Linux)
let dbPath;
try {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, 'paybridge.db');
} catch (err) {
    console.warn('⚠️ Could not create data directory, falling back to /tmp/paybridge.db');
    dbPath = '/tmp/paybridge.db';
}

let db;
try {
    db = new Database(dbPath);
    console.log(`✅ SQLite Database connected at: ${dbPath}`);
} catch (err) {
    console.warn('⚠️ SQLite file connection error, using in-memory DB:', err.message);
    db = new Database(':memory:');
}

// Enable WAL mode safely for cloud filesystems
try {
    db.pragma('journal_mode = WAL');
} catch (e) {
    console.warn('⚠️ WAL mode fallback:', e.message);
}

function initDb() {
    try {
        // Create Users table
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                country TEXT DEFAULT 'BJ',
                pin_hash TEXT NOT NULL,
                role TEXT DEFAULT 'client',
                is_admin INTEGER DEFAULT 0,
                is_verified INTEGER DEFAULT 1,
                failed_attempts INTEGER DEFAULT 0,
                lockout_until DATETIME DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create Security Logs table for Audit Security
        db.exec(`
            CREATE TABLE IF NOT EXISTS security_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                user_phone TEXT,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create Transactions table
        db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reference TEXT UNIQUE NOT NULL,
                user_id INTEGER,
                source_net TEXT NOT NULL,
                source_phone TEXT NOT NULL,
                dest_net TEXT NOT NULL,
                dest_phone TEXT NOT NULL,
                gross_amount INTEGER NOT NULL,
                fee_amount INTEGER NOT NULL,
                net_amount INTEGER NOT NULL,
                status TEXT DEFAULT 'SUCCESS',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Create Pools table
        db.exec(`
            CREATE TABLE IF NOT EXISTS pools (
                network_key TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                balance INTEGER NOT NULL,
                max_balance INTEGER NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seed default West Africa pools
        const poolCount = db.prepare('SELECT COUNT(*) as count FROM pools').get().count;
        if (poolCount < 6) {
            const insertPool = db.prepare('INSERT OR REPLACE INTO pools (network_key, name, balance, max_balance) VALUES (?, ?, ?, ?)');
            insertPool.run('mtn', 'MTN MoMo (Bénin / CI)', 45000000, 60000000);
            insertPool.run('orange', 'Orange Money (UEMOA)', 38000000, 50000000);
            insertPool.run('moov', 'Moov Money (UEMOA)', 35000000, 50000000);
            insertPool.run('wave', 'Wave Afrique', 40000000, 50000000);
            insertPool.run('celtiis', 'Celtiis Cash', 20000000, 30000000);
            insertPool.run('tmoney', 'TMoney Togocom', 18000000, 25000000);
            console.log('✅ West Africa Mobile Money pools initialized in SQLite DB.');
        }

        // Seed default Admin and Demo Client users if empty
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        if (userCount === 0) {
            const salt = bcrypt.genSaltSync(10);
            const adminPinHash = bcrypt.hashSync('2026', salt);
            const clientPinHash = bcrypt.hashSync('1234', salt);

            const insertUser = db.prepare(`
                INSERT INTO users (phone, email, first_name, last_name, country, pin_hash, role, is_admin, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            `);

            // Insert Admin
            insertUser.run('+229 01 90 00 00', 'admin@paybridge.bj', 'Superviseur', 'PAYBRIDGE', 'BJ', adminPinHash, 'admin', 1);

            // Insert Client
            insertUser.run('+229 01 97 12 34 56', 'koffi.sossou@gmail.com', 'Koffi', 'SOSSOU', 'BJ', clientPinHash, 'client', 0);

            console.log('✅ Default Admin and Demo Client seeded in SQLite DB.');
        }
    } catch (err) {
        console.error('❌ Database Initialization Error:', err);
    }
}

function logSecurityEvent(eventType, phone, details, req) {
    try {
        const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
        const ua = req ? req.headers['user-agent'] : 'ServerInternal';
        const stmt = db.prepare('INSERT INTO security_logs (event_type, user_phone, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)');
        stmt.run(eventType, phone || 'ANONYMOUS', details || '', ip, ua);
    } catch (e) {
        console.error('Audit Log Error:', e);
    }
}

initDb();

module.exports = {
    db,
    logSecurityEvent
};
