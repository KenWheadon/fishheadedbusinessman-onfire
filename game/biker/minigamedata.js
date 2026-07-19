const MiniGameData = {
    config: {
        defaultWidth: 1280,
        defaultHeight: 720
    },
    gameplay: {
        initialDrunk: 30,
        drunkDrainRate: 1.2,       // Only runs once unlocked via Shop
        drinkPenalty: 25,          // Penalty amount when failing game loops
        startPrizeMoney: 5,        // Re-aligned starting base bet money
        winMoneyTarget: 1000       // Victory conditions ceiling
    },
    packs: [
        {
            id: 'peanuts',
            name: 'Stale Peanuts',
            cost: 5,               // Lowered cost
            desc: '100% chance for -8% Drunk.',
            odds: [{ chance: 1.0, reduction: 8 }]
        },
        {
            id: 'pretzels',
            name: 'Salty Pretzels',
            cost: 15,              // Lowered cost
            desc: '70% chance for -25% Drunk, 30% for a DUD.',
            odds: [
                { chance: 0.7, reduction: 25 },
                { chance: 0.3, reduction: 0 }
            ]
        },
        {
            id: 'wings',
            name: 'Suicide Wings',
            cost: 35,              // Lowered cost
            desc: '40% chance: -65% | 30% chance: -15% | 30% DUD.',
            odds: [
                { chance: 0.4, reduction: 65 },
                { chance: 0.3, reduction: 15 },
                { chance: 0.3, reduction: 0 }
            ]
        },
        {
            id: 'drain_upgrade',
            name: 'Sober Focus',
            cost: 500,             // Unlock price condition
            desc: 'PERMANENTLY unlocks natural Drunkness drainage over time.',
            isUpgrade: true
        }
    ]
};