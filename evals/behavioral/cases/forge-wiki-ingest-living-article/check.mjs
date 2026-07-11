import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Living-article contract (forge/references/wiki.md + forge-wiki SKILL.md):
// two ingests of the same evolving fact → ONE article, append-only Timeline,
// updated fact, logged sources, indexes updated, flat taxonomy held.
export default async function check({ workdir }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });

  const kb = join(workdir, 'wiki/knowledge');

  // collect every article file (topic level, excluding indexes/logs)
  const topics = existsSync(kb)
    ? readdirSync(kb).filter((d) => !d.startsWith('_') && d !== 'INDEX.md' && statSync(join(kb, d)).isDirectory())
    : [];
  const articles = topics.flatMap((t) =>
    readdirSync(join(kb, t))
      .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
      .map((f) => ({ topic: t, file: f, path: join(kb, t, f), body: readFileSync(join(kb, t, f), 'utf8') }))
  );

  // flat invariant: no directories inside a topic
  const nested = topics.flatMap((t) =>
    readdirSync(join(kb, t)).filter((f) => statSync(join(kb, t, f)).isDirectory())
  );
  add('flat taxonomy held (no nested subfolders)', nested.length === 0, nested.join(', ') || undefined);

  // exactly ONE article carries the offsite fact — the merge-not-duplicate core
  const offsite = articles.filter((a) => /offsite/i.test(a.body));
  add('exactly one article covers the offsite deadline (MERGE, no duplicate)', offsite.length === 1, `found ${offsite.length}: ${offsite.map((a) => `${a.topic}/${a.file}`).join(', ')}`);

  const art = offsite[0];
  if (art) {
    const fm = art.body.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    for (const key of ['title', 'compiled', 'last_evidence', 'sources', 'quality', 'tags']) {
      add(`frontmatter has ${key}`, new RegExp(`^${key}:`, 'm').test(fm));
    }
    add('has > **Summary:** line', /^>\s*\*\*Summary:\*\*/m.test(art.body));
    add('has Core Concept + Key Points + Timeline sections', /##\s*Core Concept/.test(art.body) && /##\s*Key Points/.test(art.body) && /##\s*Timeline/.test(art.body));
    add('has Related section', /##\s*Related/.test(art.body), undefined, false);

    const timeline = art.body.split(/##\s*Timeline/)[1] ?? '';
    add('Timeline: first entry is Compiled', /\*\*Compiled\*\*/.test(timeline));
    add('Timeline: second ingest appended a verb entry (Reinforced/Refined/Contradicted)', /\*\*(Reinforced|Refined|Contradicted)\*\*/.test(timeline));
    const entries = timeline.match(/^- \d{4}-\d{2}-\d{2}/gm) ?? [];
    add('Timeline: ≥ 2 dated entries (append-only, not overwritten)', entries.length >= 2, `found ${entries.length}`);

    add('the updated fact landed (September 26 present)', /sept(ember)?\s*26|09-26/i.test(art.body));
    add('both sources recorded (07-02 and 07-09 emails)', /2026-07-02/.test(art.body) && /2026-07-09/.test(art.body));
    add('placed in the existing business-context topic (anti-sprawl)', art.topic === 'business-context', `topic: ${art.topic}`, false);

    // indexes + log
    const tIndexPath = join(kb, art.topic, '_index.md');
    const tIndex = existsSync(tIndexPath) ? readFileSync(tIndexPath, 'utf8') : '';
    add('topic _index.md lists the article', tIndex.includes(art.file.replace(/\.md$/, '')));
    const log = existsSync(join(kb, '_compilation-log.md')) ? readFileSync(join(kb, '_compilation-log.md'), 'utf8') : '';
    add('compilation log records both ingests', /07-02/.test(log) && /07-09/.test(log));
  }

  const index = existsSync(join(workdir, 'wiki/index.md')) ? readFileSync(join(workdir, 'wiki/index.md'), 'utf8') : '';
  add('wiki/index.md still reaches [[knowledge/INDEX]]', index.includes('[[knowledge/INDEX]]'));

  // the pre-existing article must be untouched (no collateral rewrites)
  const prior = existsSync(join(kb, 'business-context/personal-tool-first.md'))
    ? readFileSync(join(kb, 'business-context/personal-tool-first.md'), 'utf8') : '';
  add('pre-existing article not overwritten', /Compiled\*\* from conversation\. Initial framing\./.test(prior));

  return checks;
}
