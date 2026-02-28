import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LevelSelectPage from './pages/LevelSelectPage'
import GamePage from './pages/GamePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LevelSelectPage />} />
        <Route path="/game/:levelId" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  )
}
