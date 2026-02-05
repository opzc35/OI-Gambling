import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { roomApi, gameApi } from '../services/api';
import { wsService } from '../services/websocket';
import type { Room as RoomType, RoomMember, Round, GameMode } from '../types';
import './Room.css';

const Room: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const roomId = parseInt(id || '0');

  const [room, setRoom] = useState<RoomType | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [settleResult, setSettleResult] = useState<any>(null);
  const [gameMode, setGameMode] = useState<GameMode>('tags');
  const [penaltyCoefficient, setPenaltyCoefficient] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guess form states
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ratingMin, setRatingMin] = useState(800);
  const [ratingMax, setRatingMax] = useState(1000);
  const [passRateMin, setPassRateMin] = useState(30);
  const [passRateMax, setPassRateMax] = useState(40);

  // Codeforces 常见标签列表
  const availableTags = [
    'implementation', 'math', 'greedy', 'dp', 'data structures',
    'brute force', 'constructive algorithms', 'graphs', 'sortings',
    'binary search', 'dfs and similar', 'trees', 'strings', 'number theory',
    'combinatorics', 'geometry', 'bitmasks', 'two pointers', 'dsu',
    'shortest paths', 'probabilities', 'divide and conquer', 'hashing',
    'games', 'flows', 'interactive', 'string suffix structures',
    'expression parsing', 'matrices', 'fft', 'graph matchings',
    'ternary search', 'meet-in-the-middle', '2-sat', 'chinese remainder theorem',
    'schedules'
  ];

  const { user } = useAuth();
  const navigate = useNavigate();

  const isOwner = room?.owner_id === user?.id;

  const loadRoomData = useCallback(async () => {
    try {
      const data = await roomApi.getRoom(roomId);
      setRoom(data.room);
      setMembers(data.members);
    } catch (err) {
      console.error('Failed to load room:', err);
    }
  }, [roomId]);

  const loadCurrentRound = useCallback(async () => {
    try {
      const { round } = await gameApi.getCurrentRound(roomId);
      setCurrentRound(round);
    } catch (err) {
      console.error('Failed to load current round:', err);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoomData();
    loadCurrentRound();

    wsService.joinRoom(roomId);

    const handleRoomUpdate = () => {
      loadRoomData();
    };

    const handleRoundStarted = () => {
      loadCurrentRound();
    };

    const handleRoundSettled = () => {
      loadCurrentRound();
      loadRoomData();
    };

    wsService.on('room_updated', handleRoomUpdate);
    wsService.on('round_started', handleRoundStarted);
    wsService.on('round_settled', handleRoundSettled);

    return () => {
      wsService.leaveRoom(roomId);
      wsService.off('room_updated', handleRoomUpdate);
      wsService.off('round_started', handleRoundStarted);
      wsService.off('round_settled', handleRoundSettled);
    };
  }, [roomId, loadRoomData, loadCurrentRound]);

  const handleStartRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await gameApi.startRound(roomId, gameMode, penaltyCoefficient);
      setShowStartModal(false);
      loadCurrentRound();
    } catch (err: any) {
      setError(err.response?.data?.error || '开始游戏失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const guess: any = {};

      if (currentRound?.game_mode === 'tags' || currentRound?.gameMode === 'tags') {
        if (selectedTags.length === 0) {
          setError('请至少选择一个标签');
          setLoading(false);
          return;
        }
        guess.tags = selectedTags;
      } else if (currentRound?.game_mode === 'rating' || currentRound?.gameMode === 'rating') {
        guess.ratingMin = ratingMin;
        guess.ratingMax = ratingMax;
      } else if (currentRound?.game_mode === 'pass_rate' || currentRound?.gameMode === 'pass_rate') {
        guess.passRateMin = passRateMin;
        guess.passRateMax = passRateMax;
      }

      await gameApi.submitGuess(currentRound!.id, guess);
      setShowGuessModal(false);
      setSelectedTags([]);
      alert('猜测提交成功！');
    } catch (err: any) {
      setError(err.response?.data?.error || '提交猜测失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSettleRound = async () => {
    if (!window.confirm('确定要结算本轮游戏吗？')) return;

    try {
      const result = await gameApi.settleRound(currentRound!.id);
      setSettleResult(result.results);
      setShowResultModal(true);
      loadCurrentRound();
      loadRoomData();
    } catch (err: any) {
      alert(err.response?.data?.error || '结算失败');
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await roomApi.leaveRoom(roomId);
      navigate('/lobby');
    } catch (err: any) {
      alert(err.response?.data?.error || '离开房间失败');
    }
  };

  const handleCloseRoom = async () => {
    if (!window.confirm('确定要关闭房间吗？')) return;

    try {
      await roomApi.closeRoom(roomId);
      navigate('/lobby');
    } catch (err: any) {
      alert(err.response?.data?.error || '关闭房间失败');
    }
  };

  if (!room) {
    return <div>加载中...</div>;
  }

  const roundGameMode = currentRound?.game_mode || currentRound?.gameMode;

  return (
    <div className="room-container">
      <header className="room-header">
        <h1>{room.name}</h1>
        <div className="room-actions">
          <button onClick={() => navigate('/lobby')}>返回大厅</button>
          {isOwner ? (
            <button onClick={handleCloseRoom} className="danger-btn">关闭房间</button>
          ) : (
            <button onClick={handleLeaveRoom}>离开房间</button>
          )}
        </div>
      </header>

      <div className="room-content">
        <div className="room-sidebar">
          <h2>成员列表 ({members.length})</h2>
          <div className="members-list">
            {members.map((member) => (
              <div key={member.id} className="member-item">
                <span className="member-name">
                  {member.username}
                  {member.id === room.owner_id && ' 👑'}
                </span>
                <span className="member-points">{member.points} 分</span>
              </div>
            ))}
          </div>
        </div>

        <div className="room-main">
          {currentRound ? (
            <div className="game-area">
              <h2>当前游戏</h2>
              <div className="round-info">
                <p><strong>题目:</strong> {currentRound.problem_name || currentRound.problemName}</p>
                {(currentRound.problem_id || currentRound.problemId) && (
                  <p><strong>题号:</strong> {currentRound.problem_id || currentRound.problemId}</p>
                )}
                {currentRound.problemUrl && (
                  <p>
                    <strong>题目链接:</strong>{' '}
                    <a
                      href={currentRound.problemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="problem-link"
                    >
                      查看题面 →
                    </a>
                  </p>
                )}
                <p><strong>模式:</strong> {
                  roundGameMode === 'tags' ? '标签猜测' :
                  roundGameMode === 'rating' ? '难度猜测' : '通过率猜测'
                }</p>
                <p><strong>扣分系数:</strong> {currentRound.penalty_coefficient || currentRound.penaltyCoefficient}</p>
              </div>

              <div className="game-actions">
                <button onClick={() => setShowGuessModal(true)} className="guess-btn">
                  提交猜测
                </button>
                {isOwner && (
                  <button onClick={handleSettleRound} className="settle-btn">
                    结算本轮
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="no-game">
              <h2>暂无进行中的游戏</h2>
              {isOwner && (
                <button onClick={() => setShowStartModal(true)} className="start-btn">
                  开始新游戏
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showStartModal && (
        <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>开始新游戏</h2>
            <form onSubmit={handleStartRound}>
              <div className="form-group">
                <label>游戏模式</label>
                <select value={gameMode} onChange={(e) => setGameMode(e.target.value as GameMode)}>
                  <option value="tags">标签猜测</option>
                  <option value="rating">难度猜测</option>
                  <option value="pass_rate">通过率猜测</option>
                </select>
              </div>

              <div className="form-group">
                <label>扣分系数</label>
                <input
                  type="number"
                  value={penaltyCoefficient}
                  onChange={(e) => setPenaltyCoefficient(Number(e.target.value))}
                  min="1"
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button type="button" onClick={() => setShowStartModal(false)}>取消</button>
                <button type="submit" disabled={loading}>
                  {loading ? '开始中...' : '开始'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGuessModal && currentRound && (
        <div className="modal-overlay" onClick={() => setShowGuessModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>提交猜测</h2>
            <form onSubmit={handleSubmitGuess}>
              {(roundGameMode === 'tags') && (
                <div className="form-group">
                  <label>选择标签 (多选)</label>
                  <div className="tags-grid">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className={`tag-option ${selectedTags.includes(tag) ? 'selected' : ''}`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <div className="selected-tags-summary">
                      已选择 {selectedTags.length} 个标签: {selectedTags.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {(roundGameMode === 'rating') && (
                <>
                  <div className="form-group">
                    <label>难度范围 (最大跨度 200)</label>
                    <div className="range-inputs">
                      <input
                        type="number"
                        value={ratingMin}
                        onChange={(e) => setRatingMin(Number(e.target.value))}
                        placeholder="最小值"
                        required
                      />
                      <span>-</span>
                      <input
                        type="number"
                        value={ratingMax}
                        onChange={(e) => setRatingMax(Number(e.target.value))}
                        placeholder="最大值"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {(roundGameMode === 'pass_rate') && (
                <>
                  <div className="form-group">
                    <label>通过率范围 (%) (最大跨度 10)</label>
                    <div className="range-inputs">
                      <input
                        type="number"
                        value={passRateMin}
                        onChange={(e) => setPassRateMin(Number(e.target.value))}
                        placeholder="最小值"
                        min="0"
                        max="100"
                        required
                      />
                      <span>-</span>
                      <input
                        type="number"
                        value={passRateMax}
                        onChange={(e) => setPassRateMax(Number(e.target.value))}
                        placeholder="最大值"
                        min="0"
                        max="100"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button type="button" onClick={() => setShowGuessModal(false)}>取消</button>
                <button type="submit" disabled={loading}>
                  {loading ? '提交中...' : '提交'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResultModal && settleResult && (
        <div className="modal-overlay" onClick={() => setShowResultModal(false)}>
          <div className="modal-content result-modal" onClick={(e) => e.stopPropagation()}>
            <h2>🎉 结算结果</h2>

            <div className="result-section">
              <h3>题目信息</h3>
              <p><strong>题号:</strong> {settleResult.problemId}</p>
              <p><strong>题目:</strong> {settleResult.problemName}</p>
              {settleResult.actualTags && (
                <p><strong>标签:</strong> {settleResult.actualTags.join(', ')}</p>
              )}
              {settleResult.actualRating && (
                <p><strong>难度:</strong> {settleResult.actualRating}</p>
              )}
              {settleResult.actualPassRate && (
                <p><strong>通过率:</strong> {settleResult.actualPassRate}%</p>
              )}
            </div>

            <div className="result-section">
              <h3>玩家结果</h3>
              <div className="results-table">
                {settleResult.guesses && settleResult.guesses.map((guess: any) => (
                  <div key={guess.id} className={`result-row ${guess.is_correct ? 'correct' : 'incorrect'}`}>
                    <span className="player-name">{guess.username}</span>
                    <span className={`result-badge ${guess.is_correct ? 'win' : 'lose'}`}>
                      {guess.is_correct ? '✓ 猜对' : '✗ 猜错'}
                    </span>
                    <span className={`points-change ${guess.points_change >= 0 ? 'positive' : 'negative'}`}>
                      {guess.points_change >= 0 ? '+' : ''}{guess.points_change?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowResultModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;
