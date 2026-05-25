const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  console.log('Fetching raw_content column information from database...');
  // We can query the catalog or run a query that describes the structure
  const { data, error } = await supabase.rpc('get_table_columns_info'); // if exists, but probably not.
  
  // Let's run a query to select a row to inspect its types, or execute a query
  // Let's query pg_attribute or information_schema via Supabase query if possible,
  // but Supabase JS doesn't easily run arbitrary SQL unless we have a RPC.
  // Wait! Let's do a simple SELECT to check types of a single row.
  const { data: rows, error: selectError } = await supabase
    .from('raw_content')
    .select('*')
    .limit(1);

  if (selectError) {
    console.error('Select error:', selectError);
    return;
  }

  console.log('Row sample:', rows[0]);
  
  // Let's also check if we can query information_schema via supabase.rpc or similar,
  // but since we might not have a postgres function, we can check by trying to insert/update.
  // Let's see if we can do a query using postgres information_schema.
  // Wait, let's write a script that tries to execute SQL by using postgres if we can,
  // but we only have supabaseUrl and supabaseAnonKey.
  // Can we use supabase client to run a direct SQL query? No, unless there is a function.
  // We can check what functions are available or we can run the test-db query.
  // Let's list keys and types of the first row:
  if (rows.length > 0) {
    for (const key of Object.keys(rows[0])) {
      console.log(`Column: ${key} | Type of value: ${typeof rows[0][key]} | Value:`, rows[0][key]);
    }
  }
}

checkColumns();
