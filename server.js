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

    const BASE_DECK_TEMPLATE = [];
    const _addCards = (type, count) => {
        for (let i = 0; i < count; i++) {
            BASE_DECK_TEMPLATE.push(CARD_TYPES[type]);
        }
    };
    _addCards('APPLE', 48); _addCards('CHEESE', 36); _addCards('BREAD', 36); _addCards('CHICKEN', 24);
    _addCards('PEPPER', 5); _addCards('MEAD', 5); _addCards('SILK', 5); _addCards('CROSSBOW', 5);

    function drawRandomCard() {
        const template = BASE_DECK_TEMPLATE[Math.floor(Math.random() * BASE_DECK_TEMPLATE.length)];
        return { id: Math.random().toString(36).substr(2, 9), ...template };
    }

    const rooms = {}; // { roomCode: { players: [{id, name, cards, coins, stand: []}], deck: [], discard: [], sheriffIndex: 0, ... } }

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('create-room', ({ name, avatar }) => {
            const code = Math.random().toString(36).substring(2, 6).toUpperCase();
            const token = Math.random().toString(36).substring(2, 14);
            rooms[code] = {
                players: [{ id: socket.id, name, avatar, coins: 50, cards: [], stand: [], token, disconnected: false }],
                gameState: 'lobby',
                round: 0,
                maxRounds: 0
            };
            socket.join(code);
            socket.emit('room-created', { code, token });
            console.log(`Room created: ${code} by ${name}`);
        });

        socket.on('join-room', ({ name, avatar, code }) => {
            if (rooms[code]) {
                if (rooms[code].gameState === 'playing') {
                    return socket.emit('error', 'เกมเริ่มไปแล้ว ใช้ฟีเจอร์เชื่อมต่อใหม่แทน');
                }
                if (rooms[code].players.length >= 12) {
                    return socket.emit('error', 'ห้องเต็มแล้ว (สูงสุด 12 คน)');
                }
                const token = Math.random().toString(36).substring(2, 14);
                rooms[code].players.push({ id: socket.id, name, avatar, coins: 50, cards: [], stand: [], token, disconnected: false });
                socket.join(code);
                socket.emit('player-token', { token, code });
                io.to(code).emit('player-joined', { players: rooms[code].players, code });
                console.log(`${name} joined room ${code}`);
            } else {
                socket.emit('error', 'ไม่พบห้องนี้');
            }
        });

        // Host kicks a player
        socket.on('kick-player', ({ code, targetId }) => {
            const room = rooms[code];
            if (!room) return;
            const isHost = room.players[0]?.id === socket.id;
            if (!isHost) return;
            if (targetId === socket.id) return; // can't kick yourself

            room.players = room.players.filter(p => p.id !== targetId);
            // Notify the kicked player
            io.to(targetId).emit('you-were-kicked');
            // Update remaining players
            io.to(code).emit('player-joined', { players: room.players, code });
            console.log(`Player ${targetId} was kicked from room ${code}`);
        });

        // Player voluntarily leaves
        socket.on('leave-room', ({ code }) => {
            const room = rooms[code];
            if (!room) return;
            const isHost = room.players[0]?.id === socket.id;

            if (isHost) {
                // Host leaves ─ during game: end game. In lobby: dissolve room
                if (room.gameState === 'playing') {
                    room.players = room.players.filter(p => p.id !== socket.id);
                    if (room.players.length <= 1) {
                        room.phase = 'game_over';
                        room.finalScores = calculateFinalScores(room);
                        broadcastGameState(code, room);
                    } else {
                        broadcastGameState(code, room);
                    }
                    socket.leave(code);
                } else {
                    // Lobby: dissolve
                    room.players.forEach(p => {
                        if (p.id !== socket.id) {
                            io.to(p.id).emit('room-dissolved', 'เจ้าของห้องออกจากห้อง ห้องถูกยุบแล้ว');
                        }
                    });
                    delete rooms[code];
                    socket.leave(code);
                    console.log(`Room ${code} dissolved (host left)`);
                }
            } else {
                room.players = room.players.filter(p => p.id !== socket.id);
                socket.leave(code);

                if (room.players.length <= 1 && room.gameState === 'playing') {
                    room.phase = 'game_over';
                    room.finalScores = calculateFinalScores(room);
                    broadcastGameState(code, room);
                    console.log(`Room ${code} ended (only 1 player left)`);
                } else if (room.players.length === 0) {
                    delete rooms[code];
                } else {
                    if (room.gameState === 'playing') {
                        broadcastGameState(code, room);
                    } else {
                        io.to(code).emit('player-joined', { players: room.players, code });
                    }
                }
                console.log(`Socket ${socket.id} left room ${code}`);
            }
            socket.emit('left-room');
        });

        socket.on('abandon-game', ({ code, token }) => {
            const room = rooms[code];
            if (!room) return;
            const playerIdx = room.players.findIndex(p => p.token === token);
            if (playerIdx === -1) return;
            const isHost = (playerIdx === 0);

            if (isHost) {
                room.players.forEach(p => {
                    if (p.token !== token) {
                        io.to(p.id).emit('room-dissolved', 'เจ้าของห้องยกเลิกการเล่น ห้องถูกยุบแล้ว');
                    }
                });
                delete rooms[code];
            } else {
                room.players.splice(playerIdx, 1);

                if (room.players.length <= 1 && room.gameState === 'playing') {
                    room.phase = 'game_over';
                    room.finalScores = calculateFinalScores(room);
                    broadcastGameState(code, room);
                } else if (room.players.length === 0) {
                    delete rooms[code];
                } else {
                    if (room.gameState === 'playing') {
                        broadcastGameState(code, room);
                    } else {
                        io.to(code).emit('player-joined', { players: room.players, code });
                    }
                }
            }
            socket.emit('left-room');
        });

        // Reconnect to an ongoing game using stored token
        socket.on('reconnect-game', ({ code, token }) => {
            const room = rooms[code];
            if (!room) return socket.emit('reconnect-failed', 'ห้องไม่มีอยู่แล้ว');
            const player = room.players.find(p => p.token === token);
            if (!player) return socket.emit('reconnect-failed', 'ไม่พบข้อมูลผู้เล่น');

            // Update socket id and mark as online
            player.id = socket.id;
            player.disconnected = false;
            socket.join(code);

            if (room.gameState === 'playing') {
                broadcastGameState(code, room);
            } else {
                io.to(code).emit('player-joined', { players: room.players, code });
                socket.emit('room-created', { code, token }); // re-enter lobby
            }
            console.log(`Player ${player.name} reconnected to room ${code}`);
        });

        socket.on('start-game', ({ code }) => {
            const room = rooms[code];
            if (room) {
                room.gameState = 'playing';
                room.discard = [];
                room.sheriffIndex = 0;
                room.phase = 'market';
                room.round = 1;
                room.maxRounds = room.players.length * 2; // 2 laps

                room.players.forEach((p, idx) => {
                    p.cards = [];
                    for(let i = 0; i < 6; i++) p.cards.push(drawRandomCard());
                    p.hasExchanged = (idx === room.sheriffIndex);
                    p.stand = [];
                    p.coins = 50;
                    p.bag = null;
                    p.lastDiscarded = [];
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
                    const discardedThisTurn = [];
                    [...cardIndexes].sort((a, b) => b - a).forEach(idx => {
                        if (player.cards[idx]) {
                            const discarded = player.cards.splice(idx, 1)[0];
                            room.discard.push(discarded);
                            discardedThisTurn.push(discarded);
                        }
                    });
                    player.lastDiscarded = discardedThisTurn;
                    // Draw back to 6
                    while (player.cards.length < 6) {
                        player.cards.push(drawRandomCard());
                    }
                    player.hasExchanged = true;

                    // If all active players exchanged, move to load bag
                    const activePlayers = room.players.filter(p => !p.disconnected);
                    if (activePlayers.every(p => p.hasExchanged)) {
                        room.phase = 'load_bag';
                    }

                    broadcastGameState(code, room);
                }
            }
        });

        socket.on('declare-bag', ({ code, cardIndexes, declaredType }) => {
            console.log(`Declare bag received for ${socket.id} in ${code}:`, cardIndexes, declaredType);
            const room = rooms[code];
            if (room && room.phase === 'load_bag') {
                const player = room.players.find(p => p.id === socket.id);
                if (player && !player.bag) {
                    const bagCards = [];
                    // Sort descending to safely splice from highest index to lowest
                    [...cardIndexes].sort((a, b) => b - a).forEach(idx => {
                        if (player.cards[idx]) {
                            bagCards.push(player.cards.splice(idx, 1)[0]);
                        }
                    });
                    player.bag = { cards: bagCards, declaredGood: declaredType, declaredAmount: bagCards.length, bribe: 0 };
                    console.log(`Player ${player.name} loaded bag with ${bagCards.length} cards.`);

                    // Check if all ACTIVE merchants have loaded their bag
                    const sheriff = room.players[room.sheriffIndex];
                    const activeMerchants = room.players.filter(p => p.id !== sheriff.id && !p.disconnected);
                    const allMerchantsLoaded = activeMerchants.every(p => p.bag);
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
            if (!room.players || room.players.length === 0) return;
            // Guard: ensure sheriffIndex is valid
            if (room.sheriffIndex >= room.players.length) {
                room.sheriffIndex = 0;
            }
            const sheriff = room.players[room.sheriffIndex];
            room.players.forEach(p => {
                io.to(p.id).emit('game-state-updated', {
                    code,
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
                            } : null,
                            lastDiscarded: pl.lastDiscarded || []
                        }
                    }),
                    sheriffId: sheriff.id,
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

                if (target && target.bag && !target.bag.resolving) {
                    target.bag.resolving = true;
                    target.bag.status = action;
                    target.bag.revealed = true;

                    broadcastGameState(code, room);

                    setTimeout(() => {
                        if (!rooms[code] || rooms[code].phase === 'game_over') return;

                        if (action === 'inspect') {
                            let truthful = true;
                            let penaltyOwedToSheriff = 0;
                            let penaltyOwedToMerchant = 0;

                            target.bag.cards.forEach(card => {
                                if (card.name === target.bag.declaredGood) {
                                    target.stand.push(card);
                                    penaltyOwedToMerchant += card.penalty;
                                } else {
                                    // Card is contraband or wrong type — confiscated (goes to discard), triggers penalty
                                    room.discard.push(card);
                                    truthful = false;
                                    penaltyOwedToSheriff += card.penalty;
                                }
                            });

                            if (truthful) {
                                // Merchant was honest: sheriff pays penalty per card
                                const actualPay = Math.min(penaltyOwedToMerchant, sheriff.coins);
                                sheriff.coins -= actualPay;
                                target.coins += actualPay;
                            } else {
                                // Merchant was caught: merchant pays penalty, sheriff keeps declared cards
                                const actualPay = Math.min(penaltyOwedToSheriff, target.coins);
                                target.coins -= actualPay;
                                sheriff.coins += actualPay;
                            }
                        } else if (action === 'pass') {
                            // Passed - transfer bribe (if any)
                            const bribeAmount = target.bag.bribe || 0;
                            if (bribeAmount > 0) {
                                const actualBribe = Math.min(bribeAmount, target.coins);
                                target.coins -= actualBribe;
                                sheriff.coins += actualBribe;
                            }

                            target.bag.cards.forEach(card => target.stand.push(card));
                        }

                        target.bag.resolvedFinished = true;

                        // Check if all ACTIVE bags resolved (skip disconnected players)
                        const activeMerchants = room.players.filter(p => p.id !== sheriff.id && !p.disconnected);
                        const allResolved = activeMerchants.every(p => p.bag && p.bag.resolvedFinished);
                        if (allResolved) {
                            room.phase = 'end_round';
                        }

                        broadcastGameState(code, room);
                    }, 10000); // 10 seconds delay
                }
            }
        });

        socket.on('next-round', ({ code }) => {
            const room = rooms[code];
            if (!room) return;
            // Only sheriff can advance
            if (room.players[room.sheriffIndex]?.id !== socket.id) return;

            // Check if game should end
            if (room.round >= room.maxRounds) {
                const finalScores = calculateFinalScores(room);
                room.phase = 'game_over';
                room.finalScores = finalScores;
                broadcastGameState(code, room);
                return;
            }

            room.round++;
            // Rotate sheriff, skip disconnected players
            const totalPlayers = room.players.length;
            let nextIdx = (room.sheriffIndex + 1) % totalPlayers;
            let attempts = 0;
            while (room.players[nextIdx]?.disconnected && attempts < totalPlayers) {
                nextIdx = (nextIdx + 1) % totalPlayers;
                attempts++;
            }
            room.sheriffIndex = nextIdx;

            room.players.forEach(p => {
                p.bag = null;
                // Top-up cards to 6
                while (p.cards.length < 6) {
                    p.cards.push(drawRandomCard());
                }
                p.hasExchanged = (p.id === room.players[room.sheriffIndex].id);
                p.lastDiscarded = [];
            });
            room.phase = 'market';
            broadcastGameState(code, room);
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
            for (const [code, room] of Object.entries(rooms)) {
                const idx = room.players.findIndex(p => p.id === socket.id);
                if (idx !== -1) {
                    const player = room.players[idx];
                    const isHost = idx === 0;

                    if (room.gameState === 'playing') {
                        // During game: mark disconnected, give 2 minutes to reconnect
                        player.disconnected = true;
                        broadcastGameState(code, room);
                        console.log(`Player ${player.name} disconnected from game ${code}, waiting for reconnect...`);

                        setTimeout(() => {
                            if (!rooms[code]) return;
                            const p = rooms[code].players.find(pl => pl.token === player.token);
                            if (p && p.disconnected) {
                                rooms[code].players = rooms[code].players.filter(pl => pl.token !== player.token);
                                if (rooms[code].players.length <= 1 && rooms[code].gameState === 'playing') {
                                    rooms[code].phase = 'game_over';
                                    rooms[code].finalScores = calculateFinalScores(rooms[code]);
                                    broadcastGameState(code, rooms[code]);
                                    console.log(`Room ${code} ended (only 1 player left after timeout)`);
                                } else if (rooms[code].players.length === 0) {
                                    delete rooms[code];
                                } else {
                                    broadcastGameState(code, rooms[code]);
                                }
                                console.log(`Player ${player.name} removed after timeout in room ${code}`);
                            }
                        }, 120000); // 2 minutes
                    } else {
                        // In lobby
                        if (isHost) {
                            // Host disconnects in lobby -> dissolve room
                            room.players.forEach(p => {
                                if (p.id !== socket.id) {
                                    io.to(p.id).emit('room-dissolved', 'เจ้าของห้องหลุดการเชื่อมต่อ ห้องถูกยุบแล้ว');
                                }
                            });
                            delete rooms[code];
                            console.log(`Room ${code} dissolved (host disconnected in lobby)`);
                        } else {
                            room.players.splice(idx, 1);
                            io.to(code).emit('player-joined', { players: room.players, code });
                        }
                    }
                    break;
                }
            }
        });
    });

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${PORT}`);
    });
});
