/**
 * Writes a summary of a Playwright JSON report to the GitHub Actions run page
 * (or to stdout when run locally): totals per project, known bugs, and any failures.
 *
 * Usage: node scripts/writeJobSummary.mts <results.json>
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { stripVTControlCharacters } from 'node:util';
import type { JSONReport, JSONReportSuite, JSONReportTest } from '@playwright/test/reporter';

const REPORT_URL = 'https://nishajuss.github.io/playwright-framework/';

interface Result {
  title: string;
  test: JSONReportTest;
}

const [resultsFile] = process.argv.slice(2);
if (!resultsFile) {
  throw new Error('Usage: node scripts/writeJobSummary.mts <results.json>');
}
const report = JSON.parse(readFileSync(resultsFile, 'utf8')) as JSONReport;

function collect (suite: JSONReportSuite, parents: string[] = []): Result[] {
  const path = suite.title && !suite.title.endsWith('.ts') ? [...parents, suite.title] : parents;
  const own = (suite.specs ?? []).flatMap((spec) =>
    spec.tests.map((test) => ({ title: [...path, spec.title].join(' › '), test })));
  return [...own, ...(suite.suites ?? []).flatMap((child) => collect(child, path))];
}

const results = report.suites.flatMap((suite) => collect(suite));
const projects = [...new Set(results.map(({ test }) => test.projectName))];
const count = (items: Result[], status: JSONReportTest['status']) => items.filter(({ test }) => test.status === status).length;

const failed = results.filter(({ test }) => test.status === 'unexpected');
const knownBugs = results.filter(({ test }) => test.expectedStatus === 'failed');
const passed = count(results, 'expected');
const flaky = count(results, 'flaky');
const skipped = count(results, 'skipped');
const minutes = (report.stats.duration / 60000).toFixed(1);

const headline = failed.length === 0
  ? `✅ **All ${passed + flaky} tests passed** in ${minutes} min`
  : `❌ **${failed.length} of ${results.length - skipped} tests failed** in ${minutes} min`;

const lines = [
  '## Playwright test results',
  '',
  headline,
  '',
  '| Project | Passed | Failed | Flaky | Skipped |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...projects.map((project) => {
    const inProject = results.filter(({ test }) => test.projectName === project);
    return `| ${project} | ${count(inProject, 'expected')} | ${count(inProject, 'unexpected')} | ${count(inProject, 'flaky')} | ${count(inProject, 'skipped')} |`;
  }),
  `| **Total** | **${passed}** | **${failed.length}** | **${flaky}** | **${skipped}** |`,
  '',
];

if (flaky > 0) {
  lines.push(`⚠️ ${flaky} flaky: failed at first, then passed on retry.`, '');
}

if (knownBugs.length > 0) {
  const titles = [...new Set(knownBugs.map(({ title }) => title))];
  lines.push(
    `🐞 **Known bugs:** ${titles.length} test${titles.length === 1 ? '' : 's'} document${titles.length === 1 ? 's' : ''} a confirmed bug in the shop and pass while the bug exists:`,
    ...titles.map((title) => `- ${title}`),
    '',
  );
}

if (failed.length > 0) {
  lines.push('### Failures', '');
  failed.forEach(({ title, test }) => {
    const error = test.results.at(-1)?.errors[0]?.message ?? 'No error message';
    // Strip terminal colour codes and keep the first line, so the summary stays readable.
    const firstLine = stripVTControlCharacters(error).split('\n')[0].trim();
    lines.push(`- **${test.projectName}** · ${title}  \n  \`${firstLine.replace(/`/g, "'")}\``);
  });
  lines.push('');
}

lines.push(`📊 Full HTML report: attached to this run as \`playwright-report\`, and published to [GitHub Pages](${REPORT_URL}) from \`main\`.`, '');

const summary = lines.join('\n');
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
} else {
  console.log(summary);
}
