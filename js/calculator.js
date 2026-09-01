/* ==========================================================================
   PAYBRIDGE BÉNIN - FEE CALCULATOR & SLIDER SYNC MODULE (js/calculator.js)
   ========================================================================== */

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

    let feeRate = 0.01; // 1.0% Interoperability Fee
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
