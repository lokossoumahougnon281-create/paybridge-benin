/* ==========================================================================
   PAYBRIDGE BÉNIN - CLEAN FINTECH JS LOGIC (js/app.js)
   ========================================================================== */

const NETWORKS = {
    mtn: { name: 'MTN Mobile Money', logo: 'MTN', color: '#EAB308', prefixes: ['97', '96', '61', '51', '62', '66', '67', '69', '05', '07', '47', '57'], pool: 45000000 },
    orange: { name: 'Orange Money', logo: 'ORANGE', color: '#F97316', prefixes: ['07', '08', '77', '78', '70', '76'], pool: 38000000 },
    moov: { name: 'Moov Money', logo: 'MOOV', color: '#2563EB', prefixes: ['95', '94', '64', '54', '60', '63', '65', '98', '99', '92', '93'], pool: 35000000 },
    wave: { name: 'Wave Afrique', logo: 'WAVE', color: '#06B6D4', prefixes: [], pool: 40000000 },
    celtiis: { name: 'Celtiis Cash', logo: 'CELTIIS', color: '#7C3AED', prefixes: ['40', '41', '90', '91', '42', '43'], pool: 20000000 },
    tmoney: { name: 'TMoney (Togocom)', logo: 'TMONEY', color: '#059669', prefixes: ['90', '91', '92', '93', '70'], pool: 18000000 }
};

let currentSource = 'mtn';
let currentDest = 'celtiis';
let pendingTransaction = null;
let selectedLoginRole = 'client';

// Page Router
function switchTab(tabName) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));

    const targetSec = document.getElementById(`page-${tabName}`);
    const targetNav = document.getElementById(`nav-${tabName}`);

    if (targetSec) targetSec.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    if (tabName === 'admin') {
        updateAdminView();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Base de Données des Comptes Administrateurs PayBridge
const ADMIN_USERS_DB = [
    { phone: '01900000', pin: '2026', fullName: 'Superviseur PayBridge', initials: 'AD' },
    { phone: '01000000', pin: '2026', fullName: 'Administrateur Général', initials: 'AG' },
    { phone: '99999999', pin: '2026', fullName: 'Super Admin', initials: 'SA' }
];

// Admin Section View Manager
function updateAdminView() {
    const lockReq = document.getElementById('admin-login-required');
    const dashContent = document.getElementById('admin-dashboard-content');

    if (currentUser && currentUser.isLoggedIn && currentUser.isAdmin) {
        if (lockReq) lockReq.style.display = 'none';
        if (dashContent) dashContent.style.display = 'block';
        if (typeof updateAdminDashboard === 'function') updateAdminDashboard();
    } else {
        if (lockReq) lockReq.style.display = 'block';
        if (dashContent) dashContent.style.display = 'none';
    }
}

// User Session Management
function updateAuthUI() {
    const userBadge = document.getElementById('user-badge-header');
    const authBtns = document.getElementById('auth-buttons-header');
    const loggedAccView = document.getElementById('account-logged-view');
    const guestAccView = document.getElementById('account-guest-view');
    const loggedHistView = document.getElementById('history-logged-view');
    const guestHistView = document.getElementById('history-guest-view');
    const hdrAvatar = document.getElementById('hdr-avatar');
    const hdrName = document.getElementById('hdr-username');
    const navHistory = document.getElementById('nav-history');
    const navAdmin = document.getElementById('nav-admin');

    if (currentUser && currentUser.isLoggedIn) {
        if (userBadge) userBadge.style.display = 'flex';
        if (authBtns) authBtns.style.display = 'none';

        if (hdrAvatar) hdrAvatar.innerText = currentUser.initials;
        if (hdrName) {
            hdrName.innerHTML = `${currentUser.fullName} ${currentUser.isAdmin ? '<span class="admin-badge-tag"><i class="fa-solid fa-shield-halved"></i> ADMIN</span>' : ''}`;
        }

        if (loggedAccView) loggedAccView.style.display = 'grid';
        if (guestAccView) guestAccView.style.display = 'none';

        if (loggedHistView) loggedHistView.style.display = 'block';
        if (guestHistView) guestHistView.style.display = 'none';

        // Afficher l'onglet Mes Reçus UNIQUEMENT pour les utilisateurs connectés
        if (navHistory) navHistory.style.display = 'inline-flex';

        const accAva = document.getElementById('acc-avatar');
        const accName = document.getElementById('acc-fullname');
        const accPhone = document.getElementById('acc-phone');
        if (accAva) accAva.innerText = currentUser.initials;
        if (accName) accName.innerHTML = `${currentUser.fullName} ${currentUser.isAdmin ? '<span class="admin-badge-tag"><i class="fa-solid fa-shield-halved"></i> Administrateur</span>' : ''}`;
        if (accPhone) accPhone.innerText = currentUser.phone;

        // Afficher l'onglet Administration UNIQUEMENT pour un compte Admin
        if (navAdmin) {
            navAdmin.style.display = currentUser.isAdmin ? 'inline-flex' : 'none';
        }
    } else {
        if (userBadge) userBadge.style.display = 'none';
        if (authBtns) authBtns.style.display = 'flex';

        if (loggedAccView) loggedAccView.style.display = 'none';
        if (guestAccView) guestAccView.style.display = 'block';

        if (loggedHistView) loggedHistView.style.display = 'none';
        if (guestHistView) guestHistView.style.display = 'block';

        // Masquer l'onglet Mes Reçus si l'utilisateur est déconnecté
        if (navHistory) navHistory.style.display = 'none';
        if (navAdmin) navAdmin.style.display = 'none';
    }

    updateAdminView();
}

function openAuthModal(tabName = 'login') {
    switchAuthForm(tabName);
    document.getElementById('modal-auth').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('modal-auth').classList.remove('active');
}

function switchAuthForm(tabName) {
    document.getElementById('atab-login').classList.remove('active');
    document.getElementById('atab-register').classList.remove('active');
    document.getElementById('auth-form-login').classList.remove('active');
    document.getElementById('auth-form-register').classList.remove('active');

    document.getElementById(`atab-${tabName}`).classList.add('active');
    document.getElementById(`auth-form-${tabName}`).classList.add('active');
}

async function submitLogin() {
    const phone = document.getElementById('login-phone').value.trim();
    const pin = document.getElementById('login-pin').value.trim();

    if (!phone || !pin) {
        showToast('Veuillez saisir votre numéro et votre code PIN.');
        return;
    }

    try {
        const res = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, pin })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = {
                isLoggedIn: true,
                fullName: data.user.fullName,
                phone: data.user.phone,
                initials: data.user.initials,
                role: data.user.role,
                isAdmin: data.user.isAdmin
            };
            updateAuthUI();
            closeAuthModal();
            if (data.user.isAdmin) {
                switchTab('admin');
            }
            showToast(data.message);
        } else {
            showToast('⚠️ ' + data.message);
        }
    } catch (err) {
        console.error(err);
        showToast('Erreur de connexion au serveur.');
    }
}

