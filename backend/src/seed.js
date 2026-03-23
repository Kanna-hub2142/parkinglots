import db from './db.js';
import bcrypt from 'bcryptjs';

const parkingLots = [
    { placeName: "Dublin City Center Parking", location: "📍12 O'Connell Street, Dublin", mapLink: "https://www.google.com/maps/search/?api=1&query=12+O%27Connell+Street,+Dublin", totalCapacity: 180, available: 180, hourlyRate: "€4.5", lat: 53.3498, long: -6.2603 },
    { placeName: "Temple Bar Parking", location: "📍5 Fleet Street, Dublin", mapLink: "https://www.google.com/maps/search/?api=1&query=5+Fleet+Street,+Dublin", totalCapacity: 120, available: 10, hourlyRate: "€5.0", lat: 53.3458, long: -6.2628 },
    { placeName: "Cork Central Parking", location: "📍22 Patrick Street, Cork", mapLink: "https://www.google.com/maps/search/?api=1&query=22+Patrick+Street,+Cork", totalCapacity: 150, available: 40, hourlyRate: "€3.5", lat: 51.8985, long: -8.4756 },
    { placeName: "Galway Square Parking", location: "📍1 Eyre Square, Galway", mapLink: "https://www.google.com/maps/search/?api=1&query=1+Eyre+Square,+Galway", totalCapacity: 130, available: 18, hourlyRate: "€4.0", lat: 53.2738, long: -9.0478 },
    { placeName: "Limerick Riverfront Parking", location: "📍9 Shannon Street, Limerick", mapLink: "https://www.google.com/maps/search/?api=1&query=9+Shannon+Street,+Limerick", totalCapacity: 110, available: 35, hourlyRate: "€3.0", lat: 52.6638, long: -8.6267 },
    { placeName: "Waterford Mall Parking", location: "📍45 Barronstrand St, Waterford", mapLink: "https://www.google.com/maps/search/?api=1&query=45+Barronstrand+St,+Waterford", totalCapacity: 140, available: 22, hourlyRate: "€3.5", lat: 52.2593, long: -7.1101 },
    { placeName: "Kilkenny Castle Parking", location: "📍Castle Rd, Kilkenny", mapLink: "https://www.google.com/maps/search/?api=1&query=Castle+Rd,+Kilkenny", totalCapacity: 90, available: 15, hourlyRate: "€3.0", lat: 52.6501, long: -7.2492 },
    { placeName: "Sligo Town Parking", location: "📍Market Street, Sligo", mapLink: "https://www.google.com/maps/search/?api=1&query=Market+Street,+Sligo", totalCapacity: 85, available: 20, hourlyRate: "€2.5", lat: 54.2711, long: -8.4735 },
    { placeName: "Drogheda Port Parking", location: "📍Quay Street, Drogheda", mapLink: "https://www.google.com/maps/search/?api=1&query=Quay+Street,+Drogheda", totalCapacity: 100, available: 28, hourlyRate: "€3.0", lat: 53.7144, long: -6.3486 },
    { placeName: "Bray Seafront Parking", location: "📍Strand Rd, Bray", mapLink: "https://www.google.com/maps/search/?api=1&query=Strand+Rd,+Bray", totalCapacity: 95, available: 12, hourlyRate: "€3.5", lat: 53.2019, long: -6.0964 },
    { placeName: "Athlone Center Parking", location: "📍Church Street, Athlone", mapLink: "https://www.google.com/maps/search/?api=1&query=Church+Street,+Athlone", totalCapacity: 105, available: 30, hourlyRate: "€2.5", lat: 53.4225, long: -7.9406 },
    { placeName: "Dundalk Shopping Parking", location: "📍Long Walk, Dundalk", mapLink: "https://www.google.com/maps/search/?api=1&query=Long+Walk,+Dundalk", totalCapacity: 125, available: 33, hourlyRate: "€3.0", lat: 54.0044, long: -6.4022 },
    { placeName: "Tralee Town Parking", location: "📍Castle Street, Tralee", mapLink: "https://www.google.com/maps/search/?api=1&query=Castle+Street,+Tralee", totalCapacity: 88, available: 17, hourlyRate: "€2.5", lat: 52.2708, long: -9.7042 },
    { placeName: "Ennis Market Parking", location: "📍Abbey Street, Ennis", mapLink: "https://www.google.com/maps/search/?api=1&query=Abbey+Street,+Ennis", totalCapacity: 92, available: 21, hourlyRate: "€2.5", lat: 52.8463, long: -8.9811 },
    { placeName: "Wexford Harbor Parking", location: "📍North Main Street, Wexford", mapLink: "https://www.google.com/maps/search/?api=1&query=North+Main+Street,+Wexford", totalCapacity: 98, available: 19, hourlyRate: "€3.0", lat: 52.3389, long: -6.4594 },
    { placeName: "Clonmel Plaza Parking", location: "📍Gladstone Street, Clonmel", mapLink: "https://www.google.com/maps/search/?api=1&query=Gladstone+Street,+Clonmel", totalCapacity: 80, available: 16, hourlyRate: "€2.5", lat: 52.3550, long: -7.7032 },
    { placeName: "Letterkenny Mall Parking", location: "📍Port Rd, Letterkenny", mapLink: "https://www.google.com/maps/search/?api=1&query=Port+Rd,+Letterkenny", totalCapacity: 115, available: 37, hourlyRate: "€3.0", lat: 54.9545, long: -7.7317 },
    { placeName: "Mullingar Town Parking", location: "📍Dominick Street, Mullingar", mapLink: "https://www.google.com/maps/search/?api=1&query=Dominick+Street,+Mullingar", totalCapacity: 87, available: 23, hourlyRate: "€2.5", lat: 53.5255, long: -7.3489 },
    { placeName: "Naas Central Parking", location: "📍Main Street, Naas", mapLink: "https://www.google.com/maps/search/?api=1&query=Main+Street,+Naas", totalCapacity: 102, available: 29, hourlyRate: "€3.0", lat: 53.2185, long: -6.6669 },
    { placeName: "Carlow Market Parking", location: "📍Tullow Street, Carlow", mapLink: "https://www.google.com/maps/search/?api=1&query=Tullow+Street,+Carlow", totalCapacity: 90, available: 24, hourlyRate: "€2.5", lat: 52.8354, long: -6.9248 },
];

// Clear existing data and re-seed
db.exec('DELETE FROM vehicles');
db.exec('DELETE FROM users');
db.exec('DELETE FROM parking_lots');
db.exec("DELETE FROM sqlite_sequence WHERE name='parking_lots'");
db.exec("DELETE FROM sqlite_sequence WHERE name='users'");
db.exec("DELETE FROM sqlite_sequence WHERE name='vehicles'");

// Seed parking lots
const insertLot = db.prepare(`
  INSERT INTO parking_lots (place_name, location, map_link, total_capacity, available, hourly_rate, lat, long)
  VALUES (@placeName, @location, @mapLink, @totalCapacity, @available, @hourlyRate, @lat, @long)
`);

const insertManyLots = db.transaction((lots) => {
    for (const lot of lots) {
        insertLot.run(lot);
    }
});

insertManyLots(parkingLots);
console.log(`✅ Seeded ${parkingLots.length} parking lots`);

// Seed default admin user
const adminPassword = await bcrypt.hash('admin123', 10);
db.prepare(`
  INSERT INTO users (username, email, password, role)
  VALUES (?, ?, ?, ?)
`).run('admin', 'admin@parking.com', adminPassword, 'ADMIN');

console.log('✅ Seeded admin user: admin@parking.com / admin123');
console.log('🎉 Seeding complete!');
process.exit(0);
