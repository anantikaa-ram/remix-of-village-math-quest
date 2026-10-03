import type { DomainId } from "./questions";

export interface Structure {
  id: string;
  name: string;
  glyph: string;
  cost: number;
  domain: DomainId;
  /** Topic whose mastery unlocks this structure. */
  topic: string;
  minMastery: number; // 0..1
}

export const GRID_W = 8;
export const GRID_H = 6;

export const STRUCTURES: Structure[] = [
  { id: "hut", name: "Counting Hut", glyph: "🛖", cost: 20, domain: "arithmetic", topic: "Fractions", minMastery: 0 },
  { id: "stall", name: "Market Stall", glyph: "🏪", cost: 40, domain: "arithmetic", topic: "Percentages", minMastery: 0.45 },
  { id: "bank", name: "Decimal Bank", glyph: "🏦", cost: 80, domain: "arithmetic", topic: "Decimals", minMastery: 0.7 },
  { id: "well", name: "Integer Well", glyph: "⛲", cost: 25, domain: "prealgebra", topic: "Integers", minMastery: 0 },
  { id: "library", name: "Equation Library", glyph: "📚", cost: 50, domain: "prealgebra", topic: "Linear Equations", minMastery: 0.45 },
  { id: "tower", name: "Scholar's Tower", glyph: "🗼", cost: 90, domain: "prealgebra", topic: "Expressions", minMastery: 0.7 },
  { id: "tree", name: "Angle Grove", glyph: "🌳", cost: 15, domain: "geometry", topic: "Angles", minMastery: 0 },
  { id: "house", name: "Mason's House", glyph: "🏠", cost: 45, domain: "geometry", topic: "Area", minMastery: 0.45 },
  { id: "castle", name: "Pythagoras Keep", glyph: "🏰", cost: 100, domain: "geometry", topic: "Pythagoras", minMastery: 0.7 },
  { id: "field", name: "Tally Field", glyph: "🌾", cost: 20, domain: "data", topic: "Mean", minMastery: 0 },
  { id: "granary", name: "Harvest Granary", glyph: "🛕", cost: 50, domain: "data", topic: "Median", minMastery: 0.45 },
  { id: "observatory", name: "Probability Observatory", glyph: "🔭", cost: 95, domain: "data", topic: "Probability", minMastery: 0.7 },
];

export const structureById = (id: string) => STRUCTURES.find((s) => s.id === id);
