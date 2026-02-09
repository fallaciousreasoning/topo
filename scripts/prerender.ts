#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://topos.nz';
const OUTPUT_DIR = 'dist';

interface Mountain {
  name: string;
  latlng?: [number, number];
  altitude: string;
  link: string;
  description?: string;
}

interface Hut {
  assetId: number;
  name: string;
  lat: number;
  lon: number;
  introduction?: string;
  hutCategory?: string;
  place?: string;
}

interface PageMeta {
  title: string;
  description: string;
  url: string;
  type: 'mountain' | 'hut';
}

function generateHTML(meta: PageMeta, indexHTML: string): string {
  // Start with the base index.html and inject meta tags
  let html = indexHTML;

  // Replace title
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${escapeHtml(meta.title)} - NZ Topo</title>`
  );

  // Find the closing </head> tag and insert meta tags before it
  const headCloseIndex = html.indexOf('</head>');
  if (headCloseIndex === -1) {
    throw new Error('Could not find </head> tag in index.html');
  }

  const metaTags = `
  <!-- Pre-rendered meta tags -->
  <meta name="description" content="${escapeHtml(meta.description)}">
  <meta property="og:title" content="${escapeHtml(meta.title)} - NZ Topo">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${escapeHtml(meta.url)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(meta.title)} - NZ Topo">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  <link rel="canonical" href="${escapeHtml(meta.url)}">
`;

  html = html.slice(0, headCloseIndex) + metaTags + html.slice(headCloseIndex);

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function getMountains(): Promise<PageMeta[]> {
  console.log('Fetching mountains...');
  const response = await fetch(
    'https://raw.githubusercontent.com/fallaciousreasoning/nz-mountains/main/mountains.json'
  );
  const mountains: Record<string, Mountain> = await response.json();

  const pages: PageMeta[] = [];
  for (const [id, mountain] of Object.entries(mountains)) {
    if (!mountain.latlng) continue;

    const [lat, lng] = mountain.latlng;
    const name = `${mountain.name} (${mountain.altitude})`;
    const encodedName = encodeURIComponent(name);

    const description = mountain.description
      ? mountain.description.substring(0, 160)
      : `Climbing and route information for ${mountain.name}, ${mountain.altitude} in New Zealand.`;

    pages.push({
      title: name,
      description,
      url: `${SITE_URL}/?page=location/${lat}/${lng}/${encodedName}&lat=${lat}&lon=${lng}`,
      type: 'mountain',
    });
  }

  console.log(`  Found ${pages.length} mountains`);
  return pages;
}

async function getHuts(): Promise<PageMeta[]> {
  console.log('Fetching huts...');
  const hutsPath = path.join(process.cwd(), 'public', 'data', 'huts.json');
  const hutsData = fs.readFileSync(hutsPath, 'utf-8');
  const huts: Hut[] = JSON.parse(hutsData);

  const pages: PageMeta[] = [];
  for (const hut of huts) {
    if (!hut.lat || !hut.lon) continue;

    const { lat, lon, name } = hut;
    const encodedName = encodeURIComponent(name);

    let description = hut.introduction
      ? hut.introduction.substring(0, 160)
      : `${hut.hutCategory || 'DOC'} hut in ${hut.place || 'New Zealand'}`;

    if (hut.introduction && hut.introduction.length > 160) {
      description += '...';
    }

    pages.push({
      title: name,
      description,
      url: `${SITE_URL}/?page=location/${lat}/${lon}/${encodedName}&lat=${lat}&lon=${lon}`,
      type: 'hut',
    });
  }

  console.log(`  Found ${pages.length} huts`);
  return pages;
}

async function main() {
  console.log('Pre-rendering pages...\n');

  // Read the base index.html
  const indexPath = path.join(OUTPUT_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`Error: ${indexPath} not found. Run 'npm run build' first.`);
    process.exit(1);
  }

  const indexHTML = fs.readFileSync(indexPath, 'utf-8');

  // Collect all pages
  const mountainPages = await getMountains();
  const hutPages = await getHuts();
  const allPages = [...mountainPages, ...hutPages];

  console.log(`\nTotal pages to pre-render: ${allPages.length}`);
  console.log('Generating HTML files...\n');

  let generated = 0;
  const startTime = Date.now();

  for (const page of allPages) {
    const html = generateHTML(page, indexHTML);

    // Create directory structure based on URL
    // e.g., ?page=location/-43.59/170.14/Name -> location/-43.59/170.14/Name/index.html
    const urlParams = new URLSearchParams(page.url.split('?')[1]);
    const pagePath = urlParams.get('page');

    if (!pagePath) continue;

    const outputPath = path.join(OUTPUT_DIR, pagePath, 'index.html');
    const outputDir = path.dirname(outputPath);

    // Create directories
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write HTML file
    fs.writeFileSync(outputPath, html, 'utf-8');

    generated++;
    if (generated % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (generated / (Date.now() - startTime) * 1000).toFixed(1);
      console.log(`  Generated ${generated}/${allPages.length} pages (${rate} pages/sec, ${elapsed}s elapsed)`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const avgRate = (generated / (Date.now() - startTime) * 1000).toFixed(1);

  console.log(`\nPre-rendering complete!`);
  console.log(`  Pages generated: ${generated}`);
  console.log(`  Total time: ${totalTime}s`);
  console.log(`  Average rate: ${avgRate} pages/sec`);
}

main().catch((error) => {
  console.error('Error during pre-rendering:', error);
  process.exit(1);
});
