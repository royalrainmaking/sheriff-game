const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
    const CARD_TYPES = {
        APPLE: { name: 'Apple', type: 'legal', value: 2, penalty: 2, color: '#4caf50' },
        CHEESE: { name: 'Cheese', type: 'legal', value: 3, penalty: 2, color: '#4caf50' },
        BREAD: { name: 'Bread', type: 'legal', value: 3, penalty: 2, color: '#4caf50' },
        CHICKEN: { name: 'Chicken', type: 'legal', value: 4, penalty: 2, color: '#4caf50' },

        PEPPER: { name: 'Pepper', type: 'contraband', value: 6, penalty: 4, color: '#f44336' },
        MEAD: { name: 'Mead', type: 'contraband', value: 7, penalty: 4, color: '#f44336' },
        SILK: { name: 'Silk', type: 'contraband', value: 8, penalty: 4, color: '#f44336' },
        CROSSBOW: { name: 'Crossbow', type: 'contraband', value: 9, penalty: 4, color: '#f44336' }
    };

    function createDeck() {
        const deck = [];
        const addCards = (type, count) => {
            for (let i = 0; i < count; i++) {
                deck.push({ id: Math.random().toString(36).substr(2, 9), ...CARD_TYPES[type] });
            }
        };
        addCards('APPLE', 48); addCards('CHEESE', 36); addCards('BREAD', 36); addCards('CHICKEN', 24);
        addCards('PEPPER', 5); addCards('MEAD', 5); addCards('SILK', 5); addCards('CROSSBOW', 5);

        let currentIndex = deck.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [deck[currentIndex], deck[randomIndex]] = [deck[randomIndex], deck[currentIndex]];
        }
        return deck;
    }

    const rooms = {}; // { roomCode: { players: [{id, name, cards, coins, stand: []}], deck: [], discard: [], sheriffIndex: 0, ... } }

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('create-room', ({ name, avatar }) => {
            const code = Math.random().toString(36).substring(2, 6).toUpperCase();
            rooms[code] = {
                players: [{ id: socket.id, name, avatar, coins: 50, cards: [], stand: [] }],
                gameState: 'lobby',
                round: 0,
                maxRounds: 0 // will be set on game start: 2 rounds per player
            };
            socket.join(code);
            socket.emit('room-created', { code });
            console.log(`Room created: ${code} by ${name}`);
        });

        socket.on('join-room', ({ name, avatar, code }) => {
            if (rooms[code]) {
                rooms[code].players.push({ id: socket.id, name, avatar, coins: 50, cards: [], stand: [] });
                socket.join(code);
                io.to(code).emit('player-joined', { players: rooms[code].players, code });
                console.log(`${name} joined room ${code}`);
            } else {
                socket.emit('error', 'Room not found');
            }
        });

        socket.on('start-game', ({ code }) => {
            const room = rooms[code];
            if (room) {
                room.gameState = 'playing';
                room.deck = createDeck();
                room.discard = [];
                room.sheriffIndex = 0;
                room.phase = 'market';
                room.round = 1;
                room.maxRounds = room.players.length * 2; // 2 laps

                room.players.forEach((p, idx) => {
                    p.cards = room.deck.splice(0, 6);
                    p.hasExchanged = (idx === room.sheriffIndex);
                    p.stand = [];
                    p.coins = 50;
                    p.bag = null;
                });

                broadcastGameState(code, room);
                console.log(`Game started in room ${code}, maxRounds=${room.maxRounds}`);
            }
        });

        socket.on('exchange-cards', ({ code, cardIndexes }) => {
            const room = rooms[code];
            if (room && room.phase === 'market') {
                const player = room.players.find(p => p.id === socket.id);
                if (player && !player.hasExchanged) {
                    // Remove selected cards to discard
                    [...cardIndexes].sort((a, b) => b - a).forEach(idx => {
                        if (player.cards[idx]) {
                            room.discard.push(player.cards.splice(idx, 1)[0]);
                        }
                    });
                    // Draw back to 6
                    while (player.cards.length < 6 && room.deck.length > 0) {
                        player.cards.push(room.deck.shift());
                    }
                    player.hasExchanged = true;

                    // If all players exchanged, move to load bag
                    if (room.players.every(p => p.hasExchanged)) {
                        room.phase = 'load_bag';
                    }

                    broadcastGameState(code, room);
                }
            }
        });

        socket.on('declare-bag', ({ code, cardIndexes, declaredType }) => {
            console.log(`Declare bag received for ${socket.id} in ${code}:`, cardIndexes, declaredType);
            const room = rooms[code];
            if (room) {
                const player = room.players.find(p => p.id === socket.id);
                if (player) {
                    const bagCards = [];
                    // Sort descending to safely splice from highest index to lowest
                    [...cardIndexes].sort((a, b) => b - a).forEach(idx => {
                        if (player.cards[idx]) {
                            bagCards.push(player.cards.splice(idx, 1)[0]);
                        }
                    });
                    player.bag = { cards: bagCards, declaredGood: declaredType, declaredAmount: bagCards.length, bribe: 0 };
                    console.log(`Player ${player.name} loaded bag with ${bagCards.length} cards.`);

                    // Check if all merchants have loaded their bag
                    const allMerchantsLoaded = room.players.every(p => p.id === room.players[room.sheriffIndex].id || p.bag);
                    if (allMerchantsLoaded) {
                        room.phase = 'inspection';
                        console.log(`Room ${code} moved to inspection phase.`);
                    }

                    broadcastGameState(code, room);
                }
            }
        });

        socket.on('offer-bribe', ({ code, amount }) => {
            const room = rooms[code];
            if (room) {
                const player = room.players.find(p => p.id === socket.id);
                if (player && player.bag && !player.bag.status) {
                    // Ensure they can't bribe more than they have
                    player.bag.bribe = Math.max(0, Math.min(amount, player.coins));
                    broadcastGameState(code, room);
                }
            }
        });

        function calculateFinalScores(room) {
            const BONUSES = {
                Apple: { king: 20, queen: 10 },
                Cheese: { king: 15, queen: 10 },
                Bread: { king: 15, queen: 10 },
                Chicken: { king: 10, queen: 5 }
            };

            // Count legal goods per player per type
            const legalCounts = {};
            room.players.forEach(p => {
                legalCounts[p.id] = { Apple: 0, Cheese: 0, Bread: 0, Chicken: 0 };
                p.stand.forEach(card => {
                    if (card.type === 'legal' && legalCounts[p.id][card.name] !== undefined) {
                        legalCounts[p.id][card.name]++;
                    }
                });
            });

            const kingQueenBonuses = {};
            room.players.forEach(p => kingQueenBonuses[p.id] = 0);

            ['Apple', 'Cheese', 'Bread', 'Chicken'].forEach(goodType => {
                const bonus = BONUSES[goodType];
                const sorted = room.players
                    .map(p => ({ id: p.id, count: legalCounts[p.id][goodType] || 0 }))
                    .filter(x => x.count > 0)
                    .sort((a, b) => b.count - a.count);

                if (sorted.length === 0) return;

                const kingCount = sorted[0].count;
                const kingPlayers = sorted.filter(x => x.count === kingCount);

                if (kingPlayers.length >= 2) {
                    // Tie for 1st: split king+queen bonus, no queen awarded separately
                    const share = Math.floor((bonus.king + bonus.queen) / kingPlayers.length);
                    kingPlayers.forEach(x => kingQueenBonuses[x.id] += share);
                } else {
                    kingQueenBonuses[sorted[0].id] += bonus.king;
                    // Check queen
                    if (sorted.length > 1) {
                        const queenCount = sorted[1].count;
                        const queenPlayers = sorted.slice(1).filter(x => x.count === queenCount);
                        if (queenPlayers.length >= 2) {
                            const share = Math.floor(bonus.queen / queenPlayers.length);
                            queenPlayers.forEach(x => kingQueenBonuses[x.id] += share);
                        } else {
                            kingQueenBonuses[sorted[1].id] += bonus.queen;
                        }
                    }
                }
            });

            const scores = room.players.map(p => {
                const legalValue = p.stand.filter(c => c.type === 'legal').reduce((s, c) => s + c.value, 0);
                const contrabandValue = p.stand.filter(c => c.type === 'contraband').reduce((s, c) => s + c.value, 0);
                const kqBonus = kingQueenBonuses[p.id] || 0;
                const coins = p.coins;
                const total = legalValue + contrabandValue + kqBonus + coins;
                return {
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                    legalValue,
                    contrabandValue,
                    kqBonus,
                    coins,
                    total,
                    legalCount: p.stand.filter(c => c.type === 'legal').length,
                    contrabandCount: p.stand.filter(c => c.type === 'contraband').length,
                    legalCounts: legalCounts[p.id]
                };
            });

            // Sort: total desc -> legalCount desc -> contrabandCount desc
            scores.sort((a, b) => {
                if (b.total !== a.total) return b.total - a.total;
                if (b.legalCount !== a.legalCount) return b.legalCount - a.legalCount;
                return b.contrabandCount - a.contrabandCount;
            });

            return scores;
        }

        function broadcastGameState(code, room) {
            room.players.forEach(p => {
                io.to(p.id).emit('game-state-updated', {
                    players: room.players.map(pl => {
                        const hideCards = pl.id !== p.id;
                        return {
                            ...pl,
                            cards: hideCards ? Array(pl.cards.length).fill({ hidden: true }) : pl.cards,
                            hasExchanged: pl.hasExchanged,
                            bag: pl.bag ? {
                                declaredGood: pl.bag.declaredGood,
                                declaredAmount: pl.bag.declaredAmount,
                                status: pl.bag.status,
                                bribe: pl.bag.bribe,
                                revealed: pl.bag.revealed,
                                cards: (pl.bag.revealed || pl.id === p.id) ? pl.bag.cards : null
                            } : null
                        }
                    }),
                    sheriffId: room.players[room.sheriffIndex].id,
                    phase: room.phase,
                    round: room.round,
                    maxRounds: room.maxRounds,
                    finalScores: room.finalScores || null
                });
            });
        }

        socket.on('resolve-bag', ({ code, targetPlayerId, action }) => {
            const room = rooms[code];
            if (room && room.players[room.sheriffIndex].id === socket.id) {
                const target = room.players.find(p => p.id === targetPlayerId);
                const sheriff = room.players[room.sheriffIndex];

                if (target && target.bag) {
                    target.bag.status = action;

                    if (action === 'inspect') {
                        target.bag.revealed = true;
                        let truthful = true;
                        let penaltyOwedToSheriff = 0;
                        let penaltyOwedToMerchant = 0;

                        target.bag.cards.forEach(card => {
                            if (card.name === target.bag.declaredGood) {
                                target.stand.push(card);
                                penaltyOwedToMerchant += card.penalty;
                            } else {
                                truthful = false;
                                penaltyOwedToSheriff += card.penalty;
                            }
                        });

                        if (truthful) {
                            sheriff.coins -= penaltyOwedToMerchant;
                            target.coins += penaltyOwedToMerchant;
                        } else {
                            target.coins -= penaltyOwedToSheriff;
                            sheriff.coins += penaltyOwedToSheriff;
                        }
                    } else if (action === 'pass') {
                        // Passed - transfer bribe (if any)
                        const bribeAmount = target.bag.bribe || 0;
                        if (bribeAmount > 0) {
                            target.coins -= bribeAmount;
                            sheriff.coins += bribeAmount;
                        }

                        // everyone sees the cards anyway as they go to the stand
                        target.bag.revealed = true;
                        target.bag.cards.forEach(card => target.stand.push(card));
                    }

                    // Check if all bags resolved
                    const allResolved = room.players.every(p => p.id === sheriff.id || p.bag?.status);
                    if (allResolved) {
                        room.phase = 'end_round';
                    }

                    broadcastGameState(code, room);
                }
            }
        });

        socket.on('next-round', ({ code }) => {
            const room = rooms[code];
            if (room) {
                // Check if game should end
                if (room.round >= room.maxRounds) {
                    // Calculate scores and end game
                    const finalScores = calculateFinalScores(room);
                    room.phase = 'game_over';
                    room.finalScores = finalScores;
                    broadcastGameState(code, room);
                    return;
                }

                room.round++;
                room.sheriffIndex = (room.sheriffIndex + 1) % room.players.length;
                room.players.forEach(p => {
                    p.bag = null;
                    while (p.cards.length < 6 && room.deck.length > 0) {
                        p.cards.push(room.deck.shift());
                    }
                    p.hasExchanged = (p.id === room.players[room.sheriffIndex].id);
                });
                room.phase = 'market';
                broadcastGameState(code, room);
            }
        });

        socket.on('end-game-now', ({ code }) => {
            const room = rooms[code];
            if (room && room.players[room.sheriffIndex]?.id === socket.id) {
                const finalScores = calculateFinalScores(room);
                room.phase = 'game_over';
                room.finalScores = finalScores;
                broadcastGameState(code, room);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${PORT}`);
    });
});
