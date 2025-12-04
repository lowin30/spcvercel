import { normalizeForSearch } from "@/lib/text-normalizer"

interface SearchHighlightProps {
  text: string | null | undefined
  query: string
  className?: string
}

export function SearchHighlight({ text, query, className = "" }: SearchHighlightProps) {
  if (!query || !text) return <span className={className}>{text || ""}</span>

  // Normalizar para búsqueda (sin acentos, lowercase)
  const normalizedText = normalizeForSearch(text)
  const normalizedQuery = normalizeForSearch(query)

  // Si no hay match, retornar texto original
  if (!normalizedText.includes(normalizedQuery)) {
    return <span className={className}>{text}</span>
  }

  const parts: { text: string; highlight: boolean }[] = []
  let lastIndex = 0

  // Buscar todas las ocurrencias en texto normalizado
  let index = normalizedText.indexOf(normalizedQuery)
  while (index !== -1) {
    // Agregar texto antes del match
    if (index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, index),
        highlight: false
      })
    }
    
    // Agregar match (del texto original, no normalizado)
    parts.push({
      text: text.substring(index, index + query.length),
      highlight: true
    })
    
    lastIndex = index + query.length
    index = normalizedText.indexOf(normalizedQuery, lastIndex)
  }

  // Agregar texto restante
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      highlight: false
    })
  }

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 font-semibold px-0.5 rounded">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  )
}
