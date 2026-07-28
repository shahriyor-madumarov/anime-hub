export type MediaType = 'ANIME' | 'MANGA';

export type MediaFormat = 
  | 'TV' 
  | 'TV_SHORT' 
  | 'MOVIE' 
  | 'SPECIAL' 
  | 'OVA' 
  | 'ONA' 
  | 'MANGA' 
  | 'NOVEL' 
  | 'ONE_SHOT';

export type MediaStatus = 
  | 'FINISHED' 
  | 'RELEASING' 
  | 'NOT_YET_RELEASED' 
  | 'CANCELLED' 
  | 'HIATUS';

export interface Title {
  romaji: string;
  english?: string;
  native?: string;
  russian?: string;
}

export interface CoverImage {
  extraLarge: string;
  large: string;
  medium: string;
  color?: string;
}

export interface Studio {
  id: number;
  name: string;
  isAnimationStudio?: boolean;
  siteUrl?: string;
}

export interface Character {
  id: number;
  name: {
    full: string;
    native?: string;
    alternative?: string[];
  };
  image: {
    large: string;
  };
  role?: string;
  voiceActors?: {
    id: number;
    name: {
      full: string;
      native?: string;
    };
    image?: {
      medium: string;
    };
    languageV2?: string;
  }[];
}

export interface Staff {
  id: number;
  name: {
    full: string;
  };
  role: string;
  image?: {
    medium: string;
  };
}

export interface RelationEdge {
  relationType: string;
  node: {
    id: number;
    title: Title;
    type: MediaType;
    format: MediaFormat;
    status: MediaStatus;
    coverImage: CoverImage;
    seasonYear?: number;
    episodes?: number;
    chapters?: number;
    averageScore?: number;
  };
}

export interface AiringSchedule {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
  mediaId: number;
  media?: MediaItem;
}

export interface MediaItem {
  id: number;
  idMal?: number;
  title: Title;
  type: MediaType;
  format: MediaFormat;
  status: MediaStatus;
  description: string;
  russianDescription?: string;
  startDate?: { year?: number; month?: number; day?: number };
  endDate?: { year?: number; month?: number; day?: number };
  season?: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
  seasonYear?: number;
  episodes?: number;
  duration?: number;
  chapters?: number;
  volumes?: number;
  countryOfOrigin?: string;
  coverImage: CoverImage;
  bannerImage?: string;
  genres: string[];
  tags: { id: number; name: string; category?: string; description?: string; isAdult?: boolean }[];
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  favourites?: number;
  trending?: number;
  studios?: Studio[];
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };
  relations?: RelationEdge[];
  characters?: Character[];
  staff?: Staff[];
  trailer?: {
    id: string;
    site: string;
    thumbnail?: string;
  };
  recommendations?: {
    media: MediaItem;
  }[];
  isAdult?: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'Анонсы' | 'Релизы' | 'Студии' | 'Индустрия' | 'Манга';
  imageUrl: string;
  source: string;
  date: string;
  readTime: string;
  relatedMediaId?: number;
}

export type UserWatchStatus = 'WATCHING' | 'COMPLETED' | 'PLANNING' | 'DROPPED' | 'READING';

export interface UserListItem {
  mediaId: number;
  media: MediaItem;
  status: UserWatchStatus;
  score?: number;
  progress: number;
  notes?: string;
  updatedAt: string;
}

export interface UserReview {
  id: string;
  mediaId: number;
  userName: string;
  userAvatar: string;
  rating: number;
  text: string;
  createdAt: string;
  likesCount: number;
}

export interface FilterState {
  search: string;
  type: MediaType;
  format?: string;
  status?: string;
  genres: string[];
  tags: string[];
  year?: number;
  season?: string;
  studioId?: number;
  sort: 'POPULARITY_DESC' | 'SCORE_DESC' | 'TRENDING_DESC' | 'START_DATE_DESC' | 'TITLE_ROMAJI' | 'FAVOURITES_DESC' | 'CHAPTERS_DESC' | 'UPDATED_AT_DESC';
  isAdult: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  dateOfBirth: string; // YYYY-MM-DD
  age: number;
  isAdultVerified: boolean;
  createdAt?: string;
  avatarUrl?: string;
  bio?: string;
  nicknameEffect?: string;
  backgroundBanner?: string;
}
