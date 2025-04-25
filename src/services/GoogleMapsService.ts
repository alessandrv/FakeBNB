// Servizio centralizzato per Google Maps API

// Flag per tracciare lo stato del caricamento
let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;
let callbacks: (() => void)[] = [];

/**
 * Carica l'API di Google Maps una sola volta e notifica tutti i componenti interessati
 * @returns Promise che si risolve quando l'API è caricata
 */
export const loadGoogleMapsApi = (): Promise<void> => {
  // Se è già caricata, risolvi immediatamente
  if (isLoaded && window.google && window.google.maps) {
    console.log("[GoogleMapsService] API già caricata, ritorno subito");
    return Promise.resolve();
  }
  
  // Se il caricamento è già in corso, ritorna la promessa esistente
  if (isLoading && loadPromise) {
    console.log("[GoogleMapsService] Caricamento già in corso, ritorno promessa esistente");
    return loadPromise;
  }
  
  // Altrimenti inizia il caricamento
  console.log("[GoogleMapsService] Inizializzazione caricamento Google Maps API");
  isLoading = true;
  
  loadPromise = new Promise<void>((resolve, reject) => {
    try {
      // Verifica se lo script è già presente
      if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
        console.log("[GoogleMapsService] Script già presente nel DOM");
      }
      
      // Definisci un nome callback unico
      const callbackName = 'googleMapsCallback' + Math.floor(Math.random() * 1000000);
      
      // Definisci il callback per quando lo script è caricato
      (window as any)[callbackName] = function() {
        console.log('[GoogleMapsService] Callback di inizializzazione chiamata');
        isLoading = false;
        isLoaded = true;
        
        // Rimuovi il callback dopo l'uso
        setTimeout(() => {
          delete (window as any)[callbackName];
        }, 100);
        
        if (window.google && window.google.maps) {
          console.log('[GoogleMapsService] API caricata con successo');
          // Dai un po' di tempo all'API per inizializzarsi completamente
          setTimeout(() => {
            // Notifica tutti i callback registrati
            callbacks.forEach(callback => callback());
            callbacks = []; // Pulisci la lista
            resolve();
          }, 500);
        } else {
          console.error('[GoogleMapsService] API caricata ma oggetto google.maps non trovato');
          isLoaded = false;
          reject(new Error("Google Maps API non disponibile dopo il caricamento"));
        }
      };
      
      // Ottieni la chiave API dall'ambiente
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyC_n7J4QTEgn2D0xXrjJhIjHES1CdnQqxs';
      
      // Crea lo script con il callback
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      script.onerror = (error) => {
        console.error('[GoogleMapsService] Errore nel caricamento dello script:', error);
        isLoading = false;
        delete (window as any)[callbackName];
        reject(new Error("Errore nel caricamento dell'API Google Maps"));
      };
      
      // Aggiungi lo script al documento
      document.head.appendChild(script);
      console.log('[GoogleMapsService] Script aggiunto al documento');
      
    } catch (error) {
      console.error('[GoogleMapsService] Errore durante l\'inizializzazione del caricamento:', error);
      isLoading = false;
      reject(error);
    }
  });
  
  return loadPromise;
};

/**
 * Verifica se l'API Google Maps è disponibile
 */
export const isGoogleMapsLoaded = (): boolean => {
  return isLoaded && 
    !!window.google && 
    !!window.google.maps && 
    !!window.google.maps.Map;
};

/**
 * Verifica se l'API Google Places è disponibile
 */
export const isGooglePlacesLoaded = (): boolean => {
  return isGoogleMapsLoaded() &&
    !!window.google.maps.places &&
    !!window.google.maps.places.PlacesService &&
    !!window.google.maps.places.AutocompleteService;
};

/**
 * Registra un callback da chiamare quando l'API è caricata
 */
export const onGoogleMapsLoaded = (callback: () => void): void => {
  if (isLoaded && window.google && window.google.maps) {
    // Se l'API è già caricata, esegui subito il callback
    callback();
  } else {
    // Altrimenti aggiungi alla lista dei callback
    callbacks.push(callback);
  }
}; 