// Supply chain tracking data, QR code generation, and RFID simulation utilities

export interface BatchIdentity {
  batchId: string;
  farmerId: string;
  farmerName: string;
  variety: string;
  harvestDate: string;
  rfidTag: string;
  grade: "A" | "B" | "C";
  quantity: string;
  origin: string;
}

export interface TrackingEvent {
  id: number;
  status: string;
  label: string;
  description: string;
  timestamp: string;
  location: string;
  coordinates: { lat: number; lng: number };
  completed: boolean;
  current: boolean;
}

export interface Shipment {
  trackingId: string;
  batch: BatchIdentity;
  status: "created" | "harvested" | "stored" | "in-transit" | "delivered";
  origin: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  currentLocation: { lat: number; lng: number };
  events: TrackingEvent[];
  estimatedDelivery: string;
  carrier: string;
}

// Generate batch ID
let batchCounter = 1;
export function generateBatchId(): string {
  const id = `BATCH-2026-${String(batchCounter).padStart(4, "0")}`;
  batchCounter++;
  return id;
}

// Generate RFID tag
export function generateRFID(): string {
  const num = Math.floor(1000000000 + Math.random() * 9000000000);
  return `RFID-${num}`;
}

// Generate tracking ID
export function generateTrackingId(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `TRK-${num}`;
}

// QR code data for a batch
export function batchQRData(batch: BatchIdentity): string {
  return JSON.stringify({
    batchId: batch.batchId,
    farmer: batch.farmerName,
    variety: batch.variety,
    harvestDate: batch.harvestDate,
    rfid: batch.rfidTag,
  });
}

// ─── Dummy Data ────────────────────────────────────────────

export const dummyBatches: BatchIdentity[] = [
  {
    batchId: "BATCH-2026-0001",
    farmerId: "farmer-001",
    farmerName: "Aman Singh",
    variety: "Kufri Jyoti",
    harvestDate: "2026-03-15",
    rfidTag: "RFID-8473920183",
    grade: "A",
    quantity: "2,500 kg",
    origin: "Amritsar, Punjab",
  },
  {
    batchId: "BATCH-2026-0002",
    farmerId: "farmer-002",
    farmerName: "Rajesh Kumar",
    variety: "Kufri Pukhraj",
    harvestDate: "2026-03-20",
    rfidTag: "RFID-6291048375",
    grade: "A",
    quantity: "3,200 kg",
    origin: "Agra, UP",
  },
  {
    batchId: "BATCH-2026-0003",
    farmerId: "farmer-003",
    farmerName: "Priya Patel",
    variety: "Kufri Badshah",
    harvestDate: "2026-04-01",
    rfidTag: "RFID-1847392056",
    grade: "B",
    quantity: "1,800 kg",
    origin: "Deesa, Gujarat",
  },
  {
    batchId: "BATCH-2026-0004",
    farmerId: "farmer-001",
    farmerName: "Aman Singh",
    variety: "Kufri Chipsona",
    harvestDate: "2026-04-10",
    rfidTag: "RFID-3948271650",
    grade: "A",
    quantity: "4,000 kg",
    origin: "Jalandhar, Punjab",
  },
];

export const dummyShipment: Shipment = {
  trackingId: "TRK-48293",
  batch: dummyBatches[0],
  status: "in-transit",
  origin: { name: "Amritsar, Punjab", lat: 31.634, lng: 74.8723 },
  destination: { name: "Azadpur Mandi, Delhi", lat: 28.6954, lng: 77.1801 },
  currentLocation: { lat: 30.3165, lng: 76.3806 },
  estimatedDelivery: "2026-04-18",
  carrier: "FastTrack Logistics",
  events: [
    {
      id: 1,
      status: "created",
      label: "Order Created",
      description: "Buyer placed order for Kufri Jyoti batch",
      timestamp: "2026-04-10 09:00 AM",
      location: "Azadpur Mandi, Delhi",
      coordinates: { lat: 28.6954, lng: 77.1801 },
      completed: true,
      current: false,
    },
    {
      id: 2,
      status: "harvested",
      label: "Harvest Recorded",
      description: "Farmer recorded harvest — 2,500 kg Grade A",
      timestamp: "2026-04-11 06:30 AM",
      location: "Amritsar, Punjab",
      coordinates: { lat: 31.634, lng: 74.8723 },
      completed: true,
      current: false,
    },
    {
      id: 3,
      status: "sent-to-storage",
      label: "Sent to Storage",
      description: "Batch shipped to CoolStore cold storage facility",
      timestamp: "2026-04-12 10:15 AM",
      location: "Amritsar, Punjab",
      coordinates: { lat: 31.634, lng: 74.8723 },
      completed: true,
      current: false,
    },
    {
      id: 4,
      status: "stored",
      label: "Storage Accepted",
      description: "CoolStore accepted batch — QR & RFID scanned",
      timestamp: "2026-04-12 02:45 PM",
      location: "CoolStore Facility, Amritsar",
      coordinates: { lat: 31.6297, lng: 74.878 },
      completed: true,
      current: false,
    },
    {
      id: 5,
      status: "picked-up",
      label: "Logistics Pickup",
      description: "FastTrack Logistics picked up shipment",
      timestamp: "2026-04-15 08:00 AM",
      location: "CoolStore Facility, Amritsar",
      coordinates: { lat: 31.6297, lng: 74.878 },
      completed: true,
      current: false,
    },
    {
      id: 6,
      status: "in-transit",
      label: "In Transit",
      description: "Shipment en route — currently near Ambala, Haryana",
      timestamp: "2026-04-16 11:30 AM",
      location: "Ambala, Haryana",
      coordinates: { lat: 30.3165, lng: 76.3806 },
      completed: false,
      current: true,
    },
    {
      id: 7,
      status: "delivered",
      label: "Delivered",
      description: "Shipment delivered to buyer at Azadpur Mandi",
      timestamp: "",
      location: "Azadpur Mandi, Delhi",
      coordinates: { lat: 28.6954, lng: 77.1801 },
      completed: false,
      current: false,
    },
  ],
};