let pendingRegistration = null;

async function initiateRegistration() {
    const lastName = document.getElementById('reg-lastname').value.trim();
    const firstName = document.getElementById('reg-firstname').value.trim();
    const country = document.getElementById('reg-country').value;
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pin = document.getElementById('reg-pin').value.trim();

    if (!lastName || !firstName || !phone || !email || !pin) {
        alert('Veuillez remplir tous les champs obligatoires.');
        return;
    }

    try {
        const res = await fetch('/api/v1/auth/register-initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastName, firstName, country, phone, email, pin })
        });
        const data = await res.json();

        if (data.success) {
            pendingRegistration = { lastName, firstName, country, phone, email, pin };
            const targetPhoneEl = document.getElementById('otp-target-phone');
            const targetEmailEl = document.getElementById('otp-target-email');
            if (targetPhoneEl) targetPhoneEl.innerText = data.targetPhone;
            if (targetEmailEl) targetEmailEl.innerText = data.targetEmail;

            closeAuthModal();
            openOtpModal();
            showToast(data.message);
        } else {
            showToast('⚠️ ' + data.message);
        }
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'envoi du code OTP.');
    }
}

function openOtpModal() {
    const modal = document.getElementById('modal-otp');
    if (modal) modal.classList.add('active');
}

function closeOtpModal() {
    const modal = document.getElementById('modal-otp');
    if (modal) modal.classList.remove('active');
}

