// Transcript → proposed commitments (the core "magic" of the ingest pipeline).
//
// Uses Claude structured outputs (messages.parse + zodOutputFormat) so the result
// is schema-guaranteed JSON — no hand parsing. The AI only PROPOSES; a human
// reviews/edits/confirms before anything is written to InstantDB.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
// NOTE: the SDK's zodOutputFormat requires zod v4 schemas — import from 'zod/v4'
// (bundled in zod 3.25+), not plain 'zod' (which exports the v3 API there).
import { z } from 'zod/v4';
import type { WorkspaceOrg } from './instant';

export const EXTRACTION_MODEL = 'claude-sonnet-5';

const ProposedCommitment = z.object({
  title: z
    .string()
    .describe('Short imperative action item, e.g. "Draft co-branded landing page copy"'),
  ownerOrgId: z
    .string()
    .describe(
      'id of the org that OWNS this commitment, chosen from the provided org list — the org whose person committed to do it',
    ),
  assigneeName: z
    .string()
    .nullable()
    .describe('First name of the person who committed to it, if a specific person did'),
  dueDate: z
    .string()
    .nullable()
    .describe(
      'Due date as YYYY-MM-DD, resolved against the meeting date (e.g. "by Friday" → that week\'s Friday). null if none was stated',
    ),
  sourceQuote: z
    .string()
    .describe('Short verbatim quote from the transcript that this commitment came from'),
  confidence: z
    .number()
    .describe('0 to 1 — how confident you are this is a real, owned commitment'),
});

const ExtractionResult = z.object({
  meetingTitle: z
    .string()
    .nullable()
    .describe('A short descriptive title for this meeting, or null if unclear'),
  proposals: z.array(ProposedCommitment).describe('Every distinct commitment in the transcript'),
});

export type Extraction = z.infer<typeof ExtractionResult>;

const SYSTEM_PROMPT = `You extract action items ("commitments") from partnership meeting notes.

The meeting is between SEPARATE partner companies. Each commitment is OWNED by exactly one
of those companies — the one whose person agreed to do the work. Your job:

- Extract every distinct, concrete commitment. Merge duplicates.
- Assign the owning org by WHO committed ("we'll draft the copy" said by a ThreatZero person
  → ThreatZero owns it). Use the org roster to map speakers to orgs.
- Shared tasks phrased as "everyone should X" become ONE commitment per org only when the work
  is clearly per-org; otherwise assign the org that will drive it.
- Resolve relative dates ("by Friday", "next Wednesday", "before month end") against the
  meeting date. If genuinely no timing was stated, use null — do not invent dates.
- Titles are short and imperative. sourceQuote is verbatim from the transcript.
- Do not extract discussion, opinions, or decisions that require no follow-up work.`;

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

/**
 * Extract proposed commitments from a raw transcript.
 * @param transcript raw meeting notes / transcript text
 * @param meetingDate ISO date (YYYY-MM-DD) the meeting happened — anchors relative dates
 * @param orgs the workspace's member orgs (id, name, people) for ownership mapping
 * @param effort thinking depth; extraction is structured work, lower = faster
 */
export async function extractCommitments(args: {
  transcript: string;
  meetingDate: string;
  orgs: WorkspaceOrg[];
  effort?: 'low' | 'medium' | 'high';
}): Promise<{ extraction: Extraction; usage: { input: number; output: number } }> {
  const orgRoster = args.orgs
    .map((o) => `- ${o.name} (id: ${o.id})${o.people.length ? ` — people: ${o.people.join(', ')}` : ''}`)
    .join('\n');

  const response = await anthropic.messages.parse({
    model: EXTRACTION_MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `<meeting_date>${args.meetingDate}</meeting_date>

<partner_orgs>
${orgRoster}
</partner_orgs>

<transcript>
${args.transcript}
</transcript>`,
      },
    ],
    output_config: {
      format: zodOutputFormat(ExtractionResult),
      ...(args.effort ? { effort: args.effort } : {}),
    },
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Extraction was refused by the model');
  }
  if (!response.parsed_output) {
    throw new Error(`Extraction produced no parseable output (stop_reason: ${response.stop_reason})`);
  }

  return {
    extraction: response.parsed_output,
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  };
}

export type ProposedCommitmentT = z.infer<typeof ProposedCommitment>;

/**
 * Streaming variant: emits each proposal the moment its JSON object completes
 * in the model's output, so the UI can show tasks appearing one by one.
 * Returns the full validated extraction when the stream ends.
 */
export async function extractCommitmentsStream(
  args: {
    transcript: string;
    meetingDate: string;
    orgs: WorkspaceOrg[];
    effort?: 'low' | 'medium' | 'high';
  },
  onProposal: (proposal: ProposedCommitmentT, index: number) => void | Promise<void>,
): Promise<{ extraction: Extraction; usage: { input: number; output: number } }> {
  const orgRoster = args.orgs
    .map((o) => `- ${o.name} (id: ${o.id})${o.people.length ? ` — people: ${o.people.join(', ')}` : ''}`)
    .join('\n');

  const { ProposalStreamParser } = await import('./json-stream');
  const parser = new ProposalStreamParser();
  let emitted = 0;

  const stream = anthropic.messages.stream({
    model: EXTRACTION_MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `<meeting_date>${args.meetingDate}</meeting_date>

<partner_orgs>
${orgRoster}
</partner_orgs>

<transcript>
${args.transcript}
</transcript>`,
      },
    ],
    output_config: {
      format: zodOutputFormat(ExtractionResult),
      ...(args.effort ? { effort: args.effort } : {}),
    },
  });

  stream.on('text', (delta) => {
    for (const objSrc of parser.feed(delta)) {
      try {
        const parsed = ProposedCommitment.parse(JSON.parse(objSrc));
        void onProposal(parsed, emitted++);
      } catch (e) {
        // Constrained decoding makes this near-impossible; skip rather than kill the stream.
        console.warn('skipping unparseable streamed proposal:', e);
      }
    }
  });

  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') throw new Error('Extraction was refused by the model');
  const text = final.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('Extraction produced no output');
  const extraction = ExtractionResult.parse(JSON.parse(text.text));
  return {
    extraction,
    usage: { input: final.usage.input_tokens, output: final.usage.output_tokens },
  };
}
