// Digest bucketing logic — pure-function cases.
import { describe, expect, it } from 'vitest';
import { bucketByOrg } from '../engine/src/lib/jobs';

const NOW = new Date('2026-07-04T12:00:00Z');
const HORIZON = new Date('2026-07-11T12:00:00Z');
const orgNames = new Map([
  ['org-a', 'Alpha Co'],
  ['org-b', 'Beta Org'],
]);

const task = (title: string, due: string | null, orgId: string | null) => ({
  title,
  dueDate: due,
  owningOrg: orgId ? { id: orgId, name: orgNames.get(orgId)! } : null,
});

describe('bucketByOrg', () => {
  it('splits overdue / due-soon / no-date per org', () => {
    const buckets = bucketByOrg(
      [
        task('late thing', '2026-07-01T12:00:00Z', 'org-a'),
        task('this week', '2026-07-08T12:00:00Z', 'org-a'),
        task('someday', null, 'org-a'),
        task('far future', '2026-09-01T12:00:00Z', 'org-a'),
      ],
      orgNames,
      HORIZON,
      NOW,
    );
    expect(buckets).toHaveLength(1);
    const a = buckets[0];
    expect(a.orgName).toBe('Alpha Co');
    expect(a.overdue.map((t) => t.title)).toEqual(['late thing']);
    expect(a.dueSoon.map((t) => t.title)).toEqual(['this week']);
    // no-date AND beyond-horizon both land in openNoDate
    expect(a.openNoDate.sort()).toEqual(['far future', 'someday']);
  });

  it('groups by org and labels unowned tasks', () => {
    const buckets = bucketByOrg(
      [task('a', null, 'org-a'), task('b', null, 'org-b'), task('stray', null, null)],
      orgNames,
      HORIZON,
      NOW,
    );
    expect(buckets.map((b) => b.orgName).sort()).toEqual(['Alpha Co', 'Beta Org', 'Unassigned']);
  });

  it('returns nothing when there is nothing to say', () => {
    expect(bucketByOrg([], orgNames, HORIZON, NOW)).toEqual([]);
  });
});
