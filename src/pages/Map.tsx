import React, { useState, useRef, useEffect, CSSProperties, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { properties } from '../data/properties';
import SearchBar from '../components/SearchBar';
import { Card, Badge, Button } from '@heroui/react';
import { DraggableBottomSheet, DraggableBottomSheetHandle } from '../components/DraggableBottomSheet';

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
const MAP_ID = 'fakebnb-map';

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
  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
  borderRadius: '30px', 
  overflow: 'hidden',
  background: 'white',
  border: 'none',
  padding: '2px',
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
  padding: '0 10px'
};

// Stile per il contenitore della search bar versione mobile
const mobileSearchBarContainerStyle: CSSProperties = {
  ...interactiveElement,
  position: 'fixed',
  top: '0',
  left: '0',
  width: '100%',
  padding: '8px 16px',
  backgroundColor: 'white',
  borderBottom: '1px solid #e5e7eb',
  zIndex: 50,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
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
    // Implementiamo un throttling per evitare chiamate troppo frequenti
    const now = Date.now();
    if (window.lastVisibleUpdate && now - window.lastVisibleUpdate < 300) {
      // Non aggiorniamo se l'ultima chiamata è avvenuta meno di 300ms fa
      return;
    }
    window.lastVisibleUpdate = now;
    
    // Controllo più rigoroso per la mappa
    if (!googleMapRef.current || 
        !window.google || 
        !window.google.maps || 
        !window.google.maps.LatLng || 
        !mapLoaded) {
      
      // Riduciamo i log per evitare spam nella console - mostriamo solo ogni 3 secondi
      const now = Date.now();
      if (!window.lastInitWarnLog || now - window.lastInitWarnLog > 3000) {
        console.warn("[UPDATE_VISIBLE] Mappa non inizializzata completamente");
        window.lastInitWarnLog = now;
        
        // Se la mappa non è pronta ma abbiamo delle proprietà, mostriamole tutte (solo la prima volta)
        if (houses.length > 0 && visibleProperties.length === 0) {
          console.log("[UPDATE_VISIBLE] Fallback: mostro tutte le proprietà in attesa dell'inizializzazione");
          setVisibleProperties(houses);
        }
      }
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
      
      // Se i bounds non sono disponibili, mostra tutte le proprietà
      if (!bounds) {
        console.warn("[UPDATE_VISIBLE] Map bounds non disponibili");
        console.log("[UPDATE_VISIBLE] Fallback: mostro tutte le proprietà");
        setVisibleProperties(houses);
        return;
      }
      
      console.log("[UPDATE_VISIBLE] Aggiornamento proprietà visibili in base ai bounds della mappa");
      console.log("[UPDATE_VISIBLE] Bounds attuali:", 
        `SW(${bounds.getSouthWest().lat().toFixed(5)}, ${bounds.getSouthWest().lng().toFixed(5)})`,
        `NE(${bounds.getNorthEast().lat().toFixed(5)}, ${bounds.getNorthEast().lng().toFixed(5)})`);
      
      // Filtra le case visibili nell'area della mappa
      const visible = houses.filter(house => {
        if (!house.location || !house.location.lat || !house.location.lng) {
          return false;
        }
        
        try {
          const propertyLatLng = new window.google.maps.LatLng(
            house.location.lat,
            house.location.lng
          );
          return bounds.contains(propertyLatLng);
        } catch (err) {
          console.error(`[UPDATE_VISIBLE] Errore nel processare la proprietà ${house.id}:`, err);
          return false;
        }
      });
      
      console.log(`[UPDATE_VISIBLE] Proprietà filtrate: ${visible.length} visibili su ${houses.length} totali`);
      
      // Se non ci sono proprietà visibili ma ce ne sono alcune nel dataset, mostriamo comunque qualcosa
      if (visible.length === 0 && houses.length > 0) {
        console.warn("[UPDATE_VISIBLE] Nessuna proprietà visibile nell'area corrente, mostro tutte le proprietà");
        setVisibleProperties(houses);
      } else {
        // Aggiorna lo stato con le proprietà visibili
        setVisibleProperties(visible);
      }
    } catch (error) {
      console.error("[UPDATE_VISIBLE] Errore nell'aggiornamento delle proprietà visibili:", error);
      // In caso di errore, mostriamo tutte le proprietà per evitare una lista vuota
      setVisibleProperties(houses);
    }
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
      const completeMapInitialization = () => {
        // Evita inizializzazioni duplicate
        if (mapInitialized) {
          console.log("[INIT_MAP] Map already initialized, skipping duplicate initialization");
          return;
        }
        
        mapInitialized = true;
        console.log("[INIT_MAP] Completing map initialization");
        
        // Assicura che l'interazione sia possibile
        if (mapRef.current) {
          mapRef.current.style.pointerEvents = 'auto';
        }
        
        console.log("[INIT_MAP] Map instance created successfully");
        googleMapRef.current = map;
        
        // Crea una infoWindow per mostrare i dettagli della proprietà
        const infoWindow = new window.google.maps.InfoWindow({
          maxWidth: 320
        });
        
        infoWindowRef.current = infoWindow;
        
        // Forza l'applicazione dello stile personalizzato
        try {
          console.log("[INIT_MAP] Enforcing custom map style with ID e364d3818cec701");
          map.setOptions({
            mapId: "e364d3818cec701",
            clickableIcons: false
          });
          
          // Disabilita anche tutti i controlli non essenziali
          map.setOptions({
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false, 
            streetViewControl: false,
            fullscreenControl: false
          });
        } catch (error) {
          console.error("[INIT_MAP] Error applying custom map style:", error);
        }
        
        // Segnala che la mappa è stata caricata
        setMapLoaded(true);
        
        // Attendi un momento per assicurarsi che la mappa sia completamente renderizzata
        // prima di aggiornare le proprietà visibili
        setTimeout(() => {
          if (googleMapRef.current) {
            console.log("[INIT_MAP] Triggering initial updateVisibleProperties after initialization");
            updateVisibleProperties();
          }
        }, 500);
      };
      
      // Attendi che la mappa sia completamente caricata prima di procedere
      const idleListener = map.addListener('idle', () => {
        console.log("[INIT_MAP] Map idle event fired - map is ready");
        
        // Rimuovi il listener dopo la prima esecuzione
        window.google.maps.event.removeListener(idleListener);
        
        // Completa l'inizializzazione
        completeMapInitialization();
        
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
          completeMapInitialization();
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
  
  // Funzione per gestire la ricerca
  const handleSearch = async (params: SearchParams, coordinates?: [number, number]) => {
    console.log("Ricerca avviata con parametri:", params);
    
    // Non impostiamo isSearching a true
    // setIsSearching(true);
    
    setSearchTerm(params.location);
    
    // Se sono fornite le coordinate, usa quelle direttamente
    if (coordinates) {
      const [lat, lng] = coordinates;
      console.log(`Utilizzo coordinate fornite: [${lat}, ${lng}]`);
      
      if (googleMapRef.current) {
        // Centra la mappa sulle coordinate
        googleMapRef.current.setCenter({ lat, lng });
        googleMapRef.current.setZoom(13);
        
        // Aggiungi un marker per la posizione cercata
        addSearchMarker({ lat, lng }, params.location);
      }
      
      // Nascondi subito l'indicatore di caricamento
      setIsSearching(false);
      return;
    }
    
    try {
      console.log("[SEARCH] Searching for location:", params.location);
      
      // Usa l'API di Nominatim per ottenere le coordinate dalla stringa di ricerca
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(params.location)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        const position = {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lon)
        };
        
        console.log("[SEARCH] Found location:", location.display_name, position);
        
        if (googleMapRef.current) {
          // Riapplica il mapId personalizzato prima di aggiungere il marker
          googleMapRef.current.setOptions({
            mapId: "e364d3818cec701",
            clickableIcons: false
          });
          
          // Aggiungi il marker per la posizione cercata
          addSearchMarker(position, location.display_name);
          
          // Imposta lo zoom appropriato
          googleMapRef.current.setZoom(13);
        } else {
          console.error("[SEARCH] Google Map not initialized yet");
          setSearchError("Mappa non inizializzata. Riprova tra qualche istante.");
        }
      } else {
        console.warn("[SEARCH] No results found for:", params.location);
        setSearchError(`Nessun risultato trovato per: ${params.location}`);
      }
    } catch (error) {
      console.error("[SEARCH] Error during search:", error);
      setSearchError("Errore durante la ricerca. Riprova più tardi.");
    } finally {
      setIsSearching(false);
    }
  };
  
  // Funzione per aggiungere un marker per la posizione cercata
  const addSearchMarker = (position: { lat: number; lng: number }, locationName: string = "Posizione cercata") => {
    if (!googleMapRef.current || !window.google || !window.google.maps) {
      console.error("[SEARCH_MARKER] Google Maps not initialized");
      return;
    }
    
    try {
      // Rimuovi eventuali marker di ricerca precedenti
      if (searchMarkerRef.current) {
        try {
          if (window.google.maps.marker && 
              window.google.maps.marker.AdvancedMarkerElement && 
              searchMarkerRef.current instanceof window.google.maps.marker.AdvancedMarkerElement) {
            searchMarkerRef.current.map = null;
          } else if (searchMarkerRef.current.setMap && typeof searchMarkerRef.current.setMap === 'function') {
            searchMarkerRef.current.setMap(null);
          }
        } catch (e) {
          console.warn("[SEARCH_MARKER] Error removing previous marker:", e);
        }
        
        searchMarkerRef.current = null;
      }
      
      let newSearchMarker: GoogleMapMarker | null = null;
      
      // Verifica la disponibilità di AdvancedMarkerElement con controlli rigorosi
      let useAdvancedMarkers = Boolean(
        window.google && 
        window.google.maps && 
        window.google.maps.marker && 
        window.google.maps.marker.AdvancedMarkerElement
      );
      
      if (useAdvancedMarkers) {
        try {
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
          
          newSearchMarker = new window.google.maps.marker.AdvancedMarkerElement({
            map: googleMapRef.current,
            position: position,
            content: searchMarkerElement,
            zIndex: 1000, // Metti il search marker sopra gli altri
            title: locationName
          });
          
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
          console.warn("[SEARCH_MARKER] Error creating AdvancedMarkerElement, falling back to standard marker:", e);
          useAdvancedMarkers = false; // Forza il fallback al marker standard
        }
      }
      
      // Usa il marker standard come fallback se AdvancedMarkerElement non è disponibile o ha fallito
      if (!useAdvancedMarkers || !newSearchMarker) {
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
          title: locationName
        });
        
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
          
          infoWindow.open(googleMapRef.current, newSearchMarker);
        });
      }
      
      // Anima il marker se possibile
      try {
        if (!useAdvancedMarkers && newSearchMarker instanceof window.google.maps.Marker) {
          // Animazione per Marker standard
          newSearchMarker.setAnimation(window.google.maps.Animation.DROP);
        }
      } catch (e) {
        console.warn("[SEARCH_MARKER] Could not animate marker:", e);
      }
      
      // Salva il riferimento al nuovo marker di ricerca
      searchMarkerRef.current = newSearchMarker;
      console.log("[SEARCH_MARKER] Added search marker at:", position);
      
      // Centra la mappa sul marker
      googleMapRef.current.panTo(position);
      
    } catch (error) {
      console.error("[SEARCH_MARKER] Error adding search marker:", error);
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
    if (!infoWindowRef.current || !googleMapRef.current) return;
    
    // Chiudi qualsiasi infoWindow aperta
    infoWindowRef.current.close();
    
    // Crea il contenuto dell'infoWindow con design migliorato
    const content = `
      <div style="max-width: 300px; font-family: 'Arial', sans-serif;">
        <div style="position: relative;">
          <img src="${property.image}" alt="${property.title}" 
            style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px 8px 0 0;" />
          <div style="position: absolute; bottom: 8px; right: 8px; background-color: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
            $${property.price}/notte
          </div>
        </div>
        
        <div style="padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 style="font-weight: bold; margin: 0; font-size: 16px;">${property.title}</h3>
            <span style="display: flex; align-items: center; font-size: 14px;">
              <span style="color: #FFB400; margin-right: 4px;">★</span> 
              ${property.rating.toFixed(1)} 
              <span style="color: #666; margin-left: 4px;">(${property.reviews})</span>
            </span>
          </div>
          
          <p style="color: #444; font-size: 13px; margin: 8px 0; line-height: 1.4; max-height: 56px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
            ${property.description}
          </p>
          
          <button id="view-property-btn" 
            style="background-color: #2563eb; color: white; border: none; border-radius: 8px; padding: 8px 16px; width: 100%; cursor: pointer; font-weight: bold; margin-top: 8px; transition: background-color 0.2s ease;">
            Visualizza Dettagli
          </button>
        </div>
      </div>
    `;
    
    infoWindowRef.current.setContent(content);
    
    // Determina la posizione del marker e apri l'infoWindow
    try {
      // Verifica il tipo di marker per gestirlo correttamente
      if (window.google.maps.marker && 
          window.google.maps.marker.AdvancedMarkerElement && 
          marker instanceof window.google.maps.marker.AdvancedMarkerElement) {
        // Per AdvancedMarkerElement, usiamo la proprietà position
        console.log("[INFO_WINDOW] Opening for AdvancedMarkerElement");
        const position = marker.position;
        
        if (position) {
          infoWindowRef.current.setPosition(position);
          infoWindowRef.current.open(googleMapRef.current);
        } else {
          console.error("[INFO_WINDOW] AdvancedMarkerElement position is undefined");
        }
      } else if (marker && 'getPosition' in marker && typeof marker.getPosition === 'function') {
        // Per marker standard con getPosition
        console.log("[INFO_WINDOW] Opening for standard Marker with getPosition");
        const position = marker.getPosition();
        if (position) {
          infoWindowRef.current.open(googleMapRef.current, marker);
        } else {
          console.error("[INFO_WINDOW] Standard marker position is undefined");
          // Fallback alla posizione dalla proprietà
          infoWindowRef.current.setPosition({ 
            lat: property.location.lat, 
            lng: property.location.lng 
          });
          infoWindowRef.current.open(googleMapRef.current);
        }
      } else if (marker && 'position' in marker) {
        // Per marker con proprietà position diretta
        console.log("[INFO_WINDOW] Opening for marker with direct position property");
        infoWindowRef.current.setPosition(marker.position);
        infoWindowRef.current.open(googleMapRef.current);
      } else {
        // Fallback alla posizione dalla proprietà
        console.warn("[INFO_WINDOW] Unknown marker type, using property location");
        infoWindowRef.current.setPosition({ 
          lat: property.location.lat, 
          lng: property.location.lng 
        });
        infoWindowRef.current.open(googleMapRef.current);
      }
    } catch (error) {
      console.error("[INFO_WINDOW] Error opening InfoWindow:", error);
      // Fallback usando solo la posizione della proprietà
      try {
        infoWindowRef.current.setPosition({ 
          lat: property.location.lat, 
          lng: property.location.lng 
        });
        infoWindowRef.current.open(googleMapRef.current);
      } catch (e) {
        console.error("[INFO_WINDOW] Critical error opening InfoWindow:", e);
      }
    }
    
    // Aggiungi event listener per il pulsante dopo un breve ritardo
    setTimeout(() => {
      const button = document.getElementById('view-property-btn');
      if (button) {
        button.addEventListener('click', () => {
          navigate(`/property/${property.id}`);
        });
        
        // Aggiungi effetto hover
        button.addEventListener('mouseover', () => {
          button.style.backgroundColor = '#1d4ed8';
        });
        button.addEventListener('mouseout', () => {
          button.style.backgroundColor = '#2563eb';
        });
      }
    }, 10);
  };
  
  // Funzione per caricare l'API di Google Maps
  const loadGoogleMaps = () => {
    try {
      // Verifica se Google Maps è già stato caricato
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log("[INIT] Google Maps already loaded and available, initializing map...");
        
        // Verifica anche se marker è disponibile
        if (window.google.maps.Marker) {
          console.log("[INIT] Google Maps Marker is available");
        } else {
          console.warn("[INIT] Google Maps Marker is NOT available!");
        }
        
        // Inietta il polyfill per sostituire Marker con AdvancedMarkerElement se disponibile
        if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
          injectMarkerPolyfill();
        }
        
        googleMapsScriptLoaded = true;
        
        // Prima di chiamare initializeMap, verifichiamo che tutte le componenti necessarie siano caricate
        if (window.google.maps.InfoWindow && window.google.maps.LatLngBounds) {
          console.log("[INIT] All required Google Maps components are available");
          initializeMap();
        } else {
          console.warn("[INIT] Some Google Maps components are missing, retrying in 500ms");
          setTimeout(initializeMap, 500);
        }
        
        // Forza l'impostazione di Places API come pronta anche se non completamente caricata
        // Questo permetterà alla SearchBar di inizializzare i propri servizi
        console.log("[INIT] Force setting Places API as ready for SearchBar");
        setPlacesApiReady(true);
        
        // Avvia la verifica delle API Places in background
        setTimeout(() => {
          try {
            // Verifica se Places API è disponibile e completa
            if (window.google && window.google.maps && window.google.maps.places) {
              console.log("[INIT] Places API is available in background check");
              // Anche se non tutte le componenti sono disponibili, permettiamo alla SearchBar di procedere
              setPlacesApiReady(true);
            }
          } catch (e) {
            console.warn("[INIT] Error in background Places API check:", e);
          }
        }, 1000);
        
        return;
      }

      // Verifica se lo script è già in caricamento
      if (isGoogleMapsScriptLoading) {
        console.log("[INIT] Google Maps script is already loading, skipping...");
        return;
      }
      
      if (googleMapsScriptLoaded) {
        console.warn("[INIT] Google Maps script was loaded but Map is not available, this is strange...");
        setMapError(true);
        return;
      }

      // Marca lo script come in caricamento
      isGoogleMapsScriptLoading = true;
      
      console.log("[INIT] Loading Google Maps API...");
      
      // Carica lo script di Google Maps
      const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!googleMapsApiKey) {
        console.error("[INIT] Google Maps API key not found in environment variables!");
        throw new Error("Google Maps API key not found");
      }
      
      console.log("[INIT] API key found:", googleMapsApiKey.substring(0, 8) + "..." + googleMapsApiKey.substring(googleMapsApiKey.length - 4));
      
      // Crea lo script
      const script = document.createElement('script');
      // Imposta un timeout di sicurezza per prevenire caricamenti indefiniti
      const timeoutId = setTimeout(() => {
        console.error("[INIT] Google Maps script loading timed out after 10 seconds");
        isGoogleMapsScriptLoading = false;
        setMapError(true);
        
        // Rimuovi lo script che non si è caricato
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }, 10000);
      
      // Versione più semplice e diretta dello script con parametri migliorati
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&callback=initGoogleCallback&loading=async&v=weekly`;
      script.async = true;
      script.defer = true;
      
      // Aggiungiamo ulteriori event handler per monitorare lo stato di caricamento
      script.addEventListener('load', () => {
        console.log("[INIT] Google Maps script 'load' event fired");
        // Il callback si occuperà di inizializzare la mappa
      });
      
      script.addEventListener('error', (event) => {
        console.error("[INIT] Google Maps script error event:", event);
        setMapError(true);
        clearTimeout(timeoutId);
        isGoogleMapsScriptLoading = false;
      });
      
      // Definisco una funzione di callback globale
      window.initGoogleCallback = () => {
        console.log("[INIT] Google Maps initialized via callback");
        clearTimeout(timeoutId);
        isGoogleMapsScriptLoading = false;
        googleMapsScriptLoaded = true;
        
        if (window.google && window.google.maps) {
          console.log("[INIT] Verifico la disponibilità di tutti i componenti necessari...");
          
          // Controlla se l'ID dello stile è disponibile
          try {
            // Questo codice forza il caricamento dello stile personalizzato prima di procedere
            console.log("[INIT] Verifica disponibilità dello stile personalizzato con ID: e364d3818cec701");
            
            // Tentativo di riferimento diretto allo stile che potrebbe forzare il caricamento anticipato
            if (window.google.maps.mapTypes) {
              console.log("[INIT] mapTypes è disponibile per il caricamento degli stili");
            }
            
            // Riprova la chiamata di inizializzazione con un leggero ritardo
            setTimeout(() => {
              // Se googleMapRef.current è null, la mappa non è stata ancora inizializzata
              if (!googleMapRef.current) {
                console.log("[INIT] Inizializzazione della mappa dopo il caricamento dello stile");
                initializeMap();
              }
            }, 200);
          } catch (e) {
            console.warn("[INIT] Errore durante la verifica dello stile:", e);
            // Procedi comunque con l'inizializzazione
            initializeMap();
          }
        } else {
          console.error("[INIT] Google Maps not available after callback");
          setMapError(true);
        }
      };
      
      // Gestisci il caricamento dello script
      script.onload = () => {
        console.log("[INIT] Google Maps script loaded successfully");
        // Il callback si occuperà di inizializzare la mappa
      };
      
      // Aggiungi lo script al DOM
      console.log("[INIT] Appending script to document.head");
      document.head.appendChild(script);
    } catch (error) {
      console.error("[INIT] Error initializing Google Maps:", error);
      isGoogleMapsScriptLoading = false;
      setMapError(true);
    }
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
                  : `${visibleProperties.length} Properties in View`}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {visibleProperties.length < houses.length 
                  ? `Showing ${visibleProperties.length} of ${houses.length} properties` 
                  : `Showing all ${houses.length} properties`}
              </p>
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
              width: '50%',
              maxWidth: '600px',
              zIndex: 20,
              padding: '0 10px'
            }}>
              <div style={{
                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
                borderRadius: '30px', 
                overflow: 'hidden',
                background: 'white',
                border: 'none',
                padding: '2px',
                width: '100%'
              }}>
                {placesApiReady ? (
                  <SearchBar onSearch={handleSearch} isSearching={isSearching} isMobile={false} />
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '10px 16px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    Loading search...
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Search Bar - Mobile in alto */}
          {isMobile && (
            <div style={mobileSearchBarContainerStyle}>
              <div style={{ 
                width: '100%', 
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                padding: '6px',
                overflow: 'hidden'
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
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
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
                      backgroundColor: 'rgba(239, 68, 68, 0.9)', 
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
            <h2 className="text-xl font-bold text-red-500 mb-2">Errore di caricamento mappa</h2>
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
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
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
              className="mt-4 text-blue-500 hover:text-blue-700 underline text-sm"
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
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
    // Determina se usare layout specifico per mobile o desktop
    const cardStyle = isMobile 
      ? "bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all" 
      : "bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer relative";
    
    const imageHeight = isMobile ? "h-36" : "h-48";
    const padding = isMobile ? "p-3" : "p-4";
    
    return visibleProperties.length > 0 ? (
      <div className={`grid grid-cols-1 ${isMobile ? 'gap-3 px-1' : 'gap-6'}`}>
        {visibleProperties.map(property => (
          <div 
            key={property.id}
            className={`${cardStyle} ${selectedProperty === property.id ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => property.id && locateProperty(property.id)}
          >
            <div className="relative">
              <img 
                src={property.image} 
                alt={property.title} 
                className={`w-full ${imageHeight} object-cover`}
              />
              <div className={`absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-md ${isMobile ? 'text-xs' : ''}`}>
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
                  <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} viewBox="0 0 20 20" fill="currentColor">
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {property.location.lat.toFixed(2)}, {property.location.lng.toFixed(2)}
                  </div>
                ) : (
                  // Versione completa per desktop
                  <button
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
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
                  className={`bg-blue-600 hover:bg-blue-700 text-white text-sm ${isMobile ? 'py-1 px-3 text-xs' : 'py-2 px-4'} rounded-lg transition-colors font-medium`}
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
          className={`mt-4 bg-blue-600 hover:bg-blue-700 text-white ${isMobile ? 'py-1.5 px-4 text-sm' : 'py-2 px-6'} rounded-lg transition-colors shadow-sm`}
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
                if (googleMapRef.current.getZoom() > 10) {
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