const pool = require('../config/database');

const createRoom = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const result = await pool.query(
      'INSERT INTO rooms (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name.trim(), req.userId]
    );

    await pool.query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)',
      [result.rows[0].id, req.userId]
    );

    res.status(201).json({ room: result.rows[0] });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRooms = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.username as owner_username,
       COUNT(rm.user_id) as member_count
       FROM rooms r
       JOIN users u ON r.owner_id = u.id
       LEFT JOIN room_members rm ON r.id = rm.room_id
       WHERE r.is_active = true
       GROUP BY r.id, u.username
       ORDER BY r.created_at DESC`
    );

    res.json({ rooms: result.rows });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const roomResult = await pool.query(
      `SELECT r.*, u.username as owner_username
       FROM rooms r
       JOIN users u ON r.owner_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.username, u.points, rm.joined_at
       FROM room_members rm
       JOIN users u ON rm.user_id = u.id
       WHERE rm.room_id = $1
       ORDER BY rm.joined_at`,
      [id]
    );

    res.json({
      room: roomResult.rows[0],
      members: membersResult.rows,
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const roomResult = await pool.query(
      'SELECT * FROM rooms WHERE id = $1 AND is_active = true',
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or inactive' });
    }

    const existingMember = await pool.query(
      'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'Already in this room' });
    }

    await pool.query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)',
      [id, req.userId]
    );

    res.json({ message: 'Joined room successfully' });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const leaveRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const roomResult = await pool.query(
      'SELECT owner_id FROM rooms WHERE id = $1',
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (roomResult.rows[0].owner_id === req.userId) {
      return res.status(400).json({ error: 'Room owner cannot leave. Close the room instead.' });
    }

    const result = await pool.query(
      'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Not in this room' });
    }

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const closeRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const roomResult = await pool.query(
      'SELECT owner_id FROM rooms WHERE id = $1',
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (roomResult.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only room owner can close the room' });
    }

    await pool.query(
      'UPDATE rooms SET is_active = false WHERE id = $1',
      [id]
    );

    res.json({ message: 'Room closed successfully' });
  } catch (error) {
    console.error('Close room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  leaveRoom,
  closeRoom,
};
