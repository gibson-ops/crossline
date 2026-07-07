// The incremental proposal parser is the fiddly part of streaming extraction —
// exercise it with hostile chunking, braces/brackets inside strings, escapes.
import { describe, expect, it } from 'vitest';
import { ProposalStreamParser } from '../engine/src/lib/json-stream';

const DOC = JSON.stringify({
  meetingTitle: 'Weekly sync — Q3 {planning} [draft]',
  proposals: [
    { title: 'Send the "final" deck', ownerOrgId: 'a', dueDate: null },
    { title: 'Escape \\ and { brace } and ] bracket', ownerOrgId: 'b', dueDate: '2026-07-10' },
    { title: 'Plain third', ownerOrgId: 'c', dueDate: null },
  ],
});

function feedInChunks(chunkSize: number): string[] {
  const parser = new ProposalStreamParser();
  const out: string[] = [];
  for (let i = 0; i < DOC.length; i += chunkSize) {
    out.push(...parser.feed(DOC.slice(i, i + chunkSize)));
  }
  return out;
}

describe('ProposalStreamParser', () => {
  it('extracts all elements when fed one character at a time', () => {
    const objs = feedInChunks(1);
    expect(objs).toHaveLength(3);
    expect(JSON.parse(objs[0]).title).toBe('Send the "final" deck');
    expect(JSON.parse(objs[1]).title).toBe('Escape \\ and { brace } and ] bracket');
    expect(JSON.parse(objs[2]).title).toBe('Plain third');
  });

  it.each([3, 7, 64, 100_000])('is chunk-size independent (%i)', (size) => {
    const objs = feedInChunks(size);
    expect(objs).toHaveLength(3);
    objs.forEach((o) => expect(() => JSON.parse(o)).not.toThrow());
  });

  it('ignores braces in keys before the proposals array', () => {
    const parser = new ProposalStreamParser();
    const doc = '{"meetingTitle": "curly { and [ tricks", "proposals": [{"a":1}]}';
    const objs = parser.feed(doc);
    expect(objs).toHaveLength(1);
    expect(JSON.parse(objs[0])).toEqual({ a: 1 });
  });

  it('emits nothing for an empty proposals array', () => {
    const parser = new ProposalStreamParser();
    expect(parser.feed('{"meetingTitle": null, "proposals": []}')).toEqual([]);
  });

  it('handles nested objects inside a proposal', () => {
    const parser = new ProposalStreamParser();
    const objs = parser.feed('{"proposals": [{"meta": {"deep": {"x": "}"}}, "t": 1}]}');
    expect(objs).toHaveLength(1);
    expect(JSON.parse(objs[0]).meta.deep.x).toBe('}');
  });
});
