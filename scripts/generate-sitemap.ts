#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://topo.nz'; // Update this to your actual domain
const MAX_URLS_PER_SITEMAP = 50000;

interface Mountain {
  name: string;
  latlng?: [number, number];
  altitude: string;
  link: string;
}

interface Hut {
  assetId: number;
  name: string;
  lat: number;
  lon: number;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateUrl(
  loc: string,
  lastmod?: string,
  changefreq: string = 'monthly',
  priority: string = '0.5'
): string {
  let url = `  <url>\n    <loc>${escapeXml(loc)}</loc>\n`;
  if (lastmod) {
    url += `    <lastmod>${lastmod}</lastmod>\n`;
  }
  url += `    <changefreq>${changefreq}</changefreq>\n`;
  url += `    <priority>${priority}</priority>\n`;
  url += `  </url>\n`;
  return url;
}

async function getMountains(): Promise<string[]> {
  console.log('Fetching mountains...');
  const response = await fetch(
    'https://raw.githubusercontent.com/fallaciousreasoning/nz-mountains/main/mountains.json'
  );
  const mountains: Record<string, Mountain> = await response.json();

  const urls: string[] = [];
  for (const [id, mountain] of Object.entries(mountains)) {
    if (!mountain.latlng) continue;

    const [lat, lng] = mountain.latlng;
    const name = `${mountain.name} (${mountain.altitude})`;
    const encodedName = encodeURIComponent(name);

    const url = `${SITE_URL}/?page=location/${lat}/${lng}/${encodedName}&lat=${lat}&lon=${lng}`;
    urls.push(url);
  }

  console.log(`  Found ${urls.length} mountains`);
  return urls;
}

async function getHuts(): Promise<string[]> {
  console.log('Fetching huts...');
  const hutsPath = path.join(process.cwd(), 'public', 'data', 'huts.json');
  const hutsData = fs.readFileSync(hutsPath, 'utf-8');
  const huts: Hut[] = JSON.parse(hutsData);

  const urls: string[] = [];
  for (const hut of huts) {
    if (!hut.lat || !hut.lon) continue;

    const { lat, lon, name } = hut;
    const encodedName = encodeURIComponent(name);

    const url = `${SITE_URL}/?page=location/${lat}/${lon}/${encodedName}&lat=${lat}&lon=${lon}`;
    urls.push(url);
  }

  console.log(`  Found ${urls.length} huts`);
  return urls;
}

function writeSitemap(urls: string[], filename: string = 'public/sitemap.xml'): void {
  console.log(`\nWriting sitemap with ${urls.length} URLs...`);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  // Add homepage
  lines.push(generateUrl(SITE_URL, undefined, 'daily', '1.0'));

  // Add all location URLs
  const lastmod = new Date().toISOString().split('T')[0];
  for (const url of urls) {
    lines.push(generateUrl(url, lastmod, 'monthly', '0.6'));
  }

  lines.push('</urlset>');

  fs.writeFileSync(filename, lines.join('\n'), 'utf-8');
  console.log(`Sitemap written to ${filename}`);
}

function writeSitemapIndex(sitemapFiles: string[], filename: string = 'public/sitemap_index.xml'): void {
  console.log(`\nWriting sitemap index for ${sitemapFiles.length} sitemaps...`);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  const lastmod = new Date().toISOString();
  for (const sitemapFile of sitemapFiles) {
    lines.push('  <sitemap>');
    lines.push(`    <loc>${SITE_URL}/${sitemapFile}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('  </sitemap>');
  }

  lines.push('</sitemapindex>');

  fs.writeFileSync(filename, lines.join('\n'), 'utf-8');
  console.log(`Sitemap index written to ${filename}`);
}

async function main() {
  console.log('Generating sitemap...\n');

  // Collect URLs separately to set different priorities
  const mountainUrls = await getMountains();
  const hutUrls = await getHuts();

  console.log(`\nTotal URLs: ${mountainUrls.length + hutUrls.length}`);

  // Generate sitemap with different priorities
  console.log(`\nWriting sitemap with ${mountainUrls.length + hutUrls.length} URLs...`);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  // Add homepage
  lines.push(generateUrl(SITE_URL, undefined, 'daily', '1.0'));

  const lastmod = new Date().toISOString().split('T')[0];

  // Add mountains with high priority
  for (const url of mountainUrls) {
    lines.push(generateUrl(url, lastmod, 'monthly', '0.8'));
  }

  // Add huts with medium priority
  for (const url of hutUrls) {
    lines.push(generateUrl(url, lastmod, 'monthly', '0.6'));
  }

  lines.push('</urlset>');

  fs.writeFileSync('public/sitemap.xml', lines.join('\n'), 'utf-8');
  console.log('Sitemap written to public/sitemap.xml');

  console.log('\nDone! Don\'t forget to:');
  console.log('1. Update SITE_URL in the script to your actual domain');
  console.log('2. Add sitemap URL to your robots.txt');
  console.log('3. Submit sitemap to Google Search Console');
}

main().catch((error) => {
  console.error('Error generating sitemap:', error);
  process.exit(1);
});
