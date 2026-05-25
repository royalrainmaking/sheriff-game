'use client';

import { useState, useEffect } from 'react';
// removed lucide-react imports
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
  const [phaseCountdown, setPhaseCountdown] = useState(null); // { label, count }
  const [prevPhase, setPrevPhase] = useState(null);

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

  // Phase countdown effect
  const PHASE_LABELS = {
    market: { emoji: '🔄', title: 'เฟส: แลกเปลี่ยนไพ่', sub: 'ผู้เล่นทุกคนเลือกไพ่ที่ต้องการทิ้ง' },
    load_bag: { emoji: '🎒', title: 'เฟส: แพ็กของใส่ถุง', sub: 'เลือกไพ่แล้วประกาศสินค้าของคุณ' },
    inspection: { emoji: '🔍', title: 'เฟส: ตรวจค้น', sub: 'นายอำเภอกำลังตรวจสอบถุงสินค้า' },
    end_round: { emoji: '🏁', title: 'สิ้นสุดการตรวจสอบ', sub: 'รอนายอำเภอเริ่มตาถัดไป' },
  };

  useEffect(() => {
    if (!gameState?.phase) return;
    if (gameState.phase === prevPhase) return;
    setPrevPhase(gameState.phase);
    const label = PHASE_LABELS[gameState.phase];
    if (!label) return;
    let count = 3;
    setPhaseCountdown({ ...label, count });
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setPhaseCountdown(null);
      } else {
        setPhaseCountdown(prev => prev ? { ...prev, count } : null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState?.phase]);

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
            <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#DB4437', marginBottom: '10px', filter: 'drop-shadow(0 2px 4px rgba(219,68,55,0.4))' }}>local_mall</span>
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
                <label>ชื่อของคุณ</label>
                <input
                  type="text"
                  placeholder="ใส่ชื่อนักเดินทาง..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ textAlign: 'left', marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--foreground)', fontWeight: 'bold' }}>เลือกตัวละคร</label>
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
                  <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#0F9D58' }}>add_circle</span> สร้างห้องใหม่
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
                  <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#4285F4' }}>login</span> เข้าร่วมด้วยรหัส
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
              <h2 style={{ color: 'var(--primary)', marginBottom: '20px' }}>สร้างห้องเกม</h2>
              <p style={{ marginBottom: '20px', fontSize: '0.9rem' }}>คุณกำลังสร้างเซสชั่นเกมใหม่</p>
              <button className="gold-button" style={{ width: '100%' }} onClick={handleCreateRoom}>ยืนยัน & สร้างห้อง</button>
              <button onClick={() => setView('menu')} style={{ background: 'none', color: '#888', marginTop: '15px' }}>ยกเลิก</button>
            </motion.div>
          )}

          {view === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ color: 'var(--primary)', marginBottom: '20px' }}>เข้าร่วมห้อง</h2>
              <div className="input-group" style={{ textAlign: 'left' }}>
                <label>รหัสห้อง</label>
                <input
                  type="text"
                  placeholder="เช่น X1Y2"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  style={{ fontSize: '1.5rem', textAlign: 'center', letterSpacing: '5px' }}
                />
              </div>
              <button className="gold-button" style={{ width: '100%' }} onClick={handleJoinRoom}>เข้าร่วมเกม</button>
              <button onClick={() => setView('menu')} style={{ background: 'none', color: '#888', marginTop: '15px' }}>กลับหน้าหลัก</button>
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
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>รหัสห้อง</p>
                <h2 style={{ fontSize: '2rem', letterSpacing: '8px', color: '#fff' }}>{currentRoom}</h2>
              </div>

              <div style={{ textAlign: 'left', marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--foreground)', opacity: 0.8, marginBottom: '15px' }}>ผู้เล่น ({players.length}/6)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {players.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '2px solid var(--primary)', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                        {p.avatar || '👤'}
                      </div>
                      <span style={{ fontWeight: '600', color: 'var(--foreground)' }}>{p.name} {p.id === socket.id ? '(คุณ)' : ''}</span>
                    </div>
                  ))}
                  {players.length < 2 && (
                    <p style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic', marginTop: '10px' }}>รอผู้เล่นคนอื่น...</p>
                  )}
                </div>
              </div>

              {players.length >= 1 && players[0].id === socket.id && (
                <button className="gold-button" style={{ width: '100%', fontSize: '1.2rem' }} onClick={handleStartGame}>เริ่มเกม</button>
              )}

              <p style={{ marginTop: '20px', fontSize: '0.8rem', color: '#555' }}>
                แชร์รหัสให้เพื่อนเข้าร่วม
              </p>
            </motion.div>
          )}
          {view === 'game' && gameState && (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ width: '100%', margin: '0 auto', position: 'relative' }}
            >
              {/* Phase Countdown Overlay */}
              <AnimatePresence>
                {phaseCountdown && (
                  <motion.div
                    key="countdown"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    style={{
                      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      zIndex: 9999
                    }}
                  >
                    <motion.div
                      initial={{ y: -30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      style={{ textAlign: 'center' }}
                    >
                      <div style={{ fontSize: '5rem', marginBottom: '10px' }}>{phaseCountdown.emoji}</div>
                      <h2 style={{ fontSize: '2.2rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '8px' }}>{phaseCountdown.title}</h2>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: '30px' }}>{phaseCountdown.sub}</p>
                      <motion.div
                        key={phaseCountdown.count}
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{ fontSize: '6rem', fontWeight: 'bold', color: '#fff', lineHeight: 1, textShadow: '0 0 40px rgba(212,175,55,0.6)' }}
                      >
                        {phaseCountdown.count}
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              {gameState.phase === 'game_over' ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <motion.h1
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ fontSize: '3.5rem', color: 'var(--primary)', marginBottom: '10px', textShadow: '0 4px 15px rgba(212,175,55,0.5)' }}
                  >
                    🏆 จบเกม 🏆
                  </motion.h1>
                  <p style={{ fontSize: '1.2rem', color: 'var(--foreground)', marginBottom: '40px' }}>คะแนนสุดท้ายและอันดับ</p>

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
                              {score.name} {score.id === socket.id ? '(คุณ)' : ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            {score.total} <span style={{ fontSize: '1rem', color: 'var(--foreground)', opacity: 0.7 }}>pts</span>
                          </div>
                        </div>

                        {/* Score Breakdown Grid */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', fontSize: '0.9rem', textAlign: 'left' }}>
                          <div style={{ flex: 1, minWidth: '100px', background: 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ display: 'block', color: 'var(--foreground)', opacity: 0.7, fontSize: '0.8rem' }}>สินค้าถูกกฎหมาย</span>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--foreground)' }}>+{score.legalValue} แต้ม</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>({score.legalCount} ใบ)</span>
                          </div>
                          <div style={{ flex: 1, minWidth: '100px', background: 'rgba(211, 47, 47, 0.05)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ display: 'block', color: 'var(--accent)', opacity: 0.8, fontSize: '0.8rem' }}>ของเถื่อน</span>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent)' }}>+{score.contrabandValue} แต้ม</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>({score.contrabandCount} ใบ)</span>
                          </div>
                          <div style={{ flex: 1, minWidth: '100px', background: 'rgba(212, 175, 55, 0.05)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ display: 'block', color: 'var(--primary)', opacity: 0.9, fontSize: '0.8rem' }}>โบนัสราชา/ราชินี</span>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>+{score.kqBonus} แต้ม</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>(โบนัส)</span>
                          </div>
                          <div style={{ flex: 1, minWidth: '100px', background: 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ display: 'block', color: 'var(--foreground)', opacity: 0.7, fontSize: '0.8rem' }}>เงินสดคงเหลือ</span>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--foreground)' }}>+{score.coins} แต้ม</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>(อัตรา 1:1)</span>
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
                    เล่นอีกครั้ง
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>บทบาท: {gameState.sheriffId === socket.id ? '👑 นายอำเภอ' : '🎒 พ่อค้า'}</h2>
                      <span style={{ fontSize: '0.9rem', color: 'var(--foreground)', opacity: 0.7, fontWeight: 'bold', background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: '4px', marginTop: '5px' }}>
                        รอบที่ {Math.ceil(gameState.round / players.length)} จาก {gameState.maxRounds / players.length} (ตาที่ {gameState.round}/{gameState.maxRounds})
                      </span>
                      {(() => {
                        let waitingForText = '';
                        if (gameState.phase === 'market') {
                          const waitingNames = players.filter(p => p.id !== gameState.sheriffId && !p.hasExchanged).map(p => p.name);
                          waitingForText = waitingNames.length > 0 ? `รอ: ${waitingNames.join(', ')}` : 'รอนายอำเภอ...';
                        } else if (gameState.phase === 'load_bag') {
                          const waitingNames = players.filter(p => !p.bag && p.id !== gameState.sheriffId).map(p => p.name);
                          waitingForText = waitingNames.length > 0 ? `รอแพ็กถุง: ${waitingNames.join(', ')}` : 'รอนายอำเภอ...';
                        } else if (gameState.phase === 'inspection') {
                          const sheriffName = players.find(p => p.id === gameState.sheriffId)?.name;
                          waitingForText = `นายอำเภอ (${sheriffName}) กำลังตัดสิน...`;
                        } else if (gameState.phase === 'end_round') {
                          waitingForText = `รอนายอำเภอเริ่มตาถัดไป`;
                        }

                        return (
                          <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <motion.span
                              animate={{ opacity: [1, 0.2, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}
                            />
                            {waitingForText}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#F4B400' }}>monetization_on</span> {players.find(p => p.id === socket.id)?.coins} Coins
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.03)', padding: '20px', borderRadius: '16px', minHeight: '300px', position: 'relative' }}>
                    <h3 style={{ marginBottom: '15px' }}>สินค้าของคุณ</h3>

                    {gameState.phase === 'market' && gameState.sheriffId === socket.id && (
                      <p style={{ color: 'var(--primary)', fontStyle: 'italic', marginBottom: '20px' }}>
                        ช่วงตลาด: กำลังรอผู้ค้าเปลี่ยนการ์ด...
                      </p>
                    )}

                    {gameState.phase === 'market' && gameState.sheriffId !== socket.id && (
                      <p style={{ color: 'var(--foreground)', opacity: 0.6, marginBottom: '20px' }}>
                        ช่วงตลาด: เลือกการ์ดที่จะทิ้งและจั่วใหม่ได้สูงสุด 5 ใบ (หรือจะไม่เปลี่ยนเลยก็ได้
                      </p>
                    )}

                    {gameState.phase === 'load_bag' && gameState.sheriffId === socket.id && (
                      <p style={{ color: 'var(--primary)', fontStyle: 'italic', marginBottom: '20px' }}>
                        Wait for merchants to load their bags...
                      </p>
                    )}

                    {gameState.phase === 'load_bag' && gameState.sheriffId !== socket.id && (
                      <p style={{ color: 'var(--foreground)', opacity: 0.6, marginBottom: '20px' }}>
                        เลือกสิ้นค้า 1 ถึง 5 เพื่อใส่ลงในถุงของคุณ
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
                        ทิ้งการ์ด {selectedCards.length} ใบ
                      </button>
                    )}

                    {gameState.phase === 'market' && players.find(p => p.id === socket.id)?.hasExchanged && (
                      <p style={{ color: 'var(--primary)', marginTop: '20px', fontWeight: 'bold' }}>
                        เปลี่ยนการ์ดเรียบร้อยแล้ว! กำลังรอผู้เล่นคนอื่น...
                      </p>
                    )}

                    {gameState.phase === 'load_bag' && gameState.sheriffId !== socket.id && selectedCards.length > 0 && !declaring && !players.find(p => p.id === socket.id)?.bag && (
                      <button className="gold-button" onClick={() => setDeclaring(true)} style={{ marginTop: '30px', padding: '15px 30px', fontSize: '1.2rem' }}>
                        ใส่สินค้า {selectedCards.length} ลงในถุง
                      </button>
                    )}

                    {declaring && (
                      <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                        <h3 style={{ marginBottom: '15px', color: 'var(--foreground)' }}>ประกาศสินค้าของคุณ ({selectedCards.length} ในกระเป๋า)</h3>
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
                        <button className="gold-button" onClick={handleDeclare}>ยืนยันและประกาศ</button>
                        <button onClick={() => setDeclaring(false)} style={{ display: 'block', margin: '15px auto 0', background: 'none', color: '#888', border: 'none', cursor: 'pointer' }}>ยกเลิก</button>
                      </div>
                    )}

                    {players.find(p => p.id === socket.id)?.bag && gameState.phase === 'load_bag' && (
                      <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(184, 134, 11, 0.1)', borderRadius: '8px' }}>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Bag Loaded!</h3>
                        <div style={{ color: 'var(--foreground)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            You declared: <strong>{players.find(p => p.id === socket.id).bag.declaredAmount} x </strong>
                            <div style={{ width: '20px', height: '30px', background: `url(${getCardImageUrl(players.find(p => p.id === socket.id).bag.declaredGood)}) center/100% 100% no-repeat`, borderRadius: '2px', border: '1px solid rgba(0,0,0,0.2)' }} />
                            <strong>{players.find(p => p.id === socket.id).bag.declaredGood}</strong>.
                          </div>
                          <div style={{ marginTop: '5px' }}>Waiting for others...</div>
                        </div>
                      </div>
                    )}

                    {gameState.phase === 'inspection' && (
                      <div style={{ marginTop: '30px', background: 'rgba(211, 47, 47, 0.1)', padding: '20px', borderRadius: '8px', border: '1px solid var(--accent)' }}>
                        <h2 style={{ color: 'var(--accent)', marginBottom: '10px' }}>ช่วงการตรวจค้น</h2>
                        <p style={{ color: 'var(--foreground)' }}>
                          {gameState.sheriffId === socket.id
                            ? 'นายอำเภอ ตรวจค้นพ่อค้าด้านล่างนี้เลย!'
                            : 'นายอำเภอกำลังตัดสินใจว่าจะตรวจค้นถุงของใคร...'}
                        </p>

                        {/* LARGE BRIBE UI FOR MERCHANT */}
                        {gameState.sheriffId !== socket.id && !players.find(p => p.id === socket.id)?.bag?.status && (() => {
                          const me = players.find(p => p.id === socket.id);
                          const currentBribe = me?.bag?.bribe || 0;
                          return (
                            <div style={{ marginTop: '20px', padding: '20px', background: 'var(--background)', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                              <h3 style={{ marginBottom: '15px', color: 'var(--primary)' }}>💰 เรามาทำข้อตกลงกันดีกว่า...</h3>

                              {currentBribe > 0 && (
                                <div style={{ marginBottom: '15px', padding: '8px 20px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '50px', border: '1px dashed var(--primary)', display: 'inline-block' }}>
                                  <span style={{ color: 'var(--foreground)' }}>ข้อเสนอปัจจุบัน: </span>
                                  <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '5px' }}>
                                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#F4B400' }}>monetization_on</span> {currentBribe}
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
                                  ยื่นข้อเสนอ
                                </button>
                              </div>
                              <p style={{ marginTop: '10px', fontSize: '0.85rem', opacity: 0.7 }}>คำแนะนำ: ลองเปลี่ยนข้อเสนอไปเรื่อยๆ เพื่อเจรจาต่อรองกับนายอำเภอดูสิ!</p>
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
                          ดำเนินการต่อ 🚀
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                  {isSheriff && (
                                    <motion.div
                                      animate={{ y: [0, -5, 0] }}
                                      transition={{ repeat: Infinity, duration: 2 }}
                                      style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 6px rgba(212,175,55,0.8))', zIndex: 5, marginBottom: '-15px' }}
                                    >
                                      👑
                                    </motion.div>
                                  )}
                                  <div style={{ fontSize: '2.5rem', position: 'relative', zIndex: 2 }}>{p.avatar || '👤'}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: isSheriff ? 'var(--primary)' : 'var(--foreground)' }}>
                                    {p.name} {p.id === socket.id ? '(คุณ)' : ''}
                                  </span>
                                  {isSheriff && <span style={{ fontSize: '0.8rem', background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '12px', width: 'fit-content', marginTop: '2px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>นายอำเภอ (Sheriff)</span>}
                                </div>
                              </div>
                              <span style={{ color: 'var(--primary)', display: 'flex', gap: '4px', alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#F4B400' }}>monetization_on</span> {p.coins}
                              </span>
                            </div>

                            {/* Pending Round Actions: Discards and Bags */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>

                              {/* Discarded Cards */}
                              {p.lastDiscarded && p.lastDiscarded.length > 0 && (
                                <div style={{ flex: '1', minWidth: '150px', background: 'rgba(211, 47, 47, 0.05)', padding: '10px', borderRadius: '8px', border: '1px dashed var(--accent)' }}>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 'bold', marginBottom: '8px' }}>🗑️ สินค้าที่ถูกทิ้ง</div>
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {p.lastDiscarded.map((c, i) => (
                                      <div key={i} title={c.name} style={{ width: '28px', height: '42px', background: `url(${getCardImageUrl(c.name)}) center/100% 100% no-repeat`, borderRadius: '4px', border: `1px solid rgba(0,0,0,0.3)`, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Bag Info */}
                              {p.bag && !isSheriff && (
                                <div style={{ flex: '2', minWidth: '250px', background: 'rgba(184, 134, 11, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '8px' }}>🎒 ถุงสินค้าของพ่อค้า</div>

                                  {p.bag.status ? (
                                    <div style={{ textAlign: 'center' }}>
                                      <strong style={{ color: p.bag.status === 'inspect' ? 'var(--accent)' : 'var(--primary)', fontSize: '1.1rem' }}>
                                        {p.bag.status === 'inspect' ? '🔍 INSPECTED!' : '✅ PASSED!'}
                                      </strong>
                                      <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: '5px 0' }}>กำลังสรุปผล...</p>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
                                        {p.bag.cards && p.bag.cards.map((c, i) => {
                                          const isOwner = p.id === socket.id;
                                          const isContraband = c.type === 'contraband';
                                          const showFaceDown = isContraband && !isOwner;
                                          return (
                                            <motion.div
                                              initial={{ scale: 0, rotateY: 180 }}
                                              animate={{ scale: 1, rotateY: 0 }}
                                              transition={{ delay: i * 0.2 }}
                                              key={i}
                                              title={showFaceDown ? 'Contraband (Hidden)' : c.name}
                                              style={{
                                                width: '35px',
                                                height: '52px',
                                                borderRadius: '4px',
                                                background: showFaceDown
                                                  ? 'linear-gradient(135deg, #a30000 0%, #4a0000 100%)'
                                                  : `url(${getCardImageUrl(c.name)}) center/100% 100% no-repeat`,
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                                border: showFaceDown ? '1px solid #ff000055' : `1px solid ${c.color}88`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.1rem'
                                              }}
                                            >
                                              {showFaceDown && '🚫'}
                                            </motion.div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--foreground)' }}>
                                          <span>Declared: <strong>{p.bag.declaredAmount}x </strong></span>
                                          <div style={{ width: '20px', height: '30px', background: `url(${getCardImageUrl(p.bag.declaredGood)}) center/100% 100% no-repeat`, borderRadius: '2px', border: '1px solid rgba(0,0,0,0.2)' }} />
                                          <strong>{p.bag.declaredGood}</strong>
                                        </div>
                                        {p.bag.bribe > 0 && <span style={{ marginTop: '5px', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>(Bribe: <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#F4B400' }}>monetization_on</span> {p.bag.bribe})</span>}
                                      </div>
                                      {gameState.phase === 'inspection' && socket.id === gameState.sheriffId && (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                          <button onClick={() => socket.emit('resolve-bag', { code: currentRoom, targetPlayerId: p.id, action: 'pass' })} style={{ padding: '8px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Pass</button>
                                          <button onClick={() => socket.emit('resolve-bag', { code: currentRoom, targetPlayerId: p.id, action: 'inspect' })} style={{ padding: '8px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Inspect</button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Stand showing passed items */}
                            {p.stand && p.stand.length > 0 && (() => {
                              const isOwnStand = p.id === socket.id;
                              const publicTotal = p.stand.reduce((sum, c) => sum + (c.type === 'legal' ? c.value : 0), 0);
                              const privateTotal = p.stand.reduce((sum, c) => sum + c.value, 0);
                              const contrabandCount = p.stand.filter(c => c.type === 'contraband').length;

                              return (
                                <div style={{ marginTop: '15px', background: 'rgba(255,255,255,0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                  <div style={{ fontSize: '0.9rem', color: 'var(--foreground)', marginBottom: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>🛒 CARTS (STAND)</span>
                                    <span>
                                      มูลค่ารวม: <span style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{isOwnStand ? privateTotal : publicTotal}</span>
                                      {!isOwnStand && contrabandCount > 0 && <span style={{ color: 'var(--accent)', marginLeft: '10px' }}>(+{contrabandCount} Hidden)</span>}
                                    </span>
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
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>group</span>
            <span>พร้อมเล่นหลายคน (Multiplayer)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px', gap: '6px', fontSize: '0.75rem', color: '#888' }}>
            <span>Made with</span>
            <span style={{ color: '#e74c3c', fontSize: '1rem' }}>♥</span>
            <span>by</span>
            <span style={{
              background: 'linear-gradient(135deg, #b8860b, #d4af37)',
              color: '#fff',
              padding: '2px 10px',
              borderRadius: '20px',
              fontWeight: '700',
              fontSize: '0.8rem',
              letterSpacing: '1px',
              boxShadow: '0 2px 6px rgba(184,134,11,0.4)'
            }}>obob</span>
          </div>
        </div>
      </div>
    </main >
  );
}
