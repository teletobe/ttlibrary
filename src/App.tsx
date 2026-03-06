import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import BookList from './pages/BookList'
import Login from './pages/Login'
import AddBook from './pages/AddBook'
import EditBook from './pages/EditBook'
import BookDetail from './pages/BookDetail'

export default function App() {
  return (
    <BrowserRouter basename="/ttlibrary">
      <AuthProvider>
        <Routes>
          <Route path="/" element={<BookList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/books/new" element={<AddBook />} />
          <Route path="/books/:id/edit" element={<EditBook />} />
          <Route path="/books/:id" element={<BookDetail />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
