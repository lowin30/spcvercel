'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

interface WizardOption {
    label: string
    value: string
}

interface WizardOptionsProps {
    options: WizardOption[]
    onSelect: (value: string) => void
}

export function WizardOptions({ options, onSelect }: WizardOptionsProps) {
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {options.map((opt, index) => (
                <motion.div
                    key={opt.value}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelect(opt.value)}
                        className="rounded-full text-xs font-medium border border-gray-200 dark:border-gray-800"
                    >
                        {opt.label}
                    </Button>
                </motion.div>
            ))}
        </div>
    )
}
