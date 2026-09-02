// If executed directly by Node.js (e.g. Render running 'node app.js'), start the Express backend server:
if (typeof window === 'undefined') {
    require('./server/server.js');
    return;
}

/* ==========================================================================
   PAYBRIDGE BÉNIN - INTEROPERABILITY & AUTHENTICATION LOGIC (JS)
   ========================================================================== */

// 1. Benin Networks & Operators Registry
const BENIN_NETWORKS = {
    mtn: {
        id: 'mtn',
        name: 'MTN Mobile Money',
        shortName: 'MTN MoMo',
        badgeClass: 'mtn',
        prefixes: ['97', '96', '61', '51', '62', '66', '67', '69'],
        color: '#FFCC00',
        poolBalance: 25000000,
        maxPool: 30000000
    },
    moov: {
        id: 'moov',
        name: 'Moov Money',
        shortName: 'Moov',
        badgeClass: 'moov',
        prefixes: ['95', '94', '64', '54', '60', '63', '65', '98', '99'],
        color: '#005CA9',
        poolBalance: 20000000,
        maxPool: 30000000
    },
    celtiis: {
        id: 'celtiis',
        name: 'Celtiis Cash (SBIN)',
        shortName: 'Celtiis',
        badgeClass: 'celtiis',
        prefixes: ['40', '41', '90', '91', '42', '43'],
        color: '#6F2C91',
        poolBalance: 18500000,
        maxPool: 30000000
    },
    wave: {
        id: 'wave',
        name: 'Wave Bénin',
        shortName: 'Wave',
        badgeClass: 'wave',
        prefixes: [],
        color: '#1DC4FF',
        poolBalance: 22000000,
        maxPool: 30000000
    },
    bank: {
        id: 'bank',
        name: 'Compte Bancaire / GIM',
        shortName: 'Banque',
        badgeClass: 'bank',
        prefixes: [],
        color: '#10B981',
        poolBalance: 15000000,
        maxPool: 30000000
    }
};

// User Session State
let currentUser = {
    isLoggedIn: true,
    fullName: 'Koffi ADANHO',
    phone: '01 97 12 34 56',
    initials: 'KA',
    kycVerified: true,
    defaultNetwork: 'mtn'
};

// Application State
let currentSourceNet = 'mtn';
let currentDestNet = 'celtiis';
let currentStep = 1;
let currentTransaction = null;
let activeFilterNet = 'all';

// Initial Demo History Data
const DEFAULT_HISTORY = [
    {
        id: 'PB-BJ-98231401',
        timestamp: '08/08/2026 06:45',
        sourceNet: 'mtn',
        sourcePhone: '01 97 12 34 56',
        destNet: 'celtiis',
        destPhone: '01 95 88 77 66',
        gross: 50000,
        fee: 500,
        net: 49500,
        status: 'SUCCESS',
        note: 'Frais de scolarité'
    },
    {
        id: 'PB-BJ-98231402',
        timestamp: '07/08/2026 14:15',
        sourceNet: 'moov',
        sourcePhone: '01 94 44 55 66',
        destNet: 'wave',
        destPhone: '01 64 22 11 00',
        gross: 10000,
        fee: 100,
        net: 9900,
        status: 'SUCCESS',
        note: 'Achat marché'
    },
    {
        id: 'PB-BJ-98231403',
        timestamp: '06/08/2026 18:30',
        sourceNet: 'wave',
        sourcePhone: '01 96 11 22 33',
        destNet: 'bank',
        destPhone: 'BJ061 01001 123456789 01',
        gross: 250000,
        fee: 2500,
        net: 247500,
        status: 'SUCCESS',
        note: 'Virement banque BOA'
    }
];

// Initialize Application
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initNetworkGrids();
        initRecentShortcuts();
        loadHistory();
        loadHubRecent();
        calculateFees();
        updateAdminDashboard();
        updateUserWidget();
    });
}

