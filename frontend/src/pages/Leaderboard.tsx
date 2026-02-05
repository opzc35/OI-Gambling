import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardApi } from '../services/api';
import type { User } from '../types';
import './Leaderboard.css';

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { leaderboard } = await leaderboardApi.getLeaderboard();
      setLeaderboard(leaderboard);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  return (
    <div className="leaderboard-container">
      <header className="leaderboard-header">
        <h1>排行榜</h1>
        <button onClick={() => navigate('/lobby')}>返回大厅</button>
      </header>

      <div className="leaderboard-content">
        <div className="leaderboard-table">
          <div className="table-header">
            <div className="rank-col">排名</div>
            <div className="username-col">用户名</div>
            <div className="points-col">积分</div>
          </div>

          {leaderboard.map((user, index) => (
            <div key={user.id} className={`table-row ${index < 3 ? 'top-three' : ''}`}>
              <div className="rank-col">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && `#${index + 1}`}
              </div>
              <div className="username-col">{user.username}</div>
              <div className="points-col">{user.points}</div>
            </div>
          ))}

          {leaderboard.length === 0 && (
            <div className="no-data">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
