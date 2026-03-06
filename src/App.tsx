import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BookList from './pages/BookList'
import Login from './pages/Login'

export default function App() {
  return (
    <BrowserRouter basename="/ttlibrary">
      <Routes>
        <Route path="/" element={<BookList />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}
