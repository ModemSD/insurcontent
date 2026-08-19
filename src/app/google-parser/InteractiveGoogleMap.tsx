'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CompanyLead, ZoneConfig } from './actions';

// Генерируем красивую иконку для каждой зоны по номеру (Зона #1, Зона #2...)
const zoneCenterIcon = (index: number, isActive: boolean) =>
  L.divIcon({
    className: 'custom-zone-marker',
    html: `<div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${isActive ? '28px' : '22px'};
      height: ${isActive ? '28px' : '22px'};
      background-color: ${isActive ? '#2563EB' : '#64748B'};
      color: #FFFFFF;
      font-weight: 800;
      font-size: 11px;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
    ">${index + 1}</div>`,
    iconSize: [isActive ? 28 : 22, isActive ? 28 : 22],
    iconAnchor: [isActive ? 14 : 11, isActive ? 14 : 11],
  });

// Иконки найденных компаний
const companyPinIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'custom-company-marker',
    html: `<div style="
      width: ${isSelected ? '24px' : '16px'};
      height: ${isSelected ? '24px' : '16px'};
      background-color: ${isSelected ? '#10B981' : '#EF4444'};
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
    "></div>`,
    iconSize: [isSelected ? 24 : 16, isSelected ? 16 : 16],
    iconAnchor: [isSelected ? 12 : 8, isSelected ? 8 : 8],
  });

interface MapControllerProps {
  activeZone: ZoneConfig;
  zones: ZoneConfig[];
  onActiveZoneCenterChange: (center: { lat: number; lng: number }) => void;
}

function MapController({ activeZone, zones, onActiveZoneCenterChange }: MapControllerProps) {
  const map = useMap();
  const activeLat = activeZone.centerLat;
  const activeLng = activeZone.centerLng;
  const activeId = activeZone.id;
  const zonesCount = zones.length;

  // При изменении координат активной зоны или списка зон обновляем карту
  useEffect(() => {
    if (zonesCount === 1) {
      map.flyTo([activeLat, activeLng], map.getZoom() < 11 ? 12 : map.getZoom(), {
        animate: true,
        duration: 1.2,
      });
    } else if (zonesCount > 1) {
      const bounds = L.latLngBounds(zones.map((z) => [z.centerLat, z.centerLng]));
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [activeLat, activeLng, activeId, zonesCount, map]);

  useMapEvents({
    click(e) {
      onActiveZoneCenterChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return null;
}

interface InteractiveMapProps {
  zones: ZoneConfig[];
  activeZoneId: string;
  onSelectActiveZone: (id: string) => void;
  onActiveZoneCenterChange: (center: { lat: number; lng: number }) => void;
  onZoneDragEnd: (zoneId: string, center: { lat: number; lng: number }) => void;
  companies: CompanyLead[];
  selectedCompanyId?: string | null;
  onSelectCompany?: (id: string) => void;
}

export default function InteractiveGoogleMap({
  zones,
  activeZoneId,
  onSelectActiveZone,
  onActiveZoneCenterChange,
  onZoneDragEnd,
  companies,
  selectedCompanyId,
  onSelectCompany,
}: InteractiveMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const activeZone = zones.find((z) => z.id === activeZoneId) || zones[0];

  return (
    <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm z-0">
      <MapContainer
        center={[activeZone.centerLat, activeZone.centerLng]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapController
          activeZone={activeZone}
          zones={zones}
          onActiveZoneCenterChange={onActiveZoneCenterChange}
        />

        {/* Бело-синяя интерактивная карта */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Рендеринг всех зон (кругов и маркеров) */}
        {zones.map((zone, idx) => {
          const isActive = zone.id === activeZoneId;

          return (
            <React.Fragment key={zone.id}>
              {/* Круг зоны */}
              <Circle
                center={[zone.centerLat, zone.centerLng]}
                radius={zone.radiusKm * 1000}
                pathOptions={{
                  color: isActive ? '#2563EB' : '#94A3B8',
                  fillColor: isActive ? '#3B82F6' : '#CBD5E1',
                  fillOpacity: isActive ? 0.18 : 0.08,
                  weight: isActive ? 2.5 : 1.5,
                  dashArray: isActive ? '6, 6' : '4, 4',
                }}
              />

              {/* Маркер центра зоны с номером */}
              <Marker
                position={[zone.centerLat, zone.centerLng]}
                icon={zoneCenterIcon(idx, isActive)}
                draggable={true}
                eventHandlers={{
                  click() {
                    onSelectActiveZone(zone.id);
                  },
                  dragend(e) {
                    const marker = e.target;
                    const pos = marker.getLatLng();
                    onZoneDragEnd(zone.id, { lat: pos.lat, lng: pos.lng });
                  },
                }}
              >
                <Popup>
                  <div className="p-1 font-sans">
                    <div className="font-bold text-xs text-slate-900 mb-0.5">Зона #{idx + 1}</div>
                    <div className="text-[11px] text-slate-600">Радиус: {zone.radiusKm} км</div>
                    <div className="text-[10px] text-slate-400 mt-1">Кликните по маркеру, чтобы сделать активной</div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Маркеры компаний */}
        {companies.map((company) => {
          if (!company.lat || !company.lng) return null;
          const isSelected = company.id === selectedCompanyId;

          return (
            <Marker
              key={company.id}
              position={[company.lat, company.lng]}
              icon={companyPinIcon(isSelected)}
              eventHandlers={{
                click() {
                  onSelectCompany?.(company.id);
                },
              }}
            >
              <Popup>
                <div className="p-1 max-w-[220px]">
                  <div className="font-bold text-xs text-slate-900 mb-1">{company.title}</div>
                  {company.category && (
                    <div className="text-[10px] text-slate-500 mb-2">{company.category}</div>
                  )}
                  {company.phone && (
                    <div className="text-[11px] font-mono text-slate-800 mb-1">📞 {company.phone}</div>
                  )}
                  {company.email && (
                    <div className="text-[11px] text-blue-600 font-semibold mb-1 truncate">
                      ✉️ {company.email}
                    </div>
                  )}
                  {company.website && (
                    <div className="text-[11px] text-slate-600 truncate">🌐 {company.website}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Верхний баннер с подсказкой */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200/80 text-[11px] font-bold text-slate-700 shadow-sm flex items-center gap-2 select-none">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
        <span>Активна Зона #{zones.findIndex((z) => z.id === activeZoneId) + 1} ({activeZone.radiusKm} км). Кликните по карте для смены ее центра.</span>
      </div>
    </div>
  );
}
