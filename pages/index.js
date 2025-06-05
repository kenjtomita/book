import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [user, setUser] = useState(null)
  const [books, setBooks] = useState([])
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [search, setSearch] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // Check current auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadBooks()
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadBooks()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      console.error('Login error:', error)
      alert('Error logging in: ' + error.message)
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error)
      alert('Error logging out: ' + error.message)
    } else {
      setUser(null)
      setBooks([])
    }
  }

  async function loadBooks() {
    const { data } = await supabase
      .from('books')
      .select('*')
      .ilike('title', `%${search}%`)
    setBooks(data || [])
  }

  async function uploadImage(event) {
    try {
      if (!user) {
        throw new Error('Please log in to upload images');
      }

      setUploading(true)
      console.log('Starting upload process...');
      
      const file = event.target.files[0]
      if (!file) {
        throw new Error('Please select a file to upload');
      }

      console.log('Selected file:', file.name);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`
      console.log('Generated file path:', filePath);

      console.log('Uploading to Supabase storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      console.log('Getting public URL...');
      const { data } = supabase.storage
        .from('book-covers')
        .getPublicUrl(filePath)

      if (!data?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      console.log('Got public URL:', data.publicUrl);
      setImageUrl(data.publicUrl)

      // Process the image with AI
      setProcessing(true)
      console.log('Sending image URL to API:', data.publicUrl);
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: data.publicUrl }),
      });

      console.log('API response status:', response.status);
      const responseData = await response.json();
      console.log('API response data:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to process image');
      }

      if (responseData.title || responseData.author) {
        console.log('Setting detected text:', { title: responseData.title, author: responseData.author });
        setTitle(responseData.title || '');
        setAuthor(responseData.author || '');
      } else {
        console.log('No text detected in the image');
        alert('No text could be detected in the image. Please enter the title and author manually.');
      }
    } catch (error) {
      console.error('Error in uploadImage:', error);
      alert('Error: ' + (error.message || 'Failed to process image'));
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  async function addBook() {
    if (!title || !author) {
      alert('Please fill in both title and author')
      return
    }
    await supabase.from('books').insert({ 
      title, 
      author,
      user_id: user.id,
      image_url: imageUrl
    })
    setTitle('')
    setAuthor('')
    setImageUrl('')
    loadBooks()
  }

  async function deleteBook(id) {
    if (confirm('Are you sure you want to delete this book?')) {
      await supabase.from('books').delete().eq('id', id)
      loadBooks()
    }
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7f9fc'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '2rem',
          color: '#1a1a1a',
          fontWeight: '700'
        }}>📚 My Book List</h1>
        <button
          onClick={login}
          style={{
            padding: '12px 24px',
            fontSize: '1rem',
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'transform 0.1s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Login with GitHub
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f7f9fc',
      padding: '2rem'
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2rem',
          color: '#1a1a1a',
          fontWeight: '700',
          margin: 0
        }}>📚 My Book List</h1>
        <button
          onClick={logout}
          style={{
            padding: '8px 16px',
            fontSize: '0.875rem',
            backgroundColor: '#fff',
            color: '#1a1a1a',
            border: '1px solid #e1e1e1',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
        >
          Logout
        </button>
      </header>

      <div style={{
        backgroundColor: '#fff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <input
          placeholder="Search books..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyUp={loadBooks}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '1rem',
            border: '1px solid #e1e1e1',
            borderRadius: '6px',
            marginBottom: '1rem'
          }}
        />

        <div style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
        }}>
          <input
            placeholder="Book Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              padding: '12px',
              fontSize: '1rem',
              border: '1px solid #e1e1e1',
              borderRadius: '6px'
            }}
          />
          <input
            placeholder="Author"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            style={{
              padding: '12px',
              fontSize: '1rem',
              border: '1px solid #e1e1e1',
              borderRadius: '6px'
            }}
          />
          <div style={{
            display: 'flex',
            gap: '1rem'
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={uploadImage}
              disabled={uploading || processing}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '1rem',
                border: '1px solid #e1e1e1',
                borderRadius: '6px',
                backgroundColor: '#fff'
              }}
            />
            <button
              onClick={addBook}
              disabled={uploading || processing}
              style={{
                padding: '12px 24px',
                fontSize: '1rem',
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'transform 0.1s ease'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Add Book'}
            </button>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '1.5rem',
        padding: '0.5rem'
      }}>
        {books.map(book => (
          <div
            key={book.id}
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {book.image_url ? (
              <div style={{
                position: 'relative',
                paddingTop: '60%',
                backgroundColor: '#f3f4f6'
              }}>
                <img 
                  src={book.image_url} 
                  alt={book.title}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
            ) : (
              <div style={{
                paddingTop: '60%',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '2rem'
                }}>
                  📚
                </span>
              </div>
            )}
            <div style={{ padding: '1rem' }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#1a1a1a'
              }}>
                {book.title}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#666',
                marginBottom: '1rem'
              }}>
                {book.author}
              </p>
              <button
                onClick={() => deleteBook(book.id)}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '0.875rem',
                  backgroundColor: '#fff',
                  color: '#ff4444',
                  border: '1px solid #ff4444',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#ff4444'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#fff'
                  e.currentTarget.style.color = '#ff4444'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
