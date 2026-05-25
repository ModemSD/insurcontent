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

async function testOperations() {
  console.log('Testing SELECT...');
  const { data, error } = await supabase
    .from('raw_content')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Select failed:', error);
    return;
  }
  console.log('Select succeeded. Row ID:', data[0]?.id);
  const targetId = data[0]?.id;
  if (!targetId) {
    console.log('No rows found to update.');
    return;
  }

  console.log(`Testing UPDATE on row ${targetId}...`);
  // Try to update title of that row to its same title (no-op but tests write permission)
  const { data: updateData, error: updateError } = await supabase
    .from('raw_content')
    .update({ title: data[0].title })
    .eq('id', targetId)
    .select();

  if (updateError) {
    console.error('Update failed:', updateError.message);
  } else {
    console.log('Update succeeded:', updateData);
  }

  console.log(`Testing DELETE on row 999999 (non-existent, just to test permissions)...`);
  const { error: deleteError } = await supabase
    .from('raw_content')
    .delete()
    .eq('id', 999999);

  if (deleteError) {
    console.error('Delete failed:', deleteError.message);
  } else {
    console.log('Delete test succeeded (no error returned).');
  }
}

testOperations();
