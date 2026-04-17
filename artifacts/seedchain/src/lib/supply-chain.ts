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
  status: "planted" | "growing" | "harvested" | "in-storage" | "in-transit" | "delivered" | "sold";
  plantingDate: string;
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

export interface HarvestRecord {
  id: string;
  batchId: string;
  variety: string;
  quantityKg: number;
  grade: "A" | "B" | "C";
  harvestDate: string;
  farmerName: string;
  location: string;
  notes: string;
}

export interface StorageEntry {
  id: string;
  batchId: string;
  rfidTag: string;
  variety: string;
  farmerName: string;
  quantityKg: number;
  grade: "A" | "B" | "C";
  temperatureC: number;
  humidityPct: number;
  arrivalDate: string;
  status: "stored" | "releasing" | "released";
  chamber: string;
}

export interface DeliveryJob {
  id: string;
  trackingId: string;
  batchId: string;
  pickup: string;
  dropoff: string;
  status: "pending" | "accepted" | "picked-up" | "in-transit" | "delivered";
  vehicleNo: string;
  driverName: string;
  scheduledDate: string;
  currentLat: number;
  currentLng: number;
}

export interface BuyerOrder {
  id: string;
  trackingId: string;
  batchId: string;
  variety: string;
  quantityKg: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "shipped" | "delivered";
  orderDate: string;
  farmerName: string;
  origin: string;
}

// Generate batch ID
let batchCounter = 5;
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
    status: "in-transit",
    plantingDate: "2025-11-10",
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
    status: "in-storage",
    plantingDate: "2025-11-15",
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
    status: "delivered",
    plantingDate: "2025-12-01",
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
    status: "harvested",
    plantingDate: "2025-12-15",
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

// ─── Harvest Records ────────────────────────────────────────
export const dummyHarvests: HarvestRecord[] = [
  { id: "H-001", batchId: "BATCH-2026-0001", variety: "Kufri Jyoti", quantityKg: 2500, grade: "A", harvestDate: "2026-03-15", farmerName: "Aman Singh", location: "Amritsar, Punjab", notes: "Excellent quality, minimal pest damage" },
  { id: "H-002", batchId: "BATCH-2026-0002", variety: "Kufri Pukhraj", quantityKg: 3200, grade: "A", harvestDate: "2026-03-20", farmerName: "Rajesh Kumar", location: "Agra, UP", notes: "High yield, uniform tuber size" },
  { id: "H-003", batchId: "BATCH-2026-0003", variety: "Kufri Badshah", quantityKg: 1800, grade: "B", harvestDate: "2026-04-01", farmerName: "Priya Patel", location: "Deesa, Gujarat", notes: "Some irregular sizing, good for processing" },
  { id: "H-004", batchId: "BATCH-2026-0004", variety: "Kufri Chipsona", quantityKg: 4000, grade: "A", harvestDate: "2026-04-10", farmerName: "Aman Singh", location: "Jalandhar, Punjab", notes: "Premium chipping quality" },
];

// ─── Storage Inventory ─────────────────────────────────────
export const storageInventory: StorageEntry[] = [
  { id: "S-001", batchId: "BATCH-2026-0001", rfidTag: "RFID-8473920183", variety: "Kufri Jyoti", farmerName: "Aman Singh", quantityKg: 2500, grade: "A", temperatureC: 3.8, humidityPct: 92, arrivalDate: "2026-03-16", status: "released", chamber: "Chamber A1" },
  { id: "S-002", batchId: "BATCH-2026-0002", rfidTag: "RFID-6291048375", variety: "Kufri Pukhraj", farmerName: "Rajesh Kumar", quantityKg: 3200, grade: "A", temperatureC: 4.1, humidityPct: 90, arrivalDate: "2026-03-21", status: "stored", chamber: "Chamber B2" },
  { id: "S-003", batchId: "BATCH-2026-0003", rfidTag: "RFID-1847392056", variety: "Kufri Badshah", farmerName: "Priya Patel", quantityKg: 1800, grade: "B", temperatureC: 4.0, humidityPct: 91, arrivalDate: "2026-04-02", status: "released", chamber: "Chamber A3" },
  { id: "S-004", batchId: "BATCH-2026-0004", rfidTag: "RFID-3948271650", variety: "Kufri Chipsona", farmerName: "Aman Singh", quantityKg: 4000, grade: "A", temperatureC: 3.5, humidityPct: 93, arrivalDate: "2026-04-11", status: "stored", chamber: "Chamber C1" },
];

