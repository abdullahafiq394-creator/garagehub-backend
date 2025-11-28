import { db } from "./db";
import {
  users, workshops, suppliers, parts, bookings, workOrders, supplierOrders, supplierOrderItems,
  inventory, notifications, deliveryAssignments, towingRequests, cart, cartItems,
  deliveryOffers, transactionLogs, platformSettings, workshopCustomers, workshopStaff,
  workshopJobs, workshopSales, workshopExpenses, workshopPurchases, workshopAccounts,
  workshopSettings, activityLog, jobs, type MalaysianState
} from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting Global Marketplace Mode database seed...");
  
  console.log("🗑️  Clearing existing data (reverse dependency order)...");
  // Delete in reverse dependency order to avoid FK violations
  await db.delete(transactionLogs);
  await db.delete(deliveryOffers);
  await db.delete(cartItems);
  await db.delete(cart);
  await db.delete(notifications);
  await db.delete(deliveryAssignments);
  await db.delete(supplierOrderItems);
  await db.delete(activityLog);
  await db.delete(workshopSales);
  await db.delete(workshopPurchases);
  await db.delete(workshopExpenses);
  await db.delete(workshopAccounts);
  await db.delete(workshopSettings);
  await db.delete(inventory);
  await db.delete(jobs); // Delete jobs before workshops (FK dependency)
  await db.delete(workshopJobs);
  await db.delete(workOrders);
  await db.delete(bookings);
  await db.delete(towingRequests);
  await db.delete(supplierOrders);
  await db.delete(workshopStaff);
  await db.delete(workshopCustomers);
  await db.delete(parts);
  await db.delete(workshops);
  await db.delete(suppliers);
  await db.delete(platformSettings);
  await db.delete(users);
  
  const DEMO_PASSWORD = await bcrypt.hash("demo123", 10);

  console.log("👑 Creating admin user...");
  const [admin] = await db.insert(users).values({
    email: "admin@garagehub.my",
    password: DEMO_PASSWORD,
    firstName: "Admin",
    lastName: "GarageHub",
    role: "admin",
    phone: "+60123456789",
    address: "GarageHub HQ, Kuala Lumpur",
    state: "Kuala Lumpur",
    city: "Kuala Lumpur",
    latitude: "3.1390",
    longitude: "101.6869",
    walletBalance: "0",
  }).returning();

  // ============================================================================
  // KELANTAN STATE (Northeast Malaysia) - Kota Bharu Area
  // ============================================================================
  console.log("\n🏖️  KELANTAN STATE - Creating users, workshops, suppliers, runners...");
  
  // Kelantan Suppliers (3)
  const [kelSupplier1Owner, kelSupplier2Owner, kelSupplier3Owner] = await db.insert(users).values([
    {
      email: "parts.kelatan@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Ahmad",
      lastName: "Ibrahim",
      role: "supplier",
      phone: "+60199876543",
      address: "Jalan Sultan Yahya Petra, Kota Bharu",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1248",
      longitude: "102.2384",
      walletBalance: "5000",
    },
    {
      email: "oil.lubricants.kb@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Siti",
      lastName: "Hassan",
      role: "supplier",
      phone: "+60198765432",
      address: "Jalan Kebun Sultan, Kota Bharu",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1331",
      longitude: "102.2450",
      walletBalance: "3500",
    },
    {
      email: "battery.world.kelantan@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Lee",
      lastName: "Chong Wei",
      role: "supplier",
      phone: "+60197654321",
      address: "Jalan Padang Garong, Kota Bharu",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1167",
      longitude: "102.2500",
      walletBalance: "2800",
    },
  ]).returning();

  // Kelantan Workshops (2)
  const [kelWorkshop1Owner, kelWorkshop2Owner] = await db.insert(users).values([
    {
      email: "autocare.kb@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Mohd",
      lastName: "Yusof",
      role: "workshop",
      phone: "+60196543210",
      address: "Jalan Sultanah Zainab, Kota Bharu",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1200",
      longitude: "102.2420",
      walletBalance: "8000",
    },
    {
      email: "speedfix.kelantan@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Rahman",
      lastName: "Abdullah",
      role: "workshop",
      phone: "+60195432109",
      address: "Jalan Tok Hakim, Kota Bharu",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1280",
      longitude: "102.2510",
      walletBalance: "6500",
    },
  ]).returning();

  // Kelantan Runners (2)
  const [kelRunner1, kelRunner2] = await db.insert(users).values([
    {
      email: "runner.kb1@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Azman",
      lastName: "Rosli",
      role: "runner",
      phone: "+60194321098",
      address: "Jalan Hospital, Kota Bharu",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1220",
      longitude: "102.2390",
      walletBalance: "450",
    },
    {
      email: "runner.kb2@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Faizal",
      lastName: "Omar",
      role: "runner",
      phone: "+60193210987",
      address: "Jalan Temenggong, Kota Bharu",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1310",
      longitude: "102.2470",
      walletBalance: "320",
    },
  ]).returning();

  // Kelantan Supplier Profiles (Shopee-style: OEM + Halfcut mix)
  const [kelSupplier1, kelSupplier2, kelSupplier3] = await db.insert(suppliers).values([
    {
      userId: kelSupplier1Owner.id,
      name: "Kelantan Auto Parts Hub",
      description: "OEM and aftermarket parts specialist",
      address: "Jalan Sultan Yahya Petra, Kota Bharu",
      phone: "+60199876543",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1248",
      longitude: "102.2384",
      deliveryMethod: "both",
      supplierType: "OEM", // Shopee-style: OEM parts supplier
      isVerified: true,
    },
    {
      userId: kelSupplier2Owner.id,
      name: "Oil & Lubricants KB",
      description: "Premium lubricants and fluids supplier",
      address: "Jalan Kebun Sultan, Kota Bharu",
      phone: "+60198765432",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1331",
      longitude: "102.2450",
      deliveryMethod: "runner",
      supplierType: "OEM", // Shopee-style: OEM lubricants
      isVerified: true,
    },
    {
      userId: kelSupplier3Owner.id,
      name: "Battery World Kelantan",
      description: "Car batteries and electrical parts",
      address: "Jalan Padang Garong, Kota Bharu",
      phone: "+60197654321",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1167",
      longitude: "102.2500",
      deliveryMethod: "pickup",
      supplierType: "Halfcut", // Shopee-style: Halfcut salvage parts
      isVerified: true,
    },
  ]).returning();

  // Kelantan Workshop Profiles
  const [kelWorkshop1, kelWorkshop2] = await db.insert(workshops).values([
    {
      userId: kelWorkshop1Owner.id,
      name: "AutoCare Kota Bharu",
      description: "Full-service automotive workshop",
      address: "Jalan Sultanah Zainab, Kota Bharu",
      phone: "+60196543210",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1200",
      longitude: "102.2420",
      isVerified: true,
    },
    {
      userId: kelWorkshop2Owner.id,
      name: "SpeedFix Kelantan",
      description: "Quick repair and maintenance services",
      address: "Jalan Tok Hakim, Kota Bharu",
      phone: "+60195432109",
      state: "Kelantan",
      city: "Kota Bharu",
      latitude: "6.1280",
      longitude: "102.2510",
      isVerified: true,
    },
  ]).returning();

  // ============================================================================
  // SELANGOR STATE (Klang Valley) - Petaling Jaya / Shah Alam Area
  // ============================================================================
  console.log("\n🏙️  SELANGOR STATE - Creating users, workshops, suppliers, runners...");
  
  // Selangor Suppliers (3)
  const [selSupplier1Owner, selSupplier2Owner, selSupplier3Owner] = await db.insert(users).values([
    {
      email: "tyreking.pj@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "David",
      lastName: "Tan",
      role: "supplier",
      phone: "+60123456780",
      address: "Jalan SS2/24, Petaling Jaya",
      state: "Selangor",
      city: "Petaling Jaya",
      latitude: "3.1190",
      longitude: "101.6296",
      walletBalance: "12000",
    },
    {
      email: "tools.warehouse.sa@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Kumar",
      lastName: "Subramaniam",
      role: "supplier",
      phone: "+60123456781",
      address: "Persiaran Raja Muda Musa, Shah Alam",
      state: "Selangor",
      city: "Shah Alam",
      latitude: "3.0733",
      longitude: "101.5185",
      walletBalance: "9500",
    },
    {
      email: "oem.parts.klang@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Wong",
      lastName: "Kim Huat",
      role: "supplier",
      phone: "+60123456782",
      address: "Jalan Kapar, Klang",
      state: "Selangor",
      city: "Klang",
      latitude: "3.0319",
      longitude: "101.4450",
      walletBalance: "15000",
    },
  ]).returning();

  // Selangor Workshops (2)
  const [selWorkshop1Owner, selWorkshop2Owner] = await db.insert(users).values([
    {
      email: "premium.motors.pj@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Daniel",
      lastName: "Lim",
      role: "workshop",
      phone: "+60123456783",
      address: "Jalan PJS 11/9, Bandar Sunway",
      state: "Selangor",
      city: "Petaling Jaya",
      latitude: "3.0683",
      longitude: "101.6048",
      walletBalance: "18000",
    },
    {
      email: "quickservice.sa@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Raj",
      lastName: "Kumar",
      role: "workshop",
      phone: "+60123456784",
      address: "Jalan Kota Raja, Shah Alam",
      state: "Selangor",
      city: "Shah Alam",
      latitude: "3.0858",
      longitude: "101.5194",
      walletBalance: "14500",
    },
  ]).returning();

  // Selangor Runners (2)
  const [selRunner1, selRunner2] = await db.insert(users).values([
    {
      email: "runner.pj1@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Ali",
      lastName: "Rahman",
      role: "runner",
      phone: "+60123456785",
      address: "Jalan SS15/4, Subang Jaya",
      state: "Selangor",
      city: "Petaling Jaya",
      latitude: "3.0790",
      longitude: "101.5901",
      walletBalance: "890",
    },
    {
      email: "runner.sa1@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Hassan",
      lastName: "Mahmud",
      role: "runner",
      phone: "+60123456786",
      address: "Jalan Plumbum P7/P, Shah Alam",
      state: "Selangor",
      city: "Shah Alam",
      latitude: "3.0926",
      longitude: "101.5383",
      walletBalance: "650",
    },
  ]).returning();

  // Selangor Supplier Profiles (Shopee-style: OEM + Halfcut mix)
  const [selSupplier1, selSupplier2, selSupplier3] = await db.insert(suppliers).values([
    {
      userId: selSupplier1Owner.id,
      name: "Tyre King Petaling Jaya",
      description: "Premium tyres and wheels specialist",
      address: "Jalan SS2/24, Petaling Jaya",
      phone: "+60123456780",
      state: "Selangor",
      city: "Petaling Jaya",
      latitude: "3.1190",
      longitude: "101.6296",
      deliveryMethod: "both",
      supplierType: "OEM", // Shopee-style: OEM tyres
      isVerified: true,
    },
    {
      userId: selSupplier2Owner.id,
      name: "Tools Warehouse Shah Alam",
      description: "Professional automotive tools and equipment",
      address: "Persiaran Raja Muda Musa, Shah Alam",
      phone: "+60123456781",
      state: "Selangor",
      city: "Shah Alam",
      latitude: "3.0733",
      longitude: "101.5185",
      deliveryMethod: "both",
      supplierType: "Halfcut", // Shopee-style: Used tools and equipment
      isVerified: true,
    },
    {
      userId: selSupplier3Owner.id,
      name: "OEM Parts Klang Valley",
      description: "Genuine OEM parts for all car brands",
      address: "Jalan Kapar, Klang",
      phone: "+60123456782",
      state: "Selangor",
      city: "Klang",
      latitude: "3.0319",
      longitude: "101.4450",
      deliveryMethod: "runner",
      supplierType: "OEM", // Shopee-style: Genuine OEM parts
      isVerified: true,
    },
  ]).returning();

  // Selangor Workshop Profiles
  const [selWorkshop1, selWorkshop2] = await db.insert(workshops).values([
    {
      userId: selWorkshop1Owner.id,
      name: "Premium Motors Sunway",
      description: "Luxury car specialists",
      address: "Jalan PJS 11/9, Bandar Sunway",
      phone: "+60123456783",
      state: "Selangor",
      city: "Petaling Jaya",
      latitude: "3.0683",
      longitude: "101.6048",
      isVerified: true,
    },
    {
      userId: selWorkshop2Owner.id,
      name: "Quick Service Shah Alam",
      description: "Fast and reliable car servicing",
      address: "Jalan Kota Raja, Shah Alam",
      phone: "+60123456784",
      state: "Selangor",
      city: "Shah Alam",
      latitude: "3.0858",
      longitude: "101.5194",
      isVerified: true,
    },
  ]).returning();

  // ============================================================================
  // JOHOR STATE (Southern Peninsula) - Johor Bahru Area
  // ============================================================================
  console.log("\n🌴 JOHOR STATE - Creating users, workshops, suppliers, runners...");
  
  // Johor Suppliers (3)
  const [johSupplier1Owner, johSupplier2Owner, johSupplier3Owner] = await db.insert(users).values([
    {
      email: "accessories.jb@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Marcus",
      lastName: "Liew",
      role: "supplier",
      phone: "+60167890123",
      address: "Jalan Wong Ah Fook, Johor Bahru",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.4655",
      longitude: "103.7578",
      walletBalance: "7200",
    },
    {
      email: "lubricant.pro.jb@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Ravi",
      lastName: "Shankar",
      role: "supplier",
      phone: "+60167890124",
      address: "Jalan Tun Abdul Razak, Johor Bahru",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.4927",
      longitude: "103.7414",
      walletBalance: "6800",
    },
    {
      email: "battery.hub.jb@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Chen",
      lastName: "Wei Ming",
      role: "supplier",
      phone: "+60167890125",
      address: "Jalan Skudai, Johor Bahru",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.5200",
      longitude: "103.6540",
      walletBalance: "5900",
    },
  ]).returning();

  // Johor Workshops (2)
  const [johWorkshop1Owner, johWorkshop2Owner] = await db.insert(users).values([
    {
      email: "autoexpert.jb@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Ibrahim",
      lastName: "Ismail",
      role: "workshop",
      phone: "+60167890126",
      address: "Jalan Datin Halimah, Johor Bahru",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.4854",
      longitude: "103.7618",
      walletBalance: "11000",
    },
    {
      email: "carcare.jb@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Steven",
      lastName: "Ng",
      role: "workshop",
      phone: "+60167890127",
      address: "Jalan Persisiran Perling, Johor Bahru",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.5035",
      longitude: "103.7920",
      walletBalance: "9500",
    },
  ]).returning();

  // Johor Runners (2)
  const [johRunner1, johRunner2] = await db.insert(users).values([
    {
      email: "runner.jb1@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Hafiz",
      lastName: "Ahmad",
      role: "runner",
      phone: "+60167890128",
      address: "Jalan Yahya Awal, Johor Bahru",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.4724",
      longitude: "103.7543",
      walletBalance: "720",
    },
    {
      email: "runner.jb2@gmail.com",
      password: DEMO_PASSWORD,
      firstName: "Siva",
      lastName: "Kumar",
      role: "runner",
      phone: "+60167890129",
      address: "Jalan Harmonium, Taman Desa Tebrau",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.5300",
      longitude: "103.8100",
      walletBalance: "580",
    },
  ]).returning();

  // Johor Supplier Profiles (Shopee-style: OEM + Halfcut mix)
  const [johSupplier1, johSupplier2, johSupplier3] = await db.insert(suppliers).values([
    {
      userId: johSupplier1Owner.id,
      name: "Accessories Paradise JB",
      description: "Complete range of car accessories and styling",
      address: "Jalan Wong Ah Fook, Johor Bahru",
      phone: "+60167890123",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.4655",
      longitude: "103.7578",
      deliveryMethod: "both",
      supplierType: "Halfcut", // Shopee-style: Used accessories and salvage parts
      isVerified: true,
    },
    {
      userId: johSupplier2Owner.id,
      name: "Lubricant Pro Johor",
      description: "Industrial and automotive lubricants",
      address: "Jalan Tun Abdul Razak, Johor Bahru",
      phone: "+60167890124",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.4927",
      longitude: "103.7414",
      deliveryMethod: "runner",
      supplierType: "OEM", // Shopee-style: OEM lubricants
      isVerified: true,
    },
    {
      userId: johSupplier3Owner.id,
      name: "Battery Hub Johor Bahru",
      description: "Car batteries and charging systems",
      address: "Jalan Skudai, Johor Bahru",
      phone: "+60167890125",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.5200",
      longitude: "103.6540",
      deliveryMethod: "pickup",
      supplierType: "Halfcut", // Shopee-style: Used batteries
      isVerified: true,
    },
  ]).returning();

  // Johor Workshop Profiles
  const [johWorkshop1, johWorkshop2] = await db.insert(workshops).values([
    {
      userId: johWorkshop1Owner.id,
      name: "Auto Expert Johor Bahru",
      description: "Certified mechanics and diagnostic services",
      address: "Jalan Datin Halimah, Johor Bahru",
      phone: "+60167890126",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.4854",
      longitude: "103.7618",
      isVerified: true,
    },
    {
      userId: johWorkshop2Owner.id,
      name: "CarCare Center JB",
      description: "One-stop automotive solution center",
      address: "Jalan Persisiran Perling, Johor Bahru",
      phone: "+60167890127",
      state: "Johor",
      city: "Johor Bahru",
      latitude: "1.5035",
      longitude: "103.7920",
      isVerified: true,
    },
  ]).returning();

  // ============================================================================
  // PRODUCTS - Shopee-style with partCategory, supplierType, garagehubCode
  // ============================================================================
  console.log("\n📦 Creating product inventory with Shopee-style categorization...");
  
  const productsList = await db.insert(parts).values([
    // Kelantan Auto Parts Hub (OEM) - Engine parts
    { supplierId: kelSupplier1.id, supplierType: "OEM", category: "OEM", garagehubCode: "#001", name: "Toyota Genuine Oil Filter", partCategory: "engine", price: "28.90", stockQuantity: 45, description: "Original Toyota oil filter", vehicleMake: "Toyota", vehicleModel: "Camry", vehicleYearFrom: 2015, vehicleYearTo: 2023, images: ["https://via.placeholder.com/400x300?text=Toyota+Oil+Filter"] },
    { supplierId: kelSupplier1.id, supplierType: "OEM", category: "OEM", garagehubCode: "#002", name: "Perodua Myvi Air Filter", partCategory: "engine", price: "35.50", stockQuantity: 60, description: "Original Perodua air filter", vehicleMake: "Perodua", vehicleModel: "Myvi", vehicleYearFrom: 2011, vehicleYearTo: 2023, images: [] },
    { supplierId: kelSupplier1.id, supplierType: "OEM", category: "OEM", garagehubCode: "#003", name: "LED Headlight Bulbs H4", partCategory: "electrical", price: "85.00", stockQuantity: 55, description: "6000K white LED headlights", images: [] },
    
    // Oil & Lubricants KB (OEM) - Fluids
    { supplierId: kelSupplier2.id, supplierType: "OEM", category: "Lubricant", garagehubCode: "#001", name: "Castrol EDGE 5W-30 (4L)", partCategory: "fluids", price: "89.90", stockQuantity: 80, description: "Fully synthetic motor oil", images: ["https://via.placeholder.com/400x300?text=Castrol+EDGE"] },
    { supplierId: kelSupplier2.id, supplierType: "OEM", category: "Lubricant", garagehubCode: "#002", name: "Mobil 1 ESP 5W-30 (5L)", partCategory: "fluids", price: "125.00", stockQuantity: 50, description: "Advanced full synthetic oil", images: [] },
    
    // Battery World Kelantan (Halfcut) - Electrical
    { supplierId: kelSupplier3.id, supplierType: "Halfcut", category: "Battery", garagehubCode: "#001", name: "Amaron NS60 Battery", partCategory: "electrical", price: "185.00", stockQuantity: 35, description: "Maintenance-free car battery 55Ah", images: ["https://via.placeholder.com/400x300?text=Amaron+NS60"] },
    { supplierId: kelSupplier3.id, supplierType: "Halfcut", category: "Battery", garagehubCode: "#002", name: "Bosch S4 Battery DIN55", partCategory: "electrical", price: "245.00", stockQuantity: 22, description: "Premium quality 55Ah battery", images: [] },
    
    // Tyre King PJ (OEM) - Wheel/Tyre
    { supplierId: selSupplier1.id, supplierType: "OEM", category: "Tyre", garagehubCode: "#001", name: "Michelin Primacy 4 (205/55R16)", partCategory: "wheel_tyre", price: "385.00", stockQuantity: 40, description: "Premium comfort tyre", images: ["https://via.placeholder.com/400x300?text=Michelin+Primacy"] },
    { supplierId: selSupplier1.id, supplierType: "OEM", category: "Tyre", garagehubCode: "#002", name: "Bridgestone Turanza T001 (195/65R15)", partCategory: "wheel_tyre", price: "295.00", stockQuantity: 50, description: "High performance touring tyre", images: [] },
    { supplierId: selSupplier1.id, supplierType: "OEM", category: "Tyre", garagehubCode: "#003", name: "Continental MaxContact MC6 (215/50R17)", partCategory: "wheel_tyre", price: "450.00", stockQuantity: 30, description: "Sport performance tyre", images: [] },
    
    // Tools Warehouse Shah Alam (Halfcut) - Service tools
    { supplierId: selSupplier2.id, supplierType: "Halfcut", category: "Tools", garagehubCode: "#001", name: "Hydraulic Floor Jack 3 Ton", partCategory: "service", price: "189.00", stockQuantity: 15, description: "Professional grade floor jack", images: ["https://via.placeholder.com/400x300?text=Floor+Jack"] },
    { supplierId: selSupplier2.id, supplierType: "Halfcut", category: "Tools", garagehubCode: "#002", name: "Socket Wrench Set 46pcs", partCategory: "service", price: "125.00", stockQuantity: 25, description: "Complete socket set with case", images: [] },
    { supplierId: selSupplier2.id, supplierType: "Halfcut", category: "Tools", garagehubCode: "#003", name: "OBD2 Diagnostic Scanner", partCategory: "service", price: "245.00", stockQuantity: 12, description: "Advanced car diagnostic tool", images: ["https://via.placeholder.com/400x300?text=OBD2+Scanner"] },
    
    // OEM Parts Klang Valley (OEM) - Brakes
    { supplierId: selSupplier3.id, supplierType: "OEM", category: "OEM", garagehubCode: "#001", name: "Honda OEM Brake Pads", partCategory: "brake", price: "185.00", stockQuantity: 25, description: "Genuine Honda brake pads", vehicleMake: "Honda", vehicleModel: "Civic", vehicleYearFrom: 2016, vehicleYearTo: 2023, images: ["https://via.placeholder.com/400x300?text=Honda+Brake+Pads"] },
    { supplierId: selSupplier3.id, supplierType: "OEM", category: "OEM", garagehubCode: "#002", name: "Cabin Air Filter (Universal)", partCategory: "interior", price: "28.50", stockQuantity: 70, description: "Activated carbon cabin filter", images: [] },
    
    // Accessories Paradise JB (Halfcut) - Interior/Body
    { supplierId: johSupplier1.id, supplierType: "Halfcut", category: "Accessories", garagehubCode: "#001", name: "Leather Seat Covers (Set)", partCategory: "interior", price: "299.00", stockQuantity: 18, description: "Premium leather seat covers", images: ["https://via.placeholder.com/400x300?text=Seat+Covers"] },
    { supplierId: johSupplier1.id, supplierType: "Halfcut", category: "Accessories", garagehubCode: "#002", name: "Dashboard Camera HD", partCategory: "electrical", price: "189.00", stockQuantity: 35, description: "Full HD 1080p dashcam", images: ["https://via.placeholder.com/400x300?text=Dashcam"] },
    { supplierId: johSupplier1.id, supplierType: "Halfcut", category: "Accessories", garagehubCode: "#003", name: "Car Vacuum Cleaner", partCategory: "interior", price: "79.90", stockQuantity: 45, description: "Portable 12V car vacuum", images: [] },
    { supplierId: johSupplier1.id, supplierType: "Halfcut", category: "Halfcut", garagehubCode: "#004", name: "Honda Civic FC Engine Halfcut", partCategory: "engine", price: "8500.00", stockQuantity: 2, description: "Front halfcut with 1.5T engine & CVT", vehicleMake: "Honda", vehicleModel: "Civic FC", vehicleYearFrom: 2016, vehicleYearTo: 2021, images: ["https://via.placeholder.com/400x300?text=Honda+Civic+Halfcut"] },
    
    // Lubricant Pro Johor (OEM) - Fluids
    { supplierId: johSupplier2.id, supplierType: "OEM", category: "Lubricant", garagehubCode: "#001", name: "Shell Helix Ultra 5W-40 (4L)", partCategory: "fluids", price: "95.00", stockQuantity: 70, description: "Premium synthetic engine oil", images: ["https://via.placeholder.com/400x300?text=Shell+Helix"] },
    
    // Battery Hub JB (Halfcut) - Electrical
    { supplierId: johSupplier3.id, supplierType: "Halfcut", category: "Battery", garagehubCode: "#001", name: "Century NS70 Battery", partCategory: "electrical", price: "220.00", stockQuantity: 28, description: "Heavy-duty car battery 65Ah", images: ["https://via.placeholder.com/400x300?text=Century+NS70"] },
    { supplierId: johSupplier3.id, supplierType: "Halfcut", category: "Battery", garagehubCode: "#002", name: "Spark Plugs NGK (Set of 4)", partCategory: "engine", price: "68.00", stockQuantity: 80, description: "Iridium spark plugs", images: [] },
  ]).returning();

  console.log(`✅ Created ${productsList.length} products with Shopee-style partCategory & garagehubCode!`);

  // ============================================================================
  // PLATFORM SETTINGS
  // ============================================================================
  console.log("\n⚙️  Setting up platform configuration...");
  await db.insert(platformSettings).values([
    {
      key: "platform_commission_rate",
      value: "0.02",
      description: "Platform commission rate (2%)",
      updatedBy: admin.id,
    },
    {
      key: "runner_base_fee",
      value: "3.00",
      description: "Base delivery fee for runners (RM)",
      updatedBy: admin.id,
    },
    {
      key: "runner_per_km_rate",
      value: "0.80",
      description: "Per kilometer rate for runners (RM)",
      updatedBy: admin.id,
    },
    {
      key: "runner_search_radius_km",
      value: "10",
      description: "Maximum distance to search for runners (km)",
      updatedBy: admin.id,
    },
    {
      key: "runner_offer_expiry_minutes",
      value: "5",
      description: "Delivery offer expiry time (minutes)",
      updatedBy: admin.id,
    },
    {
      key: "max_runners_per_offer",
      value: "3",
      description: "Number of runners to send offers to",
      updatedBy: admin.id,
    },
  ]);

  // ============================================================================
  // SAMPLE TRANSACTIONS
  // ============================================================================
  console.log("\n💰 Creating sample wallet transactions...");
  await db.insert(transactionLogs).values([
    {
      transactionType: "order_payment",
      fromUserId: selWorkshop1Owner.id,
      toUserId: selSupplier1Owner.id,
      amount: "385.00",
      platformCommission: "7.70",
      description: "Payment for Michelin Primacy 4 tyre",
      status: "completed",
    },
    {
      transactionType: "delivery_fee",
      fromUserId: selWorkshop1Owner.id,
      toUserId: selRunner1.id,
      amount: "12.50",
      platformCommission: "0",
      description: "Delivery fee from Tyre King to Premium Motors",
      status: "completed",
    },
    {
      transactionType: "runner_payout",
      toUserId: kelRunner1.id,
      amount: "15.80",
      platformCommission: "0",
      description: "Weekly payout for completed deliveries",
      status: "completed",
    },
  ]);

  // ============================================================================
  // QUICK TEST ACCOUNTS (Simple credentials for easy testing)
  // ============================================================================
  console.log("\n🔑 Creating quick test accounts (password: 123456)...");
  
  const QUICK_PASSWORD = await bcrypt.hash("123456", 10);
  
  // Create quick accounts for each state and role
  type QuickAccount = {
    email: string;
    role: string;
    state: MalaysianState;
    name: string;
  };
  
  const quickAccounts: QuickAccount[] = [
    // Kelantan
    { email: "kelantan_workshop@test.com", role: "workshop", state: "Kelantan", name: "Kelantan Test Workshop" },
    { email: "kelantan_supplier@test.com", role: "supplier", state: "Kelantan", name: "Kelantan Test Supplier" },
    { email: "kelantan_runner@test.com", role: "runner", state: "Kelantan", name: "Kelantan Test Runner" },
    // Selangor
    { email: "selangor_workshop@test.com", role: "workshop", state: "Selangor", name: "Selangor Test Workshop" },
    { email: "selangor_supplier@test.com", role: "supplier", state: "Selangor", name: "Selangor Test Supplier" },
    { email: "selangor_runner@test.com", role: "runner", state: "Selangor", name: "Selangor Test Runner" },
    // Johor
    { email: "johor_workshop@test.com", role: "workshop", state: "Johor", name: "Johor Test Workshop" },
    { email: "johor_supplier@test.com", role: "supplier", state: "Johor", name: "Johor Test Supplier" },
    { email: "johor_runner@test.com", role: "runner", state: "Johor", name: "Johor Test Runner" },
  ];
  
  for (const account of quickAccounts) {
    const [user] = await db.insert(users).values({
      email: account.email,
      password: QUICK_PASSWORD,
      firstName: account.name.split(' ')[0],
      lastName: "Test",
      role: account.role as any,
      phone: "+60123456789",
      address: `Test Address, ${account.state}`,
      state: account.state,
      city: "Test City",
      latitude: account.state === "Kelantan" ? "6.1200" : account.state === "Selangor" ? "3.0738" : "1.4927",
      longitude: account.state === "Kelantan" ? "102.2400" : account.state === "Selangor" ? "101.5183" : "103.7414",
      walletBalance: "1000",
    }).returning();
    
    if (account.role === "workshop") {
      await db.insert(workshops).values({
        userId: user.id,
        name: account.name,
        address: `Test Address, ${account.state}`,
        state: account.state,
        city: "Test City",
        phone: "+60123456789",
        latitude: user.latitude!,
        longitude: user.longitude!,
        isVerified: true,
        walletBalance: "1000",
      });
    }
    
    if (account.role === "supplier") {
      await db.insert(suppliers).values({
        userId: user.id,
        name: account.name,
        address: `Test Address, ${account.state}`,
        state: account.state,
        city: "Test City",
        phone: "+60123456789",
        latitude: user.latitude!,
        longitude: user.longitude!,
        deliveryMethod: "both",
        isVerified: true,
        walletBalance: "1000",
      });
    }
  }
  
  // Create quick customer and admin accounts
  const [quickCustomer] = await db.insert(users).values({
    email: "customer@test.com",
    password: QUICK_PASSWORD,
    firstName: "Test",
    lastName: "Customer",
    role: "customer",
    phone: "+60123456789",
    address: "Test Customer Address",
    state: "Selangor" satisfies MalaysianState,
    city: "Kuala Lumpur",
    latitude: "3.1390",
    longitude: "101.6869",
    walletBalance: "500",
  }).returning();
  
  const [quickAdmin] = await db.insert(users).values({
    email: "admin@test.com",
    password: QUICK_PASSWORD,
    firstName: "Test",
    lastName: "Admin",
    role: "admin",
    phone: "+60123456789",
    address: "Test Admin HQ",
    state: "Kuala Lumpur" satisfies MalaysianState,
    city: "Kuala Lumpur",
    latitude: "3.1390",
    longitude: "101.6869",
    walletBalance: "0",
  }).returning();

  console.log("\n✅ Global Marketplace Mode Seed Completed!");
  console.log("\n📊 SEED DATA SUMMARY:");
  console.log("  🏢 Total Suppliers: 9 (3 per state)");
  console.log("  🔧 Total Workshops: 6 (2 per state)");
  console.log("  🚚 Total Runners: 6 (2 per state)");
  console.log("  📦 Total Products: 22 (across 7 categories)");
  console.log("  📍 States Covered: Kelantan, Selangor, Johor");
  
  console.log("\n📧 DEMO USER CREDENTIALS (password: demo123):");
  console.log("\n  👑 ADMIN:");
  console.log("     admin@garagehub.my");
  
  console.log("\n  🏖️  KELANTAN USERS:");
  console.log("     parts.kelatan@gmail.com (Supplier - Both delivery)");
  console.log("     oil.lubricants.kb@gmail.com (Supplier - Runner only)");
  console.log("     battery.world.kelantan@gmail.com (Supplier - Pickup only)");
  console.log("     autocare.kb@gmail.com (Workshop)");
  console.log("     speedfix.kelantan@gmail.com (Workshop)");
  console.log("     runner.kb1@gmail.com (Runner)");
  console.log("     runner.kb2@gmail.com (Runner)");
  
  console.log("\n  🏙️  SELANGOR USERS:");
  console.log("     tyreking.pj@gmail.com (Supplier - Both delivery)");
  console.log("     tools.warehouse.sa@gmail.com (Supplier - Both delivery)");
  console.log("     oem.parts.klang@gmail.com (Supplier - Runner only)");
  console.log("     premium.motors.pj@gmail.com (Workshop)");
  console.log("     quickservice.sa@gmail.com (Workshop)");
  console.log("     runner.pj1@gmail.com (Runner)");
  console.log("     runner.sa1@gmail.com (Runner)");
  
  console.log("\n  🌴 JOHOR USERS:");
  console.log("     accessories.jb@gmail.com (Supplier - Both delivery)");
  console.log("     lubricant.pro.jb@gmail.com (Supplier - Runner only)");
  console.log("     battery.hub.jb@gmail.com (Supplier - Pickup only)");
  console.log("     autoexpert.jb@gmail.com (Workshop)");
  console.log("     carcare.jb@gmail.com (Workshop)");
  console.log("     runner.jb1@gmail.com (Runner)");
  console.log("     runner.jb2@gmail.com (Runner)");
  
  console.log("\n🔑 QUICK TEST ACCOUNTS (password: 123456):");
  console.log("\n  👑 ADMIN:");
  console.log("     admin@test.com");
  console.log("\n  👤 CUSTOMER:");
  console.log("     customer@test.com");
  console.log("\n  🏖️  KELANTAN:");
  console.log("     kelantan_workshop@test.com (Workshop)");
  console.log("     kelantan_supplier@test.com (Supplier)");
  console.log("     kelantan_runner@test.com (Runner)");
  console.log("\n  🏙️  SELANGOR:");
  console.log("     selangor_workshop@test.com (Workshop)");
  console.log("     selangor_supplier@test.com (Supplier)");
  console.log("     selangor_runner@test.com (Runner)");
  console.log("\n  🌴 JOHOR:");
  console.log("     johor_workshop@test.com (Workshop)");
  console.log("     johor_supplier@test.com (Supplier)");
  console.log("     johor_runner@test.com (Runner)");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
