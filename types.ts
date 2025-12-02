export type Lang = 'zh' | 'en';

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface TeamMember {
  name: LocalizedText;
  title: LocalizedText;
  avatar: string;
  email: string;
  linkedin: string;
}

export interface JourneyPoint {
  y: number;
  n: string; // name
  l?: string; // location alias
  lat: number;
  lng: number;
}

export interface EmotionPoint {
  lat: number;
  lng: number;
  intensity: number;
  period: string;
}

export interface EmotionCategory {
  label: string;
  enLabel: string;
  color: string;
  points: EmotionPoint[];
}

export interface Poem {
  y: number;
  l: string;
  m: string;
  t: string;
}

export interface AnalyticItem {
  name: string;
  enName: string;
  value: number;
  emotion: string;
  enEmotion: string;
  color: string;
}

export interface LifeEvent {
  y: string;
  t: LocalizedText;
  d: LocalizedText;
}

export interface DrinkMood {
  moodKey: string;
  poem: string;
  img: string;
  desc: string;
}