// Additional dummy shipments for logistics views
export const allShipments: Shipment[] = [
  dummyShipment,
  {
    trackingId: "TRK-58102",
    batch: dummyBatches[1],
    status: "stored",
    origin: { name: "Agra, UP", lat: 27.1767, lng: 78.0081 },
    destination: { name: "Mumbai, MH", lat: 19.076, lng: 72.8777 },
    currentLocation: { lat: 27.1767, lng: 78.0081 },
    estimatedDelivery: "2026-04-22",
    carrier: "GreenLine Transport",
    events: [
      { id: 1, status: "created", label: "Order Created", description: "Order placed for Kufri Pukhraj", timestamp: "2026-04-12 10:00 AM", location: "Mumbai, MH", coordinates: { lat: 19.076, lng: 72.8777 }, completed: true, current: false },
      { id: 2, status: "harvested", label: "Harvest Recorded", description: "3,200 kg Grade A harvested", timestamp: "2026-04-14 07:00 AM", location: "Agra, UP", coordinates: { lat: 27.1767, lng: 78.0081 }, completed: true, current: false },
      { id: 3, status: "stored", label: "Storage Accepted", description: "Batch stored at FreshVault Agra", timestamp: "2026-04-15 03:00 PM", location: "FreshVault, Agra", coordinates: { lat: 27.18, lng: 78.01 }, completed: false, current: true },
      { id: 4, status: "in-transit", label: "In Transit", description: "", timestamp: "", location: "", coordinates: { lat: 0, lng: 0 }, completed: false, current: false },
      { id: 5, status: "delivered", label: "Delivered", description: "", timestamp: "", location: "", coordinates: { lat: 0, lng: 0 }, completed: false, current: false },
    ],
  },
  {
    trackingId: "TRK-67234",
    batch: dummyBatches[2],
    status: "delivered",
    origin: { name: "Deesa, Gujarat", lat: 24.2588, lng: 72.1906 },
    destination: { name: "Pune, MH", lat: 18.5204, lng: 73.8567 },
    currentLocation: { lat: 18.5204, lng: 73.8567 },
    estimatedDelivery: "2026-04-14",
    carrier: "FastTrack Logistics",
    events: [
      { id: 1, status: "created", label: "Order Created", description: "Order for Kufri Badshah", timestamp: "2026-04-06 09:00 AM", location: "Pune, MH", coordinates: { lat: 18.5204, lng: 73.8567 }, completed: true, current: false },
      { id: 2, status: "harvested", label: "Harvest Recorded", description: "1,800 kg Grade B", timestamp: "2026-04-07 06:00 AM", location: "Deesa, Gujarat", coordinates: { lat: 24.2588, lng: 72.1906 }, completed: true, current: false },
      { id: 3, status: "stored", label: "Storage Accepted", description: "Stored at ColdChain Deesa", timestamp: "2026-04-08 01:00 PM", location: "ColdChain, Deesa", coordinates: { lat: 24.26, lng: 72.19 }, completed: true, current: false },
      { id: 4, status: "in-transit", label: "In Transit", description: "Shipped via FastTrack", timestamp: "2026-04-10 08:00 AM", location: "On Route", coordinates: { lat: 21.0, lng: 73.0 }, completed: true, current: false },
      { id: 5, status: "delivered", label: "Delivered", description: "Delivered to buyer", timestamp: "2026-04-14 04:30 PM", location: "Pune, MH", coordinates: { lat: 18.5204, lng: 73.8567 }, completed: true, current: false },
    ],
  },
];

// Marketplace listings
export interface MarketplaceListing {
  id: string;
  batch: BatchIdentity;
  pricePerKg: number;
  available: boolean;
  minOrder: string;
  description: string;
}

export const marketplaceListings: MarketplaceListing[] = [
  { id: "ML-001", batch: dummyBatches[0], pricePerKg: 29, available: true, minOrder: "500 kg", description: "Premium Grade A certified seed potato. Ideal for plains cultivation." },
  { id: "ML-002", batch: dummyBatches[1], pricePerKg: 32, available: true, minOrder: "1,000 kg", description: "High-yield variety suitable for commercial farming. Cold-stored at 4°C." },
  { id: "ML-003", batch: dummyBatches[2], pricePerKg: 24, available: true, minOrder: "500 kg", description: "Grade B seed potato, excellent for processing and chips manufacturing." },
  { id: "ML-004", batch: dummyBatches[3], pricePerKg: 35, available: false, minOrder: "2,000 kg", description: "Premium chipping variety. Certified and tracked from farm to storage." },
];
