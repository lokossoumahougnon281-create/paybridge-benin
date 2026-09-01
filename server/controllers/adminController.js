const db = require('../config/database');

// GET ADMIN DASHBOARD POOLS AND STATS
function getDashboardPools(req, res) {
    try {
        const pools = db.prepare('SELECT * FROM pools').all();
        const totalVolume = db.prepare('SELECT SUM(gross_amount) as total FROM transactions WHERE status = "SUCCESS"').get().total || 0;
        const totalFees = db.prepare('SELECT SUM(fee_amount) as total FROM transactions WHERE status = "SUCCESS"').get().total || 0;
        const txCount = db.prepare('SELECT COUNT(*) as total FROM transactions').get().total || 0;

        const poolObj = {};
        pools.forEach(p => {
            poolObj[p.network_key] = {
                name: p.name,
                pool: p.balance,
                max: p.max_balance
            };
        });

        return res.json({
            success: true,
            pools: poolObj,
            stats: {
                totalVolume: totalVolume,
                totalFees: totalFees,
                txCount: txCount
            }
        });
    } catch (err) {
        console.error('Fetch admin pools error:', err);
        return res.status(500).json({ success: false, message: 'Erreur lors du chargement de la trésorerie admin.' });
    }
}

// ADJUST POOL BALANCE (DEPOSIT / REBALANCE)
function adjustPoolBalance(req, res) {
    const { networkKey, delta } = req.body;

    if (!networkKey || delta === undefined) {
        return res.status(400).json({ success: false, message: 'Paramètres d\'ajustement invalides.' });
    }

    try {
        const amount = parseInt(delta, 10);
        db.prepare('UPDATE pools SET balance = MAX(0, balance + ?), updated_at = CURRENT_TIMESTAMP WHERE network_key = ?').run(amount, networkKey);
        
        const updatedPools = db.prepare('SELECT * FROM pools').all();
        const poolObj = {};
        updatedPools.forEach(p => {
            poolObj[p.network_key] = {
                name: p.name,
                pool: p.balance,
                max: p.max_balance
            };
        });

        return res.json({
            success: true,
            message: `Ajustement du pool ${networkKey.toUpperCase()} réussi !`,
            pools: poolObj
        });
    } catch (err) {
        console.error('Adjust pool error:', err);
        return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajustement du pool.' });
    }
}

module.exports = {
    getDashboardPools,
    adjustPoolBalance
};
