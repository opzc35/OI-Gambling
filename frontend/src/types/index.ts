export interface User {
  id: number;
  username: string;
  points: number;
  created_at?: string;
  createdAt?: string;
}

export interface Room {
  id: number;
  name: string;
  owner_id: number;
  is_active: boolean;
  created_at: string;
  owner_username?: string;
  member_count?: number;
}

export interface RoomMember {
  id: number;
  username: string;
  points: number;
  joined_at: string;
}

export type GameMode = 'tags' | 'rating' | 'pass_rate';

export interface Round {
  id: number;
  room_id?: number;
  problem_id?: string;
  problem_name: string;
  problem_tags?: string[];
  problem_rating?: number;
  actual_pass_rate?: number;
  game_mode: GameMode;
  penalty_coefficient: number;
  status: 'ongoing' | 'settled';
  started_at: string;
  settled_at?: string;
  problemId?: string;
  problemName?: string;
  problemUrl?: string;
  gameMode?: GameMode;
  penaltyCoefficient?: number;
  startedAt?: string;
}

export interface Guess {
  id: number;
  round_id: number;
  user_id: number;
  guess_tags?: string[];
  guess_rating_min?: number;
  guess_rating_max?: number;
  guess_pass_rate_min?: number;
  guess_pass_rate_max?: number;
  is_correct?: boolean;
  points_change?: number;
  submitted_at: string;
  username?: string;
}

export interface Transaction {
  id: number;
  from_user_id: number;
  to_user_id: number;
  amount: number;
  created_at: string;
  from_username?: string;
  to_username?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}

export interface RoomDetail {
  room: Room;
  members: RoomMember[];
}

export interface RoundResult {
  problemId: string;
  problemName: string;
  actualTags: string[];
  actualRating: number;
  actualPassRate: number;
  guesses: Guess[];
}
