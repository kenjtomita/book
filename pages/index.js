import { useState, useEffect } from 'react'
import supabase from '../lib/supabaseClient'

export default function Home() {
  const [user, setUser] = useState(null)
  const [books, setBooks] = useState([])
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) loadBooks()
    })
  }, [])

  async function login() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'github' })
    if (error) console.error(error.message)
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function loadBooks() {
    const { data } = await supabase
      .from('books')
      .select('*')
      .ilike('title', `%${search}%`)
    setBooks(data)
  }

  async function addBook() {
    await supabase.from('books').insert({ title, author })
    setTitle('')
    setAuthor('')
    loadBooks()
  }

  async function deleteBook(id) {
    await supabase.from('books').delete().eq('id', id)
    loadBooks()
  }

  if (!user) return <button onClick={login}>Login with GitHub</button>

  return (
    <div style={{ padding: 20 }}>
      <h2>📚 My Book List</h2>
      <button onClick={logout}>Logout</button>
      <br /><br />
      <input
        placeholder="Search books..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyUp={loadBooks}
      />
      <br /><br />
      <input
        placeholder="Book Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <input
        placeholder="Author"
        value={author}
        onChange={e => setAuthor(e.target.value)}
      />
      <button onClick={addBook}>Add Book</button>

      <ul>
        {books.map(book => (
          <li key={book.id}>
            {book.title} — {book.author}
            <button onClick={() => deleteBook(book.id)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
