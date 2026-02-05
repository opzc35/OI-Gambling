const pool = require('../config/database');
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
      'SELECT owner_id FROM rooms WHERE id = $1 AND is_active = true',
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or inactive' });
    }

    if (roomResult.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only room owner can start a round' });
    }

    const ongoingRound = await pool.query(
      'SELECT id FROM game_rounds WHERE room_id = $1 AND status = $2',
      [id, 'ongoing']
    );

    if (ongoingRound.rows.length > 0) {
      return res.status(400).json({ error: 'There is already an ongoing round' });
    }

    const problem = await getRandomProblem();
    const passRate = calculatePassRate(problem.solvedCount, problem.rating);

    const result = await pool.query(
      `INSERT INTO game_rounds
       (room_id, problem_id, problem_name, problem_tags, problem_rating,
        problem_solved_count, actual_pass_rate, game_mode, penalty_coefficient)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        problem.id,
        problem.name,
        problem.tags,
        problem.rating,
        problem.solvedCount,
        passRate,
        gameMode,
        penaltyCoefficient,
      ]
    );

    res.status(201).json({
      round: {
        id: result.rows[0].id,
        problemName: result.rows[0].problem_name,
        gameMode: result.rows[0].game_mode,
        penaltyCoefficient: result.rows[0].penalty_coefficient,
        startedAt: result.rows[0].started_at,
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
       WHERE room_id = $1 AND status = $2
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
      'SELECT * FROM game_rounds WHERE id = $1 AND status = $2',
      [id, 'ongoing']
    );

    if (roundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Round not found or already settled' });
    }

    const round = roundResult.rows[0];

    const memberCheck = await pool.query(
      'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
      [round.room_id, req.userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this room' });
    }

    const existingGuess = await pool.query(
      'SELECT id FROM guesses WHERE round_id = $1 AND user_id = $2',
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
      guessTags = tags;
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

    const result = await pool.query(
      `INSERT INTO guesses
       (round_id, user_id, guess_tags, guess_rating_min, guess_rating_max,
        guess_pass_rate_min, guess_pass_rate_max)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, req.userId, guessTags, guessRatingMin, guessRatingMax, guessPassRateMin, guessPassRateMax]
    );

    res.status(201).json({ guess: result.rows[0] });
  } catch (error) {
    console.error('Submit guess error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const settleRound = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const roundResult = await client.query(
      'SELECT * FROM game_rounds WHERE id = $1 AND status = $2',
      [id, 'ongoing']
    );

    if (roundResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Round not found or already settled' });
    }

    const round = roundResult.rows[0];

    const roomResult = await client.query(
      'SELECT owner_id FROM rooms WHERE id = $1',
      [round.room_id]
    );

    if (roomResult.rows[0].owner_id !== req.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only room owner can settle the round' });
    }

    const guessesResult = await client.query(
      'SELECT * FROM guesses WHERE round_id = $1',
      [id]
    );

    const guesses = guessesResult.rows;

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

    if (correctGuesses.length > 0) {
      const rewardPerPerson = totalPenalty / correctGuesses.length;

      for (const guess of incorrectGuesses) {
        await client.query(
          'UPDATE guesses SET is_correct = false, points_change = $1 WHERE id = $2',
          [-parseFloat(round.penalty_coefficient), guess.id]
        );
        await client.query(
          'UPDATE users SET points = points - $1 WHERE id = $2',
          [parseFloat(round.penalty_coefficient), guess.user_id]
        );
      }

      for (const guess of correctGuesses) {
        await client.query(
          'UPDATE guesses SET is_correct = true, points_change = $1 WHERE id = $2',
          [rewardPerPerson, guess.id]
        );
        await client.query(
          'UPDATE users SET points = points + $1 WHERE id = $2',
          [rewardPerPerson, guess.user_id]
        );
      }
    } else {
      for (const guess of guesses) {
        await client.query(
          'UPDATE guesses SET is_correct = false, points_change = 0 WHERE id = $1',
          [guess.id]
        );
      }
    }

    await client.query(
      'UPDATE game_rounds SET status = $1, settled_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['settled', id]
    );

    await client.query('COMMIT');

    const updatedGuesses = await pool.query(
      `SELECT g.*, u.username
       FROM guesses g
       JOIN users u ON g.user_id = u.id
       WHERE g.round_id = $1`,
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
    await client.query('ROLLBACK');
    console.error('Settle round error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  startRound,
  getCurrentRound,
  submitGuess,
  settleRound,
};
