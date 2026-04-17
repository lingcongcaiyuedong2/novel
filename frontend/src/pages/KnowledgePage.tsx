import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Search, Trash2, Edit3, X, BookOpen, Hash } from 'lucide-react'
import {
  listKnowledge, createKnowledge, updateKnowledge, deleteKnowledge,
  CATEGORIES,
  type KnowledgeItem,
} from '../api/knowledge'

/** 简单 markdown → HTML: 处理 ## 标题、**粗体**、列表 */
function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-gray-800 mt-3 mb-1">{line.slice(3)}</h3>
    if (line.startsWith('### ')) return <h4 key={i} className="text-xs font-semibold text-gray-700 mt-2 mb-0.5">{line.slice(4)}</h4>
    if (line.startsWith('- ')) {
      const content = line.slice(2).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      return <li key={i} className="ml-4 text-sm text-gray-700 list-disc" dangerouslySetInnerHTML={{ __html: content }} />
    }
    const content = line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    return <p key={i} className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: content }} />
  })
}

export function KnowledgePage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('plot')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<KnowledgeItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formSubType, setFormSubType] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formTags, setFormTags] = useState('')

  // 分类计数缓存
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})

  const fetchItems = async () => {
    setLoading(true)
    const data = await listKnowledge(category, search || undefined)
    setItems(data)
    setLoading(false)
  }

  // 首次加载时获取全部分类计数
  useEffect(() => {
    const loadCounts = async () => {
      const counts: Record<string, number> = {}
      await Promise.all(CATEGORIES.map(async (cat) => {
        const data = await listKnowledge(cat.value)
        counts[cat.value] = data.length
      }))
      setCategoryCounts(counts)
    }
    loadCounts()
  }, [])

  // 更新当前分类计数
  useEffect(() => { fetchItems() }, [category, search])

  const totalCount = useMemo(() => Object.values(categoryCounts).reduce((s, n) => s + n, 0), [categoryCounts])

  const openCreate = () => {
    setFormTitle(''); setFormSubType(''); setFormContent(''); setFormTags('')
    setCreating(true); setEditing(false); setSelected(null)
  }

  const openEdit = (item: KnowledgeItem) => {
    setFormTitle(item.title); setFormSubType(item.subType); setFormContent(item.content)
    setFormTags(item.tags.join(', '))
    setEditing(true); setCreating(false); setSelected(item)
  }

  const handleSave = async () => {
    const tags = formTags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    if (creating) {
      await createKnowledge({ category, subType: formSubType, title: formTitle, content: formContent, tags })
    } else if (editing && selected) {
      await updateKnowledge(selected.id, { title: formTitle, subType: formSubType, content: formContent, tags })
    }
    setCreating(false); setEditing(false); setSelected(null)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    await deleteKnowledge(id)
    if (selected?.id === id) setSelected(null)
    fetchItems()
  }

  const showForm = creating || editing

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> 返回首页
        </button>
      </div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">知识库</h1>
          <p className="mt-1 text-sm text-gray-500">修仙小说素材库，AI 生成时会自动引用相关内容 · 共 {totalCount} 条素材</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={16} /> 新建素材
        </button>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar: categories */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => { setCategory(cat.value); setSelected(null) }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  category === cat.value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{cat.label}</span>
                  {categoryCounts[cat.value] != null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      category === cat.value ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-500'
                    }`}>{categoryCounts[cat.value]}</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{cat.desc}</div>
              </button>
            ))}
          </nav>
        </div>

        {/* Middle: card grid */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索素材..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">加载中...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen size={40} className="mx-auto text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">该分类下暂无素材</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => { setSelected(item); setEditing(false); setCreating(false) }}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    selected?.id === item.id ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-800 truncate">{item.title}</h3>
                      {item.subType && <span className="text-xs text-gray-400">{item.subType}</span>}
                    </div>
                    {item.isBuiltin ? (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">内置</span>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); openEdit(item) }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit3 size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(item.id) }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 line-clamp-3">{item.content.slice(0, 120)}...</p>
                  {item.tags.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {item.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: detail or form */}
        <div className="w-80 shrink-0">
          {showForm ? (
            <div className="sticky top-8 rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">{creating ? '新建素材' : '编辑素材'}</h3>
                <button onClick={() => { setCreating(false); setEditing(false) }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="标题"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              <input value={formSubType} onChange={e => setFormSubType(e.target.value)} placeholder="细分类型（可选）"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              <textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="内容（支持 Markdown）" rows={12}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none" />
              <input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="标签，用逗号分隔"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              <button onClick={handleSave} disabled={!formTitle || !formContent}
                className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300 transition-colors">
                保存
              </button>
            </div>
          ) : selected ? (
            <div className="sticky top-8 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800">{selected.title}</h3>
                {selected.subType && <span className="text-xs text-gray-400">{selected.subType}</span>}
              </div>
              <div className="p-5 max-h-[600px] overflow-y-auto">
                <div className="leading-relaxed space-y-0.5">{renderMarkdown(selected.content)}</div>
              </div>
              {selected.tags.length > 0 && (
                <div className="px-5 pb-4 flex gap-1.5 flex-wrap">
                  {selected.tags.map(tag => (
                    <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="sticky top-8 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
              <BookOpen size={32} className="mx-auto text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">选择一个素材查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
