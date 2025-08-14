"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type Option = {
  value: string
  label: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const commandRef = React.useRef<HTMLDivElement>(null)

  // Clear input value on selection
  const handleSelect = React.useCallback((value: string) => {
    setInputValue("")
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    )
  }, [onChange, selected])

  // Handle input value change
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }, [])

  // Handle keyboard selection
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (!input) return

    if (e.key === "Backspace" && !inputValue && selected.length > 0) {
      onChange(selected.slice(0, -1))
    }

    // Prevent default arrow key scrolling
    if (["ArrowUp", "ArrowDown", "Enter"].includes(e.key)) {
      e.preventDefault()
    }
  }, [inputValue, onChange, selected])

  // Remove item by value
  const removeItem = React.useCallback((value: string) => {
    onChange(selected.filter((item) => item !== value))
  }, [onChange, selected])

  // Get label for value
  const getLabel = React.useCallback((value: string) => {
    return options.find((option) => option.value === value)?.label ?? value
  }, [options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("min-h-10 h-auto w-full justify-between", className)}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.map((value) => (
                <Badge variant="secondary" key={value} className="mr-1 mb-1">
                  {getLabel(value)}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex items-center"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        removeItem(value)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeItem(value)
                    }}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Eliminar {getLabel(value)}</span>
                  </span>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <div className="opacity-50">⌄</div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command ref={commandRef} className="w-full">
          <div className="flex items-center border-b px-3">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Buscar..."
              disabled={disabled}
            />
          </div>
          <div className="max-h-[200px] overflow-auto">
            <CommandGroup>
              {options
                .filter((option) => option.label.toLowerCase().includes(inputValue.toLowerCase()))
                .map((option) => {
                  const isSelected = selected.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelect(option.value)}
                      className={cn(
                        "flex items-center gap-2 w-full",
                        isSelected ? "bg-accent text-accent-foreground" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                        )}
                      >
                        {isSelected && <span className="h-2 w-2">✓</span>}
                      </div>
                      <span>{option.label}</span>
                    </CommandItem>
                  )
                })}
            </CommandGroup>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
