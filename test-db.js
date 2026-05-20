const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local file manually
const envPath = path.resolve(__dirname, '.env.local');
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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing credentials in .env.local!');
  process.exit(1);
}

console.log('Connecting to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  console.log('Querying table "raw_content"...');
  const { data, error, status, statusText } = await supabase
    .from('raw_content')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Supabase Query Error:');
    console.error('Status:', status, statusText);
    console.error(error);
  } else {
    console.log('Query Succeeded!');
    console.log('HTTP Status:', status, statusText);
    console.log('Records returned:', data.length);
    if (data.length > 0) {
      console.log('First Record keys:', Object.keys(data[0]));
      console.log('First Record data:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('Zero records returned. This usually means Row-Level Security (RLS) is active but lacks a SELECT policy for anon users.');
    }
  }
}

runTest();
