/* ==========================================================================
   PAYBRIDGE BÉNIN - TRANSFER WIZARD & RECEIPT PIPELINE (js/transfer.js)
   ========================================================================== */

let currentSourceNet = 'mtn';
let currentDestNet = 'celtiis';
let currentStep = 1;
let currentTransaction = null;

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
