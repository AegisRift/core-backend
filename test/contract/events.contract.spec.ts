import { EVENT_TOPICS } from '../../src/events/contracts/integration-events/keuwo-events.examples';

describe('Integration event contracts', () => {
  it('uses versioned topic names', () => {
    expect(EVENT_TOPICS.LISTING_CREATED.endsWith('.v1')).toBe(true);
    expect(EVENT_TOPICS.PAYMENT_CONFIRMED.endsWith('.v1')).toBe(true);
  });
});
