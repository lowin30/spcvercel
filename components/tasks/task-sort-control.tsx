"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, DollarSign, Calendar, Clock, ArrowDownAZ, User } from "lucide-react"

interface TaskSortControlProps {
    userRole?: string
}

export function TaskSortControl({ userRole }: TaskSortControlProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentSort = searchParams.get('sort') || ''
    const currentView = searchParams.get('view') || 'activas'

    const createQueryString = useCallback(
        (sortValue: string) => {
            const params = new URLSearchParams(searchParams.toString())
            if (!sortValue || sortValue === '_default_') {
                params.delete('sort')
            } else {
                params.set('sort', sortValue)
            }
            return params.toString()
        },
        [searchParams]
    )

    const handleSortChange = (value: string) => {
        const query = createQueryString(value)
        router.push(pathname + '?' + query)
    }

    // Default dinámico según vista
    const activeSort = currentSort || (currentView === 'finalizadas' ? 'ultimo_pago' : 'recientes')

    return (
        <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline-flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                ordenar por:
            </span>
            <Select value={activeSort} onValueChange={handleSortChange}>
                <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border/70 hover:bg-accent/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl gap-1 px-2.5">
                    <SelectValue placeholder="ordenar por" />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-xl border-border">
                    <SelectItem value="ultimo_pago" className="text-xs font-medium flex items-center">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>último cobro primero</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="visita" className="text-xs font-medium">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>próxima visita</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="recientes" className="text-xs font-medium">
                        <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>más recientes (creación)</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="alfabetico" className="text-xs font-medium">
                        <div className="flex items-center gap-2">
                            <ArrowDownAZ className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span>alfabético (título)</span>
                        </div>
                    </SelectItem>
                    {userRole === 'admin' && (
                        <SelectItem value="supervisor" className="text-xs font-medium">
                            <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                <span>por supervisor</span>
                            </div>
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>
        </div>
    )
}
