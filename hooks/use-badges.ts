'use client'

import { useState, useEffect } from 'react'

export function useBadges() {
    const [badges, setBadges] = useState<Record<string, number>>({})

    useEffect(() => {
        let isMounted = true

        const fetchBadges = async () => {
            try {
                const res = await fetch('/api/badges')
                if (res.ok) {
                    const data = await res.json()
                    if (isMounted && data.badges) {
                        setBadges(data.badges)
                    }
                }
            } catch (error) {
                // Silencioso - fallar gracefully
            }
        }

        // Fetch inicial
        fetchBadges()

        // Polling cada 30 segundos
        const intervals = setInterval(fetchBadges, 30000)

        return () => {
            isMounted = false
            clearInterval(intervals)
        }
    }, [])

    return { badges }
}
