# Google Places Form Integration Test

This document describes how the Google Places API integration works with form submission for address persistence.

## How It Works

### For React Hook Form (Checkout)

1. **GooglePlacesInput** uses `useController` to properly register with React Hook Form
2. When a place is selected from Google Places:
   - The component updates the primary field value through `onChange`
   - All related address fields are updated via `setValue` with `shouldValidate: true`
   - Form validation is triggered for all updated fields
   - React Hook Form state is synchronized automatically

3. **Form Submission**: The checkout form submission works through the checkout provider and properly includes all address data

### For HTML Forms (Account Address Management)

1. **GooglePlacesHtmlInput** uses a hidden input field for form submission
2. When a place is selected from Google Places:
   - The hidden input (with the correct `name` attribute) is updated
   - All related form fields are found via DOM queries and updated
   - Events are dispatched to trigger any form validation or listeners

3. **Form Submission**: Standard HTML form submission includes the hidden input data along with all other populated fields

## Data Flow

```
Google Places Selection
        ↓
Address Parsing (street, city, region, country, postcode)
        ↓
Form Field Population (via setValue or DOM manipulation)
        ↓
Form Validation (automatic)
        ↓
Form Submission (React Hook Form or HTML form)
        ↓
Server Validation (Zod schema)
        ↓
Database Persistence (Elastic Path API)
```

## Key Features

- **Proper Form Integration**: Uses appropriate methods for each form type
- **Validation Support**: Triggers form validation after address selection
- **Error Handling**: Shows validation errors with proper styling
- **Fallback Support**: Falls back to regular input if Google Places fails
- **Two-way Binding**: Supports manual editing after place selection

## Testing

To test the integration:

1. Set `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` in your environment
2. Navigate to checkout or account address forms
3. Start typing an address - you should see Google Places suggestions
4. Select a suggestion - all address fields should populate automatically
5. Submit the form - the address should persist correctly in the account

The implementation ensures that whether using React Hook Form or plain HTML forms, the Google Places data is properly captured and submitted for persistence.