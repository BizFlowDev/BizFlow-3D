const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, 'src', 'frameworks', 'database', 'repositories');
const files = fs.readdirSync(repoDir).filter(f => f.endsWith('.ts') && f.startsWith('Postgres'));

for (const file of files) {
  const filePath = path.join(repoDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already imported
  if (!content.includes('mapToCamelCase')) {
    // Add import
    content = content.replace(/(import .* from '\.\.\/connection\.js';)/, "$1\nimport { mapToCamelCase } from '../mapper.js';");
    
    // Replace fromPersistence(res.rows[0])
    content = content.replace(/\.fromPersistence\(res\.rows\[0\]\)/g, '.fromPersistence(mapToCamelCase(res.rows[0]))');
    
    // Replace fromPersistence(row)
    content = content.replace(/\.fromPersistence\(row\)/g, '.fromPersistence(mapToCamelCase(row))');

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`Skipped ${file}`);
  }
}
