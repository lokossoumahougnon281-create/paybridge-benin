/* ==========================================================================
   PAYBRIDGE BÉNIN - TRANSACTION HISTORY & EXPORTER MODULE (js/history.js)
   ========================================================================== */

let activeFilterNet = 'all';

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