// AUTHENTICATION MODAL LOGIC
function openAuthModal(tabName = 'login') {
    switchAuthTab(tabName);
    document.getElementById('auth-modal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
}

function switchAuthTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    const tab = document.getElementById(`auth-tab-${tabName}`);
    const form = document.getElementById(`form-${tabName}`);

    if (tab) tab.classList.add('active');
    if (form) form.classList.add('active');
}

function handleLogin() {
    const phone = document.getElementById('login-phone').value.trim();
    if (!phone) return;

    currentUser = {
        isLoggedIn: true,
        fullName: 'Client BéninPay',
        phone: '+229 ' + phone,
        initials: 'CB',
        kycVerified: true,
        defaultNetwork: 'mtn'
    };

    updateUserWidget();
    closeAuthModal();
    showToast(`Bienvenue ! Connecté au numéro +229 ${phone}`);
}

function handleRegister() {
    const fullName = document.getElementById('reg-fullname').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const network = document.getElementById('reg-network').value;

    if (!fullName || !phone) return;

    const names = fullName.split(' ');
    const initials = names.length > 1 ? (names[0][0] + names[1][0]).toUpperCase() : names[0].substring(0, 2).toUpperCase();

    currentUser = {
        isLoggedIn: true,
        fullName: fullName,
        phone: '+229 ' + phone,
        initials: initials,
        kycVerified: true,
        defaultNetwork: network
    };

    updateUserWidget();
    closeAuthModal();
    showToast(`Félicitations ${fullName} ! Votre compte a été créé avec succès.`);
}

function demoQuickLogin(opName) {
    currentUser = {
        isLoggedIn: true,
        fullName: `Utilisateur ${opName}`,
        phone: '+229 01 97 00 00',
        initials: opName.substring(0, 2).toUpperCase(),
        kycVerified: true,
        defaultNetwork: opName.toLowerCase()
    };

    updateUserWidget();
    closeAuthModal();
    showToast(`Connecté via ${opName} !`);
}

function logoutUser() {
    currentUser.isLoggedIn = false;
    updateUserWidget();
    showToast('Vous vous êtes déconnecté.');
}

function updateUserWidget() {
    const userProfileWidget = document.getElementById('user-profile-widget');
    const authButtonsWidget = document.getElementById('auth-buttons-widget');

    if (currentUser.isLoggedIn) {
        if (userProfileWidget) userProfileWidget.style.display = 'flex';
        if (authButtonsWidget) authButtonsWidget.style.display = 'none';

        const avatarEl = document.getElementById('header-avatar');
        const nameEl = document.getElementById('header-username');

        if (avatarEl) avatarEl.innerText = currentUser.initials;
        if (nameEl) nameEl.innerText = currentUser.fullName;
    } else {
        if (userProfileWidget) userProfileWidget.style.display = 'none';
        if (authButtonsWidget) authButtonsWidget.style.display = 'flex';
    }
}

// Preset Scenarios (Demo Bar)
function runPresetScenario(presetKey) {
    if (presetKey === 'mtn-celtiis') {
        selectNetwork('source', 'mtn');
        selectNetwork('dest', 'celtiis');
        document.getElementById('source-phone').value = '0197001122';
        document.getElementById('dest-phone').value = '0195334455';
        setQuickAmount(15000);
        showToast('⚡ Scénario MTN ➔ Celtiis chargé !');
    } else if (presetKey === 'moov-wave') {
        selectNetwork('source', 'moov');
        selectNetwork('dest', 'wave');
        document.getElementById('source-phone').value = '0194556677';
        document.getElementById('dest-phone').value = '0164223344';
        setQuickAmount(5000);
        showToast('⚡ Scénario Moov ➔ Wave chargé !');
    } else if (presetKey === 'celtiis-bank') {
        selectNetwork('source', 'celtiis');
        selectNetwork('dest', 'bank');
        document.getElementById('source-phone').value = '0140112233';
        document.getElementById('dest-phone').value = '0197889900';
        setQuickAmount(100000);
        showToast('⚡ Scénario Celtiis ➔ Banque chargé !');
    }
    switchView('transfert');
    goToStep(2);
}

