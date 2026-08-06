'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Save, Menu, X } from 'lucide-react';

interface PipelineStage {
  id: string;
  clave: string;
  titulo: string;
  descripcion?: string | null;
  orden: number;
  tipo?: string;
  tasa_exito?: number;
  siguiente_etapa_id?: string | null;
  continuar_a_id?: string | null;
  regresar_a_id?: string | null;
  intentos_requeridos?: number;
}

interface NodePosition {
  x: number;
  y: number;
}

interface PipelineFlowDiagramProps {
  stages: PipelineStage[];
}

export default function PipelineFlowDiagram({ stages }: PipelineFlowDiagramProps) {
  const [customPositions, setCustomPositions] = useState<{ [key: string]: NodePosition }>({});
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [savedPositions, setSavedPositions] = useState(false);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Load custom positions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pipelineNodePositions');
    if (saved) {
      try {
        setCustomPositions(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading positions:', e);
      }
    }
  }, []);

  // Save positions to localStorage
  const savePositions = () => {
    localStorage.setItem('pipelineNodePositions', JSON.stringify(customPositions));
    setSavedPositions(true);
    setTimeout(() => setSavedPositions(false), 2000);
  };

  // Reset positions
  const resetPositions = () => {
    setCustomPositions({});
    localStorage.removeItem('pipelineNodePositions');
  };

  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => a.orden - b.orden);
  }, [stages]);

  const diagramData = useMemo(() => {
    const nodeWidth = 160;
    const nodeHeight = 100;
    const verticalGap = 180;
    const centerX = 400;

    const nodes: { [key: string]: { x: number; y: number; type: string; label: string; clave: string; lines: string[]; intentos?: number } } = {};
    const edges: Array<{ from: string; to: string; label: string; type: 'success' | 'backward' | 'delete' }> = [];

    sortedStages.forEach((stage, idx) => {
      const baseX = centerX - nodeWidth / 2;
      const baseY = idx * verticalGap + 50;

      const customPos = customPositions[`stage-${stage.id}`];
      const x = customPos ? customPos.x : baseX;
      const y = customPos ? customPos.y : baseY;

      const lines = stage.titulo.split(' ').length > 2
        ? [stage.titulo.split(' ').slice(0, -1).join(' '), stage.titulo.split(' ').slice(-1).join(' ')]
        : [stage.titulo];

      nodes[`stage-${stage.id}`] = {
        x,
        y,
        type: 'stage',
        label: stage.titulo,
        clave: stage.clave,
        lines,
      };

      const nextStage = stages.find(s => s.id === stage.continuar_a_id);
      if (nextStage) {
        edges.push({
          from: `stage-${stage.id}`,
          to: `stage-${nextStage.id}`,
          label: 'Sí',
          type: 'success',
        });
      } else {
        const terminalX = customPositions[`terminal-${stage.id}`]?.x || centerX - nodeWidth / 2 - 300;
        const terminalY = customPositions[`terminal-${stage.id}`]?.y || baseY;

        nodes[`terminal-${stage.id}`] = {
          x: terminalX,
          y: terminalY,
          type: 'terminal',
          label: '✓ Contrato',
          clave: '',
          lines: ['✓', 'Contrato'],
        };
        edges.push({
          from: `stage-${stage.id}`,
          to: `terminal-${stage.id}`,
          label: 'Sí',
          type: 'success',
        });
      }

      const backStage = stages.find(s => s.id === stage.regresar_a_id);
      if (backStage) {
        edges.push({
          from: `stage-${stage.id}`,
          to: `stage-${backStage.id}`,
          label: 'No',
          type: 'backward',
        });
      }

      // Crear nodo de eliminar si tiene intentos > 1 y no es la primera etapa
      if (idx > 0 && stage.intentos_requeridos && stage.intentos_requeridos > 1) {
        const deleteX = customPositions[`delete-${stage.id}`]?.x || centerX + nodeWidth / 2 + 150;
        const deleteY = customPositions[`delete-${stage.id}`]?.y || baseY + nodeHeight / 2 - 50;

        nodes[`delete-${stage.id}`] = {
          x: deleteX,
          y: deleteY,
          type: 'delete',
          label: 'Eliminar',
          clave: '',
          lines: ['❌', 'Eliminar'],
          intentos: stage.intentos_requeridos || 1,
        };
        edges.push({
          from: `stage-${stage.id}`,
          to: `delete-${stage.id}`,
          label: 'No',
          type: 'delete',
        });
      }
    });

    return { nodes, edges, nodeWidth, nodeHeight };
  }, [sortedStages, stages, customPositions]);

  const { nodes, edges, nodeWidth, nodeHeight } = diagramData;

  const svgWidth = 1000;
  const svgHeight = Math.max(600, sortedStages.length * 200);

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingNode || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = viewBox.x + (e.clientX - rect.left) / rect.width * (svgWidth / viewBox.scale);
    const y = viewBox.y + (e.clientY - rect.top) / rect.height * (svgHeight / viewBox.scale);

    setCustomPositions(prev => ({
      ...prev,
      [draggingNode]: { x, y },
    }));
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  const zoomIn = () => {
    setViewBox(prev => {
      const newScale = Math.min(4, prev.scale * 1.2);
      const scaleDiff = newScale / prev.scale;
      return {
        x: prev.x - (svgWidth / scaleDiff - svgWidth) / 2,
        y: prev.y - (svgHeight / scaleDiff - svgHeight) / 2,
        scale: newScale
      };
    });
  };

  const zoomOut = () => {
    setViewBox(prev => {
      const newScale = Math.max(0.5, prev.scale / 1.2);
      const scaleDiff = newScale / prev.scale;
      return {
        x: prev.x + (svgWidth - svgWidth / scaleDiff) / 2,
        y: prev.y + (svgHeight - svgHeight / scaleDiff) / 2,
        scale: newScale
      };
    });
  };

  const resetZoom = () => setViewBox({ x: 0, y: 0, scale: 1 });

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNode) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    if (isPanning) {
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const deltaX = (e.clientX - panStart.x) / rect.width * svgWidth / viewBox.scale;
      const deltaY = (e.clientY - panStart.y) / rect.height * svgHeight / viewBox.scale;

      setViewBox(prev => ({
        ...prev,
        x: prev.x - deltaX,
        y: prev.y - deltaY
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    handleMouseMove(e);
  };

  const handleSvgMouseUp = () => {
    setIsPanning(false);
    handleMouseUp();
  };

  return (
    <div className="grid grid-cols-2 gap-6">

      {/* SVG Diagram - Zoom con viewBox */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-full relative flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between relative">
          <div>
            <h3 className="font-bold text-slate-900">Flujo del Pipeline</h3>
          </div>
          {/* Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 bg-white hover:bg-slate-50 rounded border border-slate-300 flex items-center gap-1 text-sm font-bold z-20"
            title="Menú"
          >
            {showMenu ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Controls & Legend Menu */}
          {showMenu && (
            <div className="absolute top-14 right-4 bg-white rounded-lg border border-slate-200 shadow-lg p-4 z-20 space-y-3 w-64">
            {/* Controls */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 mb-2">Controles</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={zoomIn}
                  className="p-2 bg-white hover:bg-slate-50 rounded border border-slate-300 flex items-center gap-1 text-sm font-bold"
                  title="Zoom in"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={zoomOut}
                  className="p-2 bg-white hover:bg-slate-50 rounded border border-slate-300 flex items-center gap-1 text-sm font-bold"
                  title="Zoom out"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={resetZoom}
                  className="p-2 bg-white hover:bg-slate-50 rounded border border-slate-300 flex items-center gap-1 text-sm font-bold"
                  title="Reset zoom"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={savePositions}
                  className={`px-3 py-2 rounded border font-bold text-sm transition-all flex items-center gap-2 flex-1 ${
                    savedPositions
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <Save size={16} />
                  {savedPositions ? 'Guardado' : 'Guardar'}
                </button>
                <button
                  onClick={resetPositions}
                  className="px-3 py-2 bg-red-100 hover:bg-red-50 rounded border border-red-300 text-red-700 font-bold text-sm"
                >
                  <RotateCw size={16} />
                </button>
              </div>

              <div className="text-xs text-slate-600 px-2 py-1">
                Zoom: {(viewBox.scale * 100).toFixed(0)}%
              </div>
            </div>

            <div className="border-t border-slate-200"></div>

            {/* Legend */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">Leyenda</div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-6 h-4 bg-indigo-100 border border-indigo-500 rounded"></div>
                <span>Etapa</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-6 h-4 bg-emerald-100 border border-emerald-500 rounded"></div>
                <span>Terminal</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-5 h-5 rounded-full bg-red-100 border border-red-500"></div>
                <span>Eliminar</span>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Diagram Container */}
        <div style={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden', flex: 1 }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`${viewBox.x} ${viewBox.y} ${svgWidth / viewBox.scale} ${svgHeight / viewBox.scale}`}
            className="bg-gradient-to-b from-slate-50 to-white"
            style={{
              cursor: isPanning ? 'grabbing' : draggingNode ? 'grabbing' : 'grab',
            }}
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
          >
            <defs>
              <marker id="arrowSuccess" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
              </marker>
              <marker id="arrowBackward" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
              </marker>
              <marker id="arrowDelete" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
              </marker>
            </defs>

            {/* Draw edges */}
            {edges.map((edge, idx) => {
              const fromNode = nodes[edge.from];
              const toNode = nodes[edge.to];
              if (!fromNode || !toNode) return null;

              let fromX, fromY, toX, toY, color, markerEnd;
              const rightOffset = 50; // Desplazamiento solo para amarillas a la derecha

              if (edge.type === 'success') {
                // Verde - centrada
                fromX = fromNode.x + nodeWidth / 2;
                fromY = fromNode.y + nodeHeight;
                toX = toNode.x + nodeWidth / 2;
                toY = toNode.y;
                color = '#10b981';
                markerEnd = 'url(#arrowSuccess)';
              } else if (edge.type === 'backward') {
                // Amarillo/Naranja - solo a la DERECHA
                fromX = fromNode.x + nodeWidth / 2 + rightOffset;
                fromY = fromNode.y;
                toX = toNode.x + nodeWidth / 2 + rightOffset;
                toY = toNode.y + nodeHeight;
                color = '#f59e0b'; // Amarillo/Naranja
                markerEnd = 'url(#arrowBackward)';
              } else {
                // Rojo - sale del centro derecho, llega al centro del círculo
                fromX = fromNode.x + nodeWidth;
                fromY = fromNode.y + nodeHeight / 2;
                toX = toNode.x; // Centro del círculo (aproximado)
                toY = toNode.y + 50;
                color = '#ef4444';
                markerEnd = 'url(#arrowDelete)';
              }

              const midY = (fromY + toY) / 2;
              const midX = (fromX + toX) / 2;
              const path = `M ${fromX} ${fromY} Q ${midX} ${midY}, ${toX} ${toY}`;

              return (
                <g key={`edge-${idx}`} pointerEvents="none">
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    markerEnd={markerEnd}
                  />
                </g>
              );
            })}

            {/* Draw nodes */}
            {Object.entries(nodes).map(([key, node]) => {
              const isDragging = draggingNode === key;

              if (node.type === 'stage') {
                return (
                  <g
                    key={key}
                    onMouseDown={(e) => handleNodeMouseDown(key, e)}
                    style={{ cursor: 'grab' }}
                  >
                    <rect
                      x={node.x}
                      y={node.y}
                      width={nodeWidth}
                      height={nodeHeight}
                      fill={isDragging ? '#c7d2fe' : '#e0e7ff'}
                      stroke="#4f46e5"
                      strokeWidth={isDragging ? '3' : '2'}
                      rx="4"
                      opacity={isDragging ? 0.9 : 1}
                    />
                    {node.lines.map((line, idx) => (
                      <text
                        key={`line-${idx}`}
                        x={node.x + nodeWidth / 2}
                        y={node.y + 30 + idx * 22}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="600"
                        fill="#1e1b4b"
                        className="select-none pointer-events-none"
                      >
                        {line}
                      </text>
                    ))}
                    <text
                      x={node.x + nodeWidth / 2}
                      y={node.y + nodeHeight - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#6366f1"
                      fontWeight="bold"
                      className="select-none pointer-events-none"
                    >
                      ({node.clave})
                    </text>
                  </g>
                );
              } else if (node.type === 'terminal') {
                return (
                  <g
                    key={key}
                    onMouseDown={(e) => handleNodeMouseDown(key, e)}
                    style={{ cursor: 'grab' }}
                  >
                    <rect
                      x={node.x}
                      y={node.y}
                      width={nodeWidth}
                      height={nodeHeight}
                      fill={isDragging ? '#a7f3d0' : '#d1fae5'}
                      stroke="#059669"
                      strokeWidth={isDragging ? '3' : '2'}
                      rx="4"
                      opacity={isDragging ? 0.9 : 1}
                    />
                    {node.lines.map((line, idx) => (
                      <text
                        key={`line-${idx}`}
                        x={node.x + nodeWidth / 2}
                        y={node.y + 35 + idx * 25}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="bold"
                        fill="#065f46"
                        className="select-none pointer-events-none"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              } else if (node.type === 'delete') {
                return (
                  <g
                    key={key}
                    onMouseDown={(e) => handleNodeMouseDown(key, e)}
                    style={{ cursor: 'grab' }}
                  >
                    <circle
                      cx={node.x + 45}
                      cy={node.y + 50}
                      r="42"
                      fill={isDragging ? '#fca5a5' : '#fee2e2'}
                      stroke="#dc2626"
                      strokeWidth={isDragging ? '3' : '2'}
                      opacity={isDragging ? 0.9 : 1}
                    />
                    <text
                      x={node.x + 45}
                      y={node.y + 40}
                      textAnchor="middle"
                      fontSize="18"
                      fontWeight="bold"
                      fill="#991b1b"
                      className="select-none pointer-events-none"
                    >
                      ❌
                    </text>
                    <text
                      x={node.x + 45}
                      y={node.y + 65}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="#991b1b"
                      className="select-none pointer-events-none"
                    >
                      {node.intentos} intent
                    </text>
                  </g>
                );
              }
            })}
          </svg>
        </div>
      </div>

      {/* Stage Details Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-900">Detalles de Etapas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-bold text-slate-700">Etapa</th>
                <th className="px-6 py-3 text-left font-bold text-slate-700">Flujo</th>
                <th className="px-6 py-3 text-center font-bold text-slate-700">Rint - Éxito</th>
              </tr>
            </thead>
            <tbody>
              {sortedStages.map((stage, idx) => {
                const nextStage = stages.find(s => s.id === stage.continuar_a_id);
                const backStage = stages.find(s => s.id === stage.regresar_a_id);

                return (
                  <tr key={stage.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-900">{stage.titulo}</div>
                      <div className="font-mono text-xs text-slate-500 mt-1">{stage.clave}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="space-y-1">
                        {nextStage && (
                          <div className="text-green-700 font-semibold text-xs">
                            {nextStage.orden}. {nextStage.clave}
                          </div>
                        )}
                        {!nextStage && (
                          <div className="text-green-700 font-semibold text-xs">Contrato</div>
                        )}
                        {backStage && (
                          <div className="text-amber-600 font-semibold text-xs">
                            {backStage.orden}. {backStage.clave}
                          </div>
                        )}
                        {idx > 0 && stage.intentos_requeridos && stage.intentos_requeridos > 1 && (
                          <div className="text-red-700 font-semibold text-xs">Eliminar</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center font-bold text-slate-900 text-sm">{stage.intentos_requeridos || 1} - {stage.tasa_exito || 0}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
