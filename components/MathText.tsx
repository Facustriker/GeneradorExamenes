import React from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface MathTextProps {
  children: string
  block?: boolean
  className?: string
}

const MathText: React.FC<MathTextProps> = ({ children, block = false, className = "" }) => {
  // Función para procesar el texto y detectar fórmulas LaTeX
  const processText = (text: string) => {
    // Buscar fórmulas entre $...$ (inline) o $$...$$ (block)
    const parts: Array<{ type: 'text' | 'math-inline' | 'math-block'; content: string }> = []
    
    let remaining = text
    let currentIndex = 0
    
    // Regex para detectar fórmulas matemáticas
    const mathRegex = /(\$\$[^$]+\$\$|\$[^$]+\$)/g
    let match
    
    while ((match = mathRegex.exec(text)) !== null) {
      // Agregar texto antes de la fórmula
      if (match.index > currentIndex) {
        parts.push({
          type: 'text',
          content: text.substring(currentIndex, match.index)
        })
      }
      
      // Agregar la fórmula
      const formula = match[0]
      if (formula.startsWith('$$') && formula.endsWith('$$')) {
        // Fórmula en bloque
        parts.push({
          type: 'math-block',
          content: formula.slice(2, -2)
        })
      } else if (formula.startsWith('$') && formula.endsWith('$')) {
        // Fórmula inline
        parts.push({
          type: 'math-inline',
          content: formula.slice(1, -1)
        })
      }
      
      currentIndex = match.index + match[0].length
    }
    
    // Agregar texto restante
    if (currentIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex)
      })
    }
    
    return parts
  }

  // Si es todo un bloque matemático
  if (block) {
    try {
      return (
        <div className={`math-block ${className}`}>
          <BlockMath math={children} />
        </div>
      )
    } catch (error) {
      return <span className="text-red-500">Error en fórmula: {children}</span>
    }
  }

  // Procesar texto mixto
  const parts = processText(children)
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        try {
          switch (part.type) {
            case 'math-inline':
              return <InlineMath key={index} math={part.content} />
            case 'math-block':
              return <BlockMath key={index} math={part.content} />
            case 'text':
            default:
              return <span key={index}>{part.content}</span>
          }
        } catch (error) {
          return <span key={index} className="text-red-500">Error: {part.content}</span>
        }
      })}
    </span>
  )
}

export default MathText