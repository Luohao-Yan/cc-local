import { useState, useCallback, useRef, useEffect } from 'react'
import './CommandPalette.css'

export interface CommandItem {
  id: string
  label: string
  description?: string
  shortcut?: string
  icon?: string
  action: () => void
}

interface CommandPaletteProps {
  commands: CommandItem[]
  onClose: () => void
  placeholder?: string
}

function CommandPalette({ commands, onClose, placeholder = '输入命令或搜索...' }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // 过滤命令
  const filteredCommands = commands.filter(cmd => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      cmd.label.toLowerCase().includes(q) ||
      (cmd.description?.toLowerCase().includes(q) ?? false)
    )
  })

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [filteredCommands, selectedIndex, onClose])

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const handleExecute = useCallback((cmd: CommandItem) => {
    cmd.action()
    onClose()
  }, [onClose])

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input-wrapper">
          <span className="command-palette-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder={placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="command-palette-list">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">
              没有找到匹配的命令
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                className={`command-palette-item ${selectedIndex === index ? 'selected' : ''}`}
                onClick={() => handleExecute(cmd)}
                onMouseEnter={() => handleSelect(index)}
              >
                {cmd.icon && (
                  <span className="command-palette-item-icon">{cmd.icon}</span>
                )}
                <div className="command-palette-item-info">
                  <span className="command-palette-item-label">{cmd.label}</span>
                  {cmd.description && (
                    <span className="command-palette-item-description">
                      {cmd.description}
                    </span>
                  )}
                </div>
                {cmd.shortcut && (
                  <span className="command-palette-item-shortcut">
                    {cmd.shortcut}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
