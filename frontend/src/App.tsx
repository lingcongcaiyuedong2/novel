import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { CreateNovelPage } from './pages/CreateNovel'
import { NovelDetailPage } from './pages/NovelDetailPage'
import { ChapterPage } from './pages/ChapterPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { EditNovelPage } from './pages/EditNovelPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateNovelPage />} />
          <Route path="/novel/:id" element={<NovelDetailPage />} />
          <Route path="/novel/:id/edit" element={<EditNovelPage />} />
          <Route path="/novel/:id/chapter/:chapterId" element={<ChapterPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
