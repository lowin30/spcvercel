'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { useBadges } from '@/hooks/use-badges'
import { TOOL_REGISTRY } from '@/lib/tool-registry'

interface QuickAction {
    icon: string
    label: string
    command: string
    variant?: 'default' | 'outline' | 'destructive' | 'secondary'
    priority?: 'critical' | 'high' | 'medium' | 'low'
}

interface ChatQuickActionsProps {
    role: string
    onActionClick: (command: string) => void
}

export function ChatQuickActions({ role, onActionClick }: ChatQuickActionsProps) {
    const { badges } = useBadges()

    // Build actions dynamically from TOOL_REGISTRY filtered by role
    const roleActions: QuickAction[] = Object.entries(TOOL_REGISTRY)
        .filter(([_, config]) => config.roles.includes(role))
        .map(([toolName, config]) => ({
            icon: config.icon,
            label: config.label,
            command: toolName,
            variant: config.priority === 'critical' ? 'default' : 'outline' as any,
            priority: config.priority
        }))
        // Sort by priority (critical > high > medium > low)
        .sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
            return (priorityOrder[a.priority || 'low'] || 3) - (priorityOrder[b.priority || 'low'] || 3)
        })
        // Limit to top 9 for UI cleanliness
        .slice(0, 9)

    if (roleActions.length === 0) {
        return null
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 px-3 py-2"
            >
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Acciones Rápidas
                    </span>
                    {Object.keys(badges).length > 0 && (
                        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {roleActions.map((action, index) => (
                        <motion.div
                            key={action.command}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Button
                                type="button"
                                variant={action.variant || 'outline'}
                                size="sm"
                                className="w-full h-auto py-1.5 px-2 flex items-center justify-start gap-1.5 text-left hover:scale-105 transition-transform relative"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onActionClick(action.command);
                                }}
                            >
                                <span className="text-sm">{action.icon}</span>
                                <span className="text-[10px] font-medium leading-tight truncate flex-1">{action.label}</span>

                                {badges[action.command] && badges[action.command] > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full absolute -top-1 -right-1 shadow-sm"
                                    >
                                        {badges[action.command]}
                                    </Badge>
                                )}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
