/* ==========================================================================
   PAYBRIDGE BÉNIN - ADMIN TREASURY & POOLS MODULE (js/admin.js)
   ========================================================================== */

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
    const modal = document.getElementById('rebalance-modal');
    if (modal) modal.classList.add('active');
}

function closeRebalanceModal() {
    const modal = document.getElementById('rebalance-modal');
    if (modal) modal.classList.remove('active');
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