// Auto-Detect Operator Prefix
function detectOperatorPrefix(type, phoneVal) {
    const cleanPhone = phoneVal.replace(/[^0-9]/g, '');
    let sub = '';

    if (cleanPhone.length >= 4 && cleanPhone.startsWith('01')) {
        sub = cleanPhone.substring(2, 4);
    } else if (cleanPhone.length >= 2) {
        sub = cleanPhone.substring(0, 2);
    }

    if (!sub) return;

    let detectedKey = null;
    Object.keys(BENIN_NETWORKS).forEach(key => {
        if (BENIN_NETWORKS[key].prefixes.includes(sub)) {
            detectedKey = key;
        }
    });

    if (detectedKey) {
        if (type === 'source' && currentSourceNet !== detectedKey) {
            selectNetwork('source', detectedKey);
            showToast(`Opérateur Expéditeur : ${BENIN_NETWORKS[detectedKey].name} détecté !`);
        } else if (type === 'dest' && currentDestNet !== detectedKey) {
            selectNetwork('dest', detectedKey);
            showToast(`Opérateur Destinataire : ${BENIN_NETWORKS[detectedKey].name} détecté !`);
        }
    }
}

// Navigation & View Switcher
function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewName}`);
    const targetTab = document.getElementById(`tab-${viewName}`);

    if (targetView) targetView.classList.add('active');
    if (targetTab) targetTab.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startQuickTransfer(sourceNet, destNet) {
    selectNetwork('source', sourceNet);
    selectNetwork('dest', destNet);
    switchView('transfert');
    goToStep(1);
}

function initNetworkGrids() {
    const sourceGrid = document.getElementById('source-network-grid');
    const destGrid = document.getElementById('dest-network-grid');

    if (!sourceGrid || !destGrid) return;

    sourceGrid.innerHTML = '';
    destGrid.innerHTML = '';

    Object.keys(BENIN_NETWORKS).forEach(netKey => {
        const net = BENIN_NETWORKS[netKey];
        
        const sourceBtn = document.createElement('div');
        sourceBtn.className = `net-btn ${netKey === currentSourceNet ? 'selected' : ''}`;
        sourceBtn.setAttribute('data-net', netKey);
        sourceBtn.onclick = () => selectNetwork('source', netKey);
        sourceBtn.innerHTML = `
            <span class="net-badge-icon">${net.shortName}</span>
            <span class="net-name">${net.name.split(' ')[0]}</span>
        `;
        sourceGrid.appendChild(sourceBtn);

        const destBtn = document.createElement('div');
        destBtn.className = `net-btn ${netKey === currentDestNet ? 'selected' : ''}`;
        destBtn.setAttribute('data-net', netKey);
        destBtn.onclick = () => selectNetwork('dest', netKey);
        destBtn.innerHTML = `
            <span class="net-badge-icon">${net.shortName}</span>
            <span class="net-name">${net.name.split(' ')[0]}</span>
        `;
        destGrid.appendChild(destBtn);
    });

    updateNetworkBadges();
}

function selectNetwork(type, netKey) {
    if (type === 'source') {
        currentSourceNet = netKey;
        if (currentSourceNet === currentDestNet) {
            currentDestNet = netKey === 'celtiis' ? 'mtn' : 'celtiis';
        }
    } else {
        currentDestNet = netKey;
        if (currentDestNet === currentSourceNet) {
            currentSourceNet = netKey === 'mtn' ? 'celtiis' : 'mtn';
        }
    }
    initNetworkGrids();
    calculateFees();
}

function swapNetworks() {
    const temp = currentSourceNet;
    currentSourceNet = currentDestNet;
    currentDestNet = temp;

    const sourcePhoneInput = document.getElementById('source-phone');
    const destPhoneInput = document.getElementById('dest-phone');
    if (sourcePhoneInput && destPhoneInput) {
        const tempPhone = sourcePhoneInput.value;
        sourcePhoneInput.value = destPhoneInput.value;
        destPhoneInput.value = tempPhone;
    }

    initNetworkGrids();
    calculateFees();
    showToast('Réseaux inversés !');
}

function updateNetworkBadges() {
    const sourceBadge = document.getElementById('source-network-badge');
    const destBadge = document.getElementById('dest-network-badge');
    const pinNetName = document.getElementById('pin-network-name');

    if (sourceBadge) sourceBadge.innerText = BENIN_NETWORKS[currentSourceNet].shortName;
    if (destBadge) destBadge.innerText = BENIN_NETWORKS[currentDestNet].shortName;
    if (pinNetName) pinNetName.innerText = BENIN_NETWORKS[currentSourceNet].name;
}

function syncAmountSlider(val) {
    const slider = document.getElementById('amount-slider');
    if (slider) slider.value = val;
}

function syncAmountInput(val) {
    const amountInput = document.getElementById('transfer-amount');
    if (amountInput) amountInput.value = val;
}

function calculateFees() {
    const amountInput = document.getElementById('transfer-amount');
    if (!amountInput) return;
    const grossAmount = parseFloat(amountInput.value) || 0;

    let feeRate = 0.01;
    let fee = Math.max(50, Math.round(grossAmount * feeRate));
    if (grossAmount === 0) fee = 0;
    let netAmount = Math.max(0, grossAmount - fee);

    const grossEl = document.getElementById('summary-gross');
    const feeEl = document.getElementById('summary-fee');
    const netEl = document.getElementById('summary-net');

    if (grossEl) grossEl.innerText = formatFCFA(grossAmount);
    if (feeEl) feeEl.innerText = formatFCFA(fee);
    if (netEl) netEl.innerText = formatFCFA(netAmount);
}

function setQuickAmount(amt) {
    const amountInput = document.getElementById('transfer-amount');
    if (amountInput) {
        amountInput.value = amt;
        syncAmountSlider(amt);
        calculateFees();
    }
}

function formatFCFA(val) {
    return new Intl.NumberFormat('fr-FR').format(val) + ' FCFA';
}

function goToStep(stepNum) {
    if (stepNum === 2) {
        const sourcePhone = document.getElementById('source-phone').value.trim();
        const destPhone = document.getElementById('dest-phone').value.trim();
        
        if (!sourcePhone || sourcePhone.length < 8) {
            alert('Veuillez entrer un numéro expéditeur valide au Bénin.');
            document.getElementById('source-phone').focus();
            return;
        }
        if (!destPhone || destPhone.length < 8) {
            alert('Veuillez entrer un numéro destinataire valide au Bénin.');
            document.getElementById('dest-phone').focus();
            return;
        }
    }

    if (stepNum === 3) {
        const amt = parseFloat(document.getElementById('transfer-amount').value) || 0;
        if (amt < 100) {
            alert('Le montant minimum de transfert est de 100 FCFA.');
            document.getElementById('transfer-amount').focus();
            return;
        }
        document.getElementById('pin-1').value = '8';
        document.getElementById('pin-2').value = '8';
        document.getElementById('pin-3').value = '8';
        document.getElementById('pin-4').value = '8';
    }

    currentStep = stepNum;

    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById(`step-dot-${i}`);
        const content = document.getElementById(`step-${i}`);
        const line = document.getElementById(`step-line-${i}`);

        if (dot) {
            dot.classList.remove('active', 'complete');
            if (i < stepNum) dot.classList.add('complete');
            if (i === stepNum) dot.classList.add('active');
        }
        if (content) {
            content.classList.remove('active');
            if (i === stepNum) content.classList.add('active');
        }
        if (line) {
            line.classList.remove('active');
            if (i < stepNum) line.classList.add('active');
        }
    }
}

function movePin(input, idx) {
    if (input.value.length === 1 && idx < 4) {
        document.getElementById(`pin-${idx + 1}`).focus();
    }
}

function executeTransfer() {
    const sourcePhone = document.getElementById('source-phone').value.trim();
    const destPhone = document.getElementById('dest-phone').value.trim();
    const grossAmount = parseFloat(document.getElementById('transfer-amount').value) || 0;
    const note = document.getElementById('transfer-note').value.trim() || 'Transfert Direct Inter-Réseaux';

    const fee = Math.max(50, Math.round(grossAmount * 0.01));
    const net = grossAmount - fee;

    const procModal = document.getElementById('processing-modal');
    document.getElementById('t-source-net').innerText = BENIN_NETWORKS[currentSourceNet].shortName;
    document.getElementById('t-dest-net').innerText = BENIN_NETWORKS[currentDestNet].shortName;
    procModal.classList.add('active');

    setTimeout(() => updateTimelineStep(1, true), 400);
    setTimeout(() => updateTimelineStep(2, true), 1200);
    setTimeout(() => updateTimelineStep(3, true), 2000);
    setTimeout(() => {
        updateTimelineStep(4, true);
        
        const refId = 'PB-BJ-' + Math.floor(10000000 + Math.random() * 90000000);
        const dateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

        currentTransaction = {
            id: refId,
            timestamp: dateStr,
            sourceNet: currentSourceNet,
            sourcePhone: '+229 ' + sourcePhone,
            destNet: currentDestNet,
            destPhone: '+229 ' + destPhone,
            gross: grossAmount,
            fee: fee,
            net: net,
            status: 'SUCCESS',
            note: note
        };

        const history = getHistory();
        history.unshift(currentTransaction);
        saveHistory(history);

        BENIN_NETWORKS[currentSourceNet].poolBalance += grossAmount;
        BENIN_NETWORKS[currentDestNet].poolBalance -= net;

        procModal.classList.remove('active');
        resetTimelineSteps();
        showReceiptModal(currentTransaction);
        loadHistory();
        loadHubRecent();
        updateAdminDashboard();
        showToast('Transfert exécuté avec succès !');

    }, 2800);
}

function updateTimelineStep(stepIdx, isDone) {
    const item = document.getElementById(`t-step-${stepIdx}`);
    if (item) {
        item.className = `timeline-item ${isDone ? 'done' : 'active'}`;
        item.querySelector('i').className = isDone ? 'fa-solid fa-circle-check text-success' : 'fa-solid fa-circle-notch fa-spin';
    }
}

function resetTimelineSteps() {
    for (let i = 1; i <= 4; i++) {
        const item = document.getElementById(`t-step-${i}`);
        if (item) {
            item.className = 'timeline-item';
            item.querySelector('i').className = 'fa-regular fa-circle';
        }
    }
}

function showReceiptModal(tx) {
    document.getElementById('r-id').innerText = 'REF: ' + tx.id;
    document.getElementById('r-date').innerText = tx.timestamp;
    document.getElementById('r-amount-net').innerText = formatFCFA(tx.net);
    document.getElementById('r-amount-fee').innerText = `Frais d'interopérabilité : ${formatFCFA(tx.fee)}`;
    
    document.getElementById('r-source-logo').innerText = BENIN_NETWORKS[tx.sourceNet].shortName;
    document.getElementById('r-source-name').innerText = BENIN_NETWORKS[tx.sourceNet].name;
    document.getElementById('r-source-phone').innerText = tx.sourcePhone;

    document.getElementById('r-dest-logo').innerText = BENIN_NETWORKS[tx.destNet].shortName;
    document.getElementById('r-dest-name').innerText = BENIN_NETWORKS[tx.destNet].name;
    document.getElementById('r-dest-phone').innerText = tx.destPhone;

    document.getElementById('r-motif').innerText = tx.note;

    document.getElementById('receipt-modal').classList.add('active');
}

