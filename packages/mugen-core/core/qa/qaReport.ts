// ONE-CLICK QA REPORT.
//
// The point of this file is to replace a phone full of screenshots with
// one block of text that a person — or another AI — can read in a minute
// and know what this build is. So it is written for a reader, not for a
// parser: grouped, ordered worst-first where it matters, and explicit
// about the difference between "checked" and "not checked".

import { direct, type DirectorDecision } from '../experience/director';
import type { ExperienceEventDef } from '../experience/types';
import { runQaChecks } from './qaChecks';
import type { QaCheck, QaInput, QaStatus } from './types';

export interface QaReport {
  input: QaInput;
  checks: QaCheck[];
  counts: Record<QaStatus, number>;
  /** True when nothing is failing. WARN and NOT_TESTED do not block. */
  ok: boolean;
}

export function buildQaReport(input: QaInput): QaReport {
  const checks = runQaChecks(input);
  const counts: Record<QaStatus, number> = {
    PASS: 0,
    FAIL: 0,
    WARN: 0,
    NOT_TESTED: 0,
    MANUAL: 0,
  };
  for (const c of checks) counts[c.status] += 1;
  return { input, checks, counts, ok: counts.FAIL === 0 };
}

const STATUS_MARK: Record<QaStatus, string> = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  WARN: 'WARN',
  NOT_TESTED: 'NOT TESTED',
  MANUAL: 'MANUAL CHECK REQUIRED',
};

function countBy<T>(items: readonly T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
}

function line(label: string, value: string | number): string {
  return `- ${label}: ${value}`;
}

function checkLines(checks: QaCheck[]): string[] {
  return checks.map((c) => `- **${STATUS_MARK[c.status]}** \`${c.id}\` — ${c.detail}\n  - how: ${c.how}`);
}

/**
 * The report as Markdown — the thing the COPY button puts on the
 * clipboard, and the only artefact a reviewer should need for anything
 * that is not visual.
 */
export function renderQaReportMarkdown(report: QaReport): string {
  const { input, checks, counts } = report;
  const { build, world, registry, experience } = input;
  const out: string[] = [];

  out.push('# MUGEN ZERO QA REPORT');
  out.push('');
  out.push(line('Generated', input.generatedAt));
  out.push(line('Build', `${build.appVersion} / ${build.commit} / ${build.builtAt}`));
  out.push(line('Environment', build.environment));
  out.push(
    line(
      'Result',
      `${counts.FAIL === 0 ? 'no failed checks' : `${counts.FAIL} FAILED`} — ` +
        `${counts.PASS} pass, ${counts.WARN} warn, ${counts.NOT_TESTED} not tested, ${counts.MANUAL} manual`,
    ),
  );

  out.push('', '## CURRENT WORLD');
  out.push(line('World time', `${world.worldYear}年目 ${world.worldDay}日目 (day ${world.absoluteDay})`));
  out.push(line('Route', world.route));
  out.push(line('TIME SHIFTs', world.timeShifts));
  out.push(line('WORLD MEMORY facts', world.events.length));
  out.push(line('LIFE ARCHIVE', `${world.knownChapters} known / ${world.canonChapters} in canon`));
  out.push(
    line(
      'Future sites',
      world.futureSites.length === 0
        ? 'none'
        : world.futureSites
            .map((s) => `${s.id}:${s.onMap ? (s.discovered ? 'FOUND' : 'ON MAP') : 'not yet'}`)
            .join(', '),
    ),
  );

  out.push('', '## CONTENT');
  const byLayer = countBy(registry.eventDefs, (d) => d.layer);
  out.push(line('NOW events', byLayer.NOW ?? 0));
  out.push(line('NEXT events', byLayer.NEXT ?? 0));
  out.push(line('LIFE events (experience layer)', byLayer.LIFE ?? 0));
  const byLocation = countBy(registry.eventDefs, (d) => d.location);
  out.push(
    line(
      'Locations',
      registry.locations.map((l) => `${l} (${byLocation[l] ?? 0})`).join(', ') || 'none',
    ),
  );
  out.push(line('Narrative seeds', registry.seedDefs.length));
  out.push(
    line(
      'Rumours (events gated on a world fact)',
      registry.eventDefs.filter((d) =>
        (d.requirements ?? []).some(
          (r) => r.kind === 'MEMORY_PRESENT' || r.kind === 'ANY_MEMORY_PRESENT',
        ),
      ).length,
    ),
  );
  out.push(line('Events met in this world', experience.seenEventIds.length));

  out.push('', '## EXPERIENCE');
  out.push(
    line('Met', experience.seenEventIds.length === 0 ? 'nothing yet' : experience.seenEventIds.join(', ')),
  );
  out.push(
    line(
      'Most recent first',
      experience.recentEventIds.slice(0, 6).join(' -> ') || 'nothing yet',
    ),
  );

  out.push('', '## NARRATIVE SEEDS');
  for (const seed of registry.seeds) {
    out.push(
      `- [${seed.state}] \`${seed.def.seedId}\` ${seed.def.title} — from ${seed.def.sourceEventId}` +
        `${seed.def.resolvedByEventId ? `, answered by ${seed.def.resolvedByEventId}` : ', unanswered in this build'}`,
    );
  }

  const groups = [...new Set(checks.map((c) => c.group))];
  for (const group of groups) {
    out.push('', `## ${group}`);
    const inGroup = checks.filter((c) => c.group === group);
    // Anything that failed goes first — a reader skimming must not have
    // to find it among the passes.
    const order: QaStatus[] = ['FAIL', 'WARN', 'PASS', 'MANUAL', 'NOT_TESTED'];
    inGroup.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
    out.push(...checkLines(inGroup));
  }

  const failed = checks.filter((c) => c.status === 'FAIL');
  const warned = checks.filter((c) => c.status === 'WARN');
  out.push('', '## FAILED CHECKS');
  if (failed.length === 0) out.push('- none');
  else out.push(...checkLines(failed));
  out.push('', '## WARNINGS');
  if (warned.length === 0) out.push('- none');
  else out.push(...checkLines(warned));

  out.push('', '## VISUAL REVIEW REQUIRED');
  const changed = input.visualChanges.filter((v) => v.changed);
  if (changed.length === 0) {
    out.push('- [ ] No visual changes in this build');
  } else {
    for (const v of changed) out.push(`- [ ] ${v.screen} — ${v.reason}`);
  }
  const unchanged = input.visualChanges.filter((v) => !v.changed);
  if (unchanged.length > 0) {
    out.push(`- unchanged, no screenshot needed: ${unchanged.map((v) => v.screen).join(', ')}`);
  }

  out.push('');
  return out.join('\n');
}

/** The director's reasoning at one place, for the hub and the report. */
export function directorDecisionAt(
  defs: readonly ExperienceEventDef[],
  input: QaInput,
  location: string,
): DirectorDecision {
  return direct(defs, input.experienceView, { location });
}
