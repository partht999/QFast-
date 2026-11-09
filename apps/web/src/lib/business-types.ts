export const BUSINESS_TYPES = [
  { value: 'RESTAURANT', label: 'Restaurant', detail: 'Tables, QR ordering and queues' },
  { value: 'CAFE', label: 'Cafe', detail: 'Walk-in queues and customer orders' },
  { value: 'CLINIC', label: 'Clinic', detail: 'First-in, first-out service queues' },
  { value: 'HOSPITAL', label: 'Hospital (non-emergency)', detail: 'FIFO queues for suitable departments only' },
  { value: 'SALON', label: 'Salon or spa', detail: 'Walk-ins and waiting lists' },
  { value: 'DIAGNOSTIC_CENTRE', label: 'Diagnostic centre', detail: 'Sample collection and service queues' },
  { value: 'SERVICE_CENTRE', label: 'Service centre', detail: 'Customer service and repair queues' },
  { value: 'RETAIL', label: 'Retail or customer service', detail: 'In-store service queues' },
  { value: 'OTHER', label: 'Other business', detail: 'A customer-facing service business' },
] as const;

export type BusinessTypeValue = (typeof BUSINESS_TYPES)[number]['value'];

export const AVAILABLE_BUSINESS_TYPES: BusinessTypeValue[] = [
  'RESTAURANT',
  'CAFE',
  'CLINIC',
  'HOSPITAL',
  'SALON',
  'DIAGNOSTIC_CENTRE',
  'SERVICE_CENTRE',
  'RETAIL',
  'OTHER',
];