function closeReceiptModal() {
    document.getElementById('receipt-modal').classList.remove('active');
}

function copyReceiptRef() {
    if (currentTransaction) {
        navigator.clipboard.writeText(currentTransaction.id);
        showToast(`ID ${currentTransaction.id} copié !`);
    }
}

function resetForm() {
    document.getElementById('transfer-amount').value = '';
    document.getElementById('transfer-note').value = '';
    goToStep(1);
}

function getHistory() {
    const saved = localStorage.getItem('paybridge_bj_history');
    if (saved) {
        try { return JSON.parse(saved); } catch(e) {}
    }
    return DEFAULT_HISTORY;
}

function saveHistory(list) {
    localStorage.setItem('paybridge_bj_history', JSON.stringify(list));
}

function loadHistory() {
    const history = getHistory();
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    history.forEach(tx => {
        if (activeFilterNet !== 'all' && tx.sourceNet !== activeFilterNet && tx.destNet !== activeFilterNet) {
            return;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="font-family:monospace;">${tx.id}</strong></td>
            <td>${tx.timestamp}</td>
            <td><span class="net-logo ${BENIN_NETWORKS[tx.sourceNet].badgeClass}">${BENIN_NETWORKS[tx.sourceNet].shortName}</span></td>
            <td>${tx.sourcePhone}</td>
            <td><span class="net-logo ${BENIN_NETWORKS[tx.destNet].badgeClass}">${BENIN_NETWORKS[tx.destNet].shortName}</span></td>
            <td>${tx.destPhone}</td>
            <td>${formatFCFA(tx.gross)}</td>
            <td class="text-warning">${formatFCFA(tx.fee)}</td>
            <td class="text-success font-bold">${formatFCFA(tx.net)}</td>
            <td><span class="badge badge-success"><i class="fa-solid fa-check"></i> Validé</span></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick='showReceiptModal(${JSON.stringify(tx)})' title="Voir le reçu">
                    <i class="fa-solid fa-receipt"></i> Reçu
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterHistoryByNetwork(netKey, btnEl) {
    activeFilterNet = netKey;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    loadHistory();
}

function filterHistory() {
    const query = document.getElementById('search-history').value.toLowerCase();
    const rows = document.querySelectorAll('#history-table-body tr');
    rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(query) ? '' : 'none';
    });
}

function exportHistoryCSV() {
    const history = getHistory();
    let csv = 'ID,Date,Réseau Source,Expéditeur,Réseau Dest,Destinataire,Montant Brut,Frais,Montant Net,Statut\n';
    history.forEach(tx => {
        csv += `"${tx.id}","${tx.timestamp}","${tx.sourceNet}","${tx.sourcePhone}","${tx.destNet}","${tx.destPhone}",${tx.gross},${tx.fee},${tx.net},"${tx.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PayBridge_Benin_History_${Date.now()}.csv`;
    a.click();
    showToast('Fichier CSV téléchargé !');
}

function loadHubRecent() {
    const container = document.getElementById('hub-recent-transactions');
    if (!container) return;

    const history = getHistory().slice(0, 3);
    container.innerHTML = '';

    history.forEach(tx => {
        const div = document.createElement('div');
        div.className = 'recent-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.6rem;">
                <span class="net-logo ${BENIN_NETWORKS[tx.sourceNet].badgeClass}">${BENIN_NETWORKS[tx.sourceNet].shortName}</span>
                <i class="fa-solid fa-arrow-right text-muted" style="font-size:0.75rem;"></i>
                <span class="net-logo ${BENIN_NETWORKS[tx.destNet].badgeClass}">${BENIN_NETWORKS[tx.destNet].shortName}</span>
            </div>
            <div>
                <strong style="font-size:0.85rem;" class="text-success">${formatFCFA(tx.net)}</strong>
                <span style="font-size:0.72rem; color:var(--text-muted); display:block;">${tx.timestamp}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function initRecentShortcuts() {
    const list = document.getElementById('shortcuts-list');
    if (!list) return;

    const shortcuts = [
        { name: 'Koffi A.', phone: '01 97 11 22 33', net: 'mtn' },
        { name: 'Mireille D.', phone: '01 95 44 55 66', net: 'celtiis' },
        { name: 'SOSSOU SARL', phone: '01 64 88 99 00', net: 'wave' }
    ];

    list.innerHTML = '';
    shortcuts.forEach(sc => {
        const div = document.createElement('div');
        div.className = 'shortcut-card';
        div.onclick = () => {
            document.getElementById('dest-phone').value = sc.phone;
            selectNetwork('dest', sc.net);
            switchView('transfert');
            goToStep(2);
            showToast(`Destinataire ${sc.name} pré-rempli !`);
        };
        div.innerHTML = `
            <div class="sc-users">
                <span class="net-logo ${BENIN_NETWORKS[sc.net].badgeClass}">${BENIN_NETWORKS[sc.net].shortName}</span>
                <div>
                    <strong style="display:block; font-size:0.85rem;">${sc.name}</strong>
                    <span style="font-size:0.75rem; color:var(--text-muted);">+229 ${sc.phone}</span>
                </div>
            </div>
            <i class="fa-solid fa-chevron-right text-muted" style="font-size:0.75rem;"></i>
        `;
        list.appendChild(div);
    });
}

function adjustPoolBalance(netKey, delta) {
    if (BENIN_NETWORKS[netKey]) {
        BENIN_NETWORKS[netKey].poolBalance = Math.max(0, BENIN_NETWORKS[netKey].poolBalance + delta);
        updateAdminDashboard();
        showToast(`Pool ${BENIN_NETWORKS[netKey].shortName} ajusté (${delta > 0 ? '+' : ''}${formatFCFA(delta)}) !`);
    }
}

function updateAdminDashboard() {
    const history = getHistory();
    let totalVolume = 0;
    let totalFees = 0;
    let totalOps = history.length;

    history.forEach(tx => {
        totalVolume += tx.gross;
        totalFees += tx.fee;
    });

    const volEl = document.getElementById('stat-total-volume');
    const feeEl = document.getElementById('stat-total-fees');
    const cntEl = document.getElementById('stat-total-count');

    if (volEl) volEl.innerText = formatFCFA(totalVolume);
    if (feeEl) feeEl.innerText = formatFCFA(totalFees);
    if (cntEl) cntEl.innerText = `${totalOps} Ops`;

    let totalReserve = 0;
    Object.keys(BENIN_NETWORKS).forEach(key => {
        const net = BENIN_NETWORKS[key];
        totalReserve += net.poolBalance;
        const el = document.getElementById(`pool-${key}-amount`);
        const bar = document.getElementById(`pool-${key}-bar`);
        if (el) el.innerText = formatFCFA(net.poolBalance);
        if (bar) {
            const pct = Math.min(100, Math.round((net.poolBalance / net.maxPool) * 100));
            bar.style.width = `${pct}%`;
        }
    });

    const resEl = document.getElementById('stat-total-reserve');
    if (resEl) resEl.innerText = formatFCFA(totalReserve);
}

function rebalancePoolsModal() {
    document.getElementById('rebalance-modal').classList.add('active');
}

function closeRebalanceModal() {
    document.getElementById('rebalance-modal').classList.remove('active');
}

function confirmRebalance() {
    const fromNet = document.getElementById('rebalance-from').value;
    const toNet = document.getElementById('rebalance-to').value;
    const amt = parseFloat(document.getElementById('rebalance-amount').value) || 0;

    if (BENIN_NETWORKS[fromNet].poolBalance < amt) {
        alert('Solde insuffisant sur le pool source pour ce virement.');
        return;
    }

    BENIN_NETWORKS[fromNet].poolBalance -= amt;
    BENIN_NETWORKS[toNet].poolBalance += amt;

    closeRebalanceModal();
    updateAdminDashboard();
    showToast(`Rééquilibrage de ${formatFCFA(amt)} effectué avec succès !`);
}

function showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    showToast('Thème basculé !');
}
