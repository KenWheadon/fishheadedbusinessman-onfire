const MiniGameData = {
    config: {
        defaultWidth: 1280,
        defaultHeight: 720
    },
    gameplay: {
        initialDrunk: 30,
        drunkDrainRate: 1.2,       // Slowly drains naturally over time
        drinkPenalty: 25,          // Penalty amount when failing game loops
        startPrizeMoney: 150,      // Total payout baseline per round
        winMoneyTarget: 1000       // Victory conditions ceiling
    },
    packs: [
        {
            id: 'peanuts',
            name: 'Stale Peanuts',
            cost: 15,
            desc: '100% chance for -8% Drunk.',
            odds: [{ chance: 1.0, reduction: 8 }]
        },
        {
            id: 'pretzels',
            name: 'Salty Pretzels',
            cost: 40,
            desc: '70% chance for -25% Drunk, 30% for a DUD.',
            odds: [
                { chance: 0.7, reduction: 25 },
                { chance: 0.3, reduction: 0 }
            ]
        },
        {
            id: 'wings',
            name: 'Suicide Wings',
            cost: 85,
            desc: '40% chance: -65% | 30% chance: -15% | 30% DUD.',
            odds: [
                { chance: 0.4, reduction: 65 },
                { chance: 0.3, reduction: 15 },
                { chance: 0.3, reduction: 0 }
            ]
        }
    ]
};