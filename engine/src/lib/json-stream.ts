/**
 * Incremental extractor for elements of the `"proposals": [...]` array inside
 * a streaming JSON document. String- and escape-aware balanced-brace scanning;
 * feed() returns the JSON source of each element that COMPLETED in this chunk.
 */
export class ProposalStreamParser {
  private buf = '';
  private pos = 0;
  private inArray = false;
  private arrayDone = false;
  private depth = 0;
  private inString = false;
  private escaped = false;
  private objStart = -1;

  feed(delta: string): string[] {
    this.buf += delta;
    const out: string[] = [];
    if (this.arrayDone) return out;

    if (!this.inArray) {
      const key = this.buf.indexOf('"proposals"');
      if (key === -1) return out;
      const bracket = this.buf.indexOf('[', key);
      if (bracket === -1) return out;
      this.inArray = true;
      this.pos = bracket + 1;
    }

    for (; this.pos < this.buf.length; this.pos++) {
      const ch = this.buf[this.pos];
      if (this.inString) {
        if (this.escaped) this.escaped = false;
        else if (ch === '\\') this.escaped = true;
        else if (ch === '"') this.inString = false;
        continue;
      }
      if (ch === '"') {
        this.inString = true;
      } else if (ch === '{') {
        if (this.depth === 0) this.objStart = this.pos;
        this.depth++;
      } else if (ch === '}') {
        this.depth--;
        if (this.depth === 0 && this.objStart >= 0) {
          out.push(this.buf.slice(this.objStart, this.pos + 1));
          this.objStart = -1;
        }
      } else if (ch === ']' && this.depth === 0) {
        this.arrayDone = true;
        this.pos++;
        break;
      }
    }
    return out;
  }
}
