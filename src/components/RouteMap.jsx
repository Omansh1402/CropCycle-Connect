// src/components/RouteMap.jsx
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveCoordinates, calculateHaversineDistanceKm, fetchRoadRoute } from '../lib/geo';
import './RouteMap.css';

/**
 * Creates custom SVG marker icons for OpenStreetMap
 */
function createMarkerIcon(emoji, bgClass) {
  return L.divIcon({
    className: `custom-map-pin ${bgClass}`,
    html: `
      <div class="pin-marker">
        <span class="pin-emoji">${emoji}</span>
      </div>
      <div class="pin-shadow"></div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 42],
    popupAnchor: [0, -38],
  });
}

export default function RouteMap({
  origin,
  destination,
  residueType = '',
  quantityTonnes = null,
  height = '360px',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const originCoords = resolveCoordinates(origin?.coordinates || origin?.location || origin);
  const destCoords = resolveCoordinates(destination?.coordinates || destination?.location || destination);

  const originLat = originCoords?.[0];
  const originLon = originCoords?.[1];
  const destLat = destCoords?.[0];
  const destLon = destCoords?.[1];

  const haversineDist = originCoords && destCoords
    ? calculateHaversineDistanceKm(originCoords, destCoords)
    : null;

  const [routeInfo, setRouteInfo] = useState({
    loading: true,
    isRoadRoute: false,
    distanceKm: haversineDist,
    durationMins: null,
    statusNote: 'Calculating route…',
  });

  const originName = origin?.name || origin?.farmerName || 'Farmer Listing';
  const originLoc = origin?.location || 'Origin Farm';
  const destName = destination?.orgName || destination?.name || 'Buyer Yard';
  const destLoc = destination?.location || 'Delivery Destination';
  const destUse = destination?.intendedUse || '';

  useEffect(() => {
    if (!mapContainerRef.current || originLat == null || destLat == null) return;

    const coords1 = [originLat, originLon];
    const coords2 = [destLat, destLon];

    // Initialize Leaflet map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false, // Prevent page scroll interception
    });
    mapInstanceRef.current = map;

    // Add OpenStreetMap standard tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add Farmer origin marker
    const originPin = createMarkerIcon('🌾', 'pin-farmer');
    const originMarker = L.marker(coords1, { icon: originPin }).addTo(map);
    originMarker.bindPopup(`
      <div class="map-popup-card">
        <div class="map-popup-header">🌾 Farmer Origin</div>
        <strong>${originName}</strong>
        <p class="body-sm text-muted">${originLoc}</p>
        ${residueType ? `<p class="body-sm"><strong>Residue:</strong> ${residueType} (${quantityTonnes || '—'} tonnes)</p>` : ''}
      </div>
    `);

    // Add Buyer destination marker
    const destPin = createMarkerIcon('🏭', 'pin-buyer');
    const destMarker = L.marker(coords2, { icon: destPin }).addTo(map);
    destMarker.bindPopup(`
      <div class="map-popup-card">
        <div class="map-popup-header">🏭 Buyer Processing Yard</div>
        <strong>${destName}</strong>
        <p class="body-sm text-muted">${destLoc}</p>
        ${destUse ? `<p class="body-sm"><strong>Intended Use:</strong> ${destUse}</p>` : ''}
      </div>
    `);

    let isMounted = true;

    // Query OSRM routing service
    fetchRoadRoute(coords1, coords2)
      .then((routeResult) => {
        if (!isMounted) return;

        if (routeResult.success && routeResult.geometry && routeResult.geometry.length > 0) {
          // Road route successfully provided by routing service
          const roadPolyline = L.polyline(routeResult.geometry, {
            color: '#1b4332',
            weight: 5,
            opacity: 0.9,
            lineJoin: 'round',
          }).addTo(map);

          map.fitBounds(roadPolyline.getBounds(), { padding: [40, 40] });

          setRouteInfo({
            loading: false,
            isRoadRoute: true,
            distanceKm: routeResult.roadDistanceKm,
            durationMins: routeResult.roadDurationMinutes,
            statusNote: `Road route via OpenStreetMap (${routeResult.provider})`,
          });
        } else {
          // Fallback: draw straight-line connection (do not invent road route)
          const directPolyline = L.polyline([coords1, coords2], {
            color: '#52b788',
            weight: 3,
            dashArray: '8, 8',
            opacity: 0.8,
          }).addTo(map);

          map.fitBounds(directPolyline.getBounds(), { padding: [40, 40] });

          setRouteInfo({
            loading: false,
            isRoadRoute: false,
            distanceKm: haversineDist,
            durationMins: null,
            statusNote: 'Road routing service unavailable — showing direct coordinate distance (Haversine)',
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const directPolyline = L.polyline([coords1, coords2], {
          color: '#52b788',
          weight: 3,
          dashArray: '8, 8',
          opacity: 0.8,
        }).addTo(map);

        map.fitBounds(directPolyline.getBounds(), { padding: [40, 40] });

        setRouteInfo({
          loading: false,
          isRoadRoute: false,
          distanceKm: haversineDist,
          durationMins: null,
          statusNote: 'Direct coordinate distance (routing offline)',
        });
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [originLat, originLon, destLat, destLon, originName, originLoc, destName, destLoc, destUse, residueType, quantityTonnes, haversineDist]);

  if (!originCoords || !destCoords) {
    return (
      <div className="route-map-fallback card" style={{ minHeight: '160px' }}>
        <div className="fallback-inner">
          <span style={{ fontSize: '2rem' }}>🗺️</span>
          <div>
            <h4 className="heading-sm">Geographic Map Fallback</h4>
            <p className="body-sm text-muted mt-xs">
              Direct coordinates not available for {origin?.location || 'farmer'} or {destination?.location || 'buyer'}.
              Matching engine calculated estimated transit using regional administrative proximity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="route-map-wrapper card">
      <div className="route-map-header">
        <div className="route-map-points">
          <div className="route-point">
            <span className="route-dot route-dot--origin" />
            <span className="body-sm font-bold truncate">
              {origin?.location || origin?.name || 'Origin'}
            </span>
          </div>
          <span className="route-arrow">➔</span>
          <div className="route-point">
            <span className="route-dot route-dot--dest" />
            <span className="body-sm font-bold truncate">
              {destination?.location || destination?.orgName || 'Destination'}
            </span>
          </div>
        </div>

        <div className="route-map-metric">
          {routeInfo.distanceKm != null ? (
            <div className="flex items-center gap-xs">
              <span className="route-distance-badge">
                {routeInfo.isRoadRoute ? '🚗 Road Route: ' : '📏 Direct: '}
                <strong>~{routeInfo.distanceKm} km</strong>
              </span>
              {routeInfo.durationMins && (
                <span className="route-duration-badge">
                  ⏱ ~{routeInfo.durationMins} mins drive
                </span>
              )}
            </div>
          ) : (
            <span className="body-sm text-muted">Estimating distance…</span>
          )}
        </div>
      </div>

      {/* Leaflet map container */}
      <div
        ref={mapContainerRef}
        className="route-map-canvas"
        style={{ height, width: '100%', position: 'relative', zIndex: 1 }}
      />

      {/* Footer status / attribution bar */}
      <div className="route-map-footer">
        <span className="body-xs text-muted flex items-center gap-xs">
          <span className={`status-dot ${routeInfo.isRoadRoute ? 'status-dot--green' : 'status-dot--amber'}`} />
          {routeInfo.statusNote}
        </span>
        <span className="body-xs text-muted">
          Map: OpenStreetMap
        </span>
      </div>
    </div>
  );
}
