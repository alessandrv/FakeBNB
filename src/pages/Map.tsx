import React, { useState, useRef, useEffect, CSSProperties, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { properties } from '../data/properties';
import SearchBar from '../components/SearchBar';
import { Card, Badge, Button } from '@heroui/react';
import { DraggableBottomSheet, DraggableBottomSheetHandle } from '../components/DraggableBottomSheet';
import { loadGoogleMapsApi, isGoogleMapsLoaded, onGoogleMapsLoaded } from '../services/GoogleMapsService';

// Definizione delle interfacce
interface SearchParams {
  location: string;
  checkIn: string;
  checkOut: string;
}

interface Property {
  id: string;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  }
}

// Dichiarazione per estendere l'oggetto window
declare global {
  interface Window {
    google?: any;
    lastBoundsLog?: number;
    initGoogleCallback?: () => void;
    lastInitWarnLog?: number;
    lastVisibleUpdate?: number;
    mapPropertyActions?: any;
    isGoogleMapsLoading?: boolean;
  }
}

// Definizione del tipo di marker per evitare errori di lint
type GoogleMapMarker = google.maps.Marker | google.maps.marker.AdvancedMarkerElement | any;

// Flag globale per tracciare il caricamento di Google Maps
let isGoogleMapsScriptLoading = false;
let googleMapsScriptLoaded = false;

// Funzione per iniettare un polyfill che sostituisce google.maps.Marker con AdvancedMarkerElement
const injectMarkerPolyfill = () => {
  if (!window.google || !window.google.maps || !window.google.maps.marker || !window.google.maps.marker.AdvancedMarkerElement) {
    console.warn("[POLYFILL] Cannot inject marker polyfill - required APIs not available");
    return;
  }
  
  console.log("[POLYFILL] Injecting AdvancedMarkerElement polyfill for google.maps.Marker");
  
  // Salva un riferimento all'originale
  const OriginalMarker = window.google.maps.Marker;
  
  // Sostituzione di google.maps.Marker con AdvancedMarkerElement
  window.google.maps.Marker = function(options: google.maps.MarkerOptions) {
    console.log("[POLYFILL] Creating an AdvancedMarkerElement instead of Marker");
    
    const advancedOptions: any = { ...options };
    
    // Gestisci le opzioni speciali di Marker
    if (options.icon) {
      // Crea un elemento HTML per rappresentare l'icona
      const markerElement = document.createElement('div');
      markerElement.style.width = '32px';
      markerElement.style.height = '32px';
      
      if (typeof options.icon === 'string') {
        // Icona semplice stringa URL
        markerElement.innerHTML = `
          <img src="${options.icon}" alt="marker" style="width: 100%; height: 100%;" />
        `;
      } else if ((options.icon as any).url) {
        // Icona oggetto con URL
        markerElement.innerHTML = `
          <img src="${(options.icon as any).url}" alt="marker" style="width: 100%; height: 100%;" />
        `;
      } else {
        // Marker di default
        markerElement.innerHTML = `
          <div style="background-color: #2563eb; width: 30px; height: 30px; border-radius: 50%; 
               display: flex; align-items: center; justify-content: center; 
               border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
        </div>
        `;
      }
      
      advancedOptions.content = markerElement;
      delete advancedOptions.icon;
    }
    
    // Crea l'AdvancedMarkerElement
    const advancedMarker = new window.google.maps.marker.AdvancedMarkerElement(advancedOptions);
    
    // Aggiungi metodi di compatibilità
    advancedMarker.setAnimation = function() {
      // Non fa nulla, l'animazione viene gestita in modo diverso per AdvancedMarkerElement
      console.warn("[POLYFILL] setAnimation is not supported by AdvancedMarkerElement");
    };
    
    // Sovrascrive addListener per mapparlo a addEventListener
    const originalAddListener = advancedMarker.addListener;
    advancedMarker.addListener = function(event: string, handler: (...args: any[]) => void) {
      if (event === 'click') {
        return advancedMarker.addEventListener('click', handler);
      }
      // Fallback al metodo originale per altri tipi di eventi
      if (originalAddListener) {
        return originalAddListener(event, handler);
      }
    };
    
    return advancedMarker;
  } as unknown as typeof google.maps.Marker;
  
  // Mantieni le proprietà statiche dell'oggetto originale
  Object.assign(window.google.maps.Marker, OriginalMarker);
  
  // Assicurati che il constructor e prototype siano corretti
  window.google.maps.Marker.prototype = OriginalMarker.prototype;
  
  console.log("[POLYFILL] Successfully replaced google.maps.Marker with AdvancedMarkerElement");
};

// ID univoco per la mappa
const MAP_ID = 'connectlivin-map';

// Stili CSS per la mappa affiancata alla sidebar su desktop
const mapContainerStyle: CSSProperties = {
  width: '100%',
  height: '100vh',
  position: 'relative',
  top: 0,
  right: 0,
  zIndex: 0,
  background: '#f0f0f0'
};

// Stile per elementi che non devono intercettare gli eventi della mappa
const transparentToCursor: CSSProperties = {
  pointerEvents: 'none'
};

// Stile per elementi che devono essere interattivi
const interactiveElement: CSSProperties = {
        pointerEvents: 'auto'
};

// Stile personalizzato per la searchbar migliorato
const searchBarStyle: CSSProperties = {
  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
  borderRadius: '30px', 
  overflow: 'hidden',
  background: 'white',
  border: 'none',
  outline: 'none',
  padding: '0',
  maxWidth: '600px',
  width: '100%'
};

// Stile per il contenitore della search bar versione desktop
const searchBarContainerStyle: CSSProperties = {
  ...interactiveElement,
  position: 'absolute',
  top: '55px', 
  left: '50%',
  transform: 'translateX(-50%)',
  width: '50%',
  maxWidth: '600px',
  zIndex: 20,
  padding: '0 10px',
  border: 'none'
};

// Stile per il contenitore della search bar versione mobile
const mobileSearchBarContainerStyle: CSSProperties = {
  ...interactiveElement,
  position: 'fixed',
  top: '0',
  left: '0',
  width: '100%',
  padding: '8px 16px 60px 16px', // Aumentato il padding bottom per dare spazio ai dropdown
  backgroundColor: 'transparent',
  borderBottom: 'none',
  zIndex: 50,
  boxShadow: 'none',
  border: 'none'
};

// Stile per il pulsante flottante della lista mobile
const mobileListButtonStyle: CSSProperties = {
  position: 'fixed',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#2563eb',
  color: 'white',
  padding: '12px 24px',
  borderRadius: '30px',
  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
  zIndex: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  border: 'none',
  fontWeight: 'bold',
  fontSize: '14px'
};

