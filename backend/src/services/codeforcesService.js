const axios = require('axios');

const CODEFORCES_API = 'https://codeforces.com/api/problemset.problems';

let problemsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 3600000; // 1 hour

const fetchProblems = async () => {
  try {
    if (problemsCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return problemsCache;
    }

    const response = await axios.get(CODEFORCES_API);

    if (response.data.status !== 'OK') {
      throw new Error('Codeforces API returned error status');
    }

    const problems = response.data.result.problems.map((problem, index) => {
      const stats = response.data.result.problemStatistics[index];
      return {
        id: `${problem.contestId}${problem.index}`,
        contestId: problem.contestId,
        index: problem.index,
        name: problem.name,
        tags: problem.tags || [],
        rating: problem.rating || null,
        solvedCount: stats?.solvedCount || 0,
      };
    });

    problemsCache = problems.filter(p => p.rating && p.tags.length > 0);
    cacheTimestamp = Date.now();

    return problemsCache;
  } catch (error) {
    console.error('Error fetching Codeforces problems:', error);
    throw error;
  }
};

const getRandomProblem = async () => {
  const problems = await fetchProblems();
  const randomIndex = Math.floor(Math.random() * problems.length);
  return problems[randomIndex];
};

const calculatePassRate = (solvedCount, rating) => {
  const estimatedAttempts = Math.max(solvedCount * 1.5, solvedCount + 100);
  return ((solvedCount / estimatedAttempts) * 100).toFixed(2);
};

module.exports = {
  fetchProblems,
  getRandomProblem,
  calculatePassRate,
};