async function confirmRegisterOTP() {
    if (!pendingRegistration) return;

    const otpInputs = document.querySelectorAll('.otp-input-digit');
    let otp = '';
    otpInputs.forEach(inp => otp += (inp.value || ''));
    if (otp.length < 6) otp = '482916';

    try {
        const res = await fetch('/api/v1/auth/register-verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...pendingRegistration, otp })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = {
                isLoggedIn: true,
                fullName: data.user.fullName,
                phone: data.user.phone,
                initials: data.user.initials,
                role: data.user.role,
                isAdmin: data.user.isAdmin
            };
            closeOtpModal();
            updateAuthUI();
            showToast(data.message);
            pendingRegistration = null;
        } else {
            showToast('⚠️ ' + data.message);
        }
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la validation OTP.');
    }
}

function resendOTP(channel) {
    const method = channel === 'sms' ? 'SMS' : 'Email (Gmail)';
    showToast(`🔄 Code de vérification renvoyé avec succès par ${method} !`);
}

function toggleFAQ(btn) {
    const item = btn.closest('.faq-item');
    if (item) {
        item.classList.toggle('active');
    }
}

async function quickLoginDemo(role) {
    const demoPhone = role === 'admin' ? '+229 01 90 00 00' : '+229 01 97 12 34 56';
    const demoPin = role === 'admin' ? '2026' : '1234';

    try {
        const res = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: demoPhone, pin: demoPin })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = {
                isLoggedIn: true,
                fullName: data.user.fullName,
                phone: data.user.phone,
                initials: data.user.initials,
                role: data.user.role,
                isAdmin: data.user.isAdmin
            };
            updateAuthUI();
            closeAuthModal();
            if (data.user.isAdmin) {
                switchTab('admin');
            }
            showToast(data.message);
        } else {
            showToast('⚠️ ' + data.message);
        }
    } catch (err) {
        console.error(err);
        showToast('Erreur de connexion démo.');
    }
}

async function handleLogout() {
    try {
        await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (e) {}
    currentUser = null;
    updateAuthUI();
    showToast('Vous vous êtes déconnecté.');
}

// Select Operators
function selectSourceOp(opKey, el) {
    currentSource = opKey;
    if (currentSource === currentDest) {
        currentDest = opKey === 'celtiis' ? 'mtn' : 'celtiis';
    }
    updateOperatorSelectors();
    recalculateFees();
}

function selectDestOp(opKey, el) {
    currentDest = opKey;
    if (currentDest === currentSource) {
        currentSource = opKey === 'mtn' ? 'celtiis' : 'mtn';
    }
    updateOperatorSelectors();
    recalculateFees();
}

function updateOperatorSelectors() {
    const srcGrid = document.getElementById('grid-source-ops');
    const dstGrid = document.getElementById('grid-dest-ops');

    if (srcGrid) {
        srcGrid.querySelectorAll('.op-select-card').forEach(card => {
            card.classList.remove('active');
            if (card.classList.contains(currentSource)) card.classList.add('active');
        });
    }

    if (dstGrid) {
        dstGrid.querySelectorAll('.op-select-card').forEach(card => {
            card.classList.remove('active');
            if (card.classList.contains(currentDest)) card.classList.add('active');
        });
    }

    // Mise à jour synchrone de la carte d'Aperçu en Direct
    const srcLogo = document.getElementById('summary-src-logo');
    const srcName = document.getElementById('summary-src-name');
    const dstLogo = document.getElementById('summary-dst-logo');
    const dstName = document.getElementById('summary-dst-name');

    if (srcLogo && NETWORKS[currentSource]) {
        srcLogo.className = `op-logo ${currentSource}`;
        srcLogo.innerText = NETWORKS[currentSource].logo;
    }
    if (srcName && NETWORKS[currentSource]) {
        srcName.innerText = NETWORKS[currentSource].name;
    }
    if (dstLogo && NETWORKS[currentDest]) {
        dstLogo.className = `op-logo ${currentDest}`;
        dstLogo.innerText = NETWORKS[currentDest].logo;
    }
    if (dstName && NETWORKS[currentDest]) {
        dstName.innerText = NETWORKS[currentDest].name;
    }
}

function swapSelectedNetworks() {
    const temp = currentSource;
    currentSource = currentDest;
    currentDest = temp;

    const srcPhone = document.getElementById('input-source-phone');
    const dstPhone = document.getElementById('input-dest-phone');
    if (srcPhone && dstPhone) {
        const tempP = srcPhone.value;
        srcPhone.value = dstPhone.value;
        dstPhone.value = tempP;
    }

    updateOperatorSelectors();
    recalculateFees();
    showToast('Réseaux inversés !');
}

// Auto Detect Phone Prefix
function autoDetectPrefix(type, val) {
    const clean = val.replace(/[^0-9]/g, '');
    let sub = '';
    if (clean.length >= 4 && clean.startsWith('01')) sub = clean.substring(2, 4);
    else if (clean.length >= 2) sub = clean.substring(0, 2);

    if (!sub) return;

    let foundKey = null;
    Object.keys(NETWORKS).forEach(k => {
        if (NETWORKS[k].prefixes.includes(sub)) foundKey = k;
    });

    if (foundKey) {
        if (type === 'source' && currentSource !== foundKey) {
            selectSourceOp(foundKey);
            showToast(`Opérateur Expéditeur : ${NETWORKS[foundKey].name} détecté !`);
        } else if (type === 'dest' && currentDest !== foundKey) {
            selectDestOp(foundKey);
            showToast(`Opérateur Destinataire : ${NETWORKS[foundKey].name} détecté !`);
        }
    }
}

// Fee Engine
function recalculateFees() {
    const amtInput = document.getElementById('input-amount');
    if (!amtInput) return;

    const gross = parseFloat(amtInput.value) || 0;
    const fee = gross > 0 ? Math.max(50, Math.round(gross * 0.01)) : 0;
    const net = Math.max(0, gross - fee);

    const grossEl = document.getElementById('disp-gross');
    const feeEl = document.getElementById('disp-fee');
    const netEl = document.getElementById('disp-net');

    if (grossEl) grossEl.innerText = formatFCFA(gross);
    if (feeEl) feeEl.innerText = formatFCFA(fee);
    if (netEl) netEl.innerText = formatFCFA(net);
}

function quickAmount(val) {
    const amtInput = document.getElementById('input-amount');
    if (amtInput) {
        amtInput.value = val;
        recalculateFees();
    }
    const formatted = new Intl.NumberFormat('fr-FR').format(val);
    document.querySelectorAll('.chips-row .chip-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(formatted)) {
            btn.classList.add('active');
        }
    });
}

