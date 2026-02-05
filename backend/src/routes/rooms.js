const express = require('express');
const {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  leaveRoom,
  closeRoom,
} = require('../controllers/roomController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, createRoom);
router.get('/', authMiddleware, getRooms);
router.get('/:id', authMiddleware, getRoom);
router.post('/:id/join', authMiddleware, joinRoom);
router.post('/:id/leave', authMiddleware, leaveRoom);
router.delete('/:id', authMiddleware, closeRoom);

module.exports = router;
