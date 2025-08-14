import { FileWarning } from "lucide-react"
import { ReactNode } from "react"

interface NoDataProps {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function NoData({ 
  title = "No hay datos disponibles", 
  description, 
  icon = <FileWarning className="h-12 w-12 text-muted-foreground" />,
  action 
}: NoDataProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      {description && <p className="text-muted-foreground text-center mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
