import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import 'leaflet/dist/leaflet.css';

// Koordinaten für bekannte Städte/Vereine
const cityCoordinates = {
  // Deutschland
  'München': [48.1351, 11.5820],
  'Berlin': [52.5200, 13.4050],
  'Hamburg': [53.5511, 9.9937],
  'Dortmund': [51.5136, 7.4653],
  'Köln': [50.9375, 6.9603],
  'Frankfurt': [50.1109, 8.6821],
  'Stuttgart': [48.7758, 9.1829],
  'Düsseldorf': [51.2277, 6.7735],
  'Leipzig': [51.3397, 12.3731],
  'Nürnberg': [49.4521, 11.0767],
  'Bremen': [53.0793, 8.8017],
  'Hannover': [52.3759, 9.7320],
  
  // England
  'London': [51.5074, -0.1278],
  'Manchester': [53.4808, -2.2426],
  'Liverpool': [53.4084, -2.9916],
  'Birmingham': [52.4862, -1.8904],
  'Leeds': [53.8008, -1.5491],
  'Newcastle': [54.9783, -1.6178],
  
  // Spanien
  'Madrid': [40.4168, -3.7038],
  'Barcelona': [41.3874, 2.1686],
  'Valencia': [39.4699, -0.3763],
  'Sevilla': [37.3891, -5.9845],
  'Bilbao': [43.2630, -2.9350],
  
  // Italien
  'Rom': [41.9028, 12.4964],
  'Mailand': [45.4642, 9.1900],
  'Turin': [45.0703, 7.6869],
  'Neapel': [40.8518, 14.2681],
  'Florenz': [43.7696, 11.2558],
  
  // Frankreich
  'Paris': [48.8566, 2.3522],
  'Marseille': [43.2965, 5.3698],
  'Lyon': [45.7640, 4.8357],
  'Nizza': [43.7102, 7.2620],
  
  // Weitere
  'Amsterdam': [52.3676, 4.9041],
  'Brüssel': [50.8503, 4.3517],
  'Wien': [48.2082, 16.3738],
  'Zürich': [47.3769, 8.5417],
  'Lissabon': [38.7223, -9.1393],
  'Kopenhagen': [55.6761, 12.5683],
  'Stockholm': [59.3293, 18.0686],
  'Istanbul': [41.0082, 28.9784],
};

const getCoordinatesForClub = (clubName, league, country) => {
  // Versuche zuerst direkt nach Stadtname im Vereinsnamen zu suchen
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (clubName.toLowerCase().includes(city.toLowerCase())) {
      return coords;
    }
  }
  
  // Fallback: Länder-Zentrum
  const countryCoordinates = {
    'Deutschland': [51.1657, 10.4515],
    'England': [52.3555, -1.1743],
    'Spanien': [40.4637, -3.7492],
    'Italien': [41.8719, 12.5674],
    'Frankreich': [46.2276, 2.2137],
    'Niederlande': [52.1326, 5.2913],
    'Belgien': [50.5039, 4.4699],
    'Österreich': [47.5162, 14.5501],
    'Schweiz': [46.8182, 8.2275],
    'Portugal': [39.3999, -8.2245],
  };
  
  return countryCoordinates[country] || [50.0, 10.0];
};

const priorityColors = {
  niedrig: '#10b981',
  mittel: '#f59e0b',
  hoch: '#f97316',
  dringend: '#ef4444',
};

const statusColors = {
  offen: '#94a3b8',
  in_bearbeitung: '#3b82f6',
  angebote_gesendet: '#8b5cf6',
  abgeschlossen: '#10b981',
  abgelehnt: '#ef4444',
};

