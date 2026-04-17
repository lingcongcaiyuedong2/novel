import { useEffect, useRef } from 'react'

interface StreamingTextProps {
  text: string
  className?: string
  autoScroll?: boolean
}

export function StreamingText({ text, className = '', autoScroll = true }: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [text, autoScroll])

  return (
    <div
      ref={containerRef}
      className={`whitespace-pre-wrap leading-relaxed text-sm text-gray-800 overflow-y-auto ${className}`}
    >
      {text}
      <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
    </div>
  )
}
