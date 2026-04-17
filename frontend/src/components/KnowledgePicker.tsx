import { useState, useEffect } from 'react'
import { X, BookOpen, Search } from 'lucide-react'
import { listKnowledge, CATEGORIES, type KnowledgeItem } from '../api/knowledge'

interface KnowledgePickerProps {
  category: string
  onSelect: (content: string) => void
  onClose: () => void
}

export function KnowledgePicker({ category, onSelect, onClose }: KnowledgePickerProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<KnowledgeItem | null>(null)

  const catLabel = CATEGORIES.find(c => c.value === category)?.label || category

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const data = await listKnowledge(category, search || undefined)
      setItems(data)
      setLoading(false)
    }
    fetch()
  }, [category, search])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[700px] max-h-[80vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-600" />
            <h3 className="text-base font-semibold text-gray-800">从知识库选择 · {catLabel}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索..."
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">加载中...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">暂无相关素材</div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={`rounded-lg border p-3 cursor-pointer transition-all ${
                    selected?.id === item.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-800">{item.title}</h4>
                    {item.isBuiltin && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">内置</span>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{item.content.slice(0, 100)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">取消</button>
          <button
            onClick={() => { if (selected) { onSelect(selected.content); onClose() } }}
            disabled={!selected}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
          >
            使用此素材
          </button>
        </div>
      </div>
    </div>
  )
}
