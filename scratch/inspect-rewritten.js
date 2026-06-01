const fs = require('fs');
const path = require('path');

// Parse .env.local file manually
const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function inspectSchema() {
  const schemaUrl = `${supabaseUrl}/rest/v1/`;
  try {
    const response = await fetch(schemaUrl, {
      headers: {
        'apikey': supabaseAnonKey
      }
    });
    const schema = await response.json();
    console.log('Response JSON:', schema);
  } catch (fetchErr) {
    console.error('Error fetching OpenAPI schema:', fetchErr);
  }
}

inspectSchema();
