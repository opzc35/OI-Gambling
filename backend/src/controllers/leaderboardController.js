const db = require('../config/database');
const pool = require('../config/dbHelper');

const getLeaderboard = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, points
       FROM users
       ORDER BY points DESC
       LIMIT 10`
    );

    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { toUserId, amount } = req.body;

    if (!toUserId || !amount) {
      return res.status(400).json({ error: 'Recipient user ID and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    if (toUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

    const fromUserResult = await pool.query(
      'SELECT points FROM users WHERE id = ?',
      [req.userId]
    );

    if (fromUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const fromUserPoints = parseFloat(fromUserResult.rows[0].points);

    if (fromUserPoints < amount) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    const toUserResult = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [toUserId]
    );

    if (toUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    // Use transaction
    const transfer = db.transaction(() => {
      db.prepare('UPDATE users SET points = points - ? WHERE id = ?')
        .run(amount, req.userId);

      db.prepare('UPDATE users SET points = points + ? WHERE id = ?')
        .run(amount, toUserId);

      const info = db.prepare('INSERT INTO transactions (from_user_id, to_user_id, amount) VALUES (?, ?, ?)')
        .run(req.userId, toUserId, amount);

      return info.lastInsertRowid;
    });

    const transactionId = transfer();

    const transaction = await pool.get('SELECT * FROM transactions WHERE id = ?', [transactionId]);

    res.status(201).json({
      message: 'Transaction completed successfully',
      transaction,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTransactionHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*,
       u1.username as from_username,
       u2.username as to_username
       FROM transactions t
       JOIN users u1 ON t.from_user_id = u1.id
       JOIN users u2 ON t.to_user_id = u2.id
       WHERE t.from_user_id = ? OR t.to_user_id = ?
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [req.userId, req.userId]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getLeaderboard,
  createTransaction,
  getTransactionHistory,
};
