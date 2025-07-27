"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useFormContext, useController } from "react-hook-form";
import { useGooglePlaces, ParsedAddress } from "../../hooks/use-google-places";

interface GooglePlacesInputProps {
  name: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  "aria-label"?: string;
  sizeKind?: "mediumUntilSm" | "medium";
  addressField: "shippingAddress" | "billingAddress";
  className?: string;
}

export function GooglePlacesInput({
  name,
  placeholder = "Start typing your address...",
  required = false,
  autoComplete,
  "aria-label": ariaLabel,
  sizeKind = "mediumUntilSm",
  addressField,
  className,
}: GooglePlacesInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const { control, setValue, trigger } = useFormContext();
  const { isLoaded, error, createAutocompleteElement, cleanup } = useGooglePlaces();
  
  // Use useController to properly register with React Hook Form
  const {
    field: { value, onChange },
    fieldState: { error: fieldError },
  } = useController({
    name,
    control,
    defaultValue: "",
  });

  const handlePlaceChanged = useCallback((parsedAddress: ParsedAddress) => {
    // Update the primary address field (the one this component is bound to)
    onChange(parsedAddress.line_1);
    
    // Update all other address fields
    setValue(`${addressField}.line_1`, parsedAddress.line_1, { shouldValidate: true });
    setValue(`${addressField}.line_2`, parsedAddress.line_2, { shouldValidate: true });
    setValue(`${addressField}.city`, parsedAddress.city, { shouldValidate: true });
    setValue(`${addressField}.region`, parsedAddress.region, { shouldValidate: true });
    setValue(`${addressField}.country`, parsedAddress.country, { shouldValidate: true });
    setValue(`${addressField}.postcode`, parsedAddress.postcode, { shouldValidate: true });
    
    // Trigger validation for all updated fields
    trigger([
      name,
      `${addressField}.line_1`,
      `${addressField}.city`,
      `${addressField}.region`,
      `${addressField}.country`,
      `${addressField}.postcode`,
    ]);
  }, [onChange, setValue, addressField, trigger, name]);

  const handleInputChange = useCallback((event: Event) => {
    const target = event.target as HTMLInputElement;
    onChange(target.value);
  }, [onChange]);

  useEffect(() => {
    if (!isLoaded || !containerRef.current) {
      return;
    }

    try {
      const autocompleteElement = createAutocompleteElement(
        handlePlaceChanged,
        {
          types: ["address"],
          placeholder: placeholder,
        }
      );

      if (!autocompleteElement) return;

      autocompleteElementRef.current = autocompleteElement;
      
      // Style the autocomplete element to match the existing Input styles
      autocompleteElement.style.width = "100%";
      autocompleteElement.style.height = sizeKind === "medium" ? "2.75rem" : "3rem";
      autocompleteElement.style.border = fieldError 
        ? "1px solid rgb(239 68 68)" // red-500 for errors
        : "1px solid rgb(209 213 219)"; // gray-300 for normal
      autocompleteElement.style.borderRadius = "0.375rem";
      autocompleteElement.style.padding = "0.5rem 0.75rem";
      autocompleteElement.style.fontSize = "0.875rem";
      autocompleteElement.style.lineHeight = "1.25rem";
      
      // Set the current value using setAttribute
      if (value) {
        autocompleteElement.setAttribute("value", value);
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

      // Add input event listener to sync with React Hook Form
      autocompleteElement.addEventListener("input", handleInputChange);

      // Clear container and add the element
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(autocompleteElement);
      }

      return () => {
        try {
          if (autocompleteElement) {
            autocompleteElement.removeEventListener("input", handleInputChange);
          }
          if (containerRef.current && autocompleteElement && containerRef.current.contains(autocompleteElement)) {
            containerRef.current.removeChild(autocompleteElement);
          }
          autocompleteElementRef.current = null;
        } catch (cleanupError) {
          console.warn("Error during GooglePlacesInput cleanup:", cleanupError);
        }
      };
    } catch (err) {
      console.error("Error setting up GooglePlacesInput:", err);
      return;
    }
  }, [isLoaded, placeholder, sizeKind, required, autoComplete, ariaLabel, handlePlaceChanged, handleInputChange, fieldError]);

  // Update the element value when React Hook Form value changes
  useEffect(() => {
    try {
      if (autocompleteElementRef.current && autocompleteElementRef.current.getAttribute("value") !== value) {
        autocompleteElementRef.current.setAttribute("value", value || "");
      }
    } catch (err) {
      console.warn("Error updating GooglePlaces value:", err);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      try {
        cleanup();
      } catch (err) {
        console.warn("Error during GooglePlaces cleanup:", err);
      }
    };
  }, [cleanup]);

  if (error) {
    // Fallback to regular input if Google Places fails
    console.warn("Google Places error, falling back to regular input:", error);
    return (
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        className={`w-full ${sizeKind === "medium" ? "h-11" : "h-12"} border ${fieldError ? "border-red-500" : "border-gray-300"} rounded-md px-3 py-2 text-sm ${className || ""}`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className="relative">
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