// Stile per il drawer (tendina) mobile
const mobileDrawerStyle = (isOpen: boolean): CSSProperties => ({
  position: 'fixed',
  bottom: isOpen ? '0' : '-100%',
  left: '0',
  width: '100%',
  height: '80%',
  backgroundColor: 'white',
  transition: 'bottom 0.3s ease-in-out',
  zIndex: 30,
  borderTopLeftRadius: '16px',
  borderTopRightRadius: '16px',
  boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

const MapPage: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<{[key: string]: GoogleMapMarker}>({});
  const infoWindowRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bottomSheetRef = useRef<DraggableBottomSheetHandle>(null);
  
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [visibleProperties, setVisibleProperties] = useState<Property[]>([]);
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [showListOnly, setShowListOnly] = useState(false);
  const [placesApiReady, setPlacesApiReady] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'list' | 'map'>('map');
  
  // Aggiungi un riferimento per tenere traccia del marker di ricerca corrente
  const searchMarkerRef = useRef<GoogleMapMarker | null>(null);
  
  // Trasforma i dati delle proprietà usando useMemo per evitare ricreazioni inutili
  const houses = useMemo(() => {
    console.log("Memoizing properties array");
    return properties.map(property => ({
      id: property.id,
      title: property.title,
      price: property.price,
      rating: property.rating,
      reviews: property.reviews,
      image: property.image,
      description: property.description,
      location: {
        lat: property.location.lat,
        lng: property.location.lng
      }
    }));
  }, []);
  
  console.log("Totale proprietà disponibili:", houses.length);

  // Carica tutte le proprietà all'inizio e assicurati che siano visibili sulla mappa
  useEffect(() => {
    console.log("[STARTUP] Inizializzando le proprietà visibili con tutte le proprietà disponibili");
    // Non impostiamo più automaticamente tutte le proprietà come visibili all'avvio
    // Verrà gestito dalla funzione updateVisibleProperties dopo l'inizializzazione della mappa
  }, []); // Rimuovo houses dalle dipendenze per evitare loop infinito

  // Funzione per aggiornare le proprietà visibili in base ai bounds della mappa
  const updateVisibleProperties = () => {
    // Log per debugging
    console.log("--------- INIZIO UPDATE VISIBLE PROPERTIES ---------");
    
    // Controllo più rigoroso per la mappa
    if (!googleMapRef.current || 
        !window.google || 
        !window.google.maps || 
        !window.google.maps.LatLng || 
        !mapLoaded) {
      
      console.warn("[UPDATE_VISIBLE] Mappa non inizializzata completamente, non posso filtrare le proprietà");
      return;
    }

    try {
      // Verifica aggiuntiva per assicurarsi che la mappa sia pronta
      if (typeof googleMapRef.current.getBounds !== 'function') {
        console.warn("[UPDATE_VISIBLE] getBounds non è una funzione, la mappa potrebbe non essere completamente inizializzata");
      return;
    }

      // Ottiene i bounds attuali della mappa
      const bounds = googleMapRef.current.getBounds();
      
      if (!bounds) {
        console.warn("[UPDATE_VISIBLE] Map bounds non disponibili, non posso filtrare le proprietà");
        return;
      }
      
      // Ottieni i valori dei bounds per la console
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      // Log per debugging
      console.log(`[UPDATE_VISIBLE] Bounds: SW(${sw.lat().toFixed(5)}, ${sw.lng().toFixed(5)}) NE(${ne.lat().toFixed(5)}, ${ne.lng().toFixed(5)})`);
      
      // IMPORTANTE: Filtra le case che sono all'interno dei bounds attuali della mappa
      const visibleHouses = houses.filter(house => {
        if (!house.location || typeof house.location.lat !== 'number' || typeof house.location.lng !== 'number') {
          return false;
        }
        
        // Verifica che la casa sia all'interno dei bounds attuali
        const isInBounds = 
          house.location.lat >= sw.lat() && 
          house.location.lat <= ne.lat() && 
          house.location.lng >= sw.lng() && 
          house.location.lng <= ne.lng();
        
        return isInBounds;
      });
      
      // Log per debugging
      console.log(`[UPDATE_VISIBLE] Trovate ${visibleHouses.length} proprietà visibili su ${houses.length} totali`);
      
      // Aggiorna lo stato solo se è cambiato
      if (JSON.stringify(visibleHouses.map(h => h.id).sort()) !== JSON.stringify(visibleProperties.map(h => h.id).sort())) {
        console.log(`[UPDATE_VISIBLE] Aggiornamento stato: ${visibleHouses.length} proprietà saranno visibili nella lista`);
        setVisibleProperties(visibleHouses);
      } else {
        console.log(`[UPDATE_VISIBLE] Nessun cambiamento nelle proprietà visibili, mantengo lo stato attuale`);
      }
      
      // Aggiorna anche i marker sulla mappa
      Object.keys(markersRef.current).forEach(propertyId => {
        const marker = markersRef.current[propertyId];
        const isVisible = visibleHouses.some(p => p.id === propertyId);
        
        // Se il marker esiste, aggiorna la sua visibilità
        if (marker) {
          try {
            // Per AdvancedMarkerElement
            if (typeof marker.map !== 'undefined') {
              if (isVisible && marker.map === null) {
                marker.map = googleMapRef.current;
              } else if (!isVisible && marker.map !== null) {
                marker.map = null;
              }
            } 
            // Per marker standard
            else if (typeof marker.setMap === 'function') {
              if (isVisible && !marker.getMap()) {
                marker.setMap(googleMapRef.current);
              } else if (!isVisible && marker.getMap()) {
                marker.setMap(null);
              }
            }
          } catch (err) {
            console.warn(`[UPDATE_VISIBLE] Errore nell'aggiornare il marker per la proprietà ${propertyId}:`, err);
          }
        }
      });
    } catch (error) {
      console.error("[UPDATE_VISIBLE] Errore durante l'aggiornamento delle proprietà visibili:", error);
    }
    
    console.log("--------- FINE UPDATE VISIBLE PROPERTIES ---------");
  };
  
  // Hook per assicurare che gli eventi della mappa funzionino correttamente
  useEffect(() => {
    const handleWindowLoad = () => {
      console.log("Window load event triggered");
      
      // Rimuove immediatamente il blocco dello schermo
      document.body.style.overflow = 'auto';
      
      // Rimuove immediatamente la classe di caricamento
      if (mapRef.current) {
        mapRef.current.classList.remove('loading-map');
        mapRef.current.style.pointerEvents = 'auto';
        mapRef.current.style.cursor = 'grab';
      }
      
      // Rimuove pointer-events da tutti gli overlay
      if (overlayRef.current) {
        overlayRef.current.style.pointerEvents = 'none';
        overlayRef.current.style.display = 'none'; // Nasconde completamente l'overlay
      }
    };
    
    window.addEventListener('load', handleWindowLoad);
    
    return () => {
      window.removeEventListener('load', handleWindowLoad);
    };
  }, []);

  // Funzione per inizializzare la mappa con tutti i marker e gli eventi
  const initializeMap = () => {
    // Rimuove immediatamente l'overlay di loading
    onMapReady();
    
    // All'inizio dell'inizializzazione aggiungiamo una costante per lo stile
    const MAP_STYLE_ID = import.meta.env.VITE_GOOGLE_MAPS_STYLE_ID || "e364d3818cec701"; // Fallback in caso di variabile mancante
    
    // Controllo più rigoroso per l'API di Google Maps
    if (!mapRef.current) {
      console.error("[INIT_MAP] Map container reference not available");
      setMapError(true);
      // Fallback: mostra tutte le proprietà nella lista
      setVisibleProperties(houses);
      setShowListOnly(true);
      return;
    }

    if (!window.google || !window.google.maps || !window.google.maps.Map) {
      console.error("[INIT_MAP] Google Maps API not available");
      setMapError(true);
      // Fallback: mostra tutte le proprietà nella lista
      setVisibleProperties(houses);
      setShowListOnly(true);
      return;
    }

    try {
      console.log("[INIT_MAP] Creating map instance...");
      
      // Variabili per tenere traccia degli event listener per la pulizia
      const eventListeners: google.maps.MapsEventListener[] = [];
      
      // Assicuriamoci che l'elemento DIV abbia un ID
      if (!mapRef.current.id) {
        mapRef.current.id = MAP_ID;
      }
      
      // Imposta esplicitamente le proprietà di interattività
      mapRef.current.style.pointerEvents = 'auto';
      mapRef.current.style.cursor = 'grab';
      
      // Calcola il centro iniziale della mappa in base a tutte le proprietà
      let bounds = new window.google.maps.LatLngBounds();
      let hasValidProperties = false;
      
      houses.forEach(property => {
        if (property.location && property.location.lat && property.location.lng) {
          try {
            bounds.extend(new window.google.maps.LatLng(
              property.location.lat,
              property.location.lng
            ));
            hasValidProperties = true;
          } catch (err) {
            console.error(`[INIT_MAP] Errore nell'aggiungere la posizione della proprietà ${property.id}:`, err);
          }
        }
      });
      
      // Crea la mappa centrata correttamente per vedere tutte le case
      const mapOptions: any = {
        zoom: hasValidProperties ? 6 : 5,
        center: hasValidProperties ? bounds.getCenter() : { lat: 41.9028, lng: 12.4964 }, // Default a Roma se non ci sono proprietà
        mapTypeControl: false, // Disabilita i controlli per cambiare tipo di mappa (satellite/roadmap)
        streetViewControl: false, // Disabilita lo Street View (omino)
        fullscreenControl: false, // Disabilita il controllo per la visualizzazione a schermo intero
        mapId: MAP_STYLE_ID, // ID stile custom per una mappa ultra-minimal senza POI
        scrollwheel: true,
        draggable: true,
        keyboardShortcuts: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        clickableIcons: false, // Disabilita le icone cliccabili per POI
        disableDefaultUI: true, // Disabilita tutti i controlli predefiniti  
      };
      
      console.log("[INIT_MAP] Creating map with options:", mapOptions);
      
      // Assicurati che il riferimento sia pulito prima di inizializzare
      if (googleMapRef.current) {
        console.log("[INIT_MAP] Clearing previous map reference");
        googleMapRef.current = null;
      }
      
      // Crea la mappa
      const map = new window.google.maps.Map(mapRef.current, mapOptions);
      
      // Verifica che la mappa sia stata creata correttamente con un controllo più rigoroso
      if (!map || typeof map.getCenter !== 'function') {
        console.error("[INIT_MAP] Failed to create map instance or invalid map object");
        setMapError(true);
        return;
      }
      
      // Variabile per tracciare se la mappa è già stata inizializzata
      let mapInitialized = false;
      
      // Funzione condivisa per completare l'inizializzazione della mappa
      const completeMapInitialization = (map: google.maps.Map) => {
        try {
          console.log("[INIT] Completamento inizializzazione della mappa");
          
          // Imposta il riferimento alla mappa
          googleMapRef.current = map;
          
          // Aggiorna lo stato - mappa caricata
          setMapLoaded(true);
          mapInitialized = true;
          
          // Visualizza tutte le proprietà inizialmente
          updateVisibleProperties();

          // Aggiungi listener per gli eventi della mappa che filtreranno le proprietà visibili
          // CAMBIO IMPORTANTE: aggiungiamo un debounce agli eventi della mappa
          let updateTimeout: number | null = null;
          
          const handleMapChange = () => {
            console.log("[MAP_CHANGE] Cambiamento nella mappa rilevato");
            // Cancella il timer precedente se esiste
            if (updateTimeout !== null) {
              window.clearTimeout(updateTimeout);
            }
            
            // Crea un nuovo timer che aggiorna le proprietà visibili dopo un breve ritardo
            updateTimeout = window.setTimeout(() => {
              console.log("[MAP_CHANGE] Aggiorno proprietà visibili dopo debounce");
              updateVisibleProperties();
              updateTimeout = null;
            }, 300); // 300ms debounce
          };
          
          // Aggiungi gli event listener con debounce
          map.addListener('bounds_changed', handleMapChange);
          map.addListener('zoom_changed', handleMapChange);
          map.addListener('dragend', handleMapChange);
          
          // NUOVO: Aggiungi un handler separato per la fine del caricamento della mappa
          map.addListener('idle', () => {
            console.log("[MAP_IDLE] Mappa in stato idle, aggiorno proprietà");
            // Forza l'aggiornamento delle proprietà visibili quando la mappa è completamente caricata e pronta
            updateVisibleProperties();
          });

          // Aggiungi i marker per tutte le proprietà
          try {
            // Rimosso console.log per l'aggiunta di marker
            
            // Aggiungi marker in batch per migliorare le performance
            setTimeout(() => {
              addMarkersInBatches(0, 20);
            }, 200);
          } catch (error) {
            console.error("[INIT_MAP] Errore durante l'aggiunta dei marker:", error);
          }

          // Funzione per aggiungere marker in batch per migliorare le performance
          const addMarkersInBatches = (startIdx: number, batchSize: number) => {
            const endIdx = Math.min(startIdx + batchSize, houses.length);
            
            for (let i = startIdx; i < endIdx; i++) {
              const house = houses[i];
              try {
                // Verifica nuovamente che la mappa sia valida prima di ogni marker
                if (!googleMapRef.current) continue;
                
                // Verifica se AdvancedMarkerElement è disponibile
                let marker: GoogleMapMarker;
                
                if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                  // Usa AdvancedMarkerElement (metodo consigliato)
                  console.log(`[MARKER] Using AdvancedMarkerElement for property ${house.id}`);
                  
                  // Crea un elemento personalizzato per il marker
                  const markerElement = document.createElement('div');
                  markerElement.innerHTML = `
                    <div style="width: 40px; height: 50px; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.4));">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="40" height="50">
                        <!-- Penombra dell'icona -->
                        <ellipse cx="12" cy="30" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/>
                        
                        <!-- Casa con tetto e dettagli -->
                        <path d="M22,11L12,2L2,11v2h2v12c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V13h2V11z" fill="#2563eb"/>
                        <path d="M12,4L4,11h2v12c0,0.55,0.45,1,1,1h10c0.55,0,1-0.45,1-1V11h2L12,4z" fill="#4285f4"/>
                        
                        <!-- Riflessi e ombre -->
                        <path d="M12,4L4,11h2v12c0,0.55,0.45,1,1,1h10c0.55,0,1-0.45,1-1V11h2L12,4z" fill="url(#grad1)"/>
                        
                        <!-- Porta -->
                        <rect x="9.5" y="16" width="5" height="9" rx="1" fill="#1e3a8a"/>
                        
                        <!-- Finestre -->
                        <rect x="6" y="13" width="3" height="3" rx="0.5" fill="#bfdbfe"/>
                        <rect x="15" y="13" width="3" height="3" rx="0.5" fill="#bfdbfe"/>
                        <circle cx="12" cy="9" r="1.5" fill="#dbeafe"/>
                        
                        <!-- Definizione del gradiente per l'effetto di illuminazione -->
                        <defs>
                          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.7"/>
                            <stop offset="100%" stop-color="#1e40af" stop-opacity="0.1"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  `;
                  
                  marker = new window.google.maps.marker.AdvancedMarkerElement({
                    map: googleMapRef.current,
                    position: { lat: house.location.lat, lng: house.location.lng },
                    title: house.title,
                    content: markerElement
                  });
                } else {
                  // Fallback a Marker standard se AdvancedMarkerElement non è disponibile
                  console.log(`[MARKER] Falling back to standard Marker for property ${house.id}`);
                  marker = new window.google.maps.Marker({
                    position: { lat: house.location.lat, lng: house.location.lng },
                    map: googleMapRef.current,
                    title: house.title,
                    icon: {
                      url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="40" height="50"><ellipse cx="12" cy="30" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/><path d="M22,11L12,2L2,11v2h2v12c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V13h2V11z" fill="%232563eb"/><path d="M12,4L4,11h2v12c0,0.55,0.45,1,1,1h10c0.55,0,1-0.45,1-1V11h2L12,4z" fill="%234285f4"/><rect x="9.5" y="16" width="5" height="9" rx="1" fill="%231e3a8a"/><rect x="6" y="13" width="3" height="3" rx="0.5" fill="%23bfdbfe"/><rect x="15" y="13" width="3" height="3" rx="0.5" fill="%23bfdbfe"/><circle cx="12" cy="9" r="1.5" fill="%23dbeafe"/></svg>`,
                      scaledSize: new window.google.maps.Size(40, 50),
                      anchor: new window.google.maps.Point(20, 30)
                    }
                  });
                }
                
                // Aggiungi l'event listener per il click
                if (marker) {
                  if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement && 
                      marker instanceof window.google.maps.marker.AdvancedMarkerElement) {
                    // AdvancedMarkerElement usa addEventListener invece di addListener
                    marker.addEventListener('click', () => {
                      console.log(`[MARKER] Advanced marker clicked for property ${house.id}`);
                      showPropertyInfoWindow(house, marker);
                    });
                  } else {
                    // Standard Marker usa addListener
                    marker.addListener('click', () => {
                      console.log(`[MARKER] Marker clicked for property ${house.id}`);
                      showPropertyInfoWindow(house, marker);
                    });
                  }
                  
                  // Salva il riferimento
                  markersRef.current[house.id] = marker;
                }
              } catch (err) {
                console.error(`[BATCH_MARKER] Error adding marker for property ${house.id}:`, err);
              }
            }
            
            // Programma il prossimo batch
            setTimeout(() => {
              addMarkersInBatches(endIdx, batchSize);
            }, 50);
          };
          
          // Avvia l'aggiunta dei marker in batch di 20
          addMarkersInBatches(0, 20);
        } catch (error) {
          // Catch block per gestire errori nell'inizializzazione
          console.error("[INIT] Errore durante l'inizializzazione della mappa:", error);
          setMapError(true);
          setMapErrorMessage("Si è verificato un errore durante l'inizializzazione della mappa");
        }
      };
      
      // Attendi che la mappa sia completamente caricata prima di procedere
      const idleListener = map.addListener('idle', () => {
        console.log("[INIT_MAP] Map idle event fired - map is ready");
        
        // Rimuovi il listener dopo la prima esecuzione
        window.google.maps.event.removeListener(idleListener);
        
        // Completa l'inizializzazione
        completeMapInitialization(map);
        
        // Aggiungi i marker per tutte le proprietà con un ritardo per assicurare che la mappa sia pronta
        setTimeout(() => {
          // Verifica che la mappa sia effettivamente inizializzata prima di aggiungere i marker
          if (!googleMapRef.current || !window.google || !window.google.maps) {
            console.error("[INIT_MAP] Cannot add markers - Google Map not properly initialized yet");
            return;
          }

          console.log(`[INIT_MAP] Adding ${houses.length} property markers to map`);
          
          // Aggiungi i marker in batch per migliorare le prestazioni
          try {
            // Utilizza una coda per aggiungere i marker in gruppi
            const addMarkersInBatches = (startIdx: number, batchSize: number) => {
              if (startIdx >= houses.length) {
                // Tutti i marker sono stati aggiunti
                console.log(`[INIT_MAP] All ${houses.length} markers added successfully`);
                
                // Verifica il conteggio finale
                const markerCount = Object.keys(markersRef.current).length;
                console.log(`[MARKER_DEBUG] Created ${markerCount} markers out of ${houses.length} properties`);
                
                // Aggiorna le proprietà visibili dopo che tutti i marker sono stati aggiunti
                updateVisibleProperties();
                
                return;
              }
              
              // Verifica che la mappa sia ancora valida
              if (!googleMapRef.current || !window.google || !window.google.maps) {
                console.error("[BATCH_MARKER] Google Map reference lost during batch marker addition");
                return;
              }
              
              const endIdx = Math.min(startIdx + batchSize, houses.length);
              console.log(`[BATCH_MARKER] Adding markers batch ${startIdx} to ${endIdx-1}`);
              
              // Aggiungi un gruppo di marker
              for (let i = startIdx; i < endIdx; i++) {
                const house = houses[i];
                try {
                  // Verifica nuovamente che la mappa sia valida prima di ogni marker
                  if (!googleMapRef.current) continue;
                  
                  // Verifica se AdvancedMarkerElement è disponibile
                  let marker: GoogleMapMarker;
                  
                  if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                    // Usa AdvancedMarkerElement (metodo consigliato)
                    console.log(`[MARKER] Using AdvancedMarkerElement for property ${house.id}`);
                    
                    // Crea un elemento personalizzato per il marker
                    const markerElement = document.createElement('div');
                    markerElement.innerHTML = `
                      <div style="width: 40px; height: 50px; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.4));">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="40" height="50">
                          <!-- Penombra dell'icona -->
                          <ellipse cx="12" cy="30" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/>
                          
                          <!-- Casa con tetto e dettagli -->
                          <path d="M22,11L12,2L2,11v2h2v12c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V13h2V11z" fill="#2563eb"/>
                          <path d="M12,4L4,11h2v12c0,0.55,0.45,1,1,1h10c0.55,0,1-0.45,1-1V11h2L12,4z" fill="#4285f4"/>
                          
                          <!-- Riflessi e ombre -->
                          <path d="M12,4L4,11h2v12c0,0.55,0.45,1,1,1h10c0.55,0,1-0.45,1-1V11h2L12,4z" fill="url(#grad1)"/>
                          
                          <!-- Porta -->
                          <rect x="9.5" y="16" width="5" height="9" rx="1" fill="#1e3a8a"/>
                          
                          <!-- Finestre -->
                          <rect x="6" y="13" width="3" height="3" rx="0.5" fill="#bfdbfe"/>
                          <rect x="15" y="13" width="3" height="3" rx="0.5" fill="#bfdbfe"/>
                          <circle cx="12" cy="9" r="1.5" fill="#dbeafe"/>
                          
                          <!-- Definizione del gradiente per l'effetto di illuminazione -->
                          <defs>
                            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.7"/>
                              <stop offset="100%" stop-color="#1e40af" stop-opacity="0.1"/>
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    `;
                    
                    marker = new window.google.maps.marker.AdvancedMarkerElement({
                      map: googleMapRef.current,
                      position: { lat: house.location.lat, lng: house.location.lng },
                      title: house.title,
                      content: markerElement
                    });
                  } else {
                    // Fallback a Marker standard se AdvancedMarkerElement non è disponibile
                    console.log(`[MARKER] Falling back to standard Marker for property ${house.id}`);
                    marker = new window.google.maps.Marker({
                      position: { lat: house.location.lat, lng: house.location.lng },
                      map: googleMapRef.current,
                      title: house.title,
                      icon: {
                        url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="40" height="50"><ellipse cx="12" cy="30" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/><path d="M22,11L12,2L2,11v2h2v12c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V13h2V11z" fill="%232563eb"/><path d="M12,4L4,11h2v12c0,0.55,0.45,1,1,1h10c0.55,0,1-0.45,1-1V11h2L12,4z" fill="%234285f4"/><rect x="9.5" y="16" width="5" height="9" rx="1" fill="%231e3a8a"/><rect x="6" y="13" width="3" height="3" rx="0.5" fill="%23bfdbfe"/><rect x="15" y="13" width="3" height="3" rx="0.5" fill="%23bfdbfe"/><circle cx="12" cy="9" r="1.5" fill="%23dbeafe"/></svg>`,
                        scaledSize: new window.google.maps.Size(40, 50),
                        anchor: new window.google.maps.Point(20, 30)
                      }
                    });
                  }
                  
                  // Aggiungi l'event listener per il click
                  if (marker) {
                    if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement && 
                        marker instanceof window.google.maps.marker.AdvancedMarkerElement) {
                      // AdvancedMarkerElement usa addEventListener invece di addListener
                      marker.addEventListener('click', () => {
                        console.log(`[MARKER] Advanced marker clicked for property ${house.id}`);
                        showPropertyInfoWindow(house, marker);
                      });
                    } else {
                      // Standard Marker usa addListener
                      marker.addListener('click', () => {
                        console.log(`[MARKER] Marker clicked for property ${house.id}`);
                        showPropertyInfoWindow(house, marker);
                      });
                    }
                    
                    // Salva il riferimento
                    markersRef.current[house.id] = marker;
                  }
                } catch (err) {
                  console.error(`[BATCH_MARKER] Error adding marker for property ${house.id}:`, err);
                }
              }
              
              // Programma il prossimo batch
              setTimeout(() => {
                addMarkersInBatches(endIdx, batchSize);
              }, 50);
            };
            
            // Avvia l'aggiunta dei marker in batch di 10
            addMarkersInBatches(0, 10);
          } catch (error) {
            console.error("[INIT_MAP] Error adding markers:", error);
          }
        }, 1500); // Aumentiamo il delay iniziale per assicurarci che la mappa sia pronta
      });
      
      // Aggiungi un timeout di sicurezza per assicurarti che l'evento 'idle' venga chiamato
      setTimeout(() => {
        if (!mapLoaded && !mapInitialized) {
          console.warn("[INIT_MAP] Map idle event didn't fire within timeout, forcing initialization");
          
          // Rimuovi il listener in eccesso
          try {
            window.google.maps.event.removeListener(idleListener);
          } catch (e) {
            console.warn("[INIT_MAP] Error removing idle listener:", e);
          }
          
          // Forza l'inizializzazione
          completeMapInitialization(map);
        }
      }, 8000); // Aumentato a 8 secondi per dare più tempo
      
      // Se abbiamo proprietà valide, adatta la mappa per mostrare tutti i marker
      if (hasValidProperties) {
        console.log("[INIT_MAP] Fitting map to bounds of all properties");
        map.fitBounds(bounds);
        
        // Limita lo zoom per evitare zoom eccessivo con poche proprietà
        const zoomListener = map.addListener('idle', () => {
          if (map.getZoom() > 10) {
            console.log("[INIT_MAP] Limiting initial zoom level");
            map.setZoom(8);
          }
          window.google.maps.event.removeListener(zoomListener);
          
          // Aggiorna le proprietà visibili dopo il primo caricamento
          updateVisibleProperties();
        });
      }
      
      // Aggiungi un listener per aggiornare le proprietà visibili ogni volta che la mappa cambia
      map.addListener('bounds_changed', () => {
        // Evita chiamate troppo frequenti usando un throttle
        const now = Date.now();
        if (!window.lastBoundsLog || now - window.lastBoundsLog > 500) { // 500ms throttle
          window.lastBoundsLog = now;
          updateVisibleProperties();
        }
      });
      
      // Aggiungi un listener per aggiornare le proprietà visibili dopo lo zoom o il pan
      map.addListener('idle', () => {
        // Aggiorna il flag per indicare che la mappa è stata completamente renderizzata
        if (!mapLoaded && googleMapRef.current) {
          console.log("[MAP_IDLE] Map is now fully loaded and rendered");
          setMapLoaded(true);
        }
        
        // Final update after any map movement stops
        if (googleMapRef.current && mapLoaded) {
          updateVisibleProperties();
        }
        
        // Riapplica lo stile personalizzato per assicurarsi che i POI rimangano nascosti
        try {
          // Riapplica lo stile con un leggero ritardo
          setTimeout(() => {
            if (map) {
              console.log("[MAP_IDLE] Reapplying custom map style");
              map.setOptions({
                mapId: "e364d3818cec701",
                clickableIcons: false
              });
            }
          }, 100);
        } catch (error) {
          console.error("[MAP_IDLE] Error reapplying map style:", error);
        }
      });
      
      // Imposta tutte le proprietà come visibili all'inizio
      console.log("[INIT_MAP] Setting all properties as visible initially");
      setVisibleProperties(houses);
      setMapLoaded(true);
      
    } catch (error) {
      console.error("[INIT_MAP] Error creating map:", error);
      setMapError(true);
    }
  };
  
  // Miglioro la funzione locateProperty per centrare la mappa in modo più evidente
  const locateProperty = (propertyId: string) => {
    console.log(`Locating property: ${propertyId}`);
    const marker = markersRef.current[propertyId];
    const property = houses.find(h => h.id === propertyId);
    
    if (property && googleMapRef.current) {
      console.log(`Found property ${property.title}, centering map`);
      
      // Evidenziamo tutte le card come non selezionate
      setSelectedProperty(property.id);
      
      // Zoom più ravvicinato per una migliore visibilità
      googleMapRef.current.setZoom(15);
      
      // Centra la mappa sulla proprietà con animazione
      googleMapRef.current.panTo(property.location);
      
      // Mostra l'infoWindow se abbiamo un marker
      if (marker) {
        console.log(`Found marker, showing info window`);
        showPropertyInfoWindow(property, marker);
        
        // Fai lampeggiare il marker per renderlo evidente
        try {
          if (window.google.maps.marker && 
              window.google.maps.marker.AdvancedMarkerElement && 
              marker instanceof window.google.maps.marker.AdvancedMarkerElement) {
            // Per AdvancedMarkerElement, simuliamo l'animazione con CSS
            console.log("[LOCATE] Animating AdvancedMarkerElement");
            const markerElement = marker.content;
            
            if (markerElement) {
              // Applica l'animazione CSS
              markerElement.style.transition = 'transform 0.3s ease-in-out';
              markerElement.style.transform = 'scale(1.3)';
              
              // Ripristina dopo un certo tempo
              setTimeout(() => {
                markerElement.style.transform = 'scale(1.0)';
              }, 700);
              
              setTimeout(() => {
                markerElement.style.transform = 'scale(1.3)';
              }, 1000);
              
              setTimeout(() => {
                markerElement.style.transform = 'scale(1.0)';
              }, 1500);
            }
          } else if (marker && marker.setAnimation && typeof marker.setAnimation === 'function') {
            // Per marker standard, usa l'animazione BOUNCE
            console.log("[LOCATE] Animating standard Marker with BOUNCE");
            marker.setAnimation(window.google.maps.Animation.BOUNCE);
            setTimeout(() => {
              marker.setAnimation(null);
            }, 1500);
      } else {
            console.warn("[LOCATE] Marker doesn't support animation");
          }
        } catch (error) {
          console.error("[LOCATE] Error animating marker:", error);
        }
      } else {
        console.warn(`No marker found for property ${propertyId}`);
      }
    } else {
      console.error(`Could not find property or map reference for id ${propertyId}`);
    }
  };
  
  // Toggle della sidebar
  const toggleSidebar = () => {
    console.log("Toggle sidebar da", isSidebarOpen, "a", !isSidebarOpen);
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Funzione che trova la coordinata più vicina a un indirizzo tra le città note
  const findNearestCityByName = (address: string) => {
    const lowerAddress = address.toLowerCase();
    
    // Prima cerca corrispondenze esatte
    for (const city of popularCities) {
      if (lowerAddress.includes(city.name.toLowerCase())) {
        console.log(`[SEARCH] Corrispondenza trovata per "${address}" con città: ${city.name}`);
        return { lat: city.lat, lng: city.lng, name: city.name };
      }
    }
    
    // Cerca corrispondenze parziali (almeno 4 caratteri)
    for (const city of popularCities) {
      // Trova la parola più lunga nell'indirizzo
      const words = lowerAddress.split(/\s+/);
      const longestWord = words.reduce((longest, word) => word.length > longest.length ? word : longest, '');
      
      if (longestWord.length >= 4) {
        if (city.name.toLowerCase().includes(longestWord) || 
            longestWord.includes(city.name.toLowerCase())) {
          console.log(`[SEARCH] Corrispondenza parziale per "${address}" con città: ${city.name}`);
          return { lat: city.lat, lng: city.lng, name: city.name };
        }
      }
    }
    
    // Se non troviamo nulla, usiamo Roma come default
    console.log(`[SEARCH] Nessuna corrispondenza trovata per "${address}", usando Roma come default`);
    return { lat: 41.9028, lng: 12.4964, name: 'Roma' };
  };

  // Array delle città popolari per la ricerca di fallback 
  const popularCities = [
    { name: 'Roma', lat: 41.9028, lng: 12.4964 },
    { name: 'Milano', lat: 45.4642, lng: 9.1900 },
    { name: 'Firenze', lat: 43.7696, lng: 11.2558 },
    { name: 'Venezia', lat: 45.4408, lng: 12.3155 },
    { name: 'Napoli', lat: 40.8518, lng: 14.2681 },
    { name: 'Torino', lat: 45.0703, lng: 7.6869 },
    { name: 'Bologna', lat: 44.4949, lng: 11.3426 },
    { name: 'Palermo', lat: 38.1157, lng: 13.3615 }
  ];

  // Funzione per gestire la ricerca
  const handleSearch = async (location: any) => {
    console.log("[SEARCH] Ricerca avviata con parametri:", location);
    
    setIsSearching(true);
    setSearchTerm(location.address || '');
    setSearchError(null);
    
    // Rimuovi eventuali marker di ricerca precedenti
    if (searchMarkerRef.current) {
      try {
        console.log("[SEARCH] Rimozione marker precedente");
        if (window.google && window.google.maps && window.google.maps.marker && 
            window.google.maps.marker.AdvancedMarkerElement && 
            searchMarkerRef.current instanceof window.google.maps.marker.AdvancedMarkerElement) {
          searchMarkerRef.current.map = null;
        } else if (searchMarkerRef.current.setMap && typeof searchMarkerRef.current.setMap === 'function') {
          searchMarkerRef.current.setMap(null);
        }
      } catch (e) {
        console.warn("[SEARCH] Errore nella rimozione del marker precedente:", e);
      }
      
      searchMarkerRef.current = null;
    }
    
    // Se sono fornite le coordinate, usa quelle direttamente
    if (location.lat && location.lng && 
        !isNaN(location.lat) && !isNaN(location.lng)) {
      const { lat, lng } = location;
      console.log(`[SEARCH] Utilizzo coordinate fornite: [${lat}, ${lng}]`);
      
      if (googleMapRef.current) {
        // Centra la mappa sulle coordinate
        googleMapRef.current.setCenter({ lat, lng });
        googleMapRef.current.setZoom(13);
        
        // Aggiungi un marker per la posizione cercata
        addSearchMarker({ lat, lng }, location.address);
        
        // Aggiorna la lista delle proprietà visibili dopo il cambio di posizione
        setTimeout(() => {
          updateVisibleProperties();
        }, 300);
      } else {
        console.error("[SEARCH] Mappa non ancora inizializzata");
        setSearchError("Mappa non ancora pronta. Riprova tra qualche istante.");
      }
      
      setIsSearching(false);
      return;
    }

    // Non abbiamo coordinate, quindi cerchiamo l'indirizzo
    const address = location.address;
    if (!address) {
      setSearchError("Indirizzo non specificato");
      setIsSearching(false);
      return;
    }

    // Determina se la ricerca è un indirizzo specifico
    const isSpecificAddress = /\d+/.test(address) || 
                             /\b(via|viale|corso|piazza|largo|vicolo|galleria)\b/i.test(address);
    
    try {
      console.log("[SEARCH] Ricerca località:", address);
      
      // Se sembra un indirizzo specifico, usa un termine di ricerca più preciso
      const searchQuery = isSpecificAddress 
        ? `${address}, italia` 
        : address;
      
      console.log("[SEARCH] Query di ricerca modificata:", searchQuery);
      
      // Prima prova con Nominatim
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&countrycodes=it`
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data && data.length > 0) {
            // Trovato risultato con Nominatim
            let bestMatch = data[0];
            
            if (isSpecificAddress && data.length > 1) {
              // Cerca di trovare il risultato più specifico (strada vs città)
              const addressMatches = data.filter((item: any) => 
                (item.address && (item.address.road || item.address.pedestrian || item.address.street))
              );
              
              if (addressMatches.length > 0) {
                bestMatch = addressMatches[0];
                console.log("[SEARCH] Trovato indirizzo specifico:", bestMatch.display_name);
              }
            }
            
            const position = {
              lat: parseFloat(bestMatch.lat),
              lng: parseFloat(bestMatch.lon)
            };
            
            console.log("[SEARCH] Località trovata:", bestMatch.display_name, position);
            handleFoundLocation(position, bestMatch.display_name, isSpecificAddress);
            return;
          }
        }
      } catch (nominatimError) {
        console.warn("[SEARCH] Errore durante la ricerca con Nominatim:", nominatimError);
        // Continua con il fallback
      }
      
      // Fallback: usa le coordinate delle città conosciute
      const nearestCity = findNearestCityByName(address);
      const position = { lat: nearestCity.lat, lng: nearestCity.lng };
      
      console.log(`[SEARCH] Fallback a città conosciuta: ${nearestCity.name}`, position);
      handleFoundLocation(position, nearestCity.name, false);
      
    } catch (error) {
      console.error("[SEARCH] Errore durante la ricerca:", error);
      
      // Fallback finale: usa le coordinate di una città nota
      const fallbackCity = findNearestCityByName(address);
      const position = { lat: fallbackCity.lat, lng: fallbackCity.lng };
      
      console.log(`[SEARCH] Fallback finale a città conosciuta: ${fallbackCity.name}`, position);
      handleFoundLocation(position, fallbackCity.name, false);
      
      setSearchError(`Ricerca precisa non disponibile. Mostro risultati per ${fallbackCity.name}.`);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Funzione per gestire una posizione trovata
  const handleFoundLocation = (position: {lat: number, lng: number}, locationName: string, isSpecific: boolean) => {
    if (!googleMapRef.current) {
      console.error("[SEARCH] Mappa non ancora inizializzata");
      setSearchError("Mappa non inizializzata. Riprova tra qualche istante.");
      return;
    }
    
    // Centra la mappa sulle coordinate trovate
    googleMapRef.current.setCenter(position);
    
    // Riapplica il mapId personalizzato prima di aggiungere il marker
    try {
      googleMapRef.current.setOptions({
        mapId: "e364d3818cec701",
        clickableIcons: false
      });
    } catch (e) {
      console.warn("[SEARCH] Errore nell'impostazione delle opzioni della mappa:", e);
    }
    
    // Aggiungi il marker per la posizione cercata
    addSearchMarker(position, locationName);
    
    // Regola lo zoom in base al tipo di risultato
    const zoomLevel = isSpecific ? 16 : 13;
    googleMapRef.current.setZoom(zoomLevel);
    
    // Aggiorna la lista delle proprietà visibili dopo il cambio di posizione
    setTimeout(() => {
      updateVisibleProperties();
    }, 300);
    
    // Aggiorna la lista delle proprietà visibili nelle vicinanze
    const nearbyProperties = properties.filter(property => {
      const distance = calculateDistance(
        position.lat, position.lng,
        property.location.lat, property.location.lng
      );
      return distance <= 10; // Proprietà nel raggio di 10 km
    });
    
    console.log(`[SEARCH] Trovate ${nearbyProperties.length} proprietà nelle vicinanze`);
  };
  
  // Funzione per calcolare la distanza tra due punti (formula di Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Raggio della Terra in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Funzione per aggiungere un marker di ricerca personalizzato sulla mappa
  const addSearchMarker = (position: { lat: number; lng: number }, locationName: string = "Posizione cercata") => {
    try {
      // Rimuovo log non essenziale
      
      // Rimuovi il marker di ricerca precedente se esiste
      if (searchMarkerRef.current) {
        try {
          // Rimuovo log non essenziale
          searchMarkerRef.current.map = null;
        } catch (e) {
          console.warn("[SEARCH_MARKER] Errore nella rimozione del marker precedente:", e);
        }
      }
      
      let newSearchMarker: GoogleMapMarker | null = null;
      
      // Verifica la disponibilità di AdvancedMarkerElement con controlli rigorosi
      let useAdvancedMarkers = false;
      try {
        useAdvancedMarkers = Boolean(
          window.google && 
          window.google.maps && 
          window.google.maps.marker && 
          window.google.maps.marker.AdvancedMarkerElement
        );
      } catch (e) {
        console.warn("[SEARCH_MARKER] Errore nel verificare AdvancedMarkerElement:", e);
        useAdvancedMarkers = false;
      }
      
      if (useAdvancedMarkers) {
        try {
          console.log("[SEARCH_MARKER] Tentativo di creazione di un AdvancedMarkerElement");
          
          // Crea un elemento per il marker con l'aspetto di un pin
          const searchMarkerElement = document.createElement('div');
          searchMarkerElement.innerHTML = `
            <div style="width: 32px; height: 42px; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.4));">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="42">
                <!-- Ombra del pin -->
                <ellipse cx="12" cy="34" rx="4" ry="2" fill="rgba(0,0,0,0.2)"/>
                
                <!-- Pin con gradiente -->
                <path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24c0-6.6-5.4-12-12-12z" fill="#FF385C"/>
                
                <!-- Cerchio interno -->
                <circle cx="12" cy="12" r="4" fill="white"/>
              </svg>
            </div>
          `;
          
          const AdvancedMarkerElement = window.google.maps.marker.AdvancedMarkerElement;
          newSearchMarker = new AdvancedMarkerElement({
            map: googleMapRef.current,
            position: position,
            content: searchMarkerElement,
            zIndex: 1000, // Metti il search marker sopra gli altri
            title: locationName
          });
          
          console.log("[SEARCH_MARKER] AdvancedMarkerElement creato con successo");
          
          // Aggiungi click handler per mostrare un info window
          newSearchMarker.addEventListener('click', () => {
            if (!googleMapRef.current) return;
            
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 10px; max-width: 200px;">
                  <h3 style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #333;">${locationName}</h3>
                  <p style="margin: 0; font-size: 12px; color: #666;">
                    Coordinate: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}
                  </p>
                </div>
              `,
              pixelOffset: new window.google.maps.Size(0, -15)
            });
            
            infoWindow.open({
              anchor: newSearchMarker,
              map: googleMapRef.current
            });
          });
        } catch (e) {
          console.warn("[SEARCH_MARKER] Errore nella creazione di AdvancedMarkerElement, fallback al marker standard:", e);
          useAdvancedMarkers = false; // Forza il fallback al marker standard
        }
      }
      
      // Usa il marker standard come fallback se AdvancedMarkerElement non è disponibile o ha fallito
      if (!useAdvancedMarkers || !newSearchMarker) {
        try {
          console.log("[SEARCH_MARKER] Creazione di un marker standard");
          
          // Fallback al marker standard con un'icona personalizzata
          newSearchMarker = new window.google.maps.Marker({
            position: position,
            map: googleMapRef.current,
            icon: {
              url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="42"><path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24c0-6.6-5.4-12-12-12z" fill="%23FF385C"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`,
              scaledSize: new window.google.maps.Size(32, 42),
              anchor: new window.google.maps.Point(16, 42)
            },
            zIndex: 1000,
            title: locationName,
            animation: window.google.maps.Animation.DROP
          });
          
          console.log("[SEARCH_MARKER] Marker standard creato con successo");
          
          // Aggiungi click handler per mostrare un info window
          newSearchMarker.addListener('click', () => {
            if (!googleMapRef.current) return;
            
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 10px; max-width: 200px;">
                  <h3 style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #333;">${locationName}</h3>
                  <p style="margin: 0; font-size: 12px; color: #666;">
                    Coordinate: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}
                  </p>
                </div>
              `
            });
            
            infoWindow.open({
              anchor: newSearchMarker,
              map: googleMapRef.current
            });
          });
        } catch (e) {
          console.error("[SEARCH_MARKER] Errore critico nella creazione del marker standard:", e);
          return; // Non possiamo procedere senza marker
        }
      }
      
      // Salva il riferimento al marker
      if (newSearchMarker) {
        searchMarkerRef.current = newSearchMarker;
        console.log("[SEARCH_MARKER] Marker di ricerca salvato nel riferimento");
        
        // Centra la mappa sulla posizione del marker
        if (googleMapRef.current) {
          googleMapRef.current.setCenter(position);
        }
        
        // Prova ad animare il marker se possibile
        try {
          if (newSearchMarker.setAnimation && typeof newSearchMarker.setAnimation === 'function') {
            console.log("[SEARCH_MARKER] Animazione del marker...");
            newSearchMarker.setAnimation(window.google.maps.Animation.DROP);
          }
        } catch (e) {
          console.warn("[SEARCH_MARKER] Non è stato possibile animare il marker:", e);
        }
      } else {
        console.error("[SEARCH_MARKER] Impossibile creare il marker di ricerca");
      }
    } catch (error) {
      console.error("[SEARCH_MARKER] Errore durante l'aggiunta del marker di ricerca:", error);
    }
  };
  
  // Aggiungi marker per una proprietà con stile migliorato
  const addPropertyMarker = (property: Property) => {
    if (!googleMapRef.current || !window.google || !window.google.maps) {
      console.error(`[MARKER_ERROR] Cannot add marker for property ${property.id} - Google Maps not initialized`);
      return null;
    }
    
    // Verifica esplicitamente che il riferimento alla mappa sia valido
    if (typeof googleMapRef.current.getBounds !== 'function') {
      console.error(`[MARKER_ERROR] Invalid Google Map reference for property ${property.id}`);
      return null;
    }
    
    try {
      console.log(`[MARKER] Creating marker for property ${property.id} at lat:${property.location.lat}, lng:${property.location.lng}`);
      
      // Usa AdvancedMarkerElement se disponibile
      if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
        // Crea un elemento personalizzato per il marker
        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
          <div style="width: 40px; height: 50px; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.4));">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="40" height="50">
              <!-- Penombra dell'icona -->
              <ellipse cx="12" cy="30" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/>
              
              <!-- Casa con tetto e dettagli -->
              <path d="M22,11L12,2L2,11v2h2v12c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V13h2V11z" fill="#2563eb"/>
              <path d="M12,4L4,11h2v12c0,0.55,0.45,1,1,1h10c0.55,0,1-0.45,1-1V11h2L12,4z" fill="#4285f4"/>
              
              <!-- Riflessi e ombre -->
              <path d="M12,4L4,11h2v12c0,0.55,0.45,1,1,1h10c0.55,0,1-0.45,1-1V11h2L12,4z" fill="url(#grad1)"/>
              
              <!-- Porta -->
              <rect x="9.5" y="16" width="5" height="9" rx="1" fill="#1e3a8a"/>
              
              <!-- Finestre -->
              <rect x="6" y="13" width="3" height="3" rx="0.5" fill="#bfdbfe"/>
              <rect x="15" y="13" width="3" height="3" rx="0.5" fill="#bfdbfe"/>
              <circle cx="12" cy="9" r="1.5" fill="#dbeafe"/>
              
              <!-- Definizione del gradiente per l'effetto di illuminazione -->
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.7"/>
                  <stop offset="100%" stop-color="#1e40af" stop-opacity="0.1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        `;
        
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: {
            lat: property.location.lat,
            lng: property.location.lng
          },
          map: googleMapRef.current,
          title: property.title,
          content: markerElement
        });
        
        console.log(`[MARKER] AdvancedMarkerElement created for property ${property.id}`);
        
        // Aggiungi event listener per il click
        if (marker) {
          marker.addEventListener('click', () => {
            console.log(`[MARKER] Marker clicked for property ${property.id}`);
            showPropertyInfoWindow(property, marker);
          });
          
          // Salva il riferimento al marker
          markersRef.current[property.id] = marker;
          console.log(`[MARKER] Successfully saved marker reference for property ${property.id}`);
        } else {
          console.error(`[MARKER] Failed to create marker for property ${property.id}`);
        }
        
        return marker;
      } else {
        // Fallback a marker standard
        const marker = new window.google.maps.Marker({
          position: {
            lat: property.location.lat,
            lng: property.location.lng
          },
          map: googleMapRef.current,
          title: property.title,
          icon: {
            url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="40" height="50"><ellipse cx="12" cy="30" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/><path d="M22,11L12,2L2,11v2h2v12c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V13h2V11z" fill="%232563eb"/><path d="M12,4L4,11h2v12c0,0.55,0.45,1,1,1h10c0.55,0,1-0.45,1-1V11h2L12,4z" fill="%234285f4"/><rect x="9.5" y="16" width="5" height="9" rx="1" fill="%231e3a8a"/><rect x="6" y="13" width="3" height="3" rx="0.5" fill="%23bfdbfe"/><rect x="15" y="13" width="3" height="3" rx="0.5" fill="%23bfdbfe"/><circle cx="12" cy="9" r="1.5" fill="%23dbeafe"/></svg>`,
            scaledSize: new window.google.maps.Size(40, 50),
            anchor: new window.google.maps.Point(20, 30)
          },
          animation: null,
          optimized: true,
          visible: true
        });
        
        console.log(`[MARKER] Standard marker created for property ${property.id}`);
        
        // Aggiungi event listener per il click
        if (marker) {
          marker.addListener('click', () => {
            console.log(`[MARKER] Marker clicked for property ${property.id}`);
            showPropertyInfoWindow(property, marker);
          });
          
          // Salva il riferimento al marker
          markersRef.current[property.id] = marker;
          console.log(`[MARKER] Successfully saved marker reference for property ${property.id}`);
        } else {
          console.error(`[MARKER] Failed to create marker for property ${property.id}`);
        }
        
        return marker;
      }
    } catch (error) {
      console.error(`[MARKER_ERROR] Error creating marker for property ${property.id}:`, error);
      
      // Fallback più semplice in caso di errore
      try {
        // Prova prima con AdvancedMarkerElement in caso di fallback
        if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
          const simpleAdvancedMarker = new window.google.maps.marker.AdvancedMarkerElement({
            position: property.location,
            map: googleMapRef.current,
            title: property.title
          });
          
          if (simpleAdvancedMarker) {
            simpleAdvancedMarker.addEventListener('click', () => {
              showPropertyInfoWindow(property, simpleAdvancedMarker);
            });
            markersRef.current[property.id] = simpleAdvancedMarker;
            return simpleAdvancedMarker;
          }
      } else {
          // Fallback a marker standard come ultima risorsa
          const simpleMarker = new window.google.maps.Marker({
            position: property.location,
            map: googleMapRef.current,
            title: property.title
          });
          
          if (simpleMarker) {
            simpleMarker.addListener('click', () => {
              showPropertyInfoWindow(property, simpleMarker);
            });
            markersRef.current[property.id] = simpleMarker;
            return simpleMarker;
          }
        }
      } catch (e) {
        console.error(`[MARKER_ERROR] Even fallback marker creation failed for ${property.id}:`, e);
      }
      
      return null;
    }
  };
  
  // Mostra l'infoWindow per una proprietà con contenuto migliorato
  const showPropertyInfoWindow = (property: Property, marker: any) => {
    try {
      // Chiudi l'infoWindow precedente se esiste
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      
      // Verifica che la mappa esista prima di procedere
      if (!googleMapRef.current) {
        console.error("[INFO_WINDOW] Mappa non disponibile");
        return;
      }
      
      // Verifica che google.maps sia disponibile
      if (!window.google || !window.google.maps) {
        console.error("[INFO_WINDOW] Google Maps API non disponibile");
        return;
      }
      
      // Crea il contenuto HTML per la finestra informativa con maggiori dettagli
      const content = `
        <div class="property-popup" style="font-family: 'Roboto', sans-serif; max-width: 300px; padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
          <!-- Immagine con overlay e prezzo -->
          <div style="position: relative; width: 100%;">
            <img src="${property.image}" alt="${property.title}" style="width: 100%; height: 90px; object-fit: cover;">
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.3) 100%);"></div>
            <div style="position: absolute; bottom: 8px; left: 8px; right: 8px; display: flex; justify-content: space-between; align-items: flex-end;">
              <div style="color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                <div style="font-size: 18px; font-weight: 700;">€${property.price}</div>
                <div style="font-size: 10px; font-weight: 500;">per notte</div>
              </div>
              <div style="background: rgba(255,255,255,0.9); color: var(--color-primary, #3B82F6); padding: 3px 8px; border-radius: 16px; font-size: 12px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 3px;">★</span> ${property.rating.toFixed(1)}
              </div>
            </div>
          </div>
          
          <!-- Contenuto testuale -->
          <div style="padding: 12px;">
            <h3 style="margin: 0 0 4px 0; font-size: 15px; color: #222; font-weight: 600; line-height: 1.3;">${property.title}</h3>
            
            <!-- Recensioni -->
            <div style="margin-bottom: 8px; font-size: 12px; color: #666;">
              ${property.reviews} recensioni
            </div>
            
            <!-- Descrizione breve -->
            <p style="margin: 0 0 8px; font-size: 12px; color: #444; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${property.description}
            </p>
            
            <!-- Caratteristiche (esempio) -->
            <div style="display: flex; gap: 5px; margin-bottom: 8px; flex-wrap: wrap;">
              <div style="background: #F5F5F5; padding: 3px 6px; border-radius: 12px; font-size: 10px; color: #555;">2 letti</div>
              <div style="background: #F5F5F5; padding: 3px 6px; border-radius: 12px; font-size: 10px; color: #555;">1 bagno</div>
              <div style="background: #F5F5F5; padding: 3px 6px; border-radius: 12px; font-size: 10px; color: #555;">Wi-Fi</div>
            </div>
            
            <!-- Pulsanti azione -->
            <div style="display: flex; gap: 5px;">
              <button 
                onclick="window.mapPropertyActions.locateProperty('${property.id}')" 
                style="flex: 1; padding: 8px 0; background: #F8F8F8; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; color: #444; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                <span style="margin-right: 4px;">📍</span>Centra
              </button>
              <button 
                onclick="window.mapPropertyActions.viewDetails('${property.id}')" 
                style="flex: 2; padding: 8px 0; background: var(--color-primary, #3B82F6); border: none; border-radius: 6px; font-size: 12px; font-weight: 600; color: white; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                <span style="margin-right: 4px;">👁️</span>Vedi dettagli
              </button>
            </div>
          </div>
        </div>
      `;
      
      // Collega le azioni ai pulsanti della finestra informativa
      // Questo oggetto verrà usato dal codice HTML per chiamare le funzioni di React
      window.mapPropertyActions = {
        locateProperty: (propertyId: string) => {
          locateProperty(propertyId);
          // Chiudi la finestra dopo l'azione
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }
        },
        viewDetails: (propertyId: string) => {
          navigate(`/property/${propertyId}`);
          // Chiudi la finestra dopo l'azione
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }
        }
      };
      
      // Crea una nuova finestra informativa se non esiste ancora
      if (!infoWindowRef.current && window.google && window.google.maps) {
        infoWindowRef.current = new window.google.maps.InfoWindow({
          maxWidth: 300,
          disableAutoPan: false,
          pixelOffset: new window.google.maps.Size(0, -20)
        });
      }
      
      // Verifica che la finestra informativa sia stata creata
      if (!infoWindowRef.current) {
        console.error("[INFO_WINDOW] Impossibile creare la finestra informativa");
        return;
      }
      
      // Imposta il contenuto
      infoWindowRef.current.setContent(content);
      
      // Verifica esplicita che la mappa sia un'istanza valida di google.maps.Map
      if (!googleMapRef.current || typeof googleMapRef.current.getBounds !== 'function') {
        console.error("[INFO_WINDOW] Istanza della mappa non valida");
        return;
      }
      
      // Controllo che il marker esista
      if (!marker) {
        console.error("[INFO_WINDOW] Marker non disponibile");
        return;
      }

      // Apri l'infoWindow in modo appropriato in base al tipo di marker
      try {
        // Per marker standard con getPosition
        if (marker && typeof marker.getPosition === 'function') {
          // Assicurati che la mappa sia visibile e pronta prima di aprire l'InfoWindow
          setTimeout(() => {
            try {
              infoWindowRef.current.open({
                map: googleMapRef.current,
                anchor: marker
              });
            } catch (error) {
              console.error("[INFO_WINDOW] Errore nell'apertura della finestra con marker standard:", error);
              // Fallback
              try {
                infoWindowRef.current.setPosition(marker.getPosition());
                infoWindowRef.current.open(googleMapRef.current);
              } catch (e) {
                console.error("[INFO_WINDOW] Anche il fallback ha fallito:", e);
              }
            }
          }, 50);
        } 
        // Per advanced marker o marker con position
        else if (marker && marker.position) {
          setTimeout(() => {
            try {
              infoWindowRef.current.setPosition(marker.position);
              infoWindowRef.current.open({
                map: googleMapRef.current
              });
            } catch (error) {
              console.error("[INFO_WINDOW] Errore nell'apertura della finestra con position:", error);
            }
          }, 50);
        } 
        // Fallback alla posizione della proprietà
        else {
          setTimeout(() => {
            try {
              infoWindowRef.current.setPosition({
                lat: property.location.lat,
                lng: property.location.lng
              });
              infoWindowRef.current.open({
                map: googleMapRef.current
              });
            } catch (error) {
              console.error("[INFO_WINDOW] Errore nel fallback alla posizione della proprietà:", error);
            }
          }, 50);
        }
      } catch (error) {
        console.error("[INFO_WINDOW] Errore nell'apertura della finestra:", error);
        
        // Ultimo tentativo usando direttamente la posizione della proprietà
        try {
          setTimeout(() => {
            infoWindowRef.current.setPosition({
              lat: property.location.lat,
              lng: property.location.lng
            });
            infoWindowRef.current.open({
              map: googleMapRef.current
            });
          }, 100);
        } catch (finalError) {
          console.error("[INFO_WINDOW] Impossibile aprire la finestra informativa:", finalError);
        }
      }
    } catch (error) {
      console.error("[INFO_WINDOW] Errore generale nella gestione della finestra:", error);
    }
  };
  
  // Funzione per caricare l'API di Google Maps
  const loadGoogleMaps = () => {
    // Se Google Maps è già stato caricato, non fare nulla
    if (isGoogleMapsLoaded()) {
      console.log('[GOOGLE_MAPS] API già caricata, inizializzazione...');
      initializeMap();
      return;
    }

    console.log('[GOOGLE_MAPS] Caricamento tramite servizio centralizzato...');
    
    // Carica l'API tramite il servizio centralizzato
    loadGoogleMapsApi()
      .then(() => {
        console.log('[GOOGLE_MAPS] API caricata con successo');
        initializeMap();
      })
      .catch(error => {
        console.error('[GOOGLE_MAPS] Errore nel caricamento:', error);
        setMapError(true);
        setMapErrorMessage('Errore nel caricamento delle mappe. Verifica la connessione internet.');
      });
  };
  
  // Inizializza Google Maps con tutti i marker delle case
  useEffect(() => {
    if (mapLoaded || mapError || !mapRef.current) return;
    
    loadGoogleMaps();
    
    // Pulizia
    return () => {
      console.log("[CLEANUP] Rimuovendo i marker e i listener della mappa");
      
      // Rimuovi tutti gli event listener
      if (googleMapRef.current && window.google && window.google.maps) {
        window.google.maps.event.clearInstanceListeners(googleMapRef.current);
      }
      
      // Rimuovi tutti i marker dalla mappa
      Object.values(markersRef.current).forEach((marker: GoogleMapMarker) => {
        if (marker) {
          if (typeof marker.setMap === 'function') {
            marker.setMap(null);
          } else if (marker.map) {
            marker.map = null;
          }
        }
      });
      
      // Resetta riferimenti e pulisci le collezioni
      markersRef.current = {};
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      
      // Rimuovi la mappa
      if (googleMapRef.current) {
        googleMapRef.current = null;
      }
    };
  }, [mapLoaded, mapError]); // Rimuovo houses dalle dipendenze per evitare loop

  // Rilevamento della modalità mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Controllo iniziale
    checkIsMobile();
    
    // Aggiorna lo stato quando la finestra viene ridimensionata
    window.addEventListener('resize', checkIsMobile);
    
    // Pulizia
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  
  // Funzione per chiudere il drawer mobile quando si clicca sulla mappa
  const handleMapClick = () => {
    if (isMobile && isMobileDrawerOpen) {
      setIsMobileDrawerOpen(false);
    }
  };
  
  // Aggiungiamo il listener dei click sulla mappa
  useEffect(() => {
    if (googleMapRef.current) {
      googleMapRef.current.addListener('click', handleMapClick);
    }

    return () => {
      if (googleMapRef.current && window.google && window.google.maps) {
        window.google.maps.event.clearListeners(googleMapRef.current, 'click');
      }
    };
  }, [googleMapRef.current, isMobileDrawerOpen]);
  
  // Funzione per convertire le proprietà al formato richiesto dal DraggableBottomSheet
  const formatPropertiesForSheet = useMemo(() => {
    return visibleProperties.map(property => ({
      id: property.id,
      address: property.title,
      price: property.price,
      image: property.image,
      rating: property.rating,
      reviews: property.reviews,
      location: [property.location.lng, property.location.lat] as [number, number]
    }));
  }, [visibleProperties]);

  // Gestisci la visualizzazione dei dettagli della proprietà
  const handleViewDetails = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };

  // Gestisci la localizzazione della proprietà sulla mappa
  const handleFindOnMap = (location: [number, number]) => {
    if (googleMapRef.current) {
      const property = houses.find(p => 
        p.location.lng === location[0] && p.location.lat === location[1]
      );
      
      if (property) {
        locateProperty(property.id);
      } else {
        // Fallback se non troviamo la proprietà corrispondente
        googleMapRef.current.setCenter({ lat: location[1], lng: location[0] });
        googleMapRef.current.setZoom(15);
      }
    }
  };
  
  // Funzione per gestire il cambio di tab
  const handleTabChange = (tab: 'list' | 'map') => {
    console.log(`Changing tab to: ${tab}`);
    setActiveBottomTab(tab);
    
    if (tab === 'map') {
      // Quando si passa alla tab mappa, collassiamo lo sheet per mostrare meglio la mappa
      bottomSheetRef.current?.collapseSheet();
    } else if (tab === 'list') {
      // Quando si passa alla tab lista, espandiamo lo sheet per mostrare la lista
      bottomSheetRef.current?.expandSheet();
    }
  };
  
  // Assicuriamoci che alla prima visualizzazione il bottom sheet sia collassato se siamo sulla tab map
  useEffect(() => {
    if (isMobile && mapLoaded && activeBottomTab === 'map' && bottomSheetRef.current) {
      // Piccolo ritardo per dare tempo al componente di montarsi completamente
      setTimeout(() => {
        bottomSheetRef.current?.collapseSheet();
      }, 100);
    }
  }, [isMobile, mapLoaded, bottomSheetRef.current]);
  
  // Funzione da chiamare quando la mappa è pronta
  const onMapReady = () => {
    // Rimuove la schermata di loading
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '0';
      overlayRef.current.style.pointerEvents = 'none';
      overlayRef.current.style.display = 'none'; // Nasconde completamente l'overlay
    }
    
    // Sblocca lo scrolling
    document.body.style.overflow = 'auto';
    
    // Abilita interazioni con la mappa
    if (mapRef.current) {
      mapRef.current.style.pointerEvents = 'auto';
    }
    
    // Imposta lo stato pronto
    setMapLoaded(true);
  };

  // Effect per verificare il cambiamento delle proprietà visibili
  useEffect(() => {
    console.log(`[USE_EFFECT] visibleProperties è stato aggiornato: ${visibleProperties.length} proprietà`);
    
    // Se necessario, aggiorna i contatori UI
    const countElement = document.getElementById('visible-property-count');
    if (countElement) {
      countElement.textContent = `${visibleProperties.length} di ${houses.length} proprietà`;
    }
    
    const mapCounterElement = document.getElementById('map-visible-counter');
    if (mapCounterElement) {
      mapCounterElement.textContent = `${visibleProperties.length} di ${houses.length} proprietà visibili`;
    }
    
    // Aggiungiamo un avviso visibile con il numero di proprietà visibili
    console.log(`%c PROPRIETÀ VISIBILI: ${visibleProperties.length} di ${houses.length} `, 'background: #2563eb; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;');
    
  }, [visibleProperties, houses.length]);
  
  // Listener dedicato per il cambio di zoom
  useEffect(() => {
    if (!googleMapRef.current || !window.google || !window.google.maps) return;
    
    const zoomListener = googleMapRef.current.addListener('zoom_changed', () => {
      // Removed zoom change logging
      
      // Aggiorna proprietà visibili dopo cambio zoom
      updateVisibleProperties();
      
      // Timer di sicurezza: aggiorna le proprietà visibili dopo un breve ritardo
      // per assicurarsi che la mappa abbia finito di renderizzare
      setTimeout(() => {
        if (googleMapRef.current) {
          updateVisibleProperties();
        }
      }, 300);
    });
    
    return () => {
      if (window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.removeListener(zoomListener);
      }
    };
  }, [mapLoaded, updateVisibleProperties]);
  
  useEffect(() => {
    // Funzione per aggiornare le proprietà visibili dopo ogni cambio di posizione o zoom
    const handleMapViewportChange = () => {
      if (!googleMapRef.current || !window.google || !window.google.maps) return;
      
      // Rimosso console.log per i cambiamenti di viewport
      updateVisibleProperties();
    };
    
    // Assicuriamoci che l'effetto venga eseguito solo dopo che la mappa è stata caricata
    if (googleMapRef.current && window.google && window.google.maps && mapLoaded) {
      console.log('[MAP_EFFECT] Aggiungo event listeners alla mappa');
      
      // Aggiungi event listeners per i cambiamenti di viewport
      const boundsChangedListener = googleMapRef.current.addListener('bounds_changed', handleMapViewportChange);
      const zoomChangedListener = googleMapRef.current.addListener('zoom_changed', handleMapViewportChange);
      const dragEndListener = googleMapRef.current.addListener('dragend', handleMapViewportChange);
      const idleListener = googleMapRef.current.addListener('idle', handleMapViewportChange);
      
      // Esegui subito un aggiornamento per inizializzare la lista 
      updateVisibleProperties();
      
      // Cleanup dei listeners quando il componente viene smontato
      return () => {
        if (window.google && window.google.maps && window.google.maps.event) {
          window.google.maps.event.removeListener(boundsChangedListener);
          window.google.maps.event.removeListener(zoomChangedListener);
          window.google.maps.event.removeListener(dragEndListener);
          window.google.maps.event.removeListener(idleListener);
          console.log('[MAP_EFFECT] Rimossi event listeners dalla mappa');
        }
      };
    }
  }, [mapLoaded]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Header - Solo per Desktop */}
      {!isMobile && (
        <div className="h-16 bg-white bg-opacity-95 border-b w-full shadow-md z-10">
        <Header />
      </div>
      )}
      
      {/* Main Content Area */}
      <div className={`flex flex-row ${isMobile ? 'h-screen' : 'h-[calc(100vh-4rem)]'} relative w-full overflow-hidden`}>
        {/* Indicatore proprietà visibili - solo desktop */}
        {/* Indicator removed as requested */}
      
        {/* Sidebar desktop - nascosta su mobile */}
        {!isMobile && (
          <div 
            style={{
              width: isSidebarOpen ? '350px' : '0',
              minWidth: isSidebarOpen ? '350px' : '0',
              height: '100%',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: isSidebarOpen ? '2px 0 10px rgba(0,0,0,0.1)' : 'none',
              backgroundColor: 'white',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header della sidebar */}
            <div className="p-4 border-b bg-white z-20 flex-shrink-0">
              <h2 className="text-xl font-bold">
                {searchTerm 
                  ? `Results for "${searchTerm}"` 
                  : visibleProperties.length === 0
                    ? `Nessuna proprietà visibile`
                    : `Proprietà Visibili (${visibleProperties.length})`}
              </h2>
              <div className="flex items-center mt-1">
                <div className={`text-sm font-medium py-1 px-3 rounded-full ${
                  visibleProperties.length === 0 
                    ? 'bg-primary-50 text-primary-600' 
                    : visibleProperties.length < houses.length / 2
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-primary-50 text-primary-600'
                }`}>
                  {visibleProperties.length} proprietà
                </div>
                {visibleProperties.length < houses.length && visibleProperties.length > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    Zoom o sposta la mappa per vedere altre proprietà
                  </span>
                )}
              </div>
              {visibleProperties.length === 0 && (
                <div className="mt-2 p-2 bg-primary-50 border border-primary-200 rounded-md text-sm text-primary-700">
                  Nessuna proprietà visibile in questa area. Zoom out o sposta la mappa per visualizzare le proprietà.
                </div>
              )}
          </div>

            {/* Lista proprietà - occupa tutto lo spazio rimanente */}
            <div className="flex-1 overflow-auto">
            <div className="p-4">
                {renderPropertyList()}
              </div>
            </div>
          </div>
        )}
        
        {/* Container mappa - Occupa il resto dello spazio */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          {/* Mappa */}
          <div 
            ref={mapRef} 
            id={MAP_ID}
            style={{ width: '100%', height: '100%' }}
          />
          
          {/* Toggle button della sidebar - solo desktop */}
          {!isMobile && (
            <button 
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                zIndex: 10,
                backgroundColor: 'white',
                borderRadius: '50%',
                padding: '10px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={toggleSidebar}
            >
              {isSidebarOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              )}
            </button>
          )}
          
          {/* Search Bar - Desktop sopra la mappa */}
          {!isMobile && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '70%',
              maxWidth: '800px',
              zIndex: 20,
              padding: '0 10px',
              border: 'none'
            }}>
              <div style={{
                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
                borderRadius: '30px', 
                overflow: 'visible', /* Modificato da 'hidden' a 'visible' per consentire la visualizzazione del dropdown */
                background: 'white',
                border: 'none',
                outline: 'none',
                padding: '0',
                width: '100%',
                position: 'relative' /* Aggiunto per garantire il corretto positioning del dropdown */
              }}>
                {placesApiReady ? (
                  <SearchBar onSearch={handleSearch} isSearching={isSearching} isMobile={false} onMapPage={true} />
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '10px 16px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    Loading search...
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Search Bar - Mobile in alto */}
          {isMobile && (
            <div style={{ 
              ...mobileSearchBarContainerStyle,
              border: 'none',
              boxShadow: 'none'
            }}>
              <div style={{ 
                width: '100%', 
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                padding: '0',
                overflow: 'hidden',
                border: 'none',
                outline: 'none'
              }}>
                {placesApiReady ? (
                  <SearchBar 
                    onSearch={handleSearch} 
                    isSearching={isSearching} 
                    isMobile={true}
                  />
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '10px 16px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    Loading search...
                  </div>
                )}
                
                {/* Messaggio di errore */}
                {searchError && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      backgroundColor: 'rgba(59, 130, 246, 0.9)', // Colore primary invece di rosso
                      color: 'white',
                      padding: '8px 16px',
                      fontSize: '14px',
                      zIndex: 100,
                      textAlign: 'center',
                      borderBottomLeftRadius: '8px',
                      borderBottomRightRadius: '8px',
                    }}
                  >
                    {searchError}
                    <button 
                      style={{ 
                        position: 'absolute', 
                        right: '8px', 
                        top: '8px',
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        fontSize: '16px'
                      }}
                      onClick={() => setSearchError(null)}
                    >
                      ×
                    </button>
              </div>
                )}
            </div>
          </div>
          )}

          {/* Usa il DraggableBottomSheet invece del drawer personalizzato */}
          {isMobile && mapLoaded && (
              <DraggableBottomSheet
                ref={bottomSheetRef}
              houses={formatPropertiesForSheet}
              onViewDetails={handleViewDetails}
              onFindOnMap={handleFindOnMap}
              topOffset={60}
              activeTab={activeBottomTab}
              onTabChange={handleTabChange}
            />
          )}
            </div>
          </div>

      {/* Overlay di errore o loading */}
      {mapError && !showListOnly && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(243, 244, 246, 0.9)', zIndex: 50 }}>
          <div className="text-center p-4 max-w-md bg-white rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-primary-500 mb-2">Errore di caricamento mappa</h2>
            <p className="text-gray-600 mb-4">
              Si è verificato un errore durante il caricamento della mappa Google Maps. Il problema potrebbe essere legato alla chiave API.
            </p>
            <pre className="bg-gray-200 p-2 rounded text-xs text-left my-2 max-h-24 overflow-auto">
              {`Possibili cause:
1. Chiave API non valida o errata
2. API Maps JavaScript non abilitata nel progetto Google Cloud
3. Dominio non autorizzato per l'utilizzo della chiave API
4. Restrizioni di fatturazione o quote API esaurite
5. Mancanza di connessione internet`}
            </pre>
            <p className="text-sm text-gray-500 my-2">
              Chiave API utilizzata: {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 
                (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string).substring(0, 8) + "..." + 
                (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string).substring((import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string).length - 4) : 
                "Non specificata"}
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <button 
                className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded"
                onClick={() => window.location.reload()}
              >
                Riprova
              </button>
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
              >
                Gestisci Chiave API
              </a>
        </div>
            <button 
              className="mt-4 text-primary-500 hover:text-primary-700 underline text-sm"
              onClick={() => setShowListOnly(true)}
            >
              Visualizza solo la lista proprietà
            </button>
      </div>
        </div>
      )}
      
      {!mapLoaded && !mapError && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(243, 244, 246, 0.9)', zIndex: 50 }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Caricamento mappa...</p>
          </div>
        </div>
      )}

      {/* Visualizzazione alternativa quando la mappa non è disponibile */}
      {showListOnly && (
        <div className="map-unavailable-view">
          <div className="properties-list-container">
            <h2>Available Properties</h2>
            <button 
              className="retry-button"
              onClick={() => setShowListOnly(false)}
            >
              Try loading map again
            </button>
            <div className="properties-grid">
              {properties.map(property => (
                <div key={property.id} className="property-card">
                  <img src={property.image} alt={property.title} className="property-image" />
                  <div className="property-details">
                    <h3>{property.title}</h3>
                    <div className="property-rating">
                      {property.rating} ★ ({property.reviews} reviews)
                    </div>
                    <p className="property-description">{property.description}</p>
                    <p className="property-price">${property.price} per night</p>
                    <p className="property-location">Location: {property.location.lat.toFixed(4)}, {property.location.lng.toFixed(4)}</p>
                    <button 
                      className="view-details-button"
                      onClick={() => {
                        // Navigate to property details or show more info
                        console.log("View details for property:", property.id);
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // Funzione per renderizzare la lista delle proprietà (usata sia in desktop che mobile)
  function renderPropertyList() {
    // Log per debug del rendering
    console.log(`[RENDER_LIST] Rendering della lista proprietà. Proprietà visibili: ${visibleProperties.length}`);
    
    // Determina se usare layout specifico per mobile o desktop
    const cardStyle = isMobile 
      ? "bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all" 
      : "bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer relative";
    
    const imageHeight = isMobile ? "h-36" : "h-48";
    const padding = isMobile ? "p-3" : "p-4";
    
    // Usa SOLO le proprietà visibili per la lista - NON mostriamo mai tutte le proprietà
    const propertiesToShow = visibleProperties;
    
    // Log per debugging
    console.log(`[RENDER_LIST] Mostro ${propertiesToShow.length} proprietà nella lista`);
    if (propertiesToShow.length > 0) {
      console.log(`[RENDER_LIST] Prima proprietà: id=${propertiesToShow[0].id}, titolo="${propertiesToShow[0].title}"`);
    }
    
    return propertiesToShow.length > 0 ? (
      <div className={`grid grid-cols-1 ${isMobile ? 'gap-3 px-1' : 'gap-6'}`}>
        {propertiesToShow.map(property => (
          <div 
            key={property.id}
            className={`${cardStyle} ${selectedProperty === property.id ? 'ring-2 ring-primary-500' : ''}`}
            onClick={() => property.id && locateProperty(property.id)}
          >
            <div className="relative">
              <img 
                src={property.image} 
                alt={property.title} 
                className={`w-full ${imageHeight} object-cover`}
              />
              <div className={`absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-md ${isMobile ? 'text-xs' : ''}`}>
                ${property.price}<span className="text-xs font-normal">/notte</span>
        </div>
              
              {/* Badge per rating */}
              <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-gray-800 px-2 py-1 rounded-lg text-xs font-semibold shadow-sm flex items-center">
                <span className="text-yellow-500 mr-1">★</span> 
                {property.rating.toFixed(1)} 
                <span className={`${isMobile ? 'text-xs' : 'text-gray-500'} ml-1`}>({property.reviews})</span>
              </div>
              
              {/* Pulsante per vedere la posizione sulla mappa - visibile solo su desktop o se non siamo già in modalità mappa su mobile */}
              {(!isMobile || activeBottomTab !== 'map') && (
                <button 
                  className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md hover:bg-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    locateProperty(property.id);
                    if (isMobile) {
                      setIsMobileDrawerOpen(false);
                      // Se siamo in un tab diverso da mappa, cambiamo tab
                      if (activeBottomTab !== 'map') {
                        handleTabChange('map');
                      }
                    }
                  }}
                  title="Visualizza sulla mappa"
                  aria-label="Visualizza sulla mappa"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-primary-600`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className={padding}>
              <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'} text-gray-800 mb-1`}>{property.title}</h3>
              
              <p className={`text-sm text-gray-600 mb-3 ${isMobile ? 'line-clamp-1' : 'line-clamp-2'}`}>{property.description}</p>
              
              <div className={`flex justify-between items-center ${isMobile ? 'mt-1 pt-1' : 'mt-auto pt-2'} border-t border-gray-100`}>
                {isMobile ? (
                  // Versione compatta per mobile
                  <div className="flex items-center text-xs text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {property.location.lat.toFixed(2)}, {property.location.lng.toFixed(2)}
                  </div>
                ) : (
                  // Versione completa per desktop
                  <button
                    className="flex items-center text-primary-600 hover:text-primary-800 text-sm font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      locateProperty(property.id);
                      if (isMobile) {
                        setIsMobileDrawerOpen(false);
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Sulla mappa
                  </button>
                )}
                
                <button 
                  className={`bg-primary-600 hover:bg-primary-700 text-white text-sm ${isMobile ? 'py-1 px-3 text-xs' : 'py-2 px-4'} rounded-lg transition-colors font-medium`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/property/${property.id}`);
                  }}
                >
                  Dettagli
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className={`text-center py-8 px-4 bg-white rounded-xl shadow-sm ${isMobile ? 'mx-1' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} mx-auto text-gray-400 mb-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-700`}>Non ci sono proprietà in questa area</p>
        <p className="mt-1 text-gray-500 text-sm">Prova a spostare la mappa o cambiare il livello di zoom</p>
        <button 
          className={`mt-4 bg-primary-600 hover:bg-primary-700 text-white ${isMobile ? 'py-1.5 px-4 text-sm' : 'py-2 px-6'} rounded-lg transition-colors shadow-sm`}
          onClick={() => {
            if (googleMapRef.current) {
              console.log("[NO_PROPERTIES] Resetting map to show all properties");
              
              // Ricrea bounds con tutte le proprietà
              let bounds = new window.google.maps.LatLngBounds();
              houses.forEach(property => {
                if (property.location && property.location.lat && property.location.lng) {
                  bounds.extend(new window.google.maps.LatLng(
                    property.location.lat,
                    property.location.lng
                  ));
                }
              });
              
              // Adatta la mappa per mostrare tutti i marker
              googleMapRef.current.fitBounds(bounds);
              
              // Imposta uno zoom ragionevole per vedere più proprietà
              setTimeout(() => {
                if (googleMapRef.current && googleMapRef.current.getZoom() > 10) {
                  googleMapRef.current.setZoom(8);
                }
                // Aggiorna manualmente le proprietà visibili
                updateVisibleProperties();
              }, 100);
              
              // Su mobile chiudi il drawer dopo aver fatto l'operazione
              if (isMobile) {
                setIsMobileDrawerOpen(false);
              }
            }
          }}
        >
          Mostra tutte le proprietà
        </button>
    </div>
  );
  }
};

export default MapPage;