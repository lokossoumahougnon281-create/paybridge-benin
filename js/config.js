/* ==========================================================================
   PAYBRIDGE BÉNIN - CONFIGURATION & OPERATORS REGISTRY (js/config.js)
   ========================================================================== */

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

function formatFCFA(val) {
    return new Intl.NumberFormat('fr-FR').format(val) + ' FCFA';
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
