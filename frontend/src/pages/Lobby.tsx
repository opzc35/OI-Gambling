import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { roomApi } from '../services/api';
import type { Room } from '../types';
import './Lobby.css';

const Lobby: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { rooms } = await roomApi.getRooms();
      setRooms(rooms);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { room } = await roomApi.createRoom(roomName);
      setShowCreateModal(false);
      setRoomName('');
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '创建房间失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: number) => {
    try {
      await roomApi.joinRoom(roomId);
      navigate(`/room/${roomId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || '加入房间失败');
    }
  };

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <h1>OI-Gambling 大厅</h1>
        <div className="user-info">
          <span>欢迎, {user?.username}</span>
          <span className="points">积分: {user?.points}</span>
          <button onClick={() => navigate('/profile')}>个人中心</button>
          <button onClick={() => navigate('/leaderboard')}>排行榜</button>
          <button onClick={logout}>退出</button>
        </div>
      </header>

      <div className="lobby-content">
        <div className="rooms-header">
          <h2>房间列表</h2>
          <button onClick={() => setShowCreateModal(true)} className="create-btn">
            创建房间
          </button>
        </div>

        <div className="rooms-grid">
          {rooms.length === 0 ? (
            <div className="no-rooms">暂无房间，创建一个吧！</div>
          ) : (
            rooms.map((room) => (
              <div key={room.id} className="room-card">
                <h3>{room.name}</h3>
                <div className="room-info">
                  <p>房主: {room.owner_username}</p>
                  <p>成员: {room.member_count || 0}</p>
                </div>
                <button onClick={() => handleJoinRoom(room.id)} className="join-btn">
                  加入房间
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>创建房间</h2>
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label>房间名称</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="请输入房间名称"
                  required
                  autoFocus
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
