"use client";

import { Label } from "../../../components/label/Label";
import { Input } from "../../../components/input/Input";
import { GooglePlacesHtmlInput } from "../../../components/input/GooglePlacesHtmlInput";
import { FormStatusButton } from "../../../components/button/FormStatusButton";
import React from "react";
import { countries as staticCountries } from "../../../lib/all-countries";
import { useQueryClient } from "@tanstack/react-query";
import {
  accountAddressesQueryKeys,
  useAuthedAccountMember,
} from "../../../react-shopper-hooks";
import { getEpccImplicitClient } from "../../../lib/epcc-implicit-client";
import { toast } from "react-toastify";

type CheckoutAddressFormProps = {
  onAddressAdded?: (address: any) => void;
  onCancel?: () => void;
};

export function CheckoutAddressForm({ onAddressAdded, onCancel }: CheckoutAddressFormProps) {
  const queryClient = useQueryClient();
  const { selectedAccountToken } = useAuthedAccountMember();
  const client = getEpccImplicitClient();
  const countries = staticCountries;

  const handleSubmit = async (formData: FormData) => {
    if (!selectedAccountToken?.account_id) {
      toast.error("No account found");
      return;
    }

    const entries = Object.fromEntries(formData.entries());
    
    // Debug logging to see what we're receiving
    console.log("Checkout form data entries:", entries);
    
    // Validate required fields (based on shippingAddressSchema + name)
    if (!entries.name || !entries.first_name || !entries.last_name || !entries.line_1 || !entries.city || !entries.region || !entries.postcode || !entries.country) {
      console.error("Missing required fields:", {
        name: !!entries.name,
        first_name: !!entries.first_name,
        last_name: !!entries.last_name,
        line_1: !!entries.line_1, 
        city: !!entries.city,
        region: !!entries.region,
        postcode: !!entries.postcode,
        country: !!entries.country
      });
      const missingFields = [];
      if (!entries.name) missingFields.push("Address Name");
      if (!entries.first_name) missingFields.push("First Name");
      if (!entries.last_name) missingFields.push("Last Name");
      if (!entries.line_1) missingFields.push("Address");
      if (!entries.city) missingFields.push("City");
      if (!entries.region) missingFields.push("Region/State");
      if (!entries.postcode) missingFields.push("Postcode");
      if (!entries.country) missingFields.push("Country");
      
      toast.error(`Please fill in all required fields: ${missingFields.join(", ")}`);
      return;
    }

    try {
      const newAddress = await client.AccountAddresses.Create({
        account: selectedAccountToken.account_id,
        body: {
          type: "account-address",
          name: entries.name as string,
          first_name: entries.first_name as string,
          last_name: entries.last_name as string,
          line_1: entries.line_1 as string,
          line_2: entries.line_2 as string || "",
          city: entries.city as string,
          county: entries.county as string || "",
          region: entries.region as string,
          postcode: entries.postcode as string,
          country: entries.country as string,
          phone_number: entries.phone_number as string || "",
          instructions: entries.instructions as string || "",
        },
      });

      // Invalidate the query to refresh the address list
      await queryClient.invalidateQueries({
        queryKey: [
          ...accountAddressesQueryKeys.list({
            accountId: selectedAccountToken.account_id,
          }),
        ],
      });

      toast.success("Address saved successfully");
      
      if (onAddressAdded) {
        onAddressAdded(newAddress.data);
      }
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    }
  };

  return (
    <form
      action={handleSubmit}
      className="flex flex-col gap-5"
    >
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
            placeholder="Your phone number"
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
      <div className="flex gap-2">
        {onCancel && (
          <FormStatusButton variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </FormStatusButton>
        )}
        <FormStatusButton variant="secondary" type="submit">
          Save Address
        </FormStatusButton>
      </div>
    </form>
  );
}