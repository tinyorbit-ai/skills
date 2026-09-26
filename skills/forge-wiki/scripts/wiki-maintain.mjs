#!/usr/bin/env node
// Mechanical upkeep for a forge wiki: regenerates every index and runs the checks that
// need no judgment, then writes wiki/knowledge/_health-report.md. The model handles the
// rest (writing Summary lines, duplicates, topic splits, contradicting learnings).
//
//   node wiki-maintain.mjs [--wiki <dir>] [--fix] [--json] [--date YYYY-MM-DD]
//
// Without --fix it only reports. --fix regenerates indexes and adds missing Timelines.
// It never deletes, moves, merges or splits anything.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename, dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

export function maintain({ wikiDir, fix = false, today = new Date().toISOString().slice(0, 10) }) {
  const wiki = resolve(wikiDir);
  const repoRoot = dirname(wiki);
  const kb = join(wiki, 'knowledge');
  const issues = {
    orphans: [], brokenIndex: [], missingSummary: [], missingFrontmatter: [], brokenLinks: [],
    stubs: [], genericSummary: [], missingTimeline: [], staleEvidence: [], bloatedTimeline: [],
    brokenTimelineSources: [], flatViolations: [], staleLearnings: [], learningsNoConfidence: [],
  };
  const fixed = [];

  const mdFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : []);
  const subdirs = (dir) =>
    existsSync(dir)
      ? readdirSync(dir).filter((d) => !d.startsWith('.') && !d.startsWith('_') && statSync(join(dir, d)).isDirectory()).sort()
      : [];
  const walk = (dir) =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      if (f.startsWith('.')) return [];
      return statSync(p).isDirectory() ? walk(p) : f.endsWith('.md') ? [p] : [];
    });

  const allMd = existsSync(wiki) ? walk(wiki) : [];
  const targets = new Set();
  for (const p of allMd) {
    const rel = relative(wiki, p).replace(/\.md$/, '');
    targets.add(rel);
    targets.add(basename(rel));
    if (rel.startsWith('knowledge/')) targets.add(rel.slice('knowledge/'.length));
  }

  const frontmatter = (raw) => {
    const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
    const fm = {};
    if (!m) return { fm, body: raw, has: false };
    let key = null;
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (kv) { key = kv[1]; fm[key] = kv[2].trim(); continue; }
      const item = line.match(/^\s*-\s*(.+)$/);
      if (item && key) fm[key] = fm[key] ? fm[key] : item[1].trim();
    }
    return { fm, body: raw.slice(m[0].length), has: true };
  };
  const summaryOf = (raw) => raw.match(/^>\s*\*\*Summary:\*\*\s*(.+)$/m)?.[1].trim() ?? null;
  const timelineEntries = (raw) => {
    const m = raw.match(/^##\s*Timeline\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/m);
    return m ? m[1].split('\n').filter((l) => /^\s*-\s/.test(l)) : null;
  };
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

  const topics = subdirs(kb).map((t) => {
    const dir = join(kb, t);
    for (const nested of subdirs(dir)) {
      for (const f of walk(join(dir, nested))) issues.flatViolations.push(relative(wiki, f));
    }
    const articles = mdFiles(dir)
      .filter((f) => !f.startsWith('_'))
      .map((f) => {
        const path = join(dir, f);
        const raw = readFileSync(path, 'utf8');
        return { slug: f.replace(/\.md$/, ''), path, rel: relative(wiki, path), raw };
      });
    return { name: t, dir, articles };
  });

  for (const topic of topics) {
    const indexPath = join(topic.dir, '_index.md');
    const indexRaw = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
    const listed = new Set([...indexRaw.matchAll(/\[\[([^\]|#]+)/g)].map((m) => basename(m[1].trim())));
    const present = new Set(topic.articles.map((a) => a.slug));
    for (const a of topic.articles) if (!listed.has(a.slug)) issues.orphans.push(a.rel);
    for (const slug of listed) if (!present.has(slug)) issues.brokenIndex.push(`${topic.name}/_index.md lists [[${slug}]] but the file is gone`);
    const count = indexRaw.match(/Articles:\s*(\d+)/)?.[1];
    if (indexRaw && count && Number(count) !== present.size) {
      issues.brokenIndex.push(`${topic.name}/_index.md says ${count} articles, disk has ${present.size}`);
    }

    for (const a of topic.articles) {
      const { fm, body } = frontmatter(a.raw);
      const summary = summaryOf(a.raw);
      if (!summary) issues.missingSummary.push(a.rel);
      else if (/^(overview of|root index for)/i.test(summary)) issues.genericSummary.push(`${a.rel}: "${summary}"`);
      const missingKeys = ['title', 'compiled', 'sources', 'quality', 'tags'].filter((k) => !(k in fm));
      if (missingKeys.length) issues.missingFrontmatter.push(`${a.rel}: ${missingKeys.join(', ')}`);

      const tl = timelineEntries(a.raw);
      const contentLines = body
        .replace(/^##\s*Timeline[\s\S]*?(?=^##\s|(?![\s\S]))/m, '')
        .split('\n')
        .filter((l) => l.trim() && !l.startsWith('#')).length;
      if (contentLines < 12) issues.stubs.push(`${a.rel} (${contentLines} lines)`);

      if (!tl) {
        issues.missingTimeline.push(a.rel);
        if (fix) {
          const date = fm.compiled || today;
          const source = fm.sources ? fm.sources.replace(/^\[|\]$/g, '').split(',')[0].trim() : 'conversation';
          a.raw = `${a.raw.replace(/\s*$/, '')}\n\n## Timeline\n\n- ${date} — **Compiled** from \`${source}\`. Initial framing.\n`;
          writeFileSync(a.path, a.raw);
          fixed.push(`added Timeline to ${a.rel}`);
        }
      } else {
        if (tl.length > 20) issues.bloatedTimeline.push(`${a.rel} (${tl.length} entries)`);
        for (const line of tl) {
          for (const m of line.matchAll(/`([^`\s]+)`/g)) {
            const src = m[1];
            if (/^https?:/.test(src) || src === 'conversation' || !/[/.]/.test(src)) continue;
            if (!existsSync(join(repoRoot, src)) && !existsSync(join(wiki, src))) {
              issues.brokenTimelineSources.push(`${a.rel}: \`${src}\``);
            }
          }
        }
      }

      const evidence = fm.last_evidence || fm.compiled;
      if (evidence && /^\d{4}-\d{2}-\d{2}/.test(evidence) && daysBetween(evidence.slice(0, 10), today) > 180) {
        issues.staleEvidence.push(`${a.rel} (last evidence ${evidence.slice(0, 10)})`);
      }
    }
  }

  for (const p of allMd.filter((f) => relative(wiki, f).startsWith('knowledge/') && !basename(f).startsWith('_') && basename(f) !== 'INDEX.md')) {
    const raw = readFileSync(p, 'utf8');
    for (const m of raw.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
      const t = m[1].trim().replace(/\.md$/, '');
      if (!targets.has(t)) issues.brokenLinks.push(`${relative(wiki, p)}: [[${t}]]`);
    }
  }

  const learningsPath = join(wiki, 'learnings.md');
  if (existsSync(learningsPath)) {
    for (const line of readFileSync(learningsPath, 'utf8').split('\n')) {
      if (!/^\s*-\s/.test(line) || /^\s*-\s*~~/.test(line)) continue;
      for (const m of line.matchAll(/`([^`\s]+\/[^`\s]+)`/g)) {
        if (!existsSync(join(repoRoot, m[1]))) issues.staleLearnings.push(`STALE: references deleted ${m[1]}: ${line.trim().slice(0, 100)}`);
      }
      if (!/confidence\s*\d+\s*\/\s*10/i.test(line)) issues.learningsNoConfidence.push(line.trim().slice(0, 100));
    }
  }

  if (fix) {
    const title = (t) => t.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const line = (a) => `- [[${a.slug}]] — ${summaryOf(a.raw) ?? '(no summary yet)'}`;
    for (const topic of topics) {
      const out = [`# ${title(topic.name)} | Articles: ${topic.articles.length}`, `Last updated: ${today}`, '', ...topic.articles.map(line), ''];
      writeFileSync(join(topic.dir, '_index.md'), out.join('\n'));
    }
    const top = topics.flatMap((t) => [`### ${title(t.name)}`, ...t.articles.slice(0, 5).map(line), '']);
    const index = [
      '# Knowledge base', `Last updated: ${today}`, '',
      '| Topic | Articles | Index |', '|---|---|---|',
      ...topics.map((t) => `| ${title(t.name)} | ${t.articles.length} | [[${t.name}/_index]] |`),
      '', '## Top articles', '', ...top,
    ];
    if (existsSync(kb)) writeFileSync(join(kb, 'INDEX.md'), index.join('\n'));
    fixed.push(`regenerated ${topics.length} topic indexes and knowledge/INDEX.md`);

    const mocPath = join(wiki, 'index.md');
    let moc = existsSync(mocPath) ? readFileSync(mocPath, 'utf8') : '# Wiki\n';
    const record = allMd
      .map((p) => relative(wiki, p).replace(/\.md$/, ''))
      .filter((r) => !r.startsWith('knowledge/') && r !== 'index')
      .sort();
    const missing = record.filter((r) => !moc.includes(`[[${r}]]`) && !moc.includes(`[[${basename(r)}]]`));
    if (!moc.includes('[[knowledge/INDEX]]')) missing.push('knowledge/INDEX');
    if (missing.length) {
      moc = `${moc.replace(/\s*$/, '')}\n\n## Added by wiki upkeep\n\n${missing.map((r) => `- [[${r}]]`).join('\n')}\n`;
      writeFileSync(mocPath, moc);
      fixed.push(`linked ${missing.length} unlinked pages from index.md`);
    }
  }

  const articleCount = topics.reduce((n, t) => n + t.articles.length, 0);
  const issueCount = Object.values(issues).reduce((n, v) => n + v.length, 0);
  const section = (h, list) => [`### ${h}`, ...(list.length ? list.map((x) => `- ${x}`) : ['- none']), ''];
  const report = [
    '# Wiki Health Report', `Generated: ${today} by forge-wiki/scripts/wiki-maintain.mjs${fix ? ' --fix' : ''}`, '',
    '## Summary', `- Topics: ${topics.length} · Articles: ${articleCount} · Issues: ${issueCount} · Auto-fixed: ${fixed.length}`,
    ...fixed.map((f) => `- fixed: ${f}`), '',
    '## Issues',
    ...section('Orphaned articles', issues.orphans),
    ...section('Broken index references', issues.brokenIndex),
    ...section('Missing summaries (model writes these)', issues.missingSummary),
    ...section('Generic summaries (model rewrites these)', issues.genericSummary),
    ...section('Missing frontmatter', issues.missingFrontmatter),
    ...section('Broken cross-references', issues.brokenLinks),
    ...section('Stubs', issues.stubs),
    ...section('Stale evidence', issues.staleEvidence),
    ...section('Timeline health (missing / bloated / broken sources)', [
      ...issues.missingTimeline.map((x) => `missing: ${x}`),
      ...issues.bloatedTimeline.map((x) => `bloated: ${x}`),
      ...issues.brokenTimelineSources.map((x) => `broken source: ${x}`),
    ]),
    ...section('Taxonomy (flat-invariant violations: nested folders)', issues.flatViolations),
    ...section('Learnings hygiene (stale refs / missing confidence)', [
      ...issues.staleLearnings,
      ...issues.learningsNoConfidence.map((x) => `no confidence N/10: ${x}`),
    ]),
    '## Left for judgment',
    '- Duplicate coverage, topic split candidates, near-duplicate topic names and contradicting learnings are not checked by the script.',
    '',
  ].join('\n');
  if (existsSync(kb)) writeFileSync(join(kb, '_health-report.md'), report);
  return { topics: topics.length, articles: articleCount, issues, fixed, report };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const wikiDir = opt('--wiki', 'wiki');
  if (!existsSync(wikiDir)) {
    console.error(`No wiki at ${wikiDir}. Nothing to maintain.`);
    process.exit(2);
  }
  const result = maintain({ wikiDir, fix: flag('--fix'), today: opt('--date', undefined) });
  if (flag('--json')) {
    const counts = Object.fromEntries(Object.entries(result.issues).map(([k, v]) => [k, v.length]));
    console.log(JSON.stringify({ topics: result.topics, articles: result.articles, issues: counts, fixed: result.fixed }));
  } else {
    console.log(result.report);
  }
}
