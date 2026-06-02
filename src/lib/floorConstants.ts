export const FLOOR_NAMES = [
  "Het Lampatorium",
  "Het Observatorium",
  "De Werkplaats",
  "De Serre",
  "De Codekamer",
]

export const FLOOR_THEMES = [
  "Elektriciteit",
  "Ruimtevaart",
  "Krachten",
  "Biologie",
  "Wiskunde",
]

export const FLOOR_TINTS = [
  "#FFB870",
  "#2bc2e2",
  "#9d6bff",
  "#7be087",
  "#e91852",
]

// ─── Room customization ───────────────────────────────────────────────────────

/** 8-color preset palette for room tint swatches */
export const PRESET_TINTS = [
  "#FFB870",
  "#2bc2e2",
  "#9d6bff",
  "#7be087",
  "#e91852",
  "#f97316",
  "#60a5fa",
  "#f472b6",
]

export interface RoomIconEntry {
  name: string
  label: string
  category: string
}

/** 33 STEM-themed lucide icons for the room icon picker */
export const ROOM_ICONS: RoomIconEntry[] = [
  // Elektriciteit
  { name: "Zap",          label: "Bliksem",      category: "Elektriciteit" },
  { name: "Battery",      label: "Batterij",     category: "Elektriciteit" },
  { name: "Lightbulb",    label: "Lamp",         category: "Elektriciteit" },
  { name: "CircuitBoard", label: "Printplaat",   category: "Elektriciteit" },
  { name: "Cpu",          label: "CPU",          category: "Elektriciteit" },
  // Ruimtevaart
  { name: "Rocket",       label: "Raket",        category: "Ruimtevaart" },
  { name: "Globe",        label: "Aarde",        category: "Ruimtevaart" },
  { name: "Star",         label: "Ster",         category: "Ruimtevaart" },
  { name: "Telescope",    label: "Telescoop",    category: "Ruimtevaart" },
  { name: "Orbit",        label: "Baan",         category: "Ruimtevaart" },
  // Krachten
  { name: "Atom",         label: "Atoom",        category: "Krachten" },
  { name: "Magnet",       label: "Magneet",      category: "Krachten" },
  { name: "Wind",         label: "Wind",         category: "Krachten" },
  { name: "Waves",        label: "Golven",       category: "Krachten" },
  { name: "Mountain",     label: "Berg",         category: "Krachten" },
  // Biologie
  { name: "Leaf",         label: "Blad",         category: "Biologie" },
  { name: "Dna",          label: "DNA",          category: "Biologie" },
  { name: "Eye",          label: "Oog",          category: "Biologie" },
  { name: "Heart",        label: "Hart",         category: "Biologie" },
  { name: "Bug",          label: "Insect",       category: "Biologie" },
  // Wiskunde
  { name: "Calculator",   label: "Rekenmachine", category: "Wiskunde" },
  { name: "Hash",         label: "Raster",       category: "Wiskunde" },
  { name: "Percent",      label: "Procent",      category: "Wiskunde" },
  { name: "Sigma",        label: "Som",          category: "Wiskunde" },
  { name: "TrendingUp",   label: "Groei",        category: "Wiskunde" },
  // Algemeen
  { name: "Lock",         label: "Slot",         category: "Algemeen" },
  { name: "Key",          label: "Sleutel",      category: "Algemeen" },
  { name: "FlaskConical", label: "Kolf",         category: "Algemeen" },
  { name: "BookOpen",     label: "Boek",         category: "Algemeen" },
  { name: "Map",          label: "Kaart",        category: "Algemeen" },
  { name: "Trophy",       label: "Trofee",       category: "Algemeen" },
  { name: "Compass",      label: "Kompas",       category: "Algemeen" },
  { name: "Puzzle",       label: "Puzzel",       category: "Algemeen" },
]

/** Returns the default name/theme/tint/icon for a level when no custom values are stored */
export function getFloorDefaults(level: number) {
  return {
    name:  FLOOR_NAMES[level - 1]  ?? `Kamer ${level}`,
    theme: FLOOR_THEMES[level - 1] ?? "",
    tint:  FLOOR_TINTS[level - 1]  ?? "#2bc2e2",
    icon:  "Lock" as string,
  }
}

/**
 * Returns stable defaults for a question based on its ID (not its position).
 * This ensures color/name/theme don't change when the question is reordered.
 */
export function getFloorDefaultsById(id: string, fallbackLevel: number) {
  // Simple hash of the ID to pick a stable index
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const idx = hash % FLOOR_TINTS.length
  return {
    name:  FLOOR_NAMES[idx]  ?? `Kamer ${fallbackLevel}`,
    theme: FLOOR_THEMES[idx] ?? "",
    tint:  FLOOR_TINTS[idx],
    icon:  "Lock" as string,
  }
}
