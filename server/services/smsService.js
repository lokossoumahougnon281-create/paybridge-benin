/**
 * PayBridge Bénin - Service d'expédition de vrais SMS (SMS Gateway)
 * Supporte : Termii (Afrique de l'Ouest / Bénin), Twilio (Mondial) et Mode Simulation
 */

// Charge les variables d'environnement depuis .env de façon autonome
function loadEnv() {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
        try {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const [key, ...rest] = trimmed.split('=');
                    if (key) {
                        const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
                        if (!process.env[key.trim()]) {
                            process.env[key.trim()] = val;
                        }
                    }
                }
            });
        } catch (e) {
            console.warn('Erreur lecture .env:', e.message);
        }
    }
}
loadEnv();

/**
 * Normalise un numéro béninois ou sous-régional
 * Exemples:
 *  "01 97 12 34 56" -> "2290197123456"
 *  "+229 01 62 18 04 26" -> "2290162180426"
 */
function normalizePhoneNumber(rawPhone, withPlus = false) {
    if (!rawPhone) return '';
    let cleaned = rawPhone.toString().replace(/[^0-9+]/g, '');

    if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('00')) {
        cleaned = cleaned.substring(2);
    }

    // Si numéro local béninois à 10 chiffres (ex: 0197123456)
    if (cleaned.length === 10 && cleaned.startsWith('01')) {
        cleaned = '229' + cleaned;
    }
    // Si ancien format à 8 chiffres (ex: 97123456)
    else if (cleaned.length === 8) {
        cleaned = '22901' + cleaned;
    }

    // Si pas encore d'indicatif pays et fait ~8-10 chiffres
    if (!cleaned.startsWith('229') && !cleaned.startsWith('228') && !cleaned.startsWith('225') && cleaned.length <= 10) {
        cleaned = '229' + cleaned;
    }

    return withPlus ? `+${cleaned}` : cleaned;
}

/**
 * Envoi via Termii (Recommandé pour Bénin et Afrique de l'Ouest)
 */
async function sendViaTermii(to, message) {
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID || 'PayBridge';
    if (!apiKey) throw new Error('TERMII_API_KEY manquant');

    const formattedPhone = normalizePhoneNumber(to, false);
    const payload = JSON.stringify({
        to: formattedPhone,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: apiKey
    });

    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: payload
    });

    const result = await response.json();
    if (!response.ok || (result && result.code && result.code !== 'ok')) {
        throw new Error(result.message || `Termii Error ${response.status}`);
    }
    return { provider: 'termii', messageId: result.message_id || 'OK', to: formattedPhone };
}

/**
 * Envoi via Twilio
 */
async function sendViaTwilio(to, message) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Identifiants Twilio incomplets (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
    }

    const formattedPhone = normalizePhoneNumber(to, true);
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const params = new URLSearchParams();
    params.append('To', formattedPhone);
    params.append('From', fromNumber);
    params.append('Body', message);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || `Twilio Error ${response.status}`);
    }
    return { provider: 'twilio', messageId: result.sid, to: formattedPhone };
}

/**
 * Envoie un SMS individuel vers un numéro donné
 */
async function sendSingleSms(to, message) {
    const provider = (process.env.SMS_PROVIDER || '').toLowerCase();

    // 1. Termii
    if (provider === 'termii' || process.env.TERMII_API_KEY) {
        return await sendViaTermii(to, message);
    }

    // 2. Twilio
    if (provider === 'twilio' || process.env.TWILIO_ACCOUNT_SID) {
        return await sendViaTwilio(to, message);
    }

    // 3. Fallback Sandbox / Simulation
    const norm = normalizePhoneNumber(to, true);
    console.log(`📡 [SMS SANDBOX SIMULÉ] Envoi vers ${norm} : "${message.substring(0, 75)}..."`);
    return {
        provider: 'sandbox',
        simulated: true,
        to: norm,
        note: 'Aucune clé SMS configurée dans .env. SMS simulé avec succès.'
    };
}

/**
 * Dispatche les SMS réels pour le transfert (Expéditeur et Destinataire) de façon asynchrone
 */
async function dispatchRealSms(smsNotifications) {
    if (!smsNotifications) return;

    const tasks = [];

    if (smsNotifications.sender && smsNotifications.sender.phone && smsNotifications.sender.text) {
        tasks.push(
            sendSingleSms(smsNotifications.sender.phone, smsNotifications.sender.text)
                .then(res => {
                    console.log(`✅ [SMS Expéditeur] Envoyé via ${res.provider} vers ${res.to}`);
                    return res;
                })
                .catch(err => {
                    console.warn(`⚠️ [SMS Expéditeur Échec] Impossible d'envoyer à ${smsNotifications.sender.phone}:`, err.message);
                })
        );
    }

    if (smsNotifications.recipient && smsNotifications.recipient.phone && smsNotifications.recipient.text) {
        tasks.push(
            sendSingleSms(smsNotifications.recipient.phone, smsNotifications.recipient.text)
                .then(res => {
                    console.log(`✅ [SMS Destinataire] Envoyé via ${res.provider} vers ${res.to}`);
                    return res;
                })
                .catch(err => {
                    console.warn(`⚠️ [SMS Destinataire Échec] Impossible d'envoyer à ${smsNotifications.recipient.phone}:`, err.message);
                })
        );
    }

    return Promise.allSettled(tasks);
}

module.exports = {
    normalizePhoneNumber,
    sendSingleSms,
    dispatchRealSms
};
