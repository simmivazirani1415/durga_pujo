/**
 * Lets the journey director hand control to the ride without importing it (and its 3D dependencies) directly.
 * The ride controller fills these in when it starts.
 */
export const rideHooks = {
  /** true while the visitor is driving */
  active: () => false,
  /** travel to stop i during the ride (0 = leave the ride, last = finish it) */
  go: (_i: number): Promise<void> => Promise.resolve(),
  /** "carry on": leave the current stop towards the next one */
  next: () => {},
  prev: () => {},
  /** start the ride from the hero */
  start: (_scenic?: boolean) => {},
  /** enter the ride parked at stop i (from the hero, the finale, search or a deep link) */
  enterAt: (_i: number): Promise<void> => Promise.resolve(),
}
