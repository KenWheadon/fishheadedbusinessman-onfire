const MiniGameData = {
    config: {
        defaultWidth: 1280,
        defaultHeight: 720,
        focalLength: 450,
        horizonYRatio: 0.35
    },

    player: {
        startingItem: 'can',
        initialItemLevels: { can: 1, fish: 0, knife: 0 },
        initialStats: {
            fun: 100,
            stealthAlert: 0,
            workDone: 0,
            score: 0,
            money: 0
        },
        modifiers: {
            workRate: 1.2,
            suspicionScale: 1.0,
            funDrainScale: 0.5,
            throwVelocity: 1.0
        }
    },

    layout: {
        trashcan: { x: 340, y: 120, z: 700, w: 120, h: 140, depth: 90 },
        computer: { xOffset: 50, yOffset: 180, w: 160, h: 140 },
        spawn: { xOffset: 340, yOffset: 120, heightRatio: 0.10, radius: 60 },
        shopButton: { yOffset: 22, w: 130, h: 30 }
    },

    boss: {
        initialTimer: 8.0,
        dimensions: { w: 170, h: 170 },
        positions: { startX: -400, y: -60, z: 550, awayX: -450, varianceWidth: 160 },
        timings: {
            warningMin: 2.5, warningVar: 1.5,
            lookingMin: 3.5, lookingVar: 2.5,
            awayMin: 12.0, awayVar: 8.0
        },
        catchChance: 0.007,
        catchSuspicionPenalty: 5,
        passiveSuspicionRate: 5
    },

    progression: {
        workDoneRate: 1,
        workMoneyRate: 0.1,
        funDrainRate: 10,
        completionReward: 1,
        completionAlertReduction: 25
    },

    shopLayout: {
        panelW: 500,
        panelH: 400,
        panelYOffset: 10,
        closeButtonSize: 24,
        closeBtnXOffset: 20,
        closeBtnYOffset: 20,
        tabXOffset: 65,
        tabYOffset: 92,
        tabW: 110,
        tabH: 30,
        cardH: 75,
        cardGap: 8,
        startYOffset: 150,
        buyBtnXOffset: 75,
        buyBtnW: 110,
        buyBtnH: 32
    },

    upgrades: [
        { id: 'workSpeed', name: 'Macro Keyboard', desc: 'increases processing speed by +30%', cost: 10, current: 0, max: 3, multiplier: 1.5, statMod: 0.30 },
        { id: 'stealthTint', name: 'Privacy Screen', desc: 'reduces boss suspicion progression by -20%', cost: 10, current: 0, max: 3, multiplier: 1.5, statMod: -0.20 },
        { id: 'maxFun', name: 'Comfy Chair', desc: 'dampens focus depletion speed by -25%', cost: 20, current: 0, max: 3, multiplier: 1.5, statMod: -0.25 }
    ],

    items: {
        scalingMultiplier: 1.6,
        catalog: [
            { id: 'fish', name: 'Slippery Fish', desc: 'gives +10 base focus. slippery structural air drift', cost: 100, current: 0, max: 3 },
            { id: 'knife', name: 'Tactical Knife', desc: 'gives +12 base focus. heavy vertical acceleration velocity', cost: 300, current: 0, max: 3 }
        ],
        profiles: {
            can: {
                vxRange: 180, vyRange: 90, vzRange: 120,
                gravity: 1350, baseVxMulti: 2.2, baseVyMulti: 1.2,
                baseVyOffset: -450, baseVzOffset: 400, vzPowerMulti: 800,
                throwFun: 1, catchFun: 4, vRotationMinMax: 25
            },
            fish: {
                vxRange: 460, vyRange: 140, vzRange: 120,
                gravity: 1050, baseVxMulti: 2.2, baseVyMulti: 1.2,
                baseVyOffset: -490, baseVzOffset: 400, vzPowerMulti: 800,
                throwFun: 3, catchFun: 10, vRotationMinMax: 25,
                waveFreq: 25, waveAmp: 60
            },
            knife: {
                vxRange: 90, vyRange: 250, vzRange: 120,
                gravity: 2100, baseVxMulti: 2.2, baseVyMulti: 1.2,
                baseVyOffset: -390, baseVzOffset: 650, vzPowerMulti: 800,
                throwFun: 6, catchFun: 20, fixedRotation: 45
            }
        },
        dragSettings: {
            maxPullDistance: 160,
            deadzone: 8
        },
        bounceSettings: {
            vzDampening: -0.20,
            vyBounceVelocity: -240,
            vxDampening: 0.3,
            maxZDistance: 1300
        }
    }
};