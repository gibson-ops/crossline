// Head-to-head effort benchmark for extraction: latency + quality on the same
// transcript. Run:  infisical-agent run --env=dev -- npx tsx scripts/bench-extract.ts
import { extractCommitments } from '../engine/src/lib/extract';
import type { WorkspaceOrg } from '../engine/src/lib/instant';

const ORGS: WorkspaceOrg[] = [
  { id: 'org-tz', name: 'ThreatZero', people: ['James'] },
  { id: 'org-s4k', name: 'Stand 4 Kind', people: ['Maya'] },
  { id: 'org-tr', name: 'Target River', people: ['Colin'] },
];

const TRANSCRIPT = `Weekly sync, all three teams on the call.
James: On our side, ThreatZero will finalize the co-branded landing page copy by Friday.
Maya: Stand 4 Kind can pull together the district contact list — give us a week.
Colin: Target River will mock up two ad concepts by next Wednesday, and the media plan the week after.
James: I'll also get pricing one-pagers drafted for the bundled offering.
Maya: We need to confirm assembly dates with the pilot schools before month end.
Colin: Everyone should send raw logos and brand kits to the shared folder.`;

const MEETING_DATE = '2026-07-02'; // Thursday; expected: Friday=07-03, week=07-09, next Wed=07-08, week after=07-15, month end=07-31

async function run(effort?: 'low' | 'medium' | 'high') {
  const t0 = Date.now();
  const { extraction, usage } = await extractCommitments({
    transcript: TRANSCRIPT,
    meetingDate: MEETING_DATE,
    orgs: ORGS,
    effort,
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const orgName = (id: string) => ORGS.find((o) => o.id === id)?.name ?? 'BAD-ORG';
  console.log(`\n=== effort=${effort ?? 'default(high)'} — ${secs}s, out:${usage.output} tok, ${extraction.proposals.length} proposals ===`);
  for (const p of extraction.proposals) {
    console.log(`  [${orgName(p.ownerOrgId)}] ${p.title} ${p.dueDate ?? 'no-date'}`);
  }
}

(async () => {
  await run(undefined); // current behavior
  await run('medium');
  await run('low');
})();
