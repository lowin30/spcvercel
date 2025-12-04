"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Loader2, X, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase-client"

interface SuperIntelligentSearchProps {
  rpcFunction: string
  placeholder?: string
  additionalParams?: Record<string, any>
  onResults: (results: any[]) => void
  onLoading?: (loading: boolean) => void
  minChars?: number
  debounceMs?: number
  showRelevanceInfo?: boolean
  showStats?: boolean
}

export function SuperIntelligentSearch({
  rpcFunction,
  placeholder = "Buscar...",
  additionalParams = {},
  onResults,
  onLoading,
  minChars = 2,
  debounceMs = 300,
  showRelevanceInfo = true,
  showStats = true
}: SuperIntelligentSearchProps) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<{total: number, tiempo: number} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const supabase = createClient()

  // Búsqueda con debounce
  const performSearch = useCallback(async (searchText: string) => {
    if (!searchText || searchText.length < minChars) {
      onResults([])
      setStats(null)
      setLoading(false)
      onLoading?.(false)
      return
    }

    try {
      setLoading(true)
      onLoading?.(true)
      setError(null)
      
      const startTime = performance.now()
      
      const { data, error: searchError } = await supabase.rpc(rpcFunction, {
        p_query: searchText,
        ...additionalParams
      })

      const endTime = performance.now()
      const tiempo = Math.round(endTime - startTime)

      if (searchError) {
        console.error("Error en búsqueda:", searchError)
        setError("Error al buscar")
        onResults([])
      } else {
        onResults(data || [])
        if (showStats) {
          setStats({ total: data?.length || 0, tiempo })
        }
      }
    } catch (err) {
      console.error("Error inesperado:", err)
      setError("Error inesperado")
      onResults([])
    } finally {
      setLoading(false)
      onLoading?.(false)
    }
  }, [rpcFunction, additionalParams, onResults, onLoading, minChars, showStats, supabase])

  // Effect con debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query)
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, performSearch, debounceMs])

  const handleClear = () => {
    setQuery("")
    setStats(null)
    setError(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-20"
          autoComplete="off"
          spellCheck="false"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {query && !loading && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {showRelevanceInfo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">Búsqueda inteligente:</p>
                    <ul className="list-disc pl-4">
                      <li>Ignora acentos (José = Jose)</li>
                      <li>Ignora mayúsculas (JOSE = jose)</li>
                      <li>Tolera errores tipográficos</li>
                      <li>Busca en todos los campos</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      {/* Estadísticas */}
      {stats && showStats && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {stats.total} resultados
          </Badge>
          <Badge variant="outline" className="text-xs">
            {stats.tiempo}ms
          </Badge>
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      
      {/* Hint de búsqueda mínima */}
      {query.length > 0 && query.length < minChars && (
        <div className="text-sm text-muted-foreground">
          Escribe al menos {minChars} caracteres para buscar
        </div>
      )}
    </div>
  )
}
