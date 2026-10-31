// src/components/RouteMap.jsx
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveCoordinates, calculateHaversineDistanceKm, fetchRoadRoute } from '../lib/geo';
import './RouteMap.css';

/**
 * Creates custom SVG marker icons for OpenStreetMap
 */
function createMarkerIcon(label, bgClass) {
  return L.divIcon({
    className: `custom-map-pin ${bgClass}`,
    html: `
      <div class="pin-marker">
        <span class="pin-label">${label}</span>
      </div>
      <div class="pin-shadow"></div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    popupAnchor: [0, -34],
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

  // Strictly verify origin exists independently; never substitute destination coordinates for origin
  const originCoords = origin ? resolveCoordinates(origin.coordinates || origin.location || origin) : null;
  const destCoords = destination ? resolveCoordinates(destination.coordinates || destination.location || destination) : null;

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
    const originPin = createMarkerIcon('A', 'pin-farmer');
    const originMarker = L.marker(coords1, { icon: originPin }).addTo(map);
    originMarker.bindPopup(`
      <div class="map-popup-card">
        <div class="map-popup-header">Origin Point (Farmer)</div>
        <strong>${originName}</strong>
        <p class="body-sm text-muted">${originLoc}</p>
        ${residueType ? `<p class="body-sm"><strong>Residue:</strong> ${residueType} (${quantityTonnes || '—'} tonnes)</p>` : ''}
      </div>
    `);

    // Add Buyer destination marker
    const destPin = createMarkerIcon('B', 'pin-buyer');
    const destMarker = L.marker(coords2, { icon: destPin }).addTo(map);
    destMarker.bindPopup(`
      <div class="map-popup-card">
        <div class="map-popup-header">Destination Facility (Buyer)</div>
        <strong>${destName}</strong>
        <p class="body-sm text-muted">${destLoc}</p>
        ${destUse ? `<p class="body-sm"><strong>Intended Use:</strong> ${destUse}</p>` : ''}
      </div>
    `);

    // Invalidate map size after initial mount and layout settlement
    const t1 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    const t2 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 500);

    // Watch container size shifts (responsive collapse, tab changes, orientation change)
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    const handleWindowResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

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

          map.invalidateSize();
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

          map.invalidateSize();
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

        map.invalidateSize();
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
      clearTimeout(t1);
      clearTimeout(t2);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleWindowResize);
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
            <h4 className="heading-sm">
              {!originCoords ? 'Farmer Origin Location Required' : 'Buyer Location Required'}
            </h4>
            <p className="body-sm text-muted mt-xs">
              {!originCoords
                ? `Transit routing requires a farmer lot location. Please select a farmer residue listing to calculate road transit to ${destName} (${destLoc}).`
                : `Coordinates unavailable for ${destName}. Regional administrative proximity applied.`}
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
