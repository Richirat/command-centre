#!/usr/bin/env node
/**
 * fetch-notion.js
 * --------------------------------------------------------------------------
 * Pulls all rows from the Master Tasks and Monthly Revenue Tracker
 * databases in Notion, transforms them into the format the dashboard expects,
 * and writes the result to ../public/data.json.
 *
 * Required env vars:
 *   NOTION_TOKEN    - Notion internal integration token (ntn_...)
 *
 * Optional env vars (defaults are Riccardo's database IDs):
 *   TASKS_DB_ID     - Master Tasks database ID
 *   REVENUE_DB_ID   - Monthly Revenue Tracker database ID
 *
 * Usage:
 *   NOTION_TOKEN=ntn_... node scripts/fetch-notion.js
 * --------------------------------------------------------------------------
 */

import { Client } from '@notionhq/client';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const TOKEN = process.env.NOTION_TOKEN;
const TASKS_DB_ID = process.env.TASKS_DB_ID || '83823c89bdca432fa824ed3bc5c7612d';
const REVENUE_DB_ID = process.env.REVENUE_DB_ID || '37315e4eaa5649ffb2fd7f6a8ad3d61f';

if (!TOKEN) {
  console.error('❌ Missing NOTION_TOKEN environment variable.');
  console.error('   Set it in your shell or as a GitHub Actions secret.');
  process.exit(1);
}

const notion = new Client({ auth: TOKEN });

// -----------------------------------------------------------------------------
// Notion property extractors
// -----------------------------------------------------------------------------

const prop = (page, name) => page.properties?.[name];
const getTitle    = (page, name) => prop(page, name)?.title?.[0]?.plain_text ?? '';
const getSelect   = (page, name) => prop(page, name)?.select?.name ?? null;
const getDate     = (page, name) => prop(page, name)?.date?.start ?? null;
const getNumber   = (page, name) => prop(page, name)?.number ?? null;
const getCheckbox = (page, name) => prop(page, name)?.checkbox ?? false;
const getRichText = (page, name) => prop(page, name)?.rich_text?.map(t => t.plain_text).join('') ?? '';

// -----------------------------------------------------------------------------
// Pagination helper (Notion returns max 100 results per page)
// -----------------------------------------------------------------------------

