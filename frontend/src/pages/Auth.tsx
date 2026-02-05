import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
      navigate('/lobby');
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>OI-Gambling</h1>
        <h2>{isLogin ? '登录' : '注册'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              minLength={6}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>

        <div className="toggle-mode">
          {isLogin ? '还没有账号？' : '已有账号？'}
          <button onClick={() => setIsLogin(!isLogin)} className="link-btn">
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
