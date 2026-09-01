const { db, logSecurityEvent } = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateSuccessSms, generateErrorSms } = require('../utils/smsGenerator');

function generateReference() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = 'PB-2026-';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// EXECUTE INTER-NETWORK TRANSFER (ATOMIC TRANSACTION)
function executeTransfer(req, res) {
    const { sourceNet, sourcePhone, destNet, destPhone, grossAmount, pin } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!sourceNet || !sourcePhone || !destNet || !destPhone || !grossAmount) {
        return res.status(400).json({ success: false, message: 'Informations de transfert incomplètes.' });
    }

    const gross = parseInt(grossAmount, 10);
    if (isNaN(gross) || gross < 500) {
        return res.status(400).json({ success: false, message: 'Le montant minimum de transfert est de 500 FCFA.' });
    }

    // Verify PIN if user is logged in
    if (userId) {
        const user = db.prepare('SELECT pin_hash FROM users WHERE id = ?').get(userId);
        if (user && pin) {
            const isMatch = bcrypt.compareSync(pin, user.pin_hash);
            if (!isMatch) {
                const errSms = generateErrorSms({ sourceNet, sourcePhone, reason: 'Code PIN incorrect' });
                return res.status(401).json({ 
                    success: false, 
                    message: 'Code PIN de sécurité incorrect.',
                    smsNotification: errSms
                });
            }
        }
    }

    // Calculate Fees (1.0% fee)
    const fee = Math.round(gross * 0.01);
    const net = gross - fee;
    const ref = generateReference();

    // Fetch pools
    const srcPool = db.prepare('SELECT * FROM pools WHERE network_key = ?').get(sourceNet);
    const dstPool = db.prepare('SELECT * FROM pools WHERE network_key = ?').get(destNet);

    if (!srcPool || !dstPool) {
        return res.status(400).json({ success: false, message: 'Réseau d\'origine ou destinataire non supporté.' });
    }

    if (dstPool.balance < net) {
        const errSms = generateErrorSms({ sourceNet, sourcePhone, reason: `Liquidité insuffisante sur ${dstPool.name}` });
        return res.status(400).json({ 
            success: false, 
            message: `Liquidité insuffisante sur le réseau ${dstPool.name}.`,
            smsNotification: errSms
        });
    }

    // Perform atomic DB updates
    const executeDbTx = db.transaction(() => {
        // Update Pools
        db.prepare('UPDATE pools SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE network_key = ?').run(gross, sourceNet);
        db.prepare('UPDATE pools SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE network_key = ?').run(net, destNet);

        // Record Transaction
        const stmt = db.prepare(`
            INSERT INTO transactions (reference, user_id, source_net, source_phone, dest_net, dest_phone, gross_amount, fee_amount, net_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS')
        `);
        stmt.run(ref, userId, sourceNet, sourcePhone, destNet, destPhone, gross, fee, net);
    });

    try {
        executeDbTx();

        logSecurityEvent('TRANSFER_EXECUTED', sourcePhone, `Ref: ${ref}, ${gross} FCFA from ${sourceNet} to ${destNet} (${destPhone})`, req);

        const tx = {
            id: ref,
            sourceNet: sourceNet,
            sourcePhone: sourcePhone,
            destNet: destNet,
            destPhone: destPhone,
            gross: gross,
            fee: fee,
            net: net,
            status: 'SUCCESS',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Generate official SMS notifications
        const smsNotifications = generateSuccessSms({
            ref,
            sourceNet,
            sourcePhone,
            destNet,
            destPhone,
            gross,
            fee,
            net
        });

        return res.json({
            success: true,
            message: '⚡ Transfert effectué avec succès !',
            transaction: tx,
            smsNotifications: smsNotifications
        });
    } catch (err) {
        console.error('Transfer execution error:', err);
        return res.status(500).json({ success: false, message: 'Erreur lors du traitement de la transaction.' });
    }
}

// GET TRANSACTION HISTORY
function getTransactionHistory(req, res) {
    try {
        const rows = db.prepare('SELECT * FROM transactions ORDER BY id DESC LIMIT 50').all();
        const formatted = rows.map(r => ({
            id: r.reference,
            sourceNet: r.source_net,
            sourcePhone: r.source_phone,
            destNet: r.dest_net,
            destPhone: r.dest_phone,
            gross: r.gross_amount,
            fee: r.fee_amount,
            net: r.net_amount,
            status: r.status,
            timestamp: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(r.created_at).toLocaleDateString('fr-FR')
        }));

        return res.json({ success: true, history: formatted });
    } catch (err) {
        console.error('Fetch history error:', err);
        return res.status(500).json({ success: false, message: 'Erreur d\'extraction de l\'historique.' });
    }
}

module.exports = {
    executeTransfer,
    getTransactionHistory
};