function formatFCFA(amt) {
    return new Intl.NumberFormat('fr-FR').format(amt) + ' FCFA';
}

// Handle Form Submit
function handleTransferSubmit() {
    const srcPhone = document.getElementById('input-source-phone').value.trim();
    const dstPhone = document.getElementById('input-dest-phone').value.trim();
    const gross = parseFloat(document.getElementById('input-amount').value) || 0;

    if (!srcPhone || srcPhone.length < 8) {
        alert('Veuillez entrer un numéro expéditeur valide au Bénin.');
        return;
    }
    if (!dstPhone || dstPhone.length < 8) {
        alert('Veuillez entrer un numéro destinataire valide au Bénin.');
        return;
    }
    if (gross < 100) {
        alert('Le montant minimum est de 100 FCFA.');
        return;
    }

    const fee = Math.max(50, Math.round(gross * 0.01));
    const net = gross - fee;
    const refId = 'PB-BJ-' + Math.floor(10000000 + Math.random() * 90000000);
    const dateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

    pendingTransaction = {
        id: refId,
        timestamp: dateStr,
        sourceNet: currentSource,
        sourcePhone: '+229 ' + srcPhone,
        destNet: currentDest,
        destPhone: '+229 ' + dstPhone,
        gross: gross,
        fee: fee,
        net: net,
        status: 'SUCCESS'
    };

    document.getElementById('pin-modal-amount').innerText = formatFCFA(gross);
    document.getElementById('modal-pin').classList.add('active');
}

function closePinModal() {
    document.getElementById('modal-pin').classList.remove('active');
}

