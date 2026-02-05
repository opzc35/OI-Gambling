const pool = require('../config/database');

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
  const client = await pool.connect();

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

    await client.query('BEGIN');

    const fromUserResult = await client.query(
      'SELECT points FROM users WHERE id = $1',
      [req.userId]
    );

    if (fromUserResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const fromUserPoints = parseFloat(fromUserResult.rows[0].points);

    if (fromUserPoints < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient points' });
    }

    const toUserResult = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [toUserId]
    );

    if (toUserResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    await client.query(
      'UPDATE users SET points = points - $1 WHERE id = $2',
      [amount, req.userId]
    );

    await client.query(
      'UPDATE users SET points = points + $1 WHERE id = $2',
      [amount, toUserId]
    );

    const transactionResult = await client.query(
      'INSERT INTO transactions (from_user_id, to_user_id, amount) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, toUserId, amount]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Transaction completed successfully',
      transaction: transactionResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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
       WHERE t.from_user_id = $1 OR t.to_user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [req.userId]
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
