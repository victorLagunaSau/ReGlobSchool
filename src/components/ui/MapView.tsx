'use client';

import React from 'react';
// @ts-ignore
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

interface MapViewProps {
    geoUrl: string;
    data: any[];
    projectionConfig?: { scale: number; center: [number, number] };
    viewBox?: string;
    onStateHover?: (stateInfo: any | null) => void;
    onStateClick?: (stateInfo: any) => void;
    overlay?: React.ReactNode;
}

export default function MapView({
    geoUrl,
    data,
    projectionConfig = { scale: 1000, center: [-102.5528, 23.6345] },
    viewBox = "100 50 600 600",
    onStateHover,
    onStateClick,
    overlay
}: MapViewProps) {

    const getColor = (item: any) => {
        if (!item || !item.tieneOcupacion || item.porcentajePresencia <= 0) {
            return "#cbd5e1";
        }

        const perc = item.porcentajePresencia;

        if (perc <= 10) return "#bfdbfe";
        if (perc <= 40) return "#60a5fa";
        if (perc <= 70) return "#3b82f6";
        return "#1d4ed8";
    };

    return (
        <div className="relative w-full aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
            <ComposableMap
                projection="geoMercator"
                projectionConfig={projectionConfig}
                viewBox={viewBox}
                style={{ width: "100%", height: "100%" }}
            >
                <Geographies geography={geoUrl}>
                    {({ geographies }: { geographies: any[] }) =>
                        geographies.map((geo) => {
                            const stateData = data.find(d => d.inegi === geo.properties.CVE_ENT);

                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill={getColor(stateData)}
                                    stroke="#ffffff"
                                    strokeWidth={0.5}
                                    onMouseEnter={() => {
                                        const nombreEstado = geo.properties.NOMGEO || "Sin nombre";
                                        if (onStateHover) {
                                            if (stateData) {
                                                onStateHover({ ...stateData, geoName: nombreEstado });
                                            } else {
                                                onStateHover({ nombre: nombreEstado, sinAsignar: true, inegi: geo.properties.CVE_ENT });
                                            }
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        if (onStateHover) onStateHover(null);
                                    }}
                                    onClick={() => {
                                        const nombreEstado = geo.properties.NOMGEO || "Sin nombre";
                                        if (onStateClick) {
                                            if (stateData) {
                                                onStateClick({ ...stateData, geoName: nombreEstado });
                                            } else {
                                                onStateClick({ nombre: nombreEstado, sinAsignar: true, inegi: geo.properties.CVE_ENT, properties: geo.properties });
                                            }
                                        }
                                    }}
                                    style={{
                                        default: { outline: "none" },
                                        hover: { fill: "#475569", cursor: "pointer", stroke: "#1e293b" }
                                    }}
                                />
                            );
                        })
                    }
                </Geographies>
            </ComposableMap>
            {overlay && (
                <div className="absolute top-4 left-4 bg-white/95 px-3 py-1.5 rounded shadow-sm z-10 pointer-events-none">
                    {overlay}
                </div>
            )}
        </div>
    );
}