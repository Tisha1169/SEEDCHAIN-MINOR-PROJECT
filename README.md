🌱 SeedChain — Potato Supply Chain Tracking Platform

SeedChain is a digital supply chain tracking platform for agriculture that enables transparent tracking of potato batches from farm to buyer.

The platform connects farmers, cold storage operators, logistics providers, and buyers in a single ecosystem and provides real-time visibility of crop movement across the supply chain.

It aims to solve major problems in agriculture such as:

• lack of transparency in supply chains
• inefficient logistics coordination
• poor crop traceability
• limited visibility for buyers and regulators

SeedChain introduces batch-level tracking, QR identification, and shipment monitoring to digitize the entire agricultural workflow.

🚜 Problem Statement

Traditional agricultural supply chains lack digital tracking systems. Crops pass through several intermediaries including:

Farmer → Storage → Logistics → Buyer

However, there is usually no digital record of movement, which causes:

• crop mismanagement
• delayed deliveries
• lack of accountability
• quality disputes
• difficulty tracking origin of produce

SeedChain solves this by creating a digital identity for every crop batch and tracking it across all stages.

🧭 Supply Chain Workflow

The system models the complete agricultural lifecycle:

Seed Batch
   ↓
Farmer Crop Registration
   ↓
Harvest Record
   ↓
Cold Storage Entry
   ↓
Logistics Transportation
   ↓
Buyer Order
   ↓
Shipment Tracking

Every stage generates digital events stored in the database, creating a transparent supply chain.

👥 User Roles

SeedChain supports five types of users, each with dedicated dashboards and workflows.

👨‍🌾 Farmer

Farmers are responsible for crop production.

Capabilities:

• create farm profile
• register crop batches
• record harvest
• send crops to storage facilities
• track shipments
• generate QR code for batches

🧊 Cold Storage Operator

Cold storage operators manage storage facilities.

Capabilities:

• accept incoming crop shipments
• scan QR / RFID batch tags
• manage inventory
• release crops for delivery

🚚 Logistics Operator

Logistics providers transport crop shipments.

Capabilities:

• accept delivery jobs
• pick up shipments
• update shipment location
• update shipment status
• deliver crops to buyers

🛒 Buyer

Buyers purchase crops through the marketplace.

Capabilities:

• browse crop listings
• place purchase orders
• track deliveries
• view shipment status

🧑‍💼 Admin

Admin oversees the entire supply chain.

Capabilities:

• monitor shipments
• view analytics dashboards
• track supply chain activity
• manage users

📱 Key Features
📦 Batch Identity System

Every crop batch receives a unique identifier.

Example:

BATCH-2026-001

This ID follows the batch through the entire supply chain.

🔳 QR Code Tracking

When a batch is created, a QR code is generated containing:

• batch ID
• farmer ID
• crop variety
• harvest details

QR codes allow operators to scan and access batch information instantly.

📡 RFID Simulation

Each batch also receives a simulated RFID tag.

Example:

RFID-483920183

Cold storage and logistics operators can scan RFID or QR codes to update shipment status.

🗺 Shipment Tracking

Users can track crop shipments in real time.

Tracking page includes:

• shipment status
• timeline of events
• map with location updates

Example tracking timeline:

Order Created
Harvest Recorded
Shipment Sent to Storage
Storage Accepted Batch
Logistics Picked Up Shipment
In Transit
Delivered
📊 Role-Based Dashboards

Each user sees a customized dashboard.

Dashboards include:

• analytics cards
• shipment tables
• activity logs
• supply chain metrics

🎨 UI Design Philosophy

SeedChain follows a modern minimal SaaS design.

Design characteristics:

• clean white interface
• soft rounded cards
• minimal visual noise
• strong typography
• subtle green accent colors

Primary design goals:

• clarity
• usability
• responsiveness

The interface adapts seamlessly to mobile, tablet, and desktop devices.

🛠 Tech Stack
Frontend

• React
• Vite
• TypeScript
• TailwindCSS
• Framer Motion

Backend

• Supabase (PostgreSQL + Auth + API)

Supabase handles:

• authentication
• database
• API queries

Additional Libraries

• Mapbox — shipment maps
• QRCode.react — QR code generation
• Recharts — analytics charts

🗂 Project Structure
SeedChain
│
├── artifacts
│   ├── seedchain (frontend app)
│   └── api-server
│
├── lib
│   ├── db
│   └── api-spec
│
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md
⚙️ Installation

Clone the repository:

git clone https://github.com/Tisha1169/SEEDCHAIN-MINOR-PROJECT.git

Navigate to project:

cd Sleek-Canvas

Install dependencies:

pnpm install

Run development server:

pnpm dev
🔑 Environment Variables

Create a .env file:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
🚀 Deployment

SeedChain is deployed using Vercel.

Deployment steps:

Push code to GitHub
Connect repository to Vercel
Set root directory to:
artifacts/seedchain
Add environment variables
Deploy
📊 Future Improvements

Planned enhancements:

• real RFID integration
• IoT sensor data from storage facilities
• predictive supply chain analytics
• blockchain traceability
• AI demand forecasting

🌍 Impact

SeedChain can help transform agricultural supply chains by:

• improving transparency
• reducing losses
• enabling better logistics planning
• empowering farmers with digital tools

👩‍💻 Author

Tisha Dubey
B.Tech — NIT Jalandhar

Project: SeedChain — Agricultural Supply Chain Tracking Platform
