'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, LogIn, ShoppingBag, User, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '@/lib/socket';

export default function Home() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👳‍♂️');
  const [roomCode, setRoomCode] = useState('');
  const [view, setView] = useState('menu'); // menu, create, join, lobby
  const [currentRoom, setCurrentRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [declaring, setDeclaring] = useState(false);
  const [declaredGood, setDeclaredGood] = useState('Apple');
  const [bribeInput, setBribeInput] = useState(0);

  const getCardImageUrl = (name) => {
    switch (name) {
      case 'Apple': return '/card/appple.png';
      case 'Cheese': return '/card/cheese.png';
      case 'Bread': return '/card/bread.png';
      case 'Chicken': return '/card/chicken.png';
      case 'Pepper': return '/card/peper.png';
      case 'Mead': return '/card/mead.png';
      case 'Silk': return '/card/silk.png';
      case 'Crossbow': return '/card/crossbow.png';
      default: return '';
    }
  };

  useEffect(() => {
    socket.connect();

    socket.on('room-created', ({ code }) => {
      setCurrentRoom(code);
      setView('lobby');
    });

    socket.on('player-joined', ({ players, code }) => {
      if (code) setCurrentRoom(code);
      setPlayers(players);
      setView('lobby');
    });

    socket.on('game-started', (state) => {
      setGameState(state);
      setPlayers(state.players);
      setView('game');
    });

    socket.on('game-state-updated', (state) => {
      setGameState(state);
      setPlayers(state.players);
      if (state.phase) {
        setView('game');
      }
    });

    socket.on('error', (msg) => {
      alert(msg);
    });

    return () => {
      socket.off('room-created');
      socket.off('player-joined');
      socket.off('game-started');
      socket.off('game-state-updated');
      socket.off('error');
    };
  }, []);

  const handleCreateRoom = () => {
    if (!name) return alert('Please enter your name');
    socket.emit('create-room', { name, avatar });
  };

  const handleJoinRoom = () => {
    if (!name || !roomCode) return alert('Please enter name and room code');
    socket.emit('join-room', { name, avatar, code: roomCode });
  };

  const handleStartGame = () => {
    socket.emit('start-game', { code: currentRoom });
  };

  const toggleCardSelection = (idx) => {
    if (selectedCards.includes(idx)) {
      setSelectedCards(selectedCards.filter(i => i !== idx));
    } else {
      if (selectedCards.length < 5) setSelectedCards([...selectedCards, idx]);
    }
  };

  const handleExchange = () => {
    socket.emit('exchange-cards', {
      code: currentRoom,
      cardIndexes: selectedCards
    });
    setSelectedCards([]);
  };

  const handleDeclare = () => {
    socket.emit('declare-bag', {
      code: currentRoom,
      cardIndexes: selectedCards,
      declaredType: declaredGood
    });
    setDeclaring(false);
    setSelectedCards([]);
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: view === 'game' ? '1000px' : '450px', textAlign: 'center', transition: 'max-width 0.5s ease' }}>
        {view !== 'game' && (
          <div style={{ marginBottom: '40px' }}>
            <ShoppingBag size={48} color="var(--primary)" style={{ marginBottom: '10px' }} />
            <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '5px' }}>SHERIFF OF<br />NOTTINGHAM</h1>
            <p style={{ color: 'var(--foreground)', opacity: 0.7, letterSpacing: '2px' }}>SMUGGLING & BLUFFING</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="input-group" style={{ textAlign: 'left' }}>
                <label>Your Name</label>
                <input
                  type="text"
                  placeholder="Enter alias..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ textAlign: 'left', marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--foreground)', fontWeight: 'bold' }}>Choose Avatar</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['👳‍♂️', '🧕', '🧔', '👩‍🦰', '🧙‍♂️', '🧝‍♀️', '🕵️', '🤴'].map((av) => (
                    <button
                      key={av}
                      onClick={() => setAvatar(av)}
                      style={{
                        padding: '10px',
                        fontSize: '1.5rem',
                        background: avatar === av ? 'var(--primary)' : 'rgba(0,0,0,0.05)',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transform: avatar === av ? 'scale(1.1)' : 'scale(1)',
                        transition: '0.2s',
                        boxShadow: avatar === av ? '0 4px 8px rgba(0,0,0,0.2)' : 'none'
                      }}
                    >{av}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button className="gold-button" onClick={() => setView('create')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Plus size={20} /> Create New Room
                </button>
                <button
                  style={{
                    background: 'rgba(0,0,0,0.05)',
                    color: 'var(--foreground)',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}
                  onClick={() => setView('join')}
                >
                  <LogIn size={20} /> Join with Code
                </button>
              </div>
            </motion.div>
          )}

          {view === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ color: 'var(--primary)', marginBottom: '20px' }}>CREATE ROOM</h2>
              <p style={{ marginBottom: '20px', fontSize: '0.9rem' }}>You are starting a new game session.</p>
              <button className="gold-button" style={{ width: '100%' }} onClick={handleCreateRoom}>Confirm & Create</button>
              <button onClick={() => setView('menu')} style={{ background: 'none', color: '#888', marginTop: '15px' }}>Cancel</button>
            </motion.div>
          )}

          {view === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ color: 'var(--primary)', marginBottom: '20px' }}>JOIN ROOM</h2>
              <div className="input-group" style={{ textAlign: 'left' }}>
                <label>Room Code</label>
                <input
                  type="text"
                  placeholder="e.g. X1Y2"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  style={{ fontSize: '1.5rem', textAlign: 'center', letterSpacing: '5px' }}
                />
              </div>
              <button className="gold-button" style={{ width: '100%' }} onClick={handleJoinRoom}>Join Game</button>
              <button onClick={() => setView('menu')} style={{ background: 'none', color: '#888', marginTop: '15px' }}>Back to Menu</button>
            </motion.div>
          )}

          {view === 'lobby' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
            >
              <div style={{ background: 'var(--primary)', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>Room Code</p>
                <h2 style={{ fontSize: '2rem', letterSpacing: '8px', color: '#fff' }}>{currentRoom}</h2>
              </div>

              <div style={{ textAlign: 'left', marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--foreground)', opacity: 0.8, marginBottom: '15px' }}>Players ({players.length}/6)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {players.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '2px solid var(--primary)', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                        {p.avatar || '👤'}
                      </div>
                      <span style={{ fontWeight: '600', color: 'var(--foreground)' }}>{p.name} {p.id === socket.id ? '(You)' : ''}</span>
                    </div>
                  ))}
                  {players.length < 2 && (
                    <p style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic', marginTop: '10px' }}>Waiting for more players...</p>
                  )}
                </div>
              </div>

              {players.length >= 1 && players[0].id === socket.id && (
                <button className="gold-button" style={{ width: '100%', fontSize: '1.2rem' }} onClick={handleStartGame}>Start Game</button>
              )}

              <p style={{ marginTop: '20px', fontSize: '0.8rem', color: '#555' }}>
                Share the code with your friends to join.
              </p>
            </motion.div>
          )}
          {view === 'game' && gameState && (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ width: '100%', margin: '0 auto' }}
            >
              {gameState.phase === 'game_over' ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <motion.h1
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ fontSize: '3.5rem', color: 'var(--primary)', marginBottom: '10px', textShadow: '0 4px 15px rgba(212,175,55,0.5)' }}
                  >
                    🏆 GAME OVER 🏆
                  </motion.h1>
                  <p style={{ fontSize: '1.2rem', color: 'var(--foreground)', marginBottom: '40px' }}>Final Scores & Standings</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
                    {gameState.finalScores && gameState.finalScores.map((score, index) => (
                      <motion.div
                        key={score.id}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.4, type: 'spring' }}
                        style={{
                          background: index === 0 ? 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)' : 'rgba(255,255,255,0.9)',
                          border: index === 0 ? '3px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)',
                          borderRadius: '16px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '15px',
                          boxShadow: index === 0 ? '0 10px 30px rgba(212,175,55,0.3)' : '0 4px 15px rgba(0,0,0,0.05)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {index === 0 && <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1, fontSize: '10rem' }}>👑</div>}
                        {/* Header / Placement */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: index === 0 ? '2px solid rgba(212,175,55,0.3)' : '1px solid rgba(0,0,0,0.1)', paddingBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: index === 0 ? '3rem' : '2rem', fontWeight: 'bold', color: index === 0 ? 'var(--primary)' : 'var(--foreground)', opacity: index === 0 ? 1 : 0.5 }}>
                              #{index + 1}
                            </span>
                            <span style={{ fontSize: '2.5rem' }}>{score.avatar}</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
                              {score.name} {score.id === socket.id ? '(You)' : ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            {score.total} <span style={{ fontSize: '1rem', color: 'var(--foreground)', opacity: 0.7 }}>pts</span>
                          </div>
                        </div>

                        {/* Score Breakdown Grid */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', fontSize: '0.9rem', textAlign: 'left' }}>
                          <div style={{ flex: 1, minWidth: '100px', background: 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ display: 'block', color: 'var(--foreground)', opacity: 0.7, fontSize: '0.8rem' }}>Legal Goods</span>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--foreground)' }}>+{score.legalValue} pts</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>({score.legalCount} items)</span>
                          </div>
                          <div style={{ flex: 1, minWidth: '100px', background: 'rgba(211, 47, 47, 0.05)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ display: 'block', color: 'var(--accent)', opacity: 0.8, fontSize: '0.8rem' }}>Contraband</span>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent)' }}>+{score.contrabandValue} pts</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>({score.contrabandCount} items)</span>
                          </div>
                          <div style={{ flex: 1, minWidth: '100px', background: 'rgba(212, 175, 55, 0.05)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ display: 'block', color: 'var(--primary)', opacity: 0.9, fontSize: '0.8rem' }}>King/Queen</span>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>+{score.kqBonus} pts</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>(Bonuses)</span>
                          </div>
                          <div style={{ flex: 1, minWidth: '100px', background: 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ display: 'block', color: 'var(--foreground)', opacity: 0.7, fontSize: '0.8rem' }}>Remaining Gold</span>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--foreground)' }}>+{score.coins} pts</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>(1:1 Value)</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    className="gold-button"
                    onClick={() => window.location.reload()}
                    style={{ marginTop: '50px', padding: '20px 50px', fontSize: '1.5rem', borderRadius: '50px' }}
                  >
                    Play Again
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>Role: {gameState.sheriffId === socket.id ? '👑 SHERIFF' : '🎒 MERCHANT'}</h2>
                      <span style={{ fontSize: '0.9rem', color: 'var(--foreground)', opacity: 0.7, fontWeight: 'bold', background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: '4px', marginTop: '5px' }}>
                        Round {Math.ceil(gameState.round / players.length)} of {gameState.maxRounds / players.length} (Turn {gameState.round}/{gameState.maxRounds})
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      <Coins size={20} color="#d4af37" /> {players.find(p => p.id === socket.id)?.coins} Coins
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.03)', padding: '20px', borderRadius: '16px', minHeight: '300px', position: 'relative' }}>
                    <h3 style={{ marginBottom: '15px' }}>Your Hand</h3>

                    {gameState.phase === 'market' && gameState.sheriffId === socket.id && (
                      <p style={{ color: 'var(--primary)', fontStyle: 'italic', marginBottom: '20px' }}>
                        Market Phase: Waiting for merchants to exchange cards...
                      </p>
                    )}

                    {gameState.phase === 'market' && gameState.sheriffId !== socket.id && (
                      <p style={{ color: 'var(--foreground)', opacity: 0.6, marginBottom: '20px' }}>
                        Market Phase: Select up to 5 cards to discard and redraw. (You can also draw 0).
                      </p>
                    )}

                    {gameState.phase === 'load_bag' && gameState.sheriffId === socket.id && (
                      <p style={{ color: 'var(--primary)', fontStyle: 'italic', marginBottom: '20px' }}>
                        Wait for merchants to load their bags...
                      </p>
                    )}

                    {gameState.phase === 'load_bag' && gameState.sheriffId !== socket.id && (
                      <p style={{ color: 'var(--foreground)', opacity: 0.6, marginBottom: '20px' }}>
                        Select 1 to 5 cards to put in your bag.
                      </p>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                      {players.find(p => p.id === socket.id)?.cards.map((card, idx) => {
                        const isSelected = selectedCards.includes(idx);
                        return (
                          <motion.div
                            key={idx}
                            whileHover={gameState.sheriffId !== socket.id ? { scale: 1.05, y: -10 } : {}}
                            whileTap={gameState.sheriffId !== socket.id ? { scale: 0.95 } : {}}
                            onClick={() => gameState.sheriffId !== socket.id ? toggleCardSelection(idx) : null}
                            animate={{ y: isSelected ? -20 : 0 }}
                            style={{
                              width: '120px',
                              height: '180px',
                              borderRadius: '12px',
                              background: `url(${getCardImageUrl(card.name)}) center/100% 100% no-repeat`,
                              cursor: gameState.sheriffId !== socket.id ? 'pointer' : 'default',
                              boxShadow: isSelected ? `0 15px 30px ${card.color}88, 0 0 0 4px var(--primary)` : '0 5px 15px rgba(0,0,0,0.2)',
                              position: 'relative',
                              userSelect: 'none',
                              border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.2)'
                            }}
                          >

                            {isSelected && (
                              <div style={{ position: 'absolute', top: -10, left: -10, background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 4px 8px rgba(0,0,0,0.3)', fontSize: '1.2rem' }}>
                                ✓
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {gameState.phase === 'market' && gameState.sheriffId !== socket.id && !players.find(p => p.id === socket.id)?.hasExchanged && (
                      <button className="gold-button" onClick={handleExchange} style={{ marginTop: '30px', padding: '15px 30px', fontSize: '1.2rem' }}>
                        Discard & Draw {selectedCards.length} Cards
                      </button>
                    )}

                    {gameState.phase === 'market' && players.find(p => p.id === socket.id)?.hasExchanged && (
                      <p style={{ color: 'var(--primary)', marginTop: '20px', fontWeight: 'bold' }}>
                        Cards exchanged! Waiting for others...
                      </p>
                    )}

                    {gameState.phase === 'load_bag' && gameState.sheriffId !== socket.id && selectedCards.length > 0 && !declaring && !players.find(p => p.id === socket.id)?.bag && (
                      <button className="gold-button" onClick={() => setDeclaring(true)} style={{ marginTop: '30px', padding: '15px 30px', fontSize: '1.2rem' }}>
                        Put {selectedCards.length} Cards in Bag
                      </button>
                    )}

                    {declaring && (
                      <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                        <h3 style={{ marginBottom: '15px', color: 'var(--foreground)' }}>Declare Your Goods ({selectedCards.length} in bag)</h3>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                          {['Apple', 'Cheese', 'Bread', 'Chicken'].map(good => (
                            <button
                              key={good}
                              onClick={() => setDeclaredGood(good)}
                              style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                background: declaredGood === good ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                                color: declaredGood === good ? '#fff' : 'var(--foreground)',
                                border: 'none',
                                fontWeight: 'bold'
                              }}
                            >
                              {good}
                            </button>
                          ))}
                        </div>
                        <button className="gold-button" onClick={handleDeclare}>Confirm & Declare</button>
                        <button onClick={() => setDeclaring(false)} style={{ display: 'block', margin: '15px auto 0', background: 'none', color: '#888', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    )}

                    {players.find(p => p.id === socket.id)?.bag && gameState.phase === 'load_bag' && (
                      <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(184, 134, 11, 0.1)', borderRadius: '8px' }}>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Bag Loaded!</h3>
                        <p style={{ color: 'var(--foreground)' }}>
                          You declared: <strong>{players.find(p => p.id === socket.id).bag.declaredAmount} x {players.find(p => p.id === socket.id).bag.declaredGood}</strong>.<br />
                          Waiting for others...
                        </p>
                      </div>
                    )}

                    {gameState.phase === 'inspection' && (
                      <div style={{ marginTop: '30px', background: 'rgba(211, 47, 47, 0.1)', padding: '20px', borderRadius: '8px', border: '1px solid var(--accent)' }}>
                        <h2 style={{ color: 'var(--accent)', marginBottom: '10px' }}>INSPECTION PHASE</h2>
                        <p style={{ color: 'var(--foreground)' }}>
                          {gameState.sheriffId === socket.id
                            ? 'Sheriff, inspect the merchants below!'
                            : 'The Sheriff is deciding whose bag to search...'}
                        </p>

                        {/* LARGE BRIBE UI FOR MERCHANT */}
                        {gameState.sheriffId !== socket.id && !players.find(p => p.id === socket.id)?.bag?.status && (() => {
                          const me = players.find(p => p.id === socket.id);
                          const currentBribe = me?.bag?.bribe || 0;
                          return (
                            <div style={{ marginTop: '20px', padding: '20px', background: 'var(--background)', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                              <h3 style={{ marginBottom: '15px', color: 'var(--primary)' }}>💰 Let's make a deal...</h3>

                              {currentBribe > 0 && (
                                <div style={{ marginBottom: '15px', padding: '8px 20px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '50px', border: '1px dashed var(--primary)', display: 'inline-block' }}>
                                  <span style={{ color: 'var(--foreground)' }}>Current Offer: </span>
                                  <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '5px' }}>
                                    <Coins size={18} color="#d4af37" /> {currentBribe} Coins
                                  </span>
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max={me?.coins}
                                  value={bribeInput}
                                  onChange={(e) => setBribeInput(parseInt(e.target.value) || 0)}
                                  style={{
                                    width: '120px',
                                    padding: '10px 15px',
                                    borderRadius: '12px',
                                    border: '2px solid var(--primary)',
                                    fontSize: '1.8rem',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    color: 'var(--foreground)',
                                    background: 'rgba(0,0,0,0.02)'
                                  }}
                                />
                                <button
                                  className="gold-button"
                                  onClick={() => socket.emit('offer-bribe', { code: currentRoom, amount: bribeInput })}
                                  style={{ padding: '15px 30px', fontSize: '1.2rem' }}
                                >
                                  Send Offer
                                </button>
                              </div>
                              <p style={{ marginTop: '10px', fontSize: '0.85rem', opacity: 0.7 }}>Tip: Keep changing the offer to negotiate with the Sheriff!</p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {gameState.phase === 'end_round' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', zIndex: 10 }}>
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={gameState.sheriffId === socket.id ? { scale: 1.05 } : {}}
                          whileTap={gameState.sheriffId === socket.id ? { scale: 0.95 } : {}}
                          className={gameState.sheriffId === socket.id ? "gold-button" : ""}
                          onClick={() => gameState.sheriffId === socket.id && socket.emit('next-round', { code: currentRoom })}
                          style={{
                            padding: '25px 40px',
                            fontSize: '1.5rem',
                            boxShadow: gameState.sheriffId === socket.id ? '0 15px 35px rgba(212, 175, 55, 0.7)' : 'none',
                            borderRadius: '50px',
                            border: '4px solid #fff',
                            background: gameState.sheriffId === socket.id ? 'var(--primary)' : '#ccc',
                            color: '#fff',
                            cursor: gameState.sheriffId === socket.id ? 'pointer' : 'not-allowed',
                            opacity: gameState.sheriffId === socket.id ? 1 : 0.8
                          }}
                        >
                          START NEXT ROUND 🚀
                        </motion.button>
                        {gameState.sheriffId !== socket.id && (
                          <p style={{ marginTop: '20px', color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>
                            Tell the Sheriff to click this! ☝️
                          </p>
                        )}
                        {/* END GAME NOW BUTTON (optional forced early end for testing or if they want to stop) */}
                        {gameState.sheriffId === socket.id && (
                          <button
                            onClick={() => socket.emit('end-game-now', { code: currentRoom })}
                            style={{ marginTop: '30px', padding: '10px 20px', background: 'transparent', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '8px', cursor: 'pointer', color: 'var(--foreground)', opacity: 0.7 }}
                          >
                            Finish & Calculate Scores Early
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Display All Players (The Board) */}
                  <div style={{ marginTop: '30px', background: 'rgba(255,255,255,0.7)', padding: '20px', borderRadius: '16px' }}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--foreground)' }}>The Market</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {players.map(p => {
                        const isSheriff = p.id === gameState.sheriffId;
                        return (
                          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', padding: '15px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', borderLeft: isSheriff ? '4px solid var(--primary)' : '4px solid transparent' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: 'var(--foreground)' }}>
                                <span style={{ fontSize: '1.5rem' }}>{p.avatar || '👤'}</span>
                                {isSheriff ? '👑 ' : ''}{p.name} {p.id === socket.id ? '(You)' : ''}
                              </span>
                              <span style={{ color: 'var(--primary)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <Coins size={16} color="#d4af37" /> {p.coins} Coins
                              </span>
                            </div>

                            {/* Stand showing passed items */}
                            {p.stand && p.stand.length > 0 && (() => {
                              const isOwnStand = p.id === socket.id;
                              const publicTotal = p.stand.reduce((sum, c) => sum + (c.type === 'legal' ? c.value : 0), 0);
                              const privateTotal = p.stand.reduce((sum, c) => sum + c.value, 0);
                              const contrabandCount = p.stand.filter(c => c.type === 'contraband').length;

                              return (
                                <div style={{ marginTop: '15px' }}>
                                  <div style={{ fontSize: '0.9rem', color: 'var(--foreground)', marginBottom: '8px', fontWeight: 'bold' }}>
                                    🛒 Stand Total Value: {isOwnStand ? privateTotal : publicTotal}
                                    {!isOwnStand && contrabandCount > 0 && <span style={{ color: 'var(--accent)', marginLeft: '10px' }}>(+{contrabandCount} Hidden Items)</span>}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {p.stand.map((c, i) => {
                                      const isHidden = !isOwnStand && c.type === 'contraband';
                                      return (
                                        <div
                                          key={i}
                                          title={isHidden ? 'Contraband (Hidden)' : c.name}
                                          style={{
                                            width: '40px',
                                            height: '60px',
                                            borderRadius: '4px',
                                            background: isHidden
                                              ? 'linear-gradient(135deg, #a30000 0%, #4a0000 100%)'
                                              : `url(${getCardImageUrl(c.name)}) center/100% 100% no-repeat`,
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                            border: `1px solid ${c.color}88`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          {isHidden && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', fontWeight: 'bold' }}>?</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Bag Info */}
                            {p.bag && !isSheriff && (
                              <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(184, 134, 11, 0.1)', borderRadius: '6px' }}>
                                {p.bag.status ? (
                                  <div>
                                    <strong>Resolved: {p.bag.status.toUpperCase()}!</strong>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <span style={{ color: 'var(--foreground)' }}>Declared: <strong>{p.bag.declaredAmount}x {p.bag.declaredGood}</strong></span>
                                      {p.bag.bribe > 0 && <span style={{ marginLeft: '10px', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>(Bribe Offered: <Coins size={14} color="#d4af37" /> {p.bag.bribe})</span>}
                                    </div>
                                    {gameState.phase === 'inspection' && socket.id === gameState.sheriffId && (
                                      <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => socket.emit('resolve-bag', { code: currentRoom, targetPlayerId: p.id, action: 'pass' })} style={{ padding: '8px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Pass</button>
                                        <button onClick={() => socket.emit('resolve-bag', { code: currentRoom, targetPlayerId: p.id, action: 'inspect' })} style={{ padding: '8px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Inspect</button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ marginTop: '40px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--foreground)', opacity: 0.6, fontSize: '0.8rem' }}>
            <Users size={14} />
            <span>Multiplayer Ready</span>
          </div>
        </div>
      </div>
    </main >
  );
}
