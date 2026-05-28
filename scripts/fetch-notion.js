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
import { fileURLToPath } from 'url';

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

  console.log(`✅ Wrote ${outputPath}`);
  console.log(`   ${tasks.length} tasks, ${revenue.length} revenue records`);
  console.log(`   Synced at ${data.syncedAt}`);
}

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
