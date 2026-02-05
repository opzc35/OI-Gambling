const db = require('../config/database');
const pool = require('../config/dbHelper');
const { getRandomProblem, calculatePassRate } = require('../services/codeforcesService');

const startRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { gameMode, penaltyCoefficient } = req.body;

    if (!['tags', 'rating', 'pass_rate'].includes(gameMode)) {
      return res.status(400).json({ error: 'Invalid game mode' });
    }

    if (!penaltyCoefficient || penaltyCoefficient <= 0) {
      return res.status(400).json({ error: 'Penalty coefficient must be positive' });
    }

    const roomResult = await pool.query(
      'SELECT owner_id FROM rooms WHERE id = ? AND is_active = 1',
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or inactive' });
    }

    if (roomResult.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only room owner can start a round' });
    }

    const ongoingRound = await pool.query(
      'SELECT id FROM game_rounds WHERE room_id = ? AND status = ?',
      [id, 'ongoing']
    );

    if (ongoingRound.rows.length > 0) {
      return res.status(400).json({ error: 'There is already an ongoing round' });
    }

    const problem = await getRandomProblem();
    const passRate = calculatePassRate(problem.solvedCount, problem.rating);

    const result = await pool.run(
      `INSERT INTO game_rounds
       (room_id, problem_id, problem_name, problem_tags, problem_rating,
        problem_solved_count, actual_pass_rate, game_mode, penalty_coefficient)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        problem.id,
        problem.name,
        JSON.stringify(problem.tags),
        problem.rating,
        problem.solvedCount,
        passRate,
        gameMode,
        penaltyCoefficient,
      ]
    );

    const round = await pool.get('SELECT * FROM game_rounds WHERE id = ?', [result.lastID]);

    res.status(201).json({
      round: {
        id: round.id,
        problemName: round.problem_name,
        gameMode: round.game_mode,
        penaltyCoefficient: round.penalty_coefficient,
        startedAt: round.started_at,
      },
    });
  } catch (error) {
    console.error('Start round error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCurrentRound = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, problem_name, game_mode, penalty_coefficient, status, started_at
       FROM game_rounds
       WHERE room_id = ? AND status = ?
       ORDER BY started_at DESC
       LIMIT 1`,
      [id, 'ongoing']
    );

    if (result.rows.length === 0) {
      return res.json({ round: null });
    }

    res.json({ round: result.rows[0] });
  } catch (error) {
    console.error('Get current round error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const submitGuess = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags, ratingMin, ratingMax, passRateMin, passRateMax } = req.body;

    const roundResult = await pool.query(
      'SELECT * FROM game_rounds WHERE id = ? AND status = ?',
      [id, 'ongoing']
    );

    if (roundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Round not found or already settled' });
    }

    const round = roundResult.rows[0];

    const memberCheck = await pool.query(
      'SELECT * FROM room_members WHERE room_id = ? AND user_id = ?',
      [round.room_id, req.userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this room' });
    }

    const existingGuess = await pool.query(
      'SELECT id FROM guesses WHERE round_id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existingGuess.rows.length > 0) {
      return res.status(400).json({ error: 'You have already submitted a guess for this round' });
    }

    let guessTags = null;
    let guessRatingMin = null;
    let guessRatingMax = null;
    let guessPassRateMin = null;
    let guessPassRateMax = null;

    if (round.game_mode === 'tags') {
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ error: 'Tags array is required for tags mode' });
      }
      guessTags = JSON.stringify(tags);
    } else if (round.game_mode === 'rating') {
      if (ratingMin === undefined || ratingMax === undefined) {
        return res.status(400).json({ error: 'Rating range is required for rating mode' });
      }
      if (ratingMax - ratingMin > 200) {
        return res.status(400).json({ error: 'Rating range must not exceed 200' });
      }
      if (ratingMin < 0 || ratingMax < 0 || ratingMin > ratingMax) {
        return res.status(400).json({ error: 'Invalid rating range' });
      }
      guessRatingMin = ratingMin;
      guessRatingMax = ratingMax;
    } else if (round.game_mode === 'pass_rate') {
      if (passRateMin === undefined || passRateMax === undefined) {
        return res.status(400).json({ error: 'Pass rate range is required for pass_rate mode' });
      }
      if (passRateMax - passRateMin > 10) {
        return res.status(400).json({ error: 'Pass rate range must not exceed 10%' });
      }
      if (passRateMin < 0 || passRateMax > 100 || passRateMin > passRateMax) {
        return res.status(400).json({ error: 'Invalid pass rate range' });
      }
      guessPassRateMin = passRateMin;
      guessPassRateMax = passRateMax;
    }

    const result = await pool.run(
      `INSERT INTO guesses
       (round_id, user_id, guess_tags, guess_rating_min, guess_rating_max,
        guess_pass_rate_min, guess_pass_rate_max)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.userId, guessTags, guessRatingMin, guessRatingMax, guessPassRateMin, guessPassRateMax]
    );

    const guess = await pool.get('SELECT * FROM guesses WHERE id = ?', [result.lastID]);
    if (guess.guess_tags) guess.guess_tags = JSON.parse(guess.guess_tags);

    res.status(201).json({ guess });
  } catch (error) {
    console.error('Submit guess error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const settleRound = async (req, res) => {
  try {
    const { id } = req.params;

    const roundResult = await pool.query(
      'SELECT * FROM game_rounds WHERE id = ? AND status = ?',
      [id, 'ongoing']
    );

    if (roundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Round not found or already settled' });
    }

    const round = roundResult.rows[0];
    round.problem_tags = JSON.parse(round.problem_tags || '[]');

    const roomResult = await pool.query(
      'SELECT owner_id FROM rooms WHERE id = ?',
      [round.room_id]
    );

    if (roomResult.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only room owner can settle the round' });
    }

    const guessesResult = await pool.query(
      'SELECT * FROM guesses WHERE round_id = ?',
      [id]
    );

    const guesses = guessesResult.rows.map(g => ({
      ...g,
      guess_tags: g.guess_tags ? JSON.parse(g.guess_tags) : null
    }));

    guesses.forEach(guess => {
      let isCorrect = false;

      if (round.game_mode === 'tags') {
        const guessTagsSet = new Set(guess.guess_tags);
        const actualTagsSet = new Set(round.problem_tags);
        isCorrect = guessTagsSet.size === actualTagsSet.size &&
                    [...guessTagsSet].every(tag => actualTagsSet.has(tag));
      } else if (round.game_mode === 'rating') {
        isCorrect = round.problem_rating >= guess.guess_rating_min &&
                    round.problem_rating <= guess.guess_rating_max;
      } else if (round.game_mode === 'pass_rate') {
        isCorrect = parseFloat(round.actual_pass_rate) >= guess.guess_pass_rate_min &&
                    parseFloat(round.actual_pass_rate) <= guess.guess_pass_rate_max;
      }

      guess.is_correct = isCorrect;
    });

    const correctGuesses = guesses.filter(g => g.is_correct);
    const incorrectGuesses = guesses.filter(g => !g.is_correct);

    const totalPenalty = incorrectGuesses.length * parseFloat(round.penalty_coefficient);

    // Use transaction
    const settle = db.transaction(() => {
      if (correctGuesses.length > 0) {
        const rewardPerPerson = totalPenalty / correctGuesses.length;

        for (const guess of incorrectGuesses) {
          db.prepare('UPDATE guesses SET is_correct = 0, points_change = ? WHERE id = ?')
            .run(-parseFloat(round.penalty_coefficient), guess.id);
          db.prepare('UPDATE users SET points = points - ? WHERE id = ?')
            .run(parseFloat(round.penalty_coefficient), guess.user_id);
        }

        for (const guess of correctGuesses) {
          db.prepare('UPDATE guesses SET is_correct = 1, points_change = ? WHERE id = ?')
            .run(rewardPerPerson, guess.id);
          db.prepare('UPDATE users SET points = points + ? WHERE id = ?')
            .run(rewardPerPerson, guess.user_id);
        }
      } else {
        for (const guess of guesses) {
          db.prepare('UPDATE guesses SET is_correct = 0, points_change = 0 WHERE id = ?')
            .run(guess.id);
        }
      }

      db.prepare('UPDATE game_rounds SET status = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('settled', id);
    });

    settle();

    const updatedGuesses = await pool.query(
      `SELECT g.*, u.username
       FROM guesses g
       JOIN users u ON g.user_id = u.id
       WHERE g.round_id = ?`,
      [id]
    );

    res.json({
      message: 'Round settled successfully',
      results: {
        problemId: round.problem_id,
        problemName: round.problem_name,
        actualTags: round.problem_tags,
        actualRating: round.problem_rating,
        actualPassRate: round.actual_pass_rate,
        guesses: updatedGuesses.rows,
      },
    });
  } catch (error) {
    console.error('Settle round error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  startRound,
  getCurrentRound,
  submitGuess,
  settleRound,
};
