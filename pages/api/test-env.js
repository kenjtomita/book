export default function handler(req, res) {
  console.log('Environment variables check:');
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  console.log('NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  res.status(200).json({ 
    openai_key_exists: !!process.env.OPENAI_API_KEY,
    supabase_url_exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key_exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
} 