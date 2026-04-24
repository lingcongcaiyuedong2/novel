import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, X, Sparkles, Upload, Loader2, AlertCircle } from 'lucide-react'
import { listStyles, createStyle, deleteStyle, type StyleProfile } from '../api/styles'

export function StyleLibraryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<StyleProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<StyleProfile | null>(null)
  const [creating, setCreating] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formFiles, setFormFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const data = await listStyles()
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setFormName(''); setFormDesc(''); setFormFiles([]); setSubmitError('')
    setCreating(true); setSelected(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormFiles(files)
  }

  const totalFileSize = formFiles.reduce((s, f) => s + f.size, 0)

  const handleSubmit = async () => {
    if (!formName.trim() || formFiles.length === 0) return
    setSubmitting(true); setSubmitError('')
    try {
      const fd = new FormData()
      fd.append('name', formName.trim())
      fd.append('description', formDesc.trim())
      formFiles.forEach(f => fd.append('files', f))
      const created = await createStyle(fd)
      await fetchItems()
      setCreating(false)
      setSelected(created)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '创建失败'
      setSubmitError(String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该风格？引用它的小说会回退到内置风格。')) return
    try {
      await deleteStyle(id)
      if (selected?.id === id) setSelected(null)
      await fetchItems()
    } catch {
      // 静默：下次 fetchItems 会刷新
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> 返回首页
        </button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">写作风格库</h1>
          <p className="mt-1 text-sm text-gray-500">
            上传小说样本（.txt），AI 分析后提取风格画像 · 创建小说时可选用 · 共 {items.length} 个风格
          </p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={16} /> 新建风格
        </button>
      </div>

      <div className="flex gap-6">
        {/* 左：风格卡片列表 */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-center py-16 text-gray-400">加载中...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 rounded-xl border-2 border-dashed border-gray-200">
              <Sparkles size={40} className="mx-auto text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">还没有自定义风格</p>
              <p className="mt-1 text-xs text-gray-400">点击右上角"新建风格"，上传你喜欢的小说样本</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => { setSelected(item); setCreating(false) }}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    selected?.id === item.id ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-800 truncate">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <StatusBadge status={item.status} />
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    样本 {item.sampleWordCount.toLocaleString()} 字 · {item.sourceFilenames.length} 个文件
                  </div>
                  {item.status === 'failed' && item.errorMessage && (
                    <div className="mt-2 text-xs text-red-500 line-clamp-2">{item.errorMessage}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右：详情或新建表单 */}
        <div className="w-96 shrink-0">
          {creating ? (
            <div className="sticky top-8 rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">新建风格</h3>
                <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600" disabled={submitting}>
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="text-xs text-gray-600">风格名称 <span className="text-red-500">*</span></label>
                <input
                  value={formName} onChange={e => setFormName(e.target.value)} disabled={submitting}
                  placeholder="如：古龙式江湖" maxLength={40}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">简介（可选）</label>
                <input
                  value={formDesc} onChange={e => setFormDesc(e.target.value)} disabled={submitting}
                  placeholder="一句话描述这种风格的特点" maxLength={100}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">样本文件 <span className="text-red-500">*</span>（.txt，可多选）</label>
                <input
                  ref={fileInputRef} type="file" multiple accept=".txt,text/plain"
                  onChange={handleFileChange} disabled={submitting}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors disabled:opacity-50"
                >
                  <Upload size={18} className="inline mr-1.5 -mt-0.5" />
                  {formFiles.length > 0 ? `已选 ${formFiles.length} 个文件（${(totalFileSize / 1024).toFixed(1)} KB）` : '点击选择 .txt 文件'}
                </button>
                {formFiles.length > 0 && (
                  <ul className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
                    {formFiles.map((f, i) => (
                      <li key={i} className="text-xs text-gray-500 truncate">· {f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-gray-400">支持大量样本（单文件最大 50MB，最多 50 个文件）。编码支持 UTF-8 / GBK。样本越多，风格提取越准。</p>
              </div>

              {submitError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-600 flex gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || !formName.trim() || formFiles.length === 0}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300 transition-colors inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    分析中...（可能需要 10~30 秒）
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    开始分析
                  </>
                )}
              </button>
            </div>
          ) : selected ? (
            <div className="sticky top-8 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">{selected.name}</h3>
                  <StatusBadge status={selected.status} />
                </div>
                {selected.description && (
                  <p className="text-xs text-gray-500 mt-1">{selected.description}</p>
                )}
                <div className="mt-2 text-xs text-gray-400">
                  样本 {selected.sampleWordCount.toLocaleString()} 字 · {selected.sourceFilenames.join(', ')}
                </div>
              </div>
              <div className="p-5 max-h-[600px] overflow-y-auto">
                {selected.status === 'failed' ? (
                  <div className="text-sm text-red-600 flex gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">分析失败</div>
                      <div className="mt-1 text-xs">{selected.errorMessage || '未知错误'}</div>
                    </div>
                  </div>
                ) : selected.status === 'extracting' ? (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> 分析中...
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{selected.profileText}</pre>
                )}
              </div>
            </div>
          ) : (
            <div className="sticky top-8 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
              <Sparkles size={32} className="mx-auto text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">选择一个风格查看画像</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: StyleProfile['status'] }) {
  if (status === 'ready') {
    return <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">就绪</span>
  }
  if (status === 'extracting') {
    return <span className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" />分析中</span>
  }
  return <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">失败</span>
}
