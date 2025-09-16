import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts'
import MathText from './MathText' // Ajusta la ruta según tu estructura

interface GraphicData {
  type: 'line' | 'bar' | 'scatter'
  title: string
  xLabel: string
  yLabel: string
  data: Array<{ x: number; y: number }>
  annotations?: Array<{ x: number; y: number; text: string }>
}

interface MathGraphProps {
  graphicData: GraphicData
  className?: string
}

const MathGraph: React.FC<MathGraphProps> = ({ graphicData, className = "" }) => {
  if (!graphicData || !graphicData.data || graphicData.data.length === 0) {
    return (
      <div className={`p-4 border-2 border-dashed border-slate-300 rounded-lg ${className}`}>
        <p className="text-center text-slate-500 text-sm">Datos de gráfico no disponibles</p>
      </div>
    )
  }

  // Convertir datos para Recharts
  const chartData = graphicData.data.map(point => ({
    x: point.x,
    y: point.y
  }))

  return (
    <div className={`bg-white border-2 border-slate-400 rounded-lg p-4 ${className} print-colors`} 
         style={{ breakInside: 'avoid' }}>
      {/* Título del gráfico con LaTeX */}
      <div className="text-center font-bold text-slate-900 mb-3 text-base">
        <MathText>{graphicData.title}</MathText>
      </div>
      
      {/* Gráfico optimizado para impresión */}
      <div style={{ width: '100%', height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData} 
            margin={{ top: 10, right: 20, left: 40, bottom: 60 }}
          >
            {/* Grid más visible para impresión */}
            <CartesianGrid strokeDasharray="2 2" stroke="#666666" strokeWidth={1} />
            
            {/* Ejes con colores oscuros para impresión */}
            <XAxis 
              dataKey="x" 
              type="number"
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              stroke="#000000"
              strokeWidth={2}
              tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }}
            />
            <YAxis 
              type="number"
              domain={['dataMin - 1', 'dataMax + 1']}
              stroke="#000000"
              strokeWidth={2}
              tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }}
            />
            
            {/* Línea principal más gruesa y oscura para impresión */}
            <Line 
              type="monotone" 
              dataKey="y" 
              stroke="#000000" 
              strokeWidth={3}
              dot={{ fill: '#000000', strokeWidth: 2, r: 4 }}
              connectNulls={false}
            />
            
            {/* Puntos destacados en rojo oscuro para impresión */}
            {graphicData.annotations?.map((annotation, index) => (
              <ReferenceDot 
                key={index}
                x={annotation.x} 
                y={annotation.y} 
                r={6}
                fill="#CC0000"
                stroke="#990000"
                strokeWidth={3}
              />
            ))}
            
            {/* Líneas de referencia (ejes) más visibles */}
            <ReferenceLine y={0} stroke="#333333" strokeWidth={2} />
            <ReferenceLine x={0} stroke="#333333" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Etiquetas de ejes con LaTeX */}
      <div className="flex justify-between mt-2 text-sm font-bold text-slate-900">
        <div className="text-center w-full">
          <MathText>{graphicData.xLabel}</MathText>
        </div>
      </div>
      <div className="flex justify-center mt-1">
        <div className="transform -rotate-90 origin-center text-sm font-bold text-slate-900">
          <MathText>{graphicData.yLabel}</MathText>
        </div>
      </div>
      
      {/* Anotaciones como texto, optimizado para impresión */}
      {graphicData.annotations && graphicData.annotations.length > 0 && (
        <div className="mt-3 text-sm text-slate-900 border-t border-slate-400 pt-2">
          <p className="font-bold mb-1">Puntos destacados:</p>
          <div className="space-y-1">
            {graphicData.annotations.map((annotation, index) => (
              <p key={index} className="text-sm">
                • Punto ({annotation.x}, {annotation.y}): <MathText>{annotation.text}</MathText>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MathGraph