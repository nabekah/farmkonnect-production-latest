#!/usr/bin/env node

/**
 * Fix all db.query.raw() calls to use proper Drizzle ORM syntax
 * This script converts malformed raw queries to use sql`` template literals
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, 'server');

console.log('🔧 Fixing db.query.raw() Calls\n');
console.log('═══════════════════════════════════════════\n');

// Find all files with db.query.raw or db.raw
const files = execSync(`grep -r "db.query.raw\\|db.raw" ${serverDir} --include="*.ts" -l`, {
  encoding: 'utf8'
}).split('\n').filter(f => f);

console.log(`Found ${files.length} files with db.query.raw() calls\n`);

let totalFixed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Pattern 1: db.query.raw(`SELECT ... WHERE ...`, [params])
  // Convert to: db.execute(sql`SELECT ... WHERE ...`)
  content = content.replace(
    /db\.query\.raw\(\s*`([^`]+)`\s*,\s*\[(.*?)\]\s*\)/gs,
    (match, query, params) => {
      // Extract parameters
      const paramList = params.split(',').map(p => p.trim());
      
      // Replace ? with ${param}
      let fixedQuery = query;
      for (const param of paramList) {
        fixedQuery = fixedQuery.replace('?', `\${${param}}`);
      }
      
      return `db.execute(sql\`${fixedQuery}\`)`;
    }
  );
  
  // Pattern 2: db.raw(`SELECT ...`, [params])
  content = content.replace(
    /db\.raw\(\s*`([^`]+)`\s*,\s*\[(.*?)\]\s*\)/gs,
    (match, query, params) => {
      const paramList = params.split(',').map(p => p.trim());
      let fixedQuery = query;
      for (const param of paramList) {
        fixedQuery = fixedQuery.replace('?', `\${${param}}`);
      }
      return `db.execute(sql\`${fixedQuery}\`)`;
    }
  );
  
  if (content !== originalContent) {
    const fixCount = (originalContent.match(/db\.query\.raw|db\.raw/g) || []).length;
    totalFixed += fixCount;
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Fixed ${fixCount} instances in: ${path.relative(__dirname, file)}`);
  }
}

console.log(`\n═══════════════════════════════════════════`);
console.log(`\n✅ Total Fixed: ${totalFixed} instances`);
console.log('\n⚠️  IMPORTANT: Review changes and test thoroughly!');
console.log('\nNext steps:');
console.log('1. Review the changes in each file');
console.log('2. Import sql from drizzle-orm if not already imported');
console.log('3. Test the application locally');
console.log('4. Deploy to production');
console.log('\n═══════════════════════════════════════════\n');
