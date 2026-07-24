'use client';

import React, { useEffect, useState } from 'react';
// @ts-ignore
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
// @ts-ignore
import { geoMercator, geoPath } from 'd3-geo';

interface StateMapViewProps {
    geoUrl: string;       // Ruta del GeoJSON del estado (ej: "/data/maps/MX/01.geojson")
    zonesData: any[];     // Arreglo de zonas filtradas para este estado
    onZoneHover?: (zoneInfo: any | null) => void;
    onZoneClick?: (zoneInfo: any) => void;
}

// Dimensión base usada para derivar el ancho/alto del viewBox según la proporción real del estado
const BASE_SIZE = 600;
// Límites de proporción (ancho/alto) para que estados extremadamente alargados no generen cajas absurdas
const MIN_RATIO = 0.55;
const MAX_RATIO = 1.6;

interface ProjectionState {
    center: [number, number];
    scale: number;
    width: number;
    height: number;
}

export default function StateMapView({
    geoUrl,
    zonesData,
    onZoneHover,
    onZoneClick
}: StateMapViewProps) {

    // Cada estado tiene coordenadas y proporciones distintas (algunos muy alargados,
    // como Baja California o Tamaulipas), así que el centro, la escala y el propio
    // lienzo (viewBox) se calculan dinámicamente a partir de su geojson.
    const [projection, setProjection] = useState<ProjectionState | null>(null);

    useEffect(() => {
        let cancelled = false;
        setProjection(null);

        fetch(geoUrl)
            .then((res) => res.json())
            .then((geoData) => {
                if (cancelled) return;

                // 1. Medimos el rectángulo envolvente real de la geometría (a escala 1, sin desplazar).
                const rawProjection = geoMercator().center([0, 0]).scale(1).translate([0, 0]);
                const bounds = geoPath(rawProjection).bounds(geoData);
                const dx = bounds[1][0] - bounds[0][0];
                const dy = bounds[1][1] - bounds[0][1];

                // 2. El punto que debe quedar exactamente en el centro del lienzo es el punto medio
                //    del rectángulo envolvente (NO el centroide geográfico, que en estados con forma
                //    irregular o apéndices queda descentrado respecto a su propio rectángulo).
                const midX = (bounds[0][0] + bounds[1][0]) / 2;
                const midY = (bounds[0][1] + bounds[1][1]) / 2;
                const center = rawProjection.invert([midX, midY]) as [number, number];

                // 3. Lienzo con la proporción real del estado (limitada para evitar cajas extremas)
                //    y escala calculada para que el rectángulo envolvente ocupe ~85% del lienzo.
                const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, dx / dy));
                const height = BASE_SIZE;
                const width = Math.round(BASE_SIZE * ratio);
                const scale = 0.85 / Math.max(dx / width, dy / height);

                setProjection({ center, scale, width, height });
            })
            .catch((error) => console.error('Error calculando la proyección del mapa estatal:', error));

        return () => {
            cancelled = true;
        };
    }, [geoUrl]);

    // Regla de color idéntica a la que validamos con éxito
    const getZoneColor = (geoProperties: any) => {
        const munCode = geoProperties.CVE_MUN || geoProperties.CVEGEO;

        const matchedZone = zonesData.find((z: any) =>
            String(z.CveMunicipio) === String(Number(munCode)) ||
            String(z.CVEGEO) === String(munCode)
        );

        if (!matchedZone) return "#e2e8f0"; // Gris si no existe

        const val = matchedZone.assignedTo;
        if (!val) return "#e2e8f0";

        const cleanVal = String(val).trim().toLowerCase();
        if (cleanVal === "" || cleanVal === "libre") {
            return "#e2e8f0"; // Gris neutro (Libre)
        }

        return "#2563eb"; // Azul Comercial (Ocupado)
    };

    return (
        <div
            className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center"
            style={{ aspectRatio: projection ? projection.width / projection.height : 4 / 3, maxHeight: 620 }}
        >
            {!projection ? (
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ center: projection.center, scale: projection.scale }}
                    width={projection.width}
                    height={projection.height}
                    style={{ width: "100%", height: "100%" }}
                >
                    <Geographies geography={geoUrl}>
                        {({ geographies }: { geographies: any[] }) =>
                            geographies.map((geo) => {
                                const munCode = geo.properties.CVE_MUN || geo.properties.CVEGEO;
                                const matchedZone = zonesData.find((z: any) =>
                                    String(z.CveMunicipio) === String(Number(munCode)) ||
                                    String(z.CVEGEO) === String(munCode)
                                );

                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={getZoneColor(geo.properties)}
                                        stroke="#ffffff"
                                        strokeWidth={0.8}
                                        onMouseEnter={() => {
                                            if (onZoneHover) {
                                                onZoneHover(matchedZone || {
                                                    Ciudad: geo.properties.NOMGEO || geo.properties.NOMBRE,
                                                    assignedTo: "Libre",
                                                    sinRegistro: true
                                                });
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (onZoneHover) onZoneHover(null);
                                        }}
                                        onClick={() => {
                                            if (onZoneClick) {
                                                onZoneClick(matchedZone || {
                                                    Ciudad: geo.properties.NOMGEO || geo.properties.NOMBRE,
                                                    assignedTo: "Libre",
                                                    sinRegistro: true,
                                                    CVEGEO: munCode
                                                });
                                            }
                                        }}
                                        style={{
                                            default: { outline: "none" },
                                            // Gris oscuro para hover/selección: el azul queda reservado únicamente para "Ocupado"
                                            hover: { fill: "#475569", cursor: "pointer", stroke: "#ffffff" }
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>
                </ComposableMap>
            )}
        </div>
    );
}