// Pending incoming shipments for storage
export const pendingIncoming = [
  { id: "IN-001", batchId: "BATCH-2026-0005", rfidTag: "RFID-5738291046", variety: "Kufri Sinduri", farmerName: "Vikram Rao", quantityKg: 2800, scheduledDate: "2026-04-17", origin: "Indore, MP", status: "pending" as const },
  { id: "IN-002", batchId: "BATCH-2026-0006", rfidTag: "RFID-9182736450", variety: "Kufri Pukhraj", farmerName: "Meena Devi", quantityKg: 1500, scheduledDate: "2026-04-18", origin: "Meerut, UP", status: "pending" as const },
];

// ─── Delivery Jobs for Logistics ────────────────────────────
export const deliveryJobs: DeliveryJob[] = [
  { id: "DJ-001", trackingId: "TRK-48293", batchId: "BATCH-2026-0001", pickup: "CoolStore Facility, Amritsar", dropoff: "Azadpur Mandi, Delhi", status: "in-transit", vehicleNo: "PB-10-AB-1234", driverName: "Harpal Singh", scheduledDate: "2026-04-15", currentLat: 30.3165, currentLng: 76.3806 },
  { id: "DJ-002", trackingId: "TRK-58102", batchId: "BATCH-2026-0002", pickup: "FreshVault, Agra", dropoff: "Mumbai, MH", status: "pending", vehicleNo: "UP-80-CD-5678", driverName: "Ravi Sharma", scheduledDate: "2026-04-19", currentLat: 27.1767, currentLng: 78.0081 },
  { id: "DJ-003", trackingId: "TRK-67234", batchId: "BATCH-2026-0003", pickup: "ColdChain, Deesa", dropoff: "Pune, MH", status: "delivered", vehicleNo: "GJ-06-EF-9012", driverName: "Kamal Joshi", scheduledDate: "2026-04-10", currentLat: 18.5204, currentLng: 73.8567 },
];

// ─── Buyer Orders ───────────────────────────────────────────
export const buyerOrders: BuyerOrder[] = [
  { id: "ORD-001", trackingId: "TRK-48293", batchId: "BATCH-2026-0001", variety: "Kufri Jyoti", quantityKg: 2500, totalPrice: 72500, status: "shipped", orderDate: "2026-04-10", farmerName: "Aman Singh", origin: "Amritsar, Punjab" },
  { id: "ORD-002", trackingId: "TRK-67234", batchId: "BATCH-2026-0003", variety: "Kufri Badshah", quantityKg: 1800, totalPrice: 43200, status: "delivered", orderDate: "2026-04-06", farmerName: "Priya Patel", origin: "Deesa, Gujarat" },
  { id: "ORD-003", trackingId: "TRK-58102", batchId: "BATCH-2026-0002", variety: "Kufri Pukhraj", quantityKg: 3200, totalPrice: 102400, status: "confirmed", orderDate: "2026-04-12", farmerName: "Rajesh Kumar", origin: "Agra, UP" },
];

// ─── Admin Stats ────────────────────────────────────────────
export const adminStats = {
  totalBatches: 48,
  totalShipments: 32,
  activeDeliveries: 8,
  storageUsagePct: 67,
  totalFarmers: 24,
  totalBuyers: 15,
  totalRevenue: 1842000,
  monthlyGrowth: 18.5,
};

// ─── Simulated state management ─────────────────────────────
// In-memory store that acts like a mini database
class SupplyChainStore {
  private batches: BatchIdentity[] = [...dummyBatches];
  private harvests: HarvestRecord[] = [...dummyHarvests];
  private storage: StorageEntry[] = [...storageInventory];
  private shipments: Shipment[] = [...allShipments];
  private orders: BuyerOrder[] = [...buyerOrders];
  private _listeners: Array<() => void> = [];

  subscribe(fn: () => void) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  private notify() { this._listeners.forEach(fn => fn()); }

  getBatches() { return this.batches; }
  getHarvests() { return this.harvests; }
  getStorage() { return this.storage; }
  getShipments() { return this.shipments; }
  getOrders() { return this.orders; }

  addBatch(batch: BatchIdentity) {
    this.batches.push(batch);
    this.notify();
  }

  addHarvest(harvest: HarvestRecord) {
    this.harvests.push(harvest);
    const b = this.batches.find(x => x.batchId === harvest.batchId);
    if (b) b.status = "harvested";
    this.notify();
  }

  acceptIncoming(batchId: string) {
    const existing = this.storage.find(s => s.batchId === batchId);
    if (existing) { existing.status = "stored"; }
    this.notify();
  }

  addOrder(order: BuyerOrder) {
    this.orders.push(order);
    this.notify();
  }

  updateDeliveryLocation(trackingId: string, lat: number, lng: number) {
    const ship = this.shipments.find(s => s.trackingId === trackingId);
    if (ship) {
      ship.currentLocation = { lat, lng };
    }
    this.notify();
  }
}

export const store = new SupplyChainStore();
