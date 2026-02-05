import axios from 'axios';
import type {
  AuthResponse,
  User,
  Room,
  RoomDetail,
  Round,
  Guess,
  Transaction,
  RoundResult,
  GameMode
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authApi = {
  register: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', { username, password });
    return response.data;
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', { username, password });
    return response.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/api/auth/me');
    return response.data;
  },
};

// Room APIs
export const roomApi = {
  getRooms: async (): Promise<{ rooms: Room[] }> => {
    const response = await api.get<{ rooms: Room[] }>('/api/rooms');
    return response.data;
  },

  getRoom: async (id: number): Promise<RoomDetail> => {
    const response = await api.get<RoomDetail>(`/api/rooms/${id}`);
    return response.data;
  },

  createRoom: async (name: string): Promise<{ room: Room }> => {
    const response = await api.post<{ room: Room }>('/api/rooms', { name });
    return response.data;
  },

  joinRoom: async (id: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/api/rooms/${id}/join`);
    return response.data;
  },

  leaveRoom: async (id: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/api/rooms/${id}/leave`);
    return response.data;
  },

  closeRoom: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/rooms/${id}`);
    return response.data;
  },
};

// Game APIs
export const gameApi = {
  startRound: async (
    roomId: number,
    gameMode: GameMode,
    penaltyCoefficient: number
  ): Promise<{ round: Round }> => {
    const response = await api.post<{ round: Round }>(`/api/rooms/${roomId}/rounds`, {
      gameMode,
      penaltyCoefficient,
    });
    return response.data;
  },

  getCurrentRound: async (roomId: number): Promise<{ round: Round | null }> => {
    const response = await api.get<{ round: Round | null }>(`/api/rooms/${roomId}/rounds/current`);
    return response.data;
  },

  submitGuess: async (
    roundId: number,
    guess: {
      tags?: string[];
      ratingMin?: number;
      ratingMax?: number;
      passRateMin?: number;
      passRateMax?: number;
    }
  ): Promise<{ guess: Guess }> => {
    const response = await api.post<{ guess: Guess }>(`/api/rounds/${roundId}/guess`, guess);
    return response.data;
  },

  settleRound: async (roundId: number): Promise<{ message: string; results: RoundResult }> => {
    const response = await api.post<{ message: string; results: RoundResult }>(
      `/api/rounds/${roundId}/settle`
    );
    return response.data;
  },
};

// Leaderboard APIs
export const leaderboardApi = {
  getLeaderboard: async (): Promise<{ leaderboard: User[] }> => {
    const response = await api.get<{ leaderboard: User[] }>('/api/leaderboard');
    return response.data;
  },

  createTransaction: async (toUserId: number, amount: number): Promise<{
    message: string;
    transaction: Transaction
  }> => {
    const response = await api.post<{ message: string; transaction: Transaction }>(
      '/api/transactions',
      { toUserId, amount }
    );
    return response.data;
  },

  getTransactionHistory: async (): Promise<{ transactions: Transaction[] }> => {
    const response = await api.get<{ transactions: Transaction[] }>('/api/transactions/history');
    return response.data;
  },
};

export default api;
