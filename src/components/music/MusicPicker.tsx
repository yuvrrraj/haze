'use client'
import { useState } from 'react'
import { Search, X, Music2, Play } from 'lucide-react'
import Image from 'next/image'

export default function MusicPicker({ onSelect, onClose }: { onSelect: (music: any) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [source, setSource] = useState<'spotify' | 'youtube'>('spotify')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<HTMLAudioElement | null>(null)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/${source}?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.tracks || data.videos || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function playPreview(url: string) {
    if (preview) { preview.pause(); setPreview(null) }
    if (url) {
      const audio = new Audio(url)
      audio.play()
      setPreview(audio)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="bg-zinc-900 w-full rounded-t-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
          <h2 className="font-bold text-lg">Add Music</h2>
          <button onClick={() => { preview?.pause(); onClose() }}><X size={24} /></button>
        </div>

        <div className="flex gap-2 px-4 py-3">
          {(['spotify', 'youtube'] as const).map(s => (
            <button key={s} onClick={() => setSource(s)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${source === s ? 'bg-purple-500' : 'bg-zinc-800'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="flex-1 flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
            <Search size={16} className="text-zinc-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder={`Search ${source}...`}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <button onClick={search} className="bg-purple-500 px-4 py-2 rounded-xl text-sm font-medium">Search</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
          {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}
          {results.map((track, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl">
              {track.cover_url && (
                <Image src={track.cover_url} alt="" width={48} height={48} className="rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{track.title}</p>
                <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
              </div>
              <div className="flex items-center gap-2">
                {track.preview_url && (
                  <button onClick={() => playPreview(track.preview_url)} className="text-zinc-400 hover:text-white">
                    <Play size={18} />
                  </button>
                )}
                <button onClick={() => { preview?.pause(); onSelect(track) }} className="bg-purple-500 px-3 py-1 rounded-lg text-xs font-medium">
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
