import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, BookOpen, Heart, Layers, Radio, WifiOff } from 'lucide-react';
import type { CoyoteMove } from '@bodobako/shared';
import { useRoom } from '../../context/RoomContext';
import { useResolvedPlayerColors } from '../../hooks/useResolvedPlayerColors';
import { GameResultCard } from '../../components/GameResultCard';
import { Avatar } from '../../components/ui/Avatar';
import { useParticipantProfiles } from '../../components/AppHeader/hooks/useParticipantProfiles';
import { Z } from '../../styles/tokens';
import { wsClient } from '../../lib/socket';
import { CoyoteActionPanel } from './CoyoteActionPanel';
import { CoyoteCard } from './CoyoteCard';
import { CoyoteDiscardPanel } from './CoyoteDiscardPanel';
import { CoyoteRoundResult } from './CoyoteRoundResult';
import { CoyoteRulesPanel } from './CoyoteRulesPanel';
import { PLAYER_COLORS } from './constants';

export function CoyoteBoard() {
  const { gameState, room, playerId, sendMove, errorMsg, clearError, gameResult, startGame, leaveRoom, resultPlayers, rematchRequests, requestRematch, gameStartCount } = useRoom();
  const boardRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const measure = () => boardRef.current?.style.setProperty('--cy-header-height', `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const state = gameState?.gameId === 'coyote' ? gameState.state : null;
  const initialResult = useRef(state?.phase !== 'bidding');
  useEffect(() => { if (state?.phase === 'bidding') initialResult.current = false; }, [state?.phase]);
  const [panel, setPanel] = useState<'rules' | 'discard' | null>(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [connected, setConnected] = useState(wsClient.connected);
  const resolveColor = useResolvedPlayerColors(room?.players ?? null);
  const [profilesByUid] = useParticipantProfiles(room?.players ?? null);
  useEffect(() => {
    const timer = setInterval(() => setConnected(wsClient.connected), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { lock.current = false; setPending(false); }, [state, errorMsg, connected]);
  if (!state || !room || !playerId) return null;
  const name = (id: string) => (resultPlayers ?? room.players).find(p => p.id === id)?.name ?? 'プレイヤー';
  const currentId = state.playerIds[state.currentPlayerIndex];
  const isMyTurn = currentId === playerId;
  const enabled = isMyTurn && connected && !pending && !gameResult;
  const send = (action: { type: 'bid'; value: number } | { type: 'challenge' | 'continue' }) => {
    if (!enabled || lock.current || !wsClient.connected) return;
    const move: CoyoteMove = { ...action, expectedRevision: state.revision };
    lock.current = true;
    setPending(true);
    clearError();
    sendMove(move);
  };
  const myLife = state.lives[playerId];
  const opponents = state.playerIds.filter(id => id !== playerId);
  const myCard = state.hands[playerId];
  const ranked = gameResult?.ranking;
  return <main ref={boardRef} className={`cy-board ${opponents.length > 5 ? 'cy-crowded' : ''}`} aria-label="コヨーテの対戦" data-phase={state.phase}>
    <div className="cy-landscape" style={{ zIndex: Z.cyLandscape }} aria-hidden="true"><div className="cy-moon" /><svg viewBox="0 0 1400 340" preserveAspectRatio="none"><path d="M0 150Q260 25 620 215T1400 90V340H0Z" fill="#293340" /><path d="M0 255Q450 95 930 240T1400 170V340H0Z" fill="#34404a" /><path d="M0 280Q500 340 890 235T1400 310V340H0Z" fill="#171f2b" /></svg></div>
    <div className="cy-game-content">
      <div className="cy-table-toolbar">
        <div className="cy-round-bar"><span>ROUND <b>{String(state.roundNumber).padStart(2, '0')}</b></span><span><Layers size={14} />山札 {state.deckCount}枚</span><span>{state.playerIds.filter(id => state.lives[id] > 0).length}人が生存</span></div>
        <div className="cy-tools"><button onClick={() => setPanel('discard')}><Layers size={17} /><span>使用済み <b>{state.discardCount}</b>枚</span></button><button onClick={() => setPanel('rules')} aria-label="遊び方"><BookOpen size={19} /><span className="hidden sm:inline">遊び方</span></button></div>
      </div>
      {errorMsg && <div className="cy-offline" role="alert"><span>{errorMsg}</span><button className="cy-text-button" onClick={clearError}>閉じる</button></div>}
      {!connected && <p className="cy-offline" role="status"><WifiOff size={18} />再接続を待っています。操作は送信されません。</p>}
      {state.shuffleCount > 0 && <p className="cy-shuffle-notice" key={`shuffle-${state.shuffleCount}`} role="status">山札を混ぜ直しました · {state.shuffleCount}回目</p>}
      {gameResult && <section className="cy-final-result">
        {gameResult.reason === '退出' && <p className="cy-offline">退出による対戦終了</p>}
        <GameResultCard result={!ranked ? 'draw' : ranked[0] === playerId ? 'win' : 'lose'} winnerName={ranked?.[0] ? name(ranked[0]) : undefined} isHost={room.hostId === playerId} onRematch={startGame} onLeave={leaveRoom} playerId={playerId} rematchRequests={rematchRequests} resultPlayers={resultPlayers ?? room.players} minPlayers={2} onRematchRequest={requestRematch} />
        {ranked && <ol className="cy-ranking">{ranked.map((id, i) => <li key={id}><span>{i + 1}</span>{name(id)}</li>)}</ol>}
      </section>}
      {state.roundResult ? <CoyoteRoundResult key={`${gameStartCount}-${state.roundNumber}`} state={state} skipInitial={initialResult.current} name={name} canContinue={enabled} pending={pending} onContinue={() => send({ type: 'continue' })} /> : <>
        <div className="cy-current-status" style={{ zIndex: Z.cyStickyStatus }} aria-live="polite"><span>{state.lastBid ? `${name(state.lastBid.playerId)}の宣言` : '最初の宣言'}<b>{state.lastBid?.value ?? '—'}</b></span><span>{isMyTurn ? 'あなたの番' : `${name(currentId)}の番`}</span></div>
        <div className="cy-opponents" style={{ '--cy-columns': opponents.length <= 5 ? opponents.length : Math.ceil(opponents.length / 2) } as CSSProperties}>{opponents.map(id => {
          const index = state.playerIds.indexOf(id);
          const color = resolveColor(id, PLAYER_COLORS[index % PLAYER_COLORS.length]);
          const participant = room.players.find(player => player.id === id);
          const profile = participant?.userId ? profilesByUid[participant.userId] : undefined;
          return <article key={`${state.roundNumber}-${id}`} className={`cy-seat ${currentId === id ? 'cy-seat-active' : ''} ${state.lives[id] === 0 ? 'cy-seat-out' : ''}`}>
            <div className="cy-seat-top"><span className="cy-avatar" style={{ boxShadow: `0 0 0 2px ${color}` }}><Avatar photoURL={profile?.photoURL || undefined} displayName={profile?.displayName || name(id)} size={24} /></span><span className="cy-seat-name">{name(id)}</span></div>
            {state.hands[id] ? <button className="w-full block" onClick={() => setPanel('rules')} aria-label={`${name(id)}のカードの説明`}><CoyoteCard card={state.hands[id]} /></button> : <div className="cy-empty-seat">観戦中</div>}
            <div className="cy-seat-life" aria-label={`ライフ${state.lives[id]}`}><Heart size={13} /><span>{state.lives[id]} / 3</span>{currentId === id && <b>手番</b>}</div>
          </article>;
        })}</div>
        <section className="cy-bid-center" aria-label="現在の宣言" aria-live="polite"><span className="cy-eyebrow">{state.lastBid ? `${name(state.lastBid.playerId)} の宣言` : '最初の宣言を待っています'}</span><div className="cy-current-bid" key={state.revision}>{state.lastBid?.value ?? '—'}</div><p>{state.lastBid ? 'この場に、少なくとも。' : '見えている数字の、その先を読む。'}</p></section>
        <div className="cy-bid-trail" aria-label="直近の宣言履歴">{state.roundBids.slice(-5).map((bid, i) => <span key={i}>{name(bid.playerId)} <b>{bid.value}</b><ArrowRight size={12} /></span>)}</div>
      </>}
    </div>
    {state.phase === 'bidding' && !gameResult && <footer className="cy-footer">
      <div className="cy-my-hand">{myCard && <CoyoteCard card={myCard} />}<div><p className="font-bold">{myLife > 0 ? 'あなたのカード' : '観戦中'}</p><p className="cy-help-text">{myLife > 0 ? '相手には見えています' : '退出すると対戦が終了します'}</p><span className="cy-my-life"><Heart size={15} />{myLife} / 3</span></div></div>
      {isMyTurn ? <CoyoteActionPanel key={`${gameStartCount}-${state.revision}`} state={state} enabled={enabled} pending={pending} onBid={value => send({ type: 'bid', value })} onChallenge={() => send({ type: 'challenge' })} /> : <div className="cy-waiting"><Radio size={20} /><strong>{name(currentId)}が考え中</strong><p>カードと宣言が、推理のヒント。</p></div>}
    </footer>}
    {panel === 'rules' && <CoyoteRulesPanel onClose={() => setPanel(null)} />}
    {panel === 'discard' && <CoyoteDiscardPanel state={state} onClose={() => setPanel(null)} />}
  </main>;
}
