/**
 * PayBridge Bénin - Générateur de SMS Officiels par Opérateur
 */

const OPERATOR_CONFIGS = {
    mtn: {
        name: "MTN MobileMoney",
        color: "#FFCC00",
        textColor: "#000000",
        senderHeader: "MTN MoMo",
        badge: "MTN",
        icon: "fa-solid fa-signal"
    },
    moov: {
        name: "Moov Money",
        color: "#005CA9",
        textColor: "#FFFFFF",
        senderHeader: "Moov Money",
        badge: "MOOV",
        icon: "fa-solid fa-mobile-screen-button"
    },
    celtiis: {
        name: "Celtiis Cash",
        color: "#00A859",
        textColor: "#FFFFFF",
        senderHeader: "Celtiis Cash",
        badge: "CELTIIS",
        icon: "fa-solid fa-leaf"
    },
    wave: {
        name: "Wave",
        color: "#1DC3E7",
        textColor: "#000000",
        senderHeader: "Wave CI/BJ",
        badge: "WAVE",
        icon: "fa-solid fa-water"
    },
    orange: {
        name: "Orange Money",
        color: "#FF6600",
        textColor: "#FFFFFF",
        senderHeader: "Orange Money",
        badge: "ORANGE",
        icon: "fa-solid fa-sun"
    },
    tmoney: {
        name: "TMoney",
        color: "#008751",
        textColor: "#FFFFFF",
        senderHeader: "TMoney Togocom",
        badge: "TMONEY",
        icon: "fa-solid fa-bolt"
    }
};

function formatAmount(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount);
}

/**
 * Génère les messages SMS pour l'expéditeur et le destinataire lors d'un transfert réussi
 */
function generateSuccessSms({ ref, sourceNet, sourcePhone, destNet, destPhone, gross, fee, net }) {
    const srcOp = OPERATOR_CONFIGS[sourceNet] || { name: sourceNet.toUpperCase(), senderHeader: sourceNet.toUpperCase(), color: "#4B5563", textColor: "#FFF", badge: sourceNet.toUpperCase() };
    const dstOp = OPERATOR_CONFIGS[destNet] || { name: destNet.toUpperCase(), senderHeader: destNet.toUpperCase(), color: "#4B5563", textColor: "#FFF", badge: destNet.toUpperCase() };

    const formattedGross = formatAmount(gross);
    const formattedNet = formatAmount(net);
    const formattedFee = formatAmount(fee);
    const dateStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // SMS pour l'expéditeur
    let senderSms = "";
    switch (sourceNet) {
        case 'mtn':
            senderSms = `MTN MobileMoney: Transfert de ${formattedGross} FCFA effectué vers le ${destPhone} (${dstOp.name}) via PayBridge. Réf: ${ref}. Frais: ${formattedFee} FCFA. Heure: ${dateStr}. Merci d'utiliser MTN MoMo.`;
            break;
        case 'moov':
            senderSms = `Moov Money: Votre envoi de ${formattedGross} FCFA à ${destPhone} (${dstOp.name}) a été traité avec succès. Réf: ${ref}. Frais: ${formattedFee} FCFA.`;
            break;
        case 'celtiis':
            senderSms = `Celtiis Cash: Transfert réussi de ${formattedGross} FCFA vers ${destPhone} (${dstOp.name}). ID Transaction: ${ref}. Frais appliqués: ${formattedFee} FCFA.`;
            break;
        case 'wave':
            senderSms = `Wave: Vous avez envoyé ${formattedGross} FCFA au ${destPhone} (${dstOp.name}). Frais PayBridge: ${formattedFee} FCFA. Réf: ${ref}. Sans frais de retrait!`;
            break;
        default:
            senderSms = `${srcOp.senderHeader}: Transfert de ${formattedGross} FCFA envoyé à ${destPhone}. Réf: ${ref}.`;
    }

    // SMS pour le destinataire
    let recipientSms = "";
    switch (destNet) {
        case 'mtn':
            recipientSms = `MTN MobileMoney: Vous avez reçu ${formattedNet} FCFA du ${sourcePhone} (${srcOp.name}) via PayBridge. Réf: ${ref}. NOUVEAU SOLDE DISPONIBLE.`;
            break;
        case 'moov':
            recipientSms = `Moov Money: Dépôt de ${formattedNet} FCFA reçu de ${sourcePhone} (${srcOp.name}). Réf: ${ref}. Merci d'utiliser Moov Money.`;
            break;
        case 'celtiis':
            recipientSms = `Celtiis Cash: Votre compte a été crédité de ${formattedNet} FCFA par ${sourcePhone}. ID: ${ref}. Heure: ${dateStr}.`;
            break;
        case 'wave':
            recipientSms = `Wave: Vous avez reçu ${formattedNet} FCFA de ${sourcePhone} (${srcOp.name}). Réf: ${ref}. Gratuit au retrait!`;
            break;
        default:
            recipientSms = `${dstOp.senderHeader}: Vous avez reçu ${formattedNet} FCFA de ${sourcePhone}. Réf: ${ref}.`;
    }

    return {
        sender: {
            operatorKey: sourceNet,
            header: srcOp.senderHeader,
            phone: sourcePhone,
            text: senderSms,
            config: srcOp
        },
        recipient: {
            operatorKey: destNet,
            header: dstOp.senderHeader,
            phone: destPhone,
            text: recipientSms,
            config: dstOp
        }
    };
}

/**
 * Génère le message SMS en cas d'échec de la transaction
 */
function generateErrorSms({ sourceNet, sourcePhone, reason }) {
    const srcOp = OPERATOR_CONFIGS[sourceNet] || { name: sourceNet.toUpperCase(), senderHeader: sourceNet.toUpperCase(), color: "#EF4444", textColor: "#FFF", badge: sourceNet.toUpperCase() };
    const dateStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let text = `${srcOp.senderHeader}: Échec du transfert. Motif: ${reason}. Aucun prélèvement n'a été effectué sur votre compte. (${dateStr})`;

    return {
        operatorKey: sourceNet,
        header: srcOp.senderHeader,
        phone: sourcePhone,
        text: text,
        config: srcOp
    };
}

module.exports = {
    OPERATOR_CONFIGS,
    generateSuccessSms,
    generateErrorSms
};