async function fetchAllPages(databaseId) {
  const pages = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// -----------------------------------------------------------------------------
// Transformers
// -----------------------------------------------------------------------------

function transformTask(page) {
  return {
    id:       page.id,
    url:      page.url,
    task:     getTitle(page, 'Task'),
    area:     getSelect(page, 'Area'),
    status:   getSelect(page, 'Status'),
    priority: getSelect(page, 'Priority'),
    dueDate:  getDate(page, 'Due Date'),
    week:     getSelect(page, 'Week'),
    timeEst:  getNumber(page, 'Time Est (hrs)'),
    notes:    getRichText(page, 'Notes'),
  };
}

function transformRevenue(page) {
  return {
    month:        getTitle(page, 'Month'),
    target:       getNumber(page, 'Target') ?? 0,
    total:        getNumber(page, 'Total Income') ?? 0,
    freelance:    getNumber(page, 'Freelance Income') ?? 0,
    stl:          getNumber(page, 'STL Income') ?? 0,
    pod:          getNumber(page, 'POD Income') ?? 0,
    other:        getNumber(page, 'Other Income') ?? 0,
    proposals:    getNumber(page, 'Proposals Sent') ?? 0,
    stlDesigns:   getNumber(page, 'New STL Designs') ?? 0,
    podListings:  getNumber(page, 'New POD Listings') ?? 0,
    hit:          getCheckbox(page, 'Target Hit'),
  };
}

// -----------------------------------------------------------------------------
// Sort tasks by due date (nulls last)
// -----------------------------------------------------------------------------

function sortTasks(a, b) {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return new Date(a.dueDate) - new Date(b.dueDate);
}

// -----------------------------------------------------------------------------
// iCalendar (.ics) feed generation
// -----------------------------------------------------------------------------
//
// Turns each task that has a Due Date into a VEVENT so the Master Tasks list can
// be subscribed to from Apple Calendar, Outlook, or any calendar app at
// https://<user>.github.io/command-centre/tasks.ics
//
// Design notes:
//   Only tasks with a Due Date are included, and tasks marked "✅ Done" are
//   skipped. A Due Date with a time becomes a timed event, while a date-only Due
//   Date becomes an all-day event. Timed events last "Time Est (hrs)" (default
//   1h), and Notion date ranges are honoured via the date "end". The VEVENT UID
//   comes from the Notion page id, so editing a task updates the same event
//   instead of creating a duplicate. The feed is built from the raw Notion pages,
//   so public/data.json stays unchanged, and the serialiser is hand-written (no
//   dependency) to keep the output RFC 5545 compliant: text escaping, CRLF line
//   endings, and 75-octet line folding.

const DONE_STATUS = '✅ Done';
const DEFAULT_EVENT_HOURS = 1;

// Escape a TEXT value per RFC 5545 section 3.3.11 (backslash must go first).
function icsEscapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Fold a content line to a max of 75 octets using CRLF + a leading space
// (RFC 5545 section 3.1), splitting on code-point boundaries so multi-byte
// characters (e.g. emoji) are never cut in half.
function foldLine(line) {
  const out = [];
  let current = '';
  let limit = 75; // first segment 75 octets, continuation segments 74 (+ space)
  for (const ch of Array.from(line)) {
    if (Buffer.byteLength(current + ch) > limit) {
      out.push(current);
      current = ch;
      limit = 74;
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.join('\r\n ');
}

const pad2 = (n) => String(n).padStart(2, '0');

// JS Date to "YYYYMMDDTHHMMSSZ" in UTC (used for timed events).
function toUtcStamp(date) {
  return (
    date.getUTCFullYear() +
    pad2(date.getUTCMonth() + 1) +
    pad2(date.getUTCDate()) +
    'T' +
    pad2(date.getUTCHours()) +
    pad2(date.getUTCMinutes()) +
    pad2(date.getUTCSeconds()) +
    'Z'
  );
}

// "YYYY-MM-DD..." to "YYYYMMDD" with no timezone shift (all-day value).
function toDateValue(dateOnly) {
  return dateOnly.slice(0, 10).replace(/-/g, '');
}

// Add whole days to a "YYYY-MM-DD" string and return "YYYYMMDD" (UTC-safe).
function addDaysDateValue(dateOnly, days) {
  const d = new Date(dateOnly.slice(0, 10) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return toUtcStamp(d).slice(0, 8);
}

// Build the VEVENT lines for one Notion task page, or null if it is not a
// calendar-worthy task (no Due Date, or already Done).
function buildEvent(page, dtstamp) {
  const date = page.properties?.['Due Date']?.date;
  const start = date?.start;
  if (!start) return null;

  const status = page.properties?.['Status']?.select?.name ?? null;
  if (status === DONE_STATUS) return null;

  const title = page.properties?.['Task']?.title?.[0]?.plain_text || '(untitled task)';
  const area = page.properties?.['Area']?.select?.name ?? null;
  const priority = page.properties?.['Priority']?.select?.name ?? null;
  const timeEst = page.properties?.['Time Est (hrs)']?.number ?? null;
  const notes = page.properties?.['Notes']?.rich_text?.map((t) => t.plain_text).join('') ?? '';
  const url = page.url || '';
  const end = date?.end ?? null;
  const isTimed = start.includes('T');

  const lines = ['BEGIN:VEVENT'];
  lines.push(`UID:${page.id}@command-centre`);
  lines.push(`DTSTAMP:${dtstamp}`);

  if (isTimed) {
    const startDate = new Date(start);
    let endDate;
    if (end && end.includes('T')) {
      endDate = new Date(end);
    } else {
      const hours = timeEst && timeEst > 0 ? timeEst : DEFAULT_EVENT_HOURS;
      endDate = new Date(startDate.getTime() + hours * 3600 * 1000);
    }
    lines.push(`DTSTART:${toUtcStamp(startDate)}`);
    lines.push(`DTEND:${toUtcStamp(endDate)}`);
  } else {
    // All-day: DTEND is exclusive, so it is the day AFTER the last covered day.
    lines.push(`DTSTART;VALUE=DATE:${toDateValue(start)}`);
    const endExclusive = end ? addDaysDateValue(end, 1) : addDaysDateValue(start, 1);
    lines.push(`DTEND;VALUE=DATE:${endExclusive}`);
  }

  lines.push(`SUMMARY:${icsEscapeText(title)}`);

  const descParts = [];
  if (area) descParts.push(`Area: ${area}`);
  if (priority) descParts.push(`Priority: ${priority}`);
  if (status) descParts.push(`Status: ${status}`);
  if (timeEst != null) descParts.push(`Estimate: ${timeEst} h`);
  if (notes) descParts.push(`Notes: ${notes}`);
  if (url) descParts.push(`Open in Notion: ${url}`);
  if (descParts.length) {
    lines.push(`DESCRIPTION:${icsEscapeText(descParts.join('\n'))}`);
  }
  if (url) lines.push(`URL:${icsEscapeText(url)}`);
  if (area) lines.push(`CATEGORIES:${icsEscapeText(area)}`);

  // Reminders baked into the feed, because a subscribed (read-only) calendar
  // cannot take manually added per-event alerts. All-day tasks fire at 09:00 the
  // day before (-PT15H from the midnight start) and 09:00 on the day (PT9H).
  // Timed tasks fall back to 1 day before and 15 minutes before the start.
  const alarmTriggers = isTimed ? ['-P1D', '-PT15M'] : ['-PT15H', 'PT9H'];
  for (const trigger of alarmTriggers) {
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${icsEscapeText(title)}`);
    lines.push(`TRIGGER:${trigger}`);
    lines.push('END:VALARM');
  }

  lines.push('END:VEVENT');
  return lines;
}

// Serialise all tasks into a single VCALENDAR string. Returns the .ics text and
// the number of events written.
function buildICS(taskPages) {
  const dtstamp = toUtcStamp(new Date());
  const head = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//command-centre//Master Tasks//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Master Tasks (Notion)',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  const body = [];
  let count = 0;
  for (const page of taskPages) {
    const ev = buildEvent(page, dtstamp);
    if (ev) {
      body.push(...ev);
      count += 1;
    }
  }
  const allLines = [...head, ...body, 'END:VCALENDAR'];
  const ics = allLines.map(foldLine).join('\r\n') + '\r\n';
  return { ics, count };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  console.log('📥 Fetching from Notion...');

  const [taskPages, revenuePages] = await Promise.all([
    fetchAllPages(TASKS_DB_ID),
    fetchAllPages(REVENUE_DB_ID),
  ]);

  const tasks = taskPages.map(transformTask).sort(sortTasks);
  const revenue = revenuePages.map(transformRevenue);

  const data = {
    syncedAt: new Date().toISOString(),
    tasks,
    revenue,
  };

  const outputPath = join(__dirname, '..', 'public', 'data.json');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(data, null, 2));

  // Also publish a calendar feed (tasks.ics) next to data.json. Vite copies
  // everything in public/ into dist/, so the feed is served at <site>/tasks.ics
  // for Apple Calendar and Outlook to subscribe to. Built from the raw pages so
  // data.json is untouched.
  const { ics, count: eventCount } = buildICS(taskPages);
  const icsPath = join(__dirname, '..', 'public', 'tasks.ics');
  await writeFile(icsPath, ics);

  console.log(`✅ Wrote ${outputPath}`);
  console.log(`✅ Wrote ${icsPath}`);
  console.log(`   ${tasks.length} tasks, ${revenue.length} revenue records, ${eventCount} calendar events`);
  console.log(`   Synced at ${data.syncedAt}`);
}

// Only run the sync when this file is executed directly (e.g. `npm run sync`),
// so the helpers above can be imported by tests without triggering a live fetch.
const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch(err => {
    console.error('❌ Sync failed:');
    console.error(err.message || err);
    if (err.code === 'object_not_found') {
      console.error('\n   Hint: make sure both databases are shared with the integration:');
      console.error('   1. Open each database in Notion');
      console.error('   2. Click ⋯ → Connections → Add your integration');
    }
    process.exit(1);
  });
}

export { buildICS, buildEvent };
