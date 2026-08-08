import { describe, it, expect } from 'bun:test';
import type { BookingStatus } from '@destow/contracts';
import { canTransition, assertTransition, BOOKING_TRANSITIONS } from './lifecycle';

const ALL: BookingStatus[] = ['pending', 'confirmed', 'assigned', 'ongoing', 'completed', 'cancelled'];

describe('booking lifecycle', () => {
  it('walks the happy path end to end', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'assigned')).toBe(true);
    expect(canTransition('assigned', 'ongoing')).toBe(true);
    expect(canTransition('ongoing', 'completed')).toBe(true);
  });

  // The one that protects the money: completion is where commission accrues, so
  // reaching it without running the trip would book revenue that never happened.
  it('refuses to skip straight to completed', () => {
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('confirmed', 'completed')).toBe(false);
    expect(canTransition('assigned', 'completed')).toBe(false);
    expect(() => assertTransition('pending', 'completed')).toThrow(/cannot become completed/);
  });

  it('treats completed and cancelled as terminal', () => {
    for (const to of ALL) {
      expect(canTransition('completed', to)).toBe(false);
      expect(canTransition('cancelled', to)).toBe(false);
    }
  });

  // The vehicle is on the road with the customer in it.
  it('does not allow cancelling a trip already under way', () => {
    expect(canTransition('ongoing', 'cancelled')).toBe(false);
  });

  it('allows cancelling only before the trip starts', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('assigned', 'cancelled')).toBe(true);
  });

  it('never moves backwards', () => {
    const order = ['pending', 'confirmed', 'assigned', 'ongoing', 'completed'] as const;
    order.forEach((from, i) => {
      order.slice(0, i).forEach((earlier) => {
        expect(canTransition(from, earlier)).toBe(false);
      });
    });
  });

  it('covers every status, so a new one cannot be forgotten', () => {
    for (const s of ALL) expect(BOOKING_TRANSITIONS[s]).toBeDefined();
  });
});
