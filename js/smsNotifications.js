/**
 * PayBridge Bénin - Frontend SMS / Push Notification Manager
 * Simulation de notifications SMS Smartphone avec effet sonore Web Audio API
 */

window.SMSNotifications = (function() {
    let notifications = [];
    let unreadCount = 0;

    // Web Audio API Chime Synthesizer (Pas de fichier audio externe requis!)
    function playNotificationSound(type = 'success') {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            if (type === 'success') {
                // Smartphone chime double-tone (E5 to A5)
                osc1.frequency.setValueAtTime(659.25, now); // E5
                osc2.frequency.setValueAtTime(880.00, now + 0.1); // A5
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            } else {
                // Warning / Error tone
                osc1.frequency.setValueAtTime(440.00, now);
                osc2.frequency.setValueAtTime(330.00, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            }

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.1);
            osc2.start(now + 0.1);
            osc2.stop(now + 0.35);
        } catch (e) {
            console.log('Audio playback context prevented by browser policy or unsupported.');
        }
    }

    /**
     * Reçoit une ou deux notifications SMS et les affiche sous forme de Toast style Smartphone
     */
    function triggerSmsPush(smsObj, isRecipient = false) {
        if (!smsObj) return;

        const notifItem = {
            id: 'SMS-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            header: smsObj.header || 'SMS Opérateur',
            phone: smsObj.phone || '',
            text: smsObj.text || '',
            operatorKey: smsObj.operatorKey || 'mtn',
            config: smsObj.config || { color: '#FFCC00', textColor: '#000', badge: 'GSM' },
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRecipient: isRecipient,
            read: false
        };

        notifications.unshift(notifItem);
        unreadCount++;
        updateBellBadge();
        renderDrawerList();

        // Jouer le son de notification
        playNotificationSound('success');

        // Créer l'élément Toast Smartphone sur le DOM
        showToastBanner(notifItem);
    }

    function showToastBanner(notif) {
        let container = document.getElementById('sms-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'sms-toast-container';
            container.className = 'sms-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `sms-toast-card operator-${notif.operatorKey}`;
        toast.id = notif.id;
        toast.style.borderLeftColor = notif.config.color || '#2563EB';

        toast.innerHTML = `
            <div class="sms-toast-header">
                <div class="sms-toast-brand">
                    <span class="sms-op-badge" style="background: ${notif.config.color}; color: ${notif.config.textColor};">
                        ${notif.config.badge || notif.operatorKey.toUpperCase()}
                    </span>
                    <strong class="sms-op-title">${escapeHtml(notif.header)}</strong>
                    <span class="sms-toast-tag">${notif.isRecipient ? 'Destinataire' : 'Expéditeur'}</span>
                </div>
                <div class="sms-toast-meta">
                    <span class="sms-time">${notif.timestamp}</span>
                    <button class="sms-close-btn" onclick="SMSNotifications.closeToast('${notif.id}')">&times;</button>
                </div>
            </div>
            <div class="sms-toast-body">
                <p class="sms-text">${escapeHtml(notif.text)}</p>
            </div>
            <div class="sms-toast-actions">
                <button class="sms-act-btn btn-whatsapp" onclick="SMSNotifications.shareViaWhatsApp('${notif.id}')" title="Envoyer directement ce SMS via WhatsApp">
                    <i class="fa-brands fa-whatsapp"></i> Envoyer WhatsApp
                </button>
                <button class="sms-act-btn btn-copy" onclick="SMSNotifications.copyText('${notif.id}')">
                    <i class="fa-regular fa-copy"></i> Copier SMS
                </button>
                <button class="sms-act-btn btn-view" onclick="switchTab('history')">
                    <i class="fa-solid fa-receipt"></i> Voir Reçu
                </button>
            </div>
        `;

        container.appendChild(toast);

        // Auto-dismiss après 9 secondes
        setTimeout(() => {
            closeToast(notif.id);
        }, 9000);
    }

    function closeToast(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('sms-toast-hide');
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 300);
        }
    }

    function formatBeninPhoneForWhatsApp(rawPhone) {
        if (!rawPhone) return '';
        let cleaned = rawPhone.toString().replace(/[^0-9]/g, '');
        if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
        if (cleaned.length === 10 && cleaned.startsWith('01')) {
            cleaned = '229' + cleaned;
        } else if (cleaned.length === 8) {
            cleaned = '22901' + cleaned;
        } else if (!cleaned.startsWith('229') && cleaned.length <= 10) {
            cleaned = '229' + cleaned;
        }
        return cleaned;
    }

    function shareViaWhatsApp(id) {
        const notif = notifications.find(n => n.id === id);
        if (!notif) return;
        const phone = formatBeninPhoneForWhatsApp(notif.phone);
        const encodedText = encodeURIComponent(notif.text);
        const waUrl = phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(waUrl, '_blank');
    }

    function copyText(id) {
        const notif = notifications.find(n => n.id === id);
        if (notif && navigator.clipboard) {
            navigator.clipboard.writeText(notif.text).then(() => {
                if (typeof showToast === 'function') {
                    showToast('📋 Texte du SMS copié dans le presse-papier !', 'info');
                } else {
                    alert('Copie réussie : Le texte du SMS a été copié dans le presse-papier.');
                }
            });
        }
    }

    function updateBellBadge() {
        const badgeEl = document.getElementById('notif-bell-badge');
        if (badgeEl) {
            if (unreadCount > 0) {
                badgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badgeEl.style.display = 'inline-flex';
            } else {
                badgeEl.style.display = 'none';
            }
        }
    }

    function toggleDrawer() {
        const drawer = document.getElementById('notif-drawer-modal');
        if (!drawer) return;
        const willOpen = !drawer.classList.contains('active');
        drawer.style.display = ''; // Clear inline styles
        if (willOpen) {
            drawer.classList.add('active');
            markAllAsRead();
        } else {
            drawer.classList.remove('active');
        }
    }

    function markAllAsRead() {
        unreadCount = 0;
        notifications.forEach(n => n.read = true);
        updateBellBadge();
    }

    function renderDrawerList() {
        const listContainer = document.getElementById('notif-drawer-list');
        if (!listContainer) return;

        if (notifications.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-notif-state">
                    <i class="fa-regular fa-bell-slash" style="font-size: 2.5rem; color: #9CA3AF;"></i>
                    <p>Aucune notification SMS reçue pour le moment.</p>
                    <small>Effectuez un transfert pour simuler la réception de SMS MTN, Moov, Celtiis ou Wave.</small>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = notifications.map(n => `
            <div class="drawer-sms-item ${n.read ? 'read' : 'unread'}">
                <div class="drawer-sms-top">
                    <span class="sms-op-badge" style="background: ${n.config.color}; color: ${n.config.textColor};">
                        ${n.config.badge}
                    </span>
                    <strong>${escapeHtml(n.header)}</strong>
                    <span class="sms-drawer-time">${n.timestamp}</span>
                </div>
                <p class="drawer-sms-content">${escapeHtml(n.text)}</p>
                <div class="drawer-sms-footer">
                    <span class="drawer-phone-tag"><i class="fa-solid fa-phone"></i> ${escapeHtml(n.phone)}</span>
                    <div style="display:flex; gap:0.4rem; align-items:center;">
                        <button class="sms-act-btn btn-whatsapp" onclick="SMSNotifications.shareViaWhatsApp('${n.id}')" title="WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i> WhatsApp
                        </button>
                        <button class="sms-act-btn btn-copy" onclick="SMSNotifications.copyText('${n.id}')">Copier</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    return {
        triggerSmsPush,
        closeToast,
        copyText,
        shareViaWhatsApp,
        toggleDrawer,
        renderDrawerList
    };
})();
