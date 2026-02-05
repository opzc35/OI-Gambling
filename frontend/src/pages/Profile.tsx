import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leaderboardApi } from '../services/api';
import type { Transaction } from '../types';
import './Profile.css';

const Profile: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const { transactions } = await leaderboardApi.getTransactionHistory();
      setTransactions(transactions);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await leaderboardApi.createTransaction(parseInt(recipientId), parseFloat(amount));
      setShowTransferModal(false);
      setRecipientId('');
      setAmount('');
      await refreshUser();
      await loadTransactions();
      alert('转账成功！');
    } catch (err: any) {
      setError(err.response?.data?.error || '转账失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1>个人中心</h1>
        <button onClick={() => navigate('/lobby')}>返回大厅</button>
      </header>

      <div className="profile-content">
        <div className="profile-card">
          <h2>个人信息</h2>
          <div className="info-row">
            <span className="label">用户名:</span>
            <span className="value">{user?.username}</span>
          </div>
          <div className="info-row">
            <span className="label">当前积分:</span>
            <span className="value points">{user?.points}</span>
          </div>
          <button onClick={() => setShowTransferModal(true)} className="transfer-btn">
            转账
          </button>
        </div>

        <div className="transactions-card">
          <h2>交易历史</h2>
          <div className="transactions-list">
            {transactions.length === 0 ? (
              <div className="no-transactions">暂无交易记录</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="transaction-item">
                  <div className="tx-info">
                    {tx.from_user_id === user?.id ? (
                      <>
                        <span className="tx-type outgoing">转出</span>
                        <span className="tx-user">给 {tx.to_username}</span>
                      </>
                    ) : (
                      <>
                        <span className="tx-type incoming">转入</span>
                        <span className="tx-user">来自 {tx.from_username}</span>
                      </>
                    )}
                  </div>
                  <div className="tx-amount">
                    {tx.from_user_id === user?.id ? '-' : '+'}
                    {tx.amount}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>转账</h2>
            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label>接收用户 ID</label>
                <input
                  type="number"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  placeholder="请输入用户 ID"
                  required
                />
              </div>

              <div className="form-group">
                <label>转账金额</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="请输入金额"
                  min="0.01"
                  max={user?.points}
                  required
                />
                <small>当前余额: {user?.points}</small>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button type="button" onClick={() => setShowTransferModal(false)}>
                  取消
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? '转账中...' : '确认转账'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
