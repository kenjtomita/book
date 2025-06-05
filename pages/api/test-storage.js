import supabase from '../../lib/supabaseClient';

export default async function handler(req, res) {
  console.log('=== Testing Supabase Storage Access ===');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  try {
    // First, check if we can connect to Supabase
    const { data: user, error: authError } = await supabase.auth.getUser();
    console.log('Auth check:', user ? 'Authenticated' : 'Not authenticated');
    if (authError) {
      console.error('Auth error:', authError);
    }

    // List all buckets
    console.log('Attempting to list buckets...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('Error listing buckets:', {
        message: bucketsError.message,
        details: bucketsError.details,
        hint: bucketsError.hint,
        code: bucketsError.code
      });
      return res.status(500).json({ 
        error: 'Failed to list buckets',
        details: bucketsError 
      });
    }

    console.log('Available buckets:', buckets?.map(b => b.name) || []);

    // Check for book-covers bucket
    const bookCoversBucket = buckets?.find(b => b.name === 'book-covers');
    
    if (!bookCoversBucket) {
      console.log('book-covers bucket not found. Available buckets:', buckets?.map(b => b.name));
      return res.status(404).json({ 
        error: 'book-covers bucket not found',
        availableBuckets: buckets?.map(b => b.name) || []
      });
    }

    // Try to list files in the book-covers bucket
    console.log('Attempting to list files in book-covers bucket...');
    const { data: files, error: filesError } = await supabase
      .storage
      .from('book-covers')
      .list();

    if (filesError) {
      console.error('Error listing files:', {
        message: filesError.message,
        details: filesError.details,
        hint: filesError.hint,
        code: filesError.code
      });
      return res.status(500).json({ 
        error: 'Failed to list files',
        details: filesError 
      });
    }

    return res.status(200).json({
      success: true,
      buckets: buckets.map(b => ({
        name: b.name,
        public: b.public,
        createdAt: b.created_at
      })),
      bookCoversExists: !!bookCoversBucket,
      bookCoversDetails: bookCoversBucket,
      files: files || []
    });

  } catch (error) {
    console.error('Unexpected error:', {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Unexpected error',
      message: error.message
    });
  }
} 