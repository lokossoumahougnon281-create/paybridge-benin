/* ==========================================================================
   PAYBRIDGE BÉNIN - AUTHENTICATION & USER SESSION MODULE (js/auth.js)
   ========================================================================== */

let currentUser = {
    isLoggedIn: true,
    fullName: 'Koffi ADANHO',
    phone: '01 97 12 34 56',
    initials: 'KA',
    kycVerified: true,
    defaultNetwork: 'mtn'
};

function openAuthModal(tabName = 'login') {
    switchAuthTab(tabName);
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('active');
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
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
    const phoneInput = document.getElementById('login-phone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
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
    const fullNameInput = document.getElementById('reg-fullname');
    const phoneInput = document.getElementById('reg-phone');
    const networkInput = document.getElementById('reg-network');

    const fullName = fullNameInput ? fullNameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const network = networkInput ? networkInput.value : 'mtn';

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
