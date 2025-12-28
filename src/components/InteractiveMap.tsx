import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

interface InteractiveMapProps {
  center: [number, number];
  radius: number;
  onLocationChange: (lat: number, lng: number) => void;
  onRadiusChange: (radius: number) => void;
  address?: string;
  className?: string;
}

const LocationMarker = ({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number]; 
  onPositionChange: (lat: number, lng: number) => void;
}) => {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const { lat, lng } = marker.getLatLng();
        onPositionChange(lat, lng);
      }
    },
  };

  const icon = L.icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  return (
    <Marker
      ref={markerRef}
      position={position}
      draggable={true}
      eventHandlers={eventHandlers}
      icon={icon}
    />
  );
};

const MapClickHandler = ({ 
  onMapClick 
}: { 
  onMapClick: (lat: number, lng: number) => void;
}) => {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    
    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);
  
  return null;
};

const MapCenterUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [map, center]);
  
  return null;
};

const LocateButton = ({ onLocate }: { onLocate: (lat: number, lng: number) => void }) => {
  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocate(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
        }
      );
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="absolute top-4 right-4 shadow-lg pointer-events-auto"
      onClick={(e) => {
        e.stopPropagation();
        handleLocate();
      }}
    >
      <Navigation className="w-4 h-4 mr-2" />
      Minha Localização
    </Button>
  );
};

const DynamicTileLayer = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = isDark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <TileLayer
      attribution={attribution}
      url={tileUrl}
      key={`tiles-${resolvedTheme}`}
    />
  );
};

export const InteractiveMap = ({
  center,
  radius,
  onLocationChange,
  onRadiusChange,
  address,
  className,
}: InteractiveMapProps) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [mapRadius, setMapRadius] = useState(radius);
  const [isMounted, setIsMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setMapCenter(center);
  }, [center]);

  useEffect(() => {
    setMapRadius(radius);
  }, [radius]);

  const handleMapClick = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    onLocationChange(lat, lng);
  };

  const handleLocate = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    onLocationChange(lat, lng);
  };

  const handleMarkerDrag = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    onLocationChange(lat, lng);
  };

  if (!isMounted) {
    return (
      <div className={cn("relative w-full h-full rounded-lg overflow-hidden border flex items-center justify-center bg-muted", className)}>
        <div className="text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50 animate-pulse" />
          <p className="text-sm text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  const circleColor = isDark ? "#3b82f6" : "#0ea5e9";

  return (
    <div className={cn("relative w-full h-full rounded-lg overflow-hidden border", className)}>
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        className="z-0"
        scrollWheelZoom={true}
      >
        <DynamicTileLayer />
        <MapCenterUpdater center={mapCenter} />
        <MapClickHandler onMapClick={handleMapClick} />
        {mapCenter[0] !== 0 && mapCenter[1] !== 0 && (
          <>
            <LocationMarker position={mapCenter} onPositionChange={handleMarkerDrag} />
            <Circle
              center={mapCenter}
              radius={mapRadius}
              pathOptions={{
                color: circleColor,
                fillColor: circleColor,
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          </>
        )}
      </MapContainer>
      {isMounted && (
        <div className="absolute inset-0 pointer-events-none z-[9998]">
          <LocateButton onLocate={handleLocate} />
        </div>
      )}
      <div className="absolute bottom-4 left-4 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-md pointer-events-auto">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {address || `${mapCenter[0].toFixed(4)}, ${mapCenter[1].toFixed(4)}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Raio: {mapRadius >= 1000 ? `${(mapRadius / 1000).toFixed(1)} km` : `${mapRadius} m`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