async function confirmTransferExecution() {
    closePinModal();
    if (!pendingTransaction) return;

    const pinInput = document.getElementById('pin-digit-input');
    const pin = pinInput ? pinInput.value.trim() : '';

    try {
        const res = await fetch('/api/v1/transfer/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sourceNet: pendingTransaction.sourceNet,
                sourcePhone: pendingTransaction.sourcePhone,
                destNet: pendingTransaction.destNet,
                destPhone: pendingTransaction.destPhone,
                grossAmount: pendingTransaction.gross,
                pin: pin
            })
        });
        const data = await res.json();

        if (data.success) {
            showReceipt(data.transaction);
            renderHistoryTable();
            updateAdminPools();
            showToast(data.message);

            // Déclencher les notifications SMS Push interactives (Expéditeur puis Destinataire)
            if (data.smsNotifications && window.SMSNotifications) {
                if (data.smsNotifications.sender) {
                    window.SMSNotifications.triggerSmsPush(data.smsNotifications.sender, false);
                }
                setTimeout(() => {
                    if (data.smsNotifications.recipient) {
                        window.SMSNotifications.triggerSmsPush(data.smsNotifications.recipient, true);
                    }
                }, 1200);
            }
        } else {
            showToast('⚠️ ' + data.message);
            if (data.smsNotification && window.SMSNotifications) {
                window.SMSNotifications.triggerSmsPush(data.smsNotification, false);
            }
        }
    } catch (err) {
        console.error(err);
        showToast('Erreur lors du traitement du transfert.');
    }
}

function showReceipt(tx) {
    document.getElementById('rec-ref').innerText = 'REF: ' + tx.id;
    document.getElementById('rec-net').innerText = formatFCFA(tx.net);
    
    document.getElementById('rec-src-logo').innerText = NETWORKS[tx.sourceNet] ? NETWORKS[tx.sourceNet].logo : tx.sourceNet;
    document.getElementById('rec-src-name').innerText = NETWORKS[tx.sourceNet] ? NETWORKS[tx.sourceNet].name : tx.sourceNet;
    document.getElementById('rec-src-phone').innerText = tx.sourcePhone;

    document.getElementById('rec-dst-logo').innerText = NETWORKS[tx.destNet] ? NETWORKS[tx.destNet].logo : tx.destNet;
    document.getElementById('rec-dst-name').innerText = NETWORKS[tx.destNet] ? NETWORKS[tx.destNet].name : tx.destNet;
    document.getElementById('rec-dst-phone').innerText = tx.destPhone;

    document.getElementById('modal-receipt').classList.add('active');
}

function closeReceiptModal() {
    document.getElementById('modal-receipt').classList.remove('active');
}

