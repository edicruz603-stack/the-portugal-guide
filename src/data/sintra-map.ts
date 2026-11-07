import type { MapPlace } from '../lib/map/types.ts';

/**
 * Markers shown on the Sintra field-guide map (same 9 places as the legacy page).
 * Phase 1 corrections: Quinta da Regaleira and Palácio de Monserrate moved to the operators'
 * published coordinates (legacy markers were about 124 m and 137 m away). Sources read 7 Nov 2026.
 * Places marked 'approximate' have not yet been checked against an official source.
 */
export const sintraMapPlaces: MapPlace[] = [
  { id: 'place.sintra.national-palace', name: 'Palácio Nacional de Sintra · gardens (free entry)', zone: 'Historic centre', lat: 38.79736, lon: -9.39052, category: 'monument', precision: 'official', source: 'src.parques-de-sintra.national-palace' },
  { id: 'place.sintra.quinta-da-regaleira', name: 'Quinta da Regaleira', zone: 'Historic centre and gardens', lat: 38.795875, lon: -9.397281, category: 'monument', precision: 'official', source: 'src.regaleira.contacts' },
  { id: 'place.sintra.moorish-castle', name: 'Castelo dos Mouros', zone: 'Hilltop monuments', lat: 38.79007, lon: -9.3893, category: 'monument', precision: 'official', source: 'src.parques-de-sintra.moorish-castle' },
  { id: 'place.sintra.pena-palace', name: 'Palácio da Pena · visitor entrance', zone: 'Hilltop monuments', lat: 38.7879, lon: -9.3876, category: 'monument', precision: 'official', source: 'src.parques-de-sintra.pena' },
  { id: 'place.sintra.monserrate', name: 'Palácio de Monserrate', zone: 'Western gardens', lat: 38.791861, lon: -9.419192, category: 'monument', precision: 'official', source: 'src.parques-de-sintra.monserrate' },
  { id: 'place.sintra.museu-anjos-teixeira', name: 'Museu Anjos Teixeira · free', zone: 'Free cultural stop', lat: 38.79683, lon: -9.38733, category: 'free', precision: 'approximate' },
  { id: 'place.sintra.parque-da-liberdade', name: 'Parque da Liberdade · free', zone: 'Free public garden', lat: 38.79667, lon: -9.38628, category: 'free', precision: 'approximate' },
  { id: 'place.sintra.miradouro-sao-martinho', name: 'Miradouro do Adro de São Martinho · free', zone: 'Free viewpoint', lat: 38.79644, lon: -9.39175, category: 'free', precision: 'approximate' },
  { id: 'place.sintra.villa-sassetti', name: 'Vila Sassetti · free garden path', zone: 'Free garden walk', lat: 38.79572, lon: -9.39067, category: 'free', precision: 'official', source: 'src.parques-de-sintra.villa-sassetti' },
];
