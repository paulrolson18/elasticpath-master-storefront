"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useGooglePlaces, ParsedAddress } from "../../hooks/use-google-places";
import { countries } from "../../lib/all-countries";

interface GooglePlacesHtmlInputProps {
  id?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  "aria-label"?: string;
  className?: string;
  onAddressChange?: (address: ParsedAddress) => void;
}

export function GooglePlacesHtmlInput({
  id,
  name,
  placeholder = "Start typing your address...",
  required = false,
  autoComplete,
  "aria-label": ariaLabel,
  className,
  onAddressChange,
}: GooglePlacesHtmlInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const { isLoaded, error, createAutocompleteElement, cleanup } = useGooglePlaces();

  const handlePlaceChanged = useCallback((parsedAddress: ParsedAddress) => {
    console.log("=== handlePlaceChanged called ===");
    console.log("Received parsedAddress:", parsedAddress);
    
    // Validate country code before proceeding
    const validCountryCodes = countries.map(c => c.code);
    if (!parsedAddress.country || !validCountryCodes.includes(parsedAddress.country)) {
      console.warn("Invalid or missing country code from Google Places:", parsedAddress.country);
      console.log("Valid country codes:", validCountryCodes);
      // Set a default country code
      parsedAddress.country = "US"; // Default fallback
    }
    
    console.log("Processing address from Google Places:", parsedAddress);
    console.log("line_1 value:", parsedAddress.line_1, "type:", typeof parsedAddress.line_1);

    // Update the hidden input that will be submitted with the form
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = (parsedAddress.line_1 !== undefined && parsedAddress.line_1 !== null) ? String(parsedAddress.line_1) : '';
    }

    // Update the visible autocomplete element
    if (autocompleteElementRef.current) {
      const line1Value = (parsedAddress.line_1 !== undefined && parsedAddress.line_1 !== null) ? String(parsedAddress.line_1) : '';
      autocompleteElementRef.current.setAttribute("value", line1Value);
    }

    // Get the form and update related fields
    const form = containerRef.current?.closest('form');
    if (form) {
      const fields = {
        line_1: parsedAddress.line_1,
        line_2: parsedAddress.line_2,
        city: parsedAddress.city,
        region: parsedAddress.region,
        county: parsedAddress.region, // Some forms use county instead of region
        country: parsedAddress.country,
        postcode: parsedAddress.postcode,
      };

      Object.entries(fields).forEach(([fieldName, value]) => {
        const field = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | HTMLSelectElement;
        console.log(`Setting field ${fieldName}:`, value, "type:", typeof value);
        if (field) {
          if (field.tagName === 'SELECT') {
            // For select elements, find the option with matching value
            const option = field.querySelector(`option[value="${value}"]`) as HTMLOptionElement;
            if (option) {
              field.value = value;
              // Trigger change event for select elements
              field.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else {
            const fieldValue = (value !== undefined && value !== null) ? String(value) : '';
            field.value = fieldValue;
            console.log(`Field ${fieldName} set to:`, fieldValue);
            // Trigger input event for input elements
            field.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else {
          console.log(`Field ${fieldName} not found in form`);
        }
      });
    }
    
    // Call the callback if provided
    if (onAddressChange) {
      onAddressChange(parsedAddress);
    }
  }, []);

  const handleInputChange = useCallback((event: Event) => {
    // Sync the hidden input with the autocomplete element
    const target = event.target as HTMLInputElement;
    console.log("handleInputChange called with value:", target.value);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = target.value;
      console.log("Hidden input updated to:", hiddenInputRef.current.value);
    }
  }, []);

  useEffect(() => {
    console.log("GooglePlacesHtmlInput useEffect - isLoaded:", isLoaded, "containerRef.current:", containerRef.current);
    if (isLoaded && containerRef.current) {
      console.log("Creating autocomplete element...");
      const autocompleteElement = createAutocompleteElement(
        handlePlaceChanged,
        {
          // types: ["address"], // Removed due to API version compatibility issues
          placeholder: placeholder,
        }
      );
      console.log("Autocomplete element created:", autocompleteElement);

      if (autocompleteElement) {
        autocompleteElementRef.current = autocompleteElement;
        
        // Style the autocomplete element to match the existing Input styles
        autocompleteElement.style.width = "100%";
        autocompleteElement.style.height = "3rem";
        autocompleteElement.style.border = "1px solid rgb(209 213 219)";
        autocompleteElement.style.borderRadius = "0.375rem";
        autocompleteElement.style.padding = "0.5rem 0.75rem";
        autocompleteElement.style.fontSize = "0.875rem";
        autocompleteElement.style.lineHeight = "1.25rem";
        
        if (id) {
          autocompleteElement.setAttribute("id", id);
        }
        
        if (required) {
          autocompleteElement.setAttribute("required", "true");
        }
        
        if (autoComplete) {
          autocompleteElement.setAttribute("autocomplete", autoComplete);
        }
        
        if (ariaLabel) {
          autocompleteElement.setAttribute("aria-label", ariaLabel);
        }

        // Don't set name on the autocomplete element - we'll use a hidden input for form submission
        console.log("Adding input event listener to autocomplete element");
        // Temporarily disable this to see if it's causing the "undefined" issue
        // autocompleteElement.addEventListener("input", handleInputChange);

        // Clear container and add the element
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(autocompleteElement);

        return () => {
          if (autocompleteElement) {
            autocompleteElement.removeEventListener("input", handleInputChange);
          }
          if (containerRef.current && autocompleteElement) {
            containerRef.current.removeChild(autocompleteElement);
          }
        };
      }
    }
    return undefined;
  }, [isLoaded, id, placeholder, required, autoComplete, ariaLabel, handlePlaceChanged, handleInputChange]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (error) {
    // Fallback to regular input if Google Places fails
    console.warn("Google Places error, falling back to regular input:", error);
    return (
      <input
        id={id}
        name={name}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        className={`w-full h-12 border border-gray-300 rounded-md px-3 py-2 text-sm ${className || ""}`}
      />
    );
  }

  return (
    <div className="relative">
      {/* Hidden input for form submission */}
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        id={id ? `${id}-hidden` : undefined}
        onInvalid={(e) => console.log("Hidden input invalid:", e)}
        onChange={(e) => console.log("Hidden input onChange:", e.target.value)}
      />
      
      <div ref={containerRef} className={className}>
        {!isLoaded && (
          <div className="w-full h-12 border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 flex items-center">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2"></div>
            <span className="text-gray-500">Loading address autocomplete...</span>
          </div>
        )}
      </div>
    </div>
  );
}