export default function ClubRequestsMap({ requests = [] }) {
  const navigate = useNavigate();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('alle');
  
  useEffect(() => {
    setMapLoaded(true);
  }, []);

  // Alle Anfragen anzeigen (auch archivierte)
  const allRequests = requests;

  // Gruppiere Anfragen nach Koordinaten (für Cluster)
  const requestsByLocation = allRequests.reduce((acc, request) => {
    const coords = getCoordinatesForClub(request.club_name, request.league, request.country);
    const key = `${coords[0]},${coords[1]}`;
    if (!acc[key]) {
      acc[key] = { coords, requests: [] };
    }
    acc[key].requests.push(request);
    return acc;
  }, {});

  const filteredLocations = Object.values(requestsByLocation).filter(location => {
    if (selectedFilter === 'alle') return true;
    return location.requests.some(r => r.status === selectedFilter);
  });

  const statusCounts = {
    offen: allRequests.filter(r => r.status === 'offen').length,
    in_bearbeitung: allRequests.filter(r => r.status === 'in_bearbeitung').length,
    angebote_gesendet: allRequests.filter(r => r.status === 'angebote_gesendet').length,
    abgeschlossen: allRequests.filter(r => r.status === 'abgeschlossen').length,
  };

  if (!mapLoaded) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <MapPin className="w-5 h-5 text-blue-900 dark:text-blue-400" />
                Geografische Verteilung der Vereinsanfragen
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {allRequests.length} Anfragen auf der Karte
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedFilter === 'alle' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('alle')}
                className={selectedFilter === 'alle' ? 'bg-blue-900' : ''}
              >
                Alle ({allRequests.length})
              </Button>
              {Object.entries(statusCounts).map(([status, count]) => (
                <Button
                  key={status}
                  size="sm"
                  variant={selectedFilter === status ? 'default' : 'outline'}
                  onClick={() => setSelectedFilter(status)}
                  className={selectedFilter === status ? 'bg-blue-900' : ''}
                >
                  {status.replace(/_/g, ' ')} ({count})
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px] relative">
            <MapContainer
              center={[50.0, 10.0]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {filteredLocations.map((location, index) => {
                const totalRequests = location.requests.length;
                const radius = Math.min(8 + (totalRequests * 3), 30);
                
                // Finde dominanten Status
                const statusCount = location.requests.reduce((acc, r) => {
                  acc[r.status] = (acc[r.status] || 0) + 1;
                  return acc;
                }, {});
                const dominantStatus = Object.keys(statusCount).reduce((a, b) => 
                  statusCount[a] > statusCount[b] ? a : b
                );

                return (
                  <CircleMarker
                    key={index}
                    center={location.coords}
                    radius={radius}
                    pathOptions={{
                      fillColor: statusColors[dominantStatus] || '#3b82f6',
                      color: '#fff',
                      weight: 2,
                      opacity: 1,
                      fillOpacity: 0.7,
                    }}
                  >
                    <Popup maxWidth={300} className="custom-popup">
                      <div className="p-2">
                        <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {totalRequests} {totalRequests === 1 ? 'Anfrage' : 'Anfragen'}
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {location.requests.slice(0, 5).map((request) => (
                            <div 
                              key={request.id}
                              className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                              onClick={() => {
                                navigate(createPageUrl("ClubRequestDetail") + "?id=" + request.id);
                              }}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-semibold text-sm text-slate-900">{request.club_name}</p>
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs"
                                  style={{ 
                                    backgroundColor: statusColors[request.status] + '20',
                                    color: statusColors[request.status],
                                    borderColor: statusColors[request.status]
                                  }}
                                >
                                  {request.status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600">{request.league}</p>
                              <p className="text-xs text-slate-600">{request.position_needed}</p>
                              {request.budget_max && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Budget: {(request.budget_max / 1000000).toFixed(1)}M €
                                </p>
                              )}
                            </div>
                          ))}
                          {location.requests.length > 5 && (
                            <p className="text-xs text-slate-500 text-center pt-1">
                              +{location.requests.length - 5} weitere
                            </p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Legende */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Legende:</span>
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                  {status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Größe = Anzahl der Anfragen in der Region
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}