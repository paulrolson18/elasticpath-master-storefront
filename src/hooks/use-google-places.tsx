"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { countries } from "../lib/all-countries";

interface AddressComponents {
  street_number?: string;
  route?: string;
  locality?: string;
  administrative_area_level_1?: string;
  administrative_area_level_2?: string;
  country?: string;
  postal_code?: string;
}

export interface ParsedAddress {
  line_1: string;
  line_2: string;
  city: string;
  region: string;
  country: string;
  postcode: string;
}

export function useGooglePlaces() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autocompleteElementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    console.log("Google Places API Key:", apiKey ? "Set (length: " + apiKey.length + ")" : "Not set");
    
    if (!apiKey) {
      setError("Google Places API key is not configured");
      return;
    }

    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places"],
    });

    loader
      .importLibrary("places")
      .then(async () => {
        // Ensure PlaceAutocompleteElement is available
        await customElements.whenDefined("gmp-place-autocomplete");
        setIsLoaded(true);
        setError(null);
      })
      .catch((err) => {
        setError("Failed to load Google Places API");
        console.error("Google Places API loading error:", err);
      });
  }, []);

  const createAutocompleteElement = (
    onPlaceChanged: (address: ParsedAddress) => void,
    options?: {
      types?: string[];
      countries?: string[];
      placeholder?: string;
    }
  ) => {
    if (!isLoaded) return null;

    try {
      // Create the place autocomplete element
      const autocompleteElement = document.createElement("gmp-place-autocomplete") as google.maps.places.PlaceAutocompleteElement;
      
      // Set attributes - skip types for now due to API version issues
      // if (options?.types) {
      //   autocompleteElement.setAttribute("types", options.types.join(","));
      // } else {
      //   autocompleteElement.setAttribute("types", "address");
      // }
      
      // Add fields parameter to get address components and formatted address
      // Include all possible fields that might contain postal code data
      autocompleteElement.setAttribute("fields", "address_components,formatted_address,name,geometry,place_id,plus_code,types,vicinity");
      
      // Also try the requestedPlaceDataFields attribute which might be needed for Web Components
      autocompleteElement.setAttribute("requestedPlaceDataFields", "address_components,formatted_address,name");
      
      // Try the request-source attribute to ensure we get full place details
      autocompleteElement.setAttribute("request-source", "PLACE_DETAILS");
      
      if (options?.countries) {
        autocompleteElement.setAttribute("countries", options.countries.join(","));
      }
      
      if (options?.placeholder) {
        autocompleteElement.setAttribute("placeholder", options.placeholder);
      }

      // Add event listener for place selection
      console.log("Adding event listener to autocomplete element:", autocompleteElement);
      
      // Try multiple event patterns to catch the place selection
      const eventTypes = [
        'gmp-placeselect',
        'placeselect', 
        'place-select',
        'place_changed',
        'places_changed'
      ];
      
      eventTypes.forEach(eventType => {
        autocompleteElement.addEventListener(eventType, (event: any) => {
          console.log(`${eventType} event fired:`, event);
          const place = event.detail?.place || event.place || event.target?.place;
          if (place) {
            console.log("Place object:", place);
            console.log("Place properties:", Object.keys(place));
            
            if (place.addressComponents) {
              console.log("Using addressComponents");
              const parsedAddress = parseAddressComponents(place.addressComponents, place.formattedAddress);
              onPlaceChanged(parsedAddress);
            } else if (place.displayName || place.formattedAddress) {
              console.log("Using fallback - displayName or formattedAddress");
              const fallbackAddress = {
                line_1: place.displayName || place.formattedAddress || "",
                line_2: "",
                city: "",
                region: "",
                country: "US",
                postcode: "",
              };
              console.log("Using fallback address:", fallbackAddress);
              onPlaceChanged(fallbackAddress);
            }
          }
        });
      });

      // Try to access the internal input element via the inputElement property
      setTimeout(() => {
        console.log("Trying to access inputElement property...");
        
        // Try different ways to access the inputElement
        let inputElement = (autocompleteElement as any).inputElement;
        
        if (!inputElement) {
          // Try accessing it from different properties
          const props = Object.getOwnPropertyNames(autocompleteElement);
          console.log("All properties:", props);
          
          for (const prop of props) {
            const value = (autocompleteElement as any)[prop];
            if (value && typeof value === 'object' && value.tagName === 'INPUT') {
              console.log(`Found input element via ${prop}:`, value);
              inputElement = value;
              break;
            }
          }
        }
        
        if (inputElement) {
          console.log("Found inputElement:", inputElement);
          
          // Listen for input events on the internal input
          inputElement.addEventListener('input', (event: any) => {
            console.log("Internal inputElement event:", event.target.value);
            
            // Try to get the current place if available
            const currentPlace = (autocompleteElement as any).place;
            if (currentPlace) {
              console.log("Found current place:", currentPlace);
            }
          });
          
          inputElement.addEventListener('change', (event: any) => {
            const inputValue = event.target.value;
            console.log("Internal inputElement change:", inputValue);
            
            // When input changes to a full address (contains comma), 
            // it likely means user selected from dropdown
            if (inputValue && inputValue.includes(",")) {
              console.log("🔍 FULL ADDRESS DETECTED IN CHANGE EVENT - checking for place object...");
              
              // Give Google Places a moment to populate the place object
              setTimeout(() => {
                const placeAfterDelay = (autocompleteElement as any).place;
                console.log("Place object after change event delay:", placeAfterDelay);
                
                // Let's check ALL properties of the autocomplete element to see where place data might be stored
                console.log("=== DEBUGGING: Checking all autocomplete element properties ===");
                const allProps = Object.getOwnPropertyNames(autocompleteElement);
                const interestingProps = allProps.filter(prop => {
                  const value = (autocompleteElement as any)[prop];
                  return value && typeof value === 'object' && value !== autocompleteElement;
                });
                
                console.log("Interesting object properties:", interestingProps);
                interestingProps.forEach(prop => {
                  const value = (autocompleteElement as any)[prop];
                  console.log(`${prop}:`, value);
                  if (value && typeof value === 'object') {
                    console.log(`${prop} keys:`, Object.keys(value));
                    // Check if this object has addressComponents
                    if (value.addressComponents) {
                      console.log(`🎯 FOUND addressComponents in ${prop}!`, value.addressComponents);
                    }
                    if (value.formattedAddress) {
                      console.log(`🎯 FOUND formattedAddress in ${prop}:`, value.formattedAddress);
                    }
                    
                    // Also check for any postal_code properties
                    Object.keys(value).forEach(subKey => {
                      const subValue = value[subKey];
                      if (typeof subKey === 'string' && subKey.toLowerCase().includes('postal')) {
                        console.log(`🎯 Found postal property ${prop}.${subKey}:`, subValue);
                      }
                      if (typeof subValue === 'string' && /\d{5}/.test(subValue)) {
                        console.log(`🎯 Found potential ZIP code in ${prop}.${subKey}:`, subValue);
                      }
                    });
                  }
                });
                
                // Also check if predictions contains the selected place
                const predictions = (autocompleteElement as any).predictions;
                console.log("Current predictions:", predictions);
                if (predictions && Array.isArray(predictions)) {
                  predictions.forEach((prediction, index) => {
                    console.log(`Prediction ${index}:`, prediction);
                    if (prediction && typeof prediction === 'object') {
                      console.log(`Prediction ${index} keys:`, Object.keys(prediction));
                      
                      // Let's deep dive into the prediction object to find address data
                      const keys = Object.keys(prediction);
                      keys.forEach(key => {
                        const value = (prediction as any)[key];
                        console.log(`  ${key}:`, value);
                        
                        // Check if this property contains address components or structured data
                        if (value && typeof value === 'object') {
                          console.log(`  ${key} (object) keys:`, Object.keys(value));
                          
                          // Look for formattedAddress or addressComponents patterns
                          if (value.formattedAddress || value.formatted_address) {
                            console.log(`🎯 Found formattedAddress in ${key}:`, value.formattedAddress || value.formatted_address);
                          }
                          if (value.addressComponents || value.address_components) {
                            console.log(`🎯 Found addressComponents in ${key}:`, value.addressComponents || value.address_components);
                          }
                          
                          // Check if the selected address matches the input value
                          const addressMatch = inputValue.toLowerCase();
                          Object.keys(value).forEach(subKey => {
                            const subValue = value[subKey];
                            if (typeof subValue === 'string' && subValue.toLowerCase().includes(addressMatch.toLowerCase().substring(0, 10))) {
                              console.log(`🎯 Found matching address text in ${key}.${subKey}:`, subValue);
                              
                              // Try to get the full place object from this prediction
                              console.log(`🔍 Checking if prediction ${index} has place data for selected address...`);
                              if (value.addressComponents || value.address_components) {
                                console.log(`🎉 FOUND addressComponents in prediction ${index}!`);
                                const components = value.addressComponents || value.address_components;
                                const formatted = value.formattedAddress || value.formatted_address || subValue;
                                const parsedAddress = parseAddressComponents(components, formatted);
                                onPlaceChanged(parsedAddress);
                                return; // Exit early if we found data
                              }
                            }
                          });
                        }
                      });
                    }
                  });
                }
                
                if (placeAfterDelay) {
                  console.log("Place object keys:", Object.keys(placeAfterDelay));
                  console.log("Place.addressComponents:", placeAfterDelay.addressComponents);
                  console.log("Place.formattedAddress:", placeAfterDelay.formattedAddress);
                  console.log("Place.displayName:", placeAfterDelay.displayName);
                  
                  if (placeAfterDelay.addressComponents) {
                    console.log("🎉 PLACE DETECTED with addressComponents!");
                    const parsedAddress = parseAddressComponents(placeAfterDelay.addressComponents, placeAfterDelay.formattedAddress);
                    onPlaceChanged(parsedAddress);
                  } else {
                    console.warn("⚠️ Place object exists but no addressComponents found");
                    console.log("Available place properties:", Object.keys(placeAfterDelay));
                  }
                } else {
                  console.warn("⚠️ No place object found even after delay");
                  console.log("=== Trying Google Places API call for place details ===");
                  
                  // Try to get place details using the Google Places API directly
                  // First check if we can access the Places service
                  if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                    const service = new google.maps.places.PlacesService(document.createElement('div'));
                    
                    // Try to get place details by searching for the selected address
                    const request = {
                      query: inputValue,
                      fields: ['address_components', 'formatted_address', 'name', 'place_id']
                    };
                    
                    console.log("Making Places API textSearch call with query:", inputValue);
                    service.textSearch(request, (results, status) => {
                      console.log("Places API textSearch results:", results, "status:", status);
                      
                      if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                        const place = results[0];
                        console.log("🎉 Got place from Places API:", place);
                        
                        if (place.address_components) {
                          console.log("🎉 FOUND address_components from Places API!");
                          const parsedAddress = parseAddressComponents(place.address_components, place.formatted_address);
                          onPlaceChanged(parsedAddress);
                          return;
                        } else if (place.place_id) {
                          // textSearch doesn't return address_components, but we have place_id
                          // Use getDetails to get the full place data including address_components
                          console.log("📍 Got place_id from textSearch, calling getDetails for address_components...");
                          
                          const detailsRequest = {
                            placeId: place.place_id,
                            fields: ['address_components', 'formatted_address', 'name']
                          };
                          
                          service.getDetails(detailsRequest, (detailsResult, detailsStatus) => {
                            console.log("Places API getDetails result:", detailsResult, "status:", detailsStatus);
                            
                            if (detailsStatus === google.maps.places.PlacesServiceStatus.OK && detailsResult) {
                              if (detailsResult.address_components) {
                                console.log("🎉 FOUND address_components from getDetails!");
                                const parsedAddress = parseAddressComponents(detailsResult.address_components, detailsResult.formatted_address);
                                onPlaceChanged(parsedAddress);
                                return;
                              }
                            }
                            
                            console.log("=== getDetails failed, using formatted_address from textSearch ===");
                            // Use the formatted_address from textSearch which includes the ZIP code
                            const parsedFallback = parseFormattedAddress(place.formatted_address || inputValue);
                            console.log("Using parsed fallback address:", parsedFallback);
                            onPlaceChanged(parsedFallback);
                          });
                          return; // Don't fall through to the regular fallback
                        } else if (place.formatted_address) {
                          console.log("🎯 Using formatted_address from textSearch:", place.formatted_address);
                          // Use the formatted_address from the API which should include the ZIP code
                          const parsedFallback = parseFormattedAddress(place.formatted_address);
                          console.log("Using parsed address from API formatted_address:", parsedFallback);
                          onPlaceChanged(parsedFallback);
                          return;
                        }
                      }
                      
                      console.log("=== Places API call failed, falling back to simple address parsing ===");
                      // Parse the formatted address string into components
                      const parsedFallback = parseFormattedAddress(inputValue);
                      console.log("Using parsed fallback address:", parsedFallback);
                      onPlaceChanged(parsedFallback);
                    });
                  } else {
                    console.log("=== Google Places API not available, falling back to simple address parsing ===");
                    // Parse the formatted address string into components
                    const parsedFallback = parseFormattedAddress(inputValue);
                    console.log("Using parsed fallback address:", parsedFallback);
                    onPlaceChanged(parsedFallback);
                  }
                }
              }, 500); // Wait 500ms for Google Places to populate the place object
            }
          });
        } else {
          console.warn("Could not access inputElement property - trying alternative approach");
        }
        
        // Monitor the predictions and place properties more aggressively
        let lastPredictions = null;
        let lastPlace = null;
        let lastInputValue = "";
        
        const monitorGooglePlaces = () => {
          const predictions = (autocompleteElement as any).predictions;
          const currentPlace = (autocompleteElement as any).place;
          const inputElement = (autocompleteElement as any).inputElement;
          const currentInputValue = inputElement?.value || "";
          
          if (predictions !== lastPredictions) {
            console.log("Predictions changed:", predictions);
            lastPredictions = predictions;
          }
          
          // Track input value changes to detect selection
          if (currentInputValue !== lastInputValue) {
            console.log("Input value changed from:", lastInputValue, "to:", currentInputValue);
            lastInputValue = currentInputValue;
            
            // When input value becomes a full address (contains comma), 
            // it likely means user selected from dropdown
            if (currentInputValue.includes(",")) {
              console.log("🔍 FULL ADDRESS DETECTED - checking for place object...");
              
              // Give Google Places a moment to populate the place object
              setTimeout(() => {
                const placeAfterDelay = (autocompleteElement as any).place;
                console.log("Place object after delay:", placeAfterDelay);
                
                if (placeAfterDelay) {
                  console.log("Place object keys:", Object.keys(placeAfterDelay));
                  console.log("Place.addressComponents:", placeAfterDelay.addressComponents);
                  console.log("Place.formattedAddress:", placeAfterDelay.formattedAddress);
                  console.log("Place.displayName:", placeAfterDelay.displayName);
                  
                  if (placeAfterDelay.addressComponents) {
                    console.log("🎉 PLACE DETECTED with addressComponents!");
                    const parsedAddress = parseAddressComponents(placeAfterDelay.addressComponents, placeAfterDelay.formattedAddress);
                    onPlaceChanged(parsedAddress);
                  } else {
                    console.warn("⚠️ Place object exists but no addressComponents found");
                    console.log("Available place properties:", Object.keys(placeAfterDelay));
                  }
                } else {
                  console.warn("⚠️ No place object found even after delay");
                }
              }, 500); // Wait 500ms for Google Places to populate the place object
            }
          }
          
          if (currentPlace !== lastPlace) {
            console.log("Place changed:", currentPlace);
            lastPlace = currentPlace;
            
            if (currentPlace && currentPlace.addressComponents) {
              console.log("🎉 PLACE DETECTED with addressComponents!");
              const parsedAddress = parseAddressComponents(currentPlace.addressComponents, currentPlace.formattedAddress);
              onPlaceChanged(parsedAddress);
            }
          }
        };
        
        // Check every 200ms for changes
        setInterval(monitorGooglePlaces, 200);
        
        // Test if the autocomplete element has any methods or properties we can use
        console.log("Autocomplete element properties:", Object.getOwnPropertyNames(autocompleteElement));
        console.log("Autocomplete element prototype:", Object.getOwnPropertyNames(Object.getPrototypeOf(autocompleteElement)));
        
        // Test if the element has a value property
        console.log("Autocomplete element value:", (autocompleteElement as any).value);
        console.log("Autocomplete element textContent:", autocompleteElement.textContent);
        
        // Try accessing some of the other properties we saw
        console.log("sessionToken:", (autocompleteElement as any).sessionToken);
        console.log("predictions:", (autocompleteElement as any).predictions);
      }, 2000); // Increased timeout to give Google Places more time to initialize

      // Also try listening on the autocomplete element itself
      autocompleteElement.addEventListener("input", (event: any) => {
        console.log("Input event on autocomplete:", event.target.value);
      });

      autocompleteElement.addEventListener("change", (event: any) => {
        console.log("Change event on autocomplete:", event.target.value);
      });

      // Try listening for all events to see what's available
      ['click', 'focus', 'blur', 'select', 'keydown', 'keyup'].forEach(eventType => {
        autocompleteElement.addEventListener(eventType, (event: any) => {
          console.log(`${eventType} event on autocomplete:`, event);
          
          // On certain events, try to check if a place has been selected
          if (['click', 'keydown'].includes(eventType)) {
            setTimeout(() => {
              const place = (autocompleteElement as any).place;
              const value = (autocompleteElement as any).value;
              const inputElement = (autocompleteElement as any).inputElement;
              const inputValue = inputElement?.value;
              
              console.log(`After ${eventType} - place:`, place);
              console.log(`After ${eventType} - value:`, value);
              console.log(`After ${eventType} - inputValue:`, inputValue);
              
              if (place && place.addressComponents) {
                console.log("🎉 Found place with addressComponents after", eventType);
                const parsedAddress = parseAddressComponents(place.addressComponents, place.formattedAddress);
                onPlaceChanged(parsedAddress);
              }
            }, 100); // Small delay to let Google Places process the selection
          }
        });
      });

      autocompleteElementRef.current = autocompleteElement;
      return autocompleteElement;
    } catch (err) {
      console.error("Error creating Google Places Autocomplete Element:", err);
      setError("Failed to create autocomplete element");
      return null;
    }
  };

  const parseFormattedAddress = (formattedAddress: string): ParsedAddress => {
    console.log("Parsing formatted address:", formattedAddress);
    
    // Split the address by commas to get components
    const parts = formattedAddress.split(',').map(part => part.trim());
    console.log("Address parts:", parts);
    
    let line_1 = "";
    let city = "";
    let region = "";
    let postcode = "";
    let country = "US"; // Default to US
    
    if (parts.length >= 1) {
      // First part is usually the street address
      line_1 = parts[0];
    }
    
    if (parts.length >= 2) {
      // Second part is usually the city
      city = parts[1];
    }
    
    if (parts.length >= 3) {
      // Third part is usually "State ZIP" or just "State"
      const stateZipPart = parts[2];
      
      // Try to extract state and ZIP from patterns like "CA 93401" or "CA, 93401"
      const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s*,?\s*(\d{5}(?:-\d{4})?)$/);
      if (stateZipMatch) {
        region = stateZipMatch[1]; // State code like "CA"
        postcode = stateZipMatch[2]; // ZIP like "93401"
      } else {
        // Check if it's just a state code like "CA"
        const stateOnlyMatch = stateZipPart.match(/^([A-Z]{2})$/);
        if (stateOnlyMatch) {
          region = stateOnlyMatch[1];
          
          // Look for ZIP code in the next part
          if (parts.length >= 4) {
            const potentialZip = parts[3].match(/(\d{5}(?:-\d{4})?)/);
            if (potentialZip) {
              postcode = potentialZip[1];
            }
          }
        } else {
          // If no recognizable pattern, just use as region
          region = stateZipPart;
        }
        
        // Also check if there's a ZIP code in any remaining parts
        for (let i = 3; i < parts.length; i++) {
          const zipMatch = parts[i].match(/(\d{5}(?:-\d{4})?)/);
          if (zipMatch) {
            postcode = zipMatch[1];
            break;
          }
        }
      }
    }
    
    if (parts.length >= 4) {
      // Fourth part might be country
      const potentialCountry = parts[3].toUpperCase();
      if (potentialCountry === "USA" || potentialCountry === "US") {
        country = "US";
      } else {
        // Try to map country name to code
        const countryMatch = countries.find(c => 
          c.name.toLowerCase() === parts[3].toLowerCase() ||
          c.code.toLowerCase() === parts[3].toLowerCase()
        );
        if (countryMatch) {
          country = countryMatch.code;
        }
      }
    }
    
    const parsedAddress = {
      line_1,
      line_2: "",
      city,
      region,
      country,
      postcode,
    };
    
    console.log("Parsed address result:", parsedAddress);
    return parsedAddress;
  };

  const parseAddressComponents = (
    components: google.maps.places.AddressComponent[],
    formattedAddress?: string
  ): ParsedAddress => {
    const addressComponents: AddressComponents = {};

    components.forEach((component) => {
      const types = component.types;
      
      // Debug each component to understand the structure
      console.log("Processing component:", component);
      console.log("Component types:", types);
      console.log("Component long_name:", component.long_name);
      console.log("Component short_name:", component.short_name);
      
      if (types.includes("street_number")) {
        addressComponents.street_number = component.long_name || component.short_name || undefined;
      } else if (types.includes("route")) {
        addressComponents.route = component.long_name || component.short_name || undefined;
      } else if (types.includes("locality")) {
        addressComponents.locality = component.long_name || component.short_name || undefined;
      } else if (types.includes("administrative_area_level_1")) {
        addressComponents.administrative_area_level_1 = component.short_name || component.long_name || undefined;
      } else if (types.includes("administrative_area_level_2")) {
        addressComponents.administrative_area_level_2 = component.long_name || component.short_name || undefined;
      } else if (types.includes("country")) {
        // Use short_name for country code (e.g., "US" instead of "United States")
        addressComponents.country = component.short_name || component.long_name || undefined;
      } else if (types.includes("postal_code")) {
        addressComponents.postal_code = component.long_name || component.short_name || undefined;
      }
    });

    // Construct the address fields
    let line_1 = [
      addressComponents.street_number,
      addressComponents.route,
    ]
      .filter(Boolean)
      .join(" ");

    // If line_1 is empty and we have a formatted address, use the first part
    if (!line_1 && formattedAddress) {
      const addressParts = formattedAddress.split(",");
      line_1 = addressParts[0]?.trim() || "";
    }

    // Map country name to country code if needed
    let countryCode = addressComponents.country || "";
    if (countryCode && countryCode.length > 2) {
      // If we got a country name instead of code, try to map it
      const countryMatch = countries.find(c => 
        c.name.toLowerCase().includes(countryCode.toLowerCase()) ||
        countryCode.toLowerCase().includes(c.name.toLowerCase())
      );
      if (countryMatch) {
        countryCode = countryMatch.code;
      }
    }

    const parsedAddress = {
      line_1: line_1 || "",
      line_2: "",
      city: addressComponents.locality || "",
      region: addressComponents.administrative_area_level_1 || "",
      country: countryCode,
      postcode: addressComponents.postal_code || "",
    };

    // Debug logging to help identify issues
    console.log("Google Places raw components:", components);
    console.log("Parsed address components:", addressComponents);
    console.log("Final parsed address:", parsedAddress);

    return parsedAddress;
  };

  const cleanup = () => {
    if (autocompleteElementRef.current) {
      autocompleteElementRef.current.remove();
      autocompleteElementRef.current = null;
    }
  };

  return {
    isLoaded,
    error,
    createAutocompleteElement,
    cleanup,
  };
}