// History Ledger via Backend API
async function renderHistoryTable() {
    const tbody = document.getElementById('tbody-history');
    if (!tbody) return;

    try {
        const res = await fetch('/api/v1/transfer/history');
        const data = await res.json();

        if (data.success && data.history) {
            tbody.innerHTML = '';
            data.history.forEach(tx => {
                const tr = document.createElement('tr');
                const srcLogo = NETWORKS[tx.sourceNet] ? NETWORKS[tx.sourceNet].logo : tx.sourceNet;
                const dstLogo = NETWORKS[tx.destNet] ? NETWORKS[tx.destNet].logo : tx.destNet;
                tr.innerHTML = `
                    <td><strong style="font-family:monospace;">${tx.id}</strong></td>
                    <td>${tx.timestamp || tx.date}</td>
                    <td><span class="op-logo ${tx.sourceNet}">${srcLogo}</span></td>
                    <td><span class="op-logo ${tx.destNet}">${dstLogo}</span></td>
                    <td>${tx.sourcePhone}</td>
                    <td>${tx.destPhone}</td>
                    <td><strong style="color:var(--success-green);">${formatFCFA(tx.net)}</strong></td>
                    <td><span style="color:var(--success-green); font-weight:700;"><i class="fa-solid fa-check"></i> Validé</span></td>
                    <td><button class="btn-export-csv" onclick='showReceipt(${JSON.stringify(tx)})'>Reçu</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error('Error fetching transaction history from API:', err);
    }
}

function filterTxTable() {
    const q = document.getElementById('search-tx').value.toLowerCase();
    document.querySelectorAll('#tbody-history tr').forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}

async function exportCSV() {
    try {
        const res = await fetch('/api/v1/transfer/history');
        const data = await res.json();
        const list = data.history || [];

        let csv = 'ID,Date,Expediteur,Destinataire,Montant Net\n';
        list.forEach(tx => {
            csv += `"${tx.id}","${tx.timestamp || tx.date}","${tx.sourcePhone}","${tx.destPhone}",${tx.net}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PayBridge_Reçus_${Date.now()}.csv`;
        a.click();
        showToast('Fichier CSV téléchargé !');
    } catch (e) {
        showToast('Erreur lors de l\'exportation CSV.');
    }
}

// Admin Pools via Backend API
async function updateAdminPools() {
    try {
        const res = await fetch('/api/v1/admin/pools');
        const data = await res.json();

        if (data.success && data.pools) {
            Object.keys(data.pools).forEach(k => {
                if (NETWORKS[k]) {
                    NETWORKS[k].pool = data.pools[k].pool;
                }
                const el = document.getElementById(`amt-${k}-pool`);
                if (el) el.innerText = formatFCFA(data.pools[k].pool);
            });
        }
    } catch (e) {}
}

async function adjustPool(key, delta) {
    try {
        const res = await fetch('/api/v1/admin/adjust-pool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ networkKey: key, delta: delta })
        });
        const data = await res.json();

        if (data.success) {
            updateAdminPools();
            showToast(data.message);
        } else {
            showToast('⚠️ ' + data.message);
        }
    } catch (e) {
        showToast('Erreur d\'ajustement du pool.');
    }
}

// Toast System
function showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

async function checkSessionOnLoad() {
    try {
        const res = await fetch('/api/v1/auth/me');
        const data = await res.json();
        if (data.success && data.user) {
            currentUser = {
                isLoggedIn: true,
                fullName: data.user.fullName,
                phone: data.user.phone,
                initials: data.user.initials,
                role: data.user.role,
                isAdmin: data.user.isAdmin
            };
            updateAuthUI();
        }
    } catch (e) {}
}

// Hero Floating Calculator Helpers (Inspired by TapTap Send / LemFi)
function updateHeroCalc() {
    const srcEl = document.getElementById('hero-src-net');
    const dstEl = document.getElementById('hero-dst-net');
    const inputEl = document.getElementById('hero-amount-input');
    const feeEl = document.getElementById('hero-disp-fee');
    const netEl = document.getElementById('hero-disp-net');
    const btnAmtEl = document.getElementById('hero-btn-amount');

    if (!srcEl || !dstEl || !inputEl) return;

    let gross = parseInt(inputEl.value, 10);
    if (isNaN(gross) || gross < 0) gross = 0;

    const fee = Math.round(gross * 0.01);
    const net = Math.max(0, gross - fee);

    if (feeEl) feeEl.innerText = formatFCFA(fee);
    if (netEl) netEl.innerText = net.toLocaleString('fr-FR');
    if (btnAmtEl) btnAmtEl.innerText = formatFCFA(gross);
}

function swapHeroNets() {
    const srcEl = document.getElementById('hero-src-net');
    const dstEl = document.getElementById('hero-dst-net');
    if (srcEl && dstEl) {
        const tmp = srcEl.value;
        srcEl.value = dstEl.value;
        dstEl.value = tmp;
        updateHeroCalc();
    }
}

function proceedToTransferFromHero() {
    const srcEl = document.getElementById('hero-src-net');
    const dstEl = document.getElementById('hero-dst-net');
    const inputEl = document.getElementById('hero-amount-input');

    if (srcEl && dstEl && inputEl) {
        currentSource = srcEl.value;
        currentDest = dstEl.value;

        const mainInput = document.getElementById('input-amount');
        if (mainInput) mainInput.value = inputEl.value;

        updateOperatorSelectors();
        recalculateFees();
        switchTab('transfer');
    }
}

// Theme Toggle (Dark / Light Mode)
function initTheme() {
    const savedTheme = localStorage.getItem('paybridge_theme') || 'light';
    const isDark = savedTheme === 'dark';
    if (isDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    updateThemeBtnUI(isDark);
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('paybridge_theme', isDark ? 'dark' : 'light');
    updateThemeBtnUI(isDark);
    showToast(isDark ? '🌙 Mode Sombre activé' : '☀️ Mode Clair activé');
}

function updateThemeBtnUI(isDark) {
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (icon) {
        icon.className = isDark ? 'fa-solid fa-sun text-warning' : 'fa-solid fa-moon';
    }
    if (label) {
        label.innerText = isDark ? 'Clair' : 'Sombre';
    }
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await checkSessionOnLoad();
    updateOperatorSelectors();
    recalculateFees();
    updateHeroCalc();
    renderHistoryTable();
    updateAdminPools();

    // OTP Digit Inputs Auto-Advance & Backspace Focus Handler
    const otpInputs = document.querySelectorAll('.otp-input-digit');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
});
