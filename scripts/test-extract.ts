// End-to-end test of the extraction pipeline against REAL services:
// reads the seeded meeting + orgs from InstantDB, runs Claude extraction,
// and sanity-checks the proposals. Run:
//   infisical-agent run --env=dev -- npx tsx scripts/test-extract.ts
import { db, getWorkspaceOrgs } from '../engine/src/lib/instant';
import { extractCommitments } from '../engine/src/lib/extract';

const WORKSPACE_ID = 'a0000000-0000-4000-8000-000000000001';

async function main() {
  // Pull the seeded meeting + org context from InstantDB (peer-actor reads).
  const res = await db.query({
    meetings: { $: { where: { workspaceId: WORKSPACE_ID } } },
  });
  const meeting = res.meetings[0];
  if (!meeting) throw new Error('no seeded meeting found — run scripts/seed.ts first');

  const orgs = await getWorkspaceOrgs(WORKSPACE_ID);
  console.log(`orgs: ${orgs.map((o) => `${o.name}(${o.people.join('/')})`).join(', ')}`);

  const meetingDate = new Date(meeting.meetingDate).toISOString().slice(0, 10);
  console.log(`meeting date: ${meetingDate}; transcript ${meeting.rawTranscript.length} chars`);
  console.log('extracting…');

  const t0 = Date.now();
  const { extraction, usage } = await extractCommitments({
    transcript: meeting.rawTranscript,
    meetingDate,
    orgs,
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n✓ "${extraction.meetingTitle}" — ${extraction.proposals.length} proposals in ${secs}s (in:${usage.input} out:${usage.output} tokens)\n`);
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? `UNKNOWN(${id})`;
  for (const p of extraction.proposals) {
    console.log(
      `  [${orgName(p.ownerOrgId)}] ${p.title}` +
        (p.assigneeName ? ` — ${p.assigneeName}` : '') +
        (p.dueDate ? ` (due ${p.dueDate})` : ' (no due date)') +
        `  conf=${p.confidence}`,
    );
  }

  // sanity checks
  const badOrg = extraction.proposals.filter((p) => !orgs.some((o) => o.id === p.ownerOrgId));
  if (badOrg.length) throw new Error(`${badOrg.length} proposals assigned to unknown org ids`);
  if (extraction.proposals.length < 5) throw new Error('expected at least 5 commitments from the sample transcript');
  console.log('\n✓ sanity checks passed (all owner org ids valid, count plausible)');
}

main().catch((e) => {
  console.error('test-extract failed:', e);
  process.exit(1);
});
