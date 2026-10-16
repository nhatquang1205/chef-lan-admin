import { Route, Routes } from 'react-router'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<main className="p-6 text-2xl font-semibold">Trang chủ</main>} />
      <Route path="*" element={<main className="p-6 text-2xl font-semibold">Không tìm thấy trang</main>} />
    </Routes>
  )
}
