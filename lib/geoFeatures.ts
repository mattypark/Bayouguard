/* Lightweight geographic reference for the watershed graph: major Houston-area
 * cities and a coarse outline of the greater-Houston / Harris County region.
 * These are stylized (hand-traced), enough to give the node cloud a sense of
 * place. Swap in real TIGER/GeoJSON later if precise boundaries are needed. */

export interface City {
  name: string;
  lat: number;
  lng: number;
}

export const HOUSTON_CITIES: City[] = [
  { name: 'HOUSTON', lat: 29.7604, lng: -95.3698 },
  { name: 'Katy', lat: 29.7858, lng: -95.8245 },
  { name: 'Sugar Land', lat: 29.6197, lng: -95.6349 },
  { name: 'Missouri City', lat: 29.6186, lng: -95.5377 },
  { name: 'Pearland', lat: 29.5636, lng: -95.286 },
  { name: 'Pasadena', lat: 29.6911, lng: -95.2091 },
  { name: 'Baytown', lat: 29.7355, lng: -94.9774 },
  { name: 'League City', lat: 29.5075, lng: -95.0949 },
  { name: 'Cypress', lat: 29.9691, lng: -95.6972 },
  { name: 'Spring', lat: 30.0799, lng: -95.4172 },
  { name: 'The Woodlands', lat: 30.1658, lng: -95.4613 },
  { name: 'Conroe', lat: 30.3119, lng: -95.4561 },
  { name: 'Galveston', lat: 29.3013, lng: -94.7977 },
];

// Coarse ring around the greater-Houston region (lat, lng), clockwise.
export const HOUSTON_OUTLINE: Array<[number, number]> = [
  [30.30, -95.78],
  [30.36, -95.30],
  [30.28, -95.00],
  [30.05, -94.86],
  [29.80, -94.80],
  [29.55, -94.84],
  [29.32, -94.92],
  [29.18, -95.18],
  [29.22, -95.50],
  [29.34, -95.78],
  [29.55, -95.96],
  [29.82, -96.02],
  [30.05, -95.98],
  [30.20, -95.90],
];
