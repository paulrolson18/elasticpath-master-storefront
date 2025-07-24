"use client";

import { Label } from "../../../../../components/label/Label";
import { Input } from "../../../../../components/input/Input";
import { GooglePlacesHtmlInput } from "../../../../../components/input/GooglePlacesHtmlInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/select/Select";
import React from "react";
import { countries as staticCountries } from "../../../../../lib/all-countries";

export function AddAddressForm() {
  const countries = staticCountries;

  return (
    <fieldset className="flex flex-col gap-5">
      <div className="flex flex-col self-stretch">
        <p>
          <Label htmlFor="address_name">Address Name</Label>
          <Input
            id="address_name"
            type="text"
            name="name"
            aria-label="Address Name"
            placeholder="e.g., Home, Work, Office"
            required
          />
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
        <p>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            type="text"
            name="first_name"
            autoComplete="shipping given-name"
            aria-label="First Name"
            required
          />
        </p>
        <p>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            type="text"
            name="last_name"
            autoComplete="shipping family-name"
            aria-label="Last Name"
            required
          />
        </p>
      </div>

      <div>
        <Label htmlFor="line_1">Address</Label>
        <GooglePlacesHtmlInput
          id="line_1"
          name="line_1"
          placeholder="Start typing your address..."
          autoComplete="shipping address-line-1"
          aria-label="Address"
          required
        />
        <p className="text-sm text-gray-600 mt-1">
          Start typing to search for your address. City, state, and country will be filled automatically.
        </p>
      </div>

      <div>
        <Label htmlFor="phone_number">Phone Number</Label>
        <Input
          id="phone_number"
          type="tel"
          name="phone_number"
          autoComplete="tel"
          aria-label="Phone Number"
          placeholder="Phone number"
        />
      </div>

      <div>
        <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
        <Input
          id="instructions"
          type="text"
          name="instructions"
          aria-label="Additional Instructions"
          placeholder="e.g., Ring doorbell, Leave at door, Apartment 2B"
        />
      </div>

      {/* Hidden fields that will be populated by Google Places */}
      <input type="hidden" name="line_2" defaultValue="" />
      <input type="hidden" name="city" defaultValue="" />
      <input type="hidden" name="county" defaultValue="" />
      <input type="hidden" name="region" defaultValue="" />
      <input type="hidden" name="postcode" defaultValue="" />
      <input type="hidden" name="country" defaultValue="US" />
    </fieldset>
  );
}
