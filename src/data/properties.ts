import { Property } from '../types/property';

export const properties: Property[] = [
  // Rome properties
  {
    id: '1',
    title: 'Elegant Apartment near Colosseum',
    description: 'Stylish 2-bedroom apartment just 5 minutes walk from the Colosseum',
    price: 180,
    image: 'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 41.8902,
      lng: 12.4922
    },
    rating: 4.8,
    reviews: 124
  },
  {
    id: '2',
    title: 'Trastevere Charming Loft',
    description: 'Beautiful loft in the heart of Trastevere with authentic Roman character',
    price: 165,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 41.8865,
      lng: 12.4694
    },
    rating: 4.7,
    reviews: 96
  },
  {
    id: '3',
    title: 'Vatican View Apartment',
    description: 'Modern apartment with a stunning view of St. Peter\'s Basilica',
    price: 195,
    image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 41.9022,
      lng: 12.4539
    },
    rating: 4.9,
    reviews: 115
  },
  {
    id: '4',
    title: 'Spanish Steps Studio',
    description: 'Cozy studio just steps away from the famous Spanish Steps',
    price: 135,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 41.9057,
      lng: 12.4823
    },
    rating: 4.6,
    reviews: 87
  },
  // Florence properties
  {
    id: '5',
    title: 'Renaissance Apartment near Duomo',
    description: 'Beautifully renovated apartment with views of Florence Cathedral',
    price: 170,
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.7731,
      lng: 11.2563
    },
    rating: 4.9,
    reviews: 142
  },
  {
    id: '6',
    title: 'Oltrarno Artist\'s Studio',
    description: 'Unique artist\'s studio in the bohemian Oltrarno district',
    price: 125,
    image: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.7647,
      lng: 11.2456
    },
    rating: 4.7,
    reviews: 78
  },
  {
    id: '7',
    title: 'Ponte Vecchio Luxury Suite',
    description: 'High-end suite with direct views of the Ponte Vecchio bridge',
    price: 250,
    image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.7680,
      lng: 11.2531
    },
    rating: 4.9,
    reviews: 103
  },
  // Venice properties
  {
    id: '8',
    title: 'Canal-side Venetian House',
    description: 'Authentic Venetian house with its own small canal entrance',
    price: 220,
    image: 'https://images.unsplash.com/photo-1549918864-48ac978761a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.4371,
      lng: 12.3326
    },
    rating: 4.8,
    reviews: 116
  },
  {
    id: '9',
    title: 'San Marco Luxury Apartment',
    description: 'Elegant apartment just minutes from Piazza San Marco',
    price: 240,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.4343,
      lng: 12.3388
    },
    rating: 4.9,
    reviews: 95
  },
  {
    id: '10',
    title: 'Rialto Modern Loft',
    description: 'Contemporary designed loft near the famous Rialto Bridge',
    price: 190,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.4385,
      lng: 12.3359
    },
    rating: 4.7,
    reviews: 89
  },
  // Milan properties
  {
    id: '11',
    title: 'Fashion District Penthouse',
    description: 'Stunning penthouse in the heart of Milan\'s fashion district',
    price: 280,
    image: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.4669,
      lng: 9.1917
    },
    rating: 4.9,
    reviews: 127
  },
  {
    id: '12',
    title: 'Navigli Canal Apartment',
    description: 'Trendy apartment overlooking the vibrant Navigli canals',
    price: 160,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.4583,
      lng: 9.1714
    },
    rating: 4.7,
    reviews: 114
  },
  {
    id: '13',
    title: 'Duomo View Studio',
    description: 'Compact studio with breathtaking views of the Milan Cathedral',
    price: 175,
    image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.4647,
      lng: 9.1921
    },
    rating: 4.8,
    reviews: 93
  },
  // Naples properties
  {
    id: '14',
    title: 'Seafront Neapolitan Apartment',
    description: 'Beautiful apartment with panoramic views of the Bay of Naples',
    price: 145,
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.8358,
      lng: 14.2487
    },
    rating: 4.6,
    reviews: 84
  },
  {
    id: '15',
    title: 'Historic Center Loft',
    description: 'Characterful loft in the ancient heart of Naples',
    price: 120,
    image: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.8518,
      lng: 14.2681
    },
    rating: 4.5,
    reviews: 72
  },
  // Sicily properties
  {
    id: '16',
    title: 'Taormina Sea View Villa',
    description: 'Luxurious villa with stunning views of the Sicilian coastline',
    price: 300,
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 37.8516,
      lng: 15.2853
    },
    rating: 4.9,
    reviews: 145
  },
  {
    id: '17',
    title: 'Palermo Historic Apartment',
    description: 'Elegant apartment in a restored palazzo in central Palermo',
    price: 155,
    image: 'https://images.unsplash.com/photo-1560185007-5f0bb1866cab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 38.1157,
      lng: 13.3615
    },
    rating: 4.7,
    reviews: 98
  },
  {
    id: '18',
    title: 'Syracuse Waterfront Home',
    description: 'Beautiful home with direct access to the crystal clear waters of Syracuse',
    price: 220,
    image: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 37.0755,
      lng: 15.2866
    },
    rating: 4.8,
    reviews: 86
  },
  // Tuscany properties
  {
    id: '19',
    title: 'Chianti Wine Country Villa',
    description: 'Rustic villa surrounded by vineyards in the heart of Chianti',
    price: 275,
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.4642,
      lng: 11.2544
    },
    rating: 4.9,
    reviews: 132
  },
  {
    id: '20',
    title: 'Siena Medieval Apartment',
    description: 'Charming apartment in a medieval building near Piazza del Campo',
    price: 165,
    image: 'https://images.unsplash.com/photo-1566908829550-e6551b00979b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.3186,
      lng: 11.3306
    },
    rating: 4.8,
    reviews: 91
  },
  {
    id: '21',
    title: 'Lucca City Walls Home',
    description: 'Unique home with views of Lucca\'s famous Renaissance walls',
    price: 185,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.8429,
      lng: 10.5027
    },
    rating: 4.7,
    reviews: 88
  },
  // Amalfi Coast properties
  {
    id: '22',
    title: 'Positano Cliffside Suite',
    description: 'Breathtaking suite built into the cliffs with panoramic sea views',
    price: 350,
    image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.6263,
      lng: 14.4842
    },
    rating: 5.0,
    reviews: 156
  },
  {
    id: '23',
    title: 'Ravello Garden Retreat',
    description: 'Peaceful apartment with beautiful gardens overlooking the coast',
    price: 230,
    image: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.6490,
      lng: 14.6110
    },
    rating: 4.8,
    reviews: 112
  },
  {
    id: '24',
    title: 'Amalfi Historic Center Flat',
    description: 'Cozy flat in the historic center, steps from the main cathedral',
    price: 195,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.6343,
      lng: 14.6023
    },
    rating: 4.7,
    reviews: 94
  },
  // Lake Como properties
  {
    id: '25',
    title: 'Bellagio Lakefront Villa',
    description: 'Elegant villa with private dock and unparalleled lake views',
    price: 420,
    image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.9862,
      lng: 9.2645
    },
    rating: 4.9,
    reviews: 138
  },
  {
    id: '26',
    title: 'Como City Modern Apartment',
    description: 'Contemporary apartment with stunning lake views in the city of Como',
    price: 190,
    image: 'https://images.unsplash.com/photo-1565182999561-18d7dc61c393?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.8103,
      lng: 9.0851
    },
    rating: 4.7,
    reviews: 106
  },
  {
    id: '27',
    title: 'Varenna Hillside Cottage',
    description: 'Charming cottage with terraced garden overlooking the eastern shore',
    price: 210,
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 46.0088,
      lng: 9.2845
    },
    rating: 4.8,
    reviews: 97
  },
  // Sardinia properties
  {
    id: '28',
    title: 'Costa Smeralda Luxury Villa',
    description: 'Exclusive villa with private beach access in Porto Cervo',
    price: 500,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 41.1360,
      lng: 9.5423
    },
    rating: 5.0,
    reviews: 167
  },
  {
    id: '29',
    title: 'Alghero Old Town Apartment',
    description: 'Stylish apartment in the historic center of Alghero',
    price: 155,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.5584,
      lng: 8.3125
    },
    rating: 4.6,
    reviews: 85
  },
  {
    id: '30',
    title: 'Cagliari Seaside Loft',
    description: 'Modern loft with panoramic views of the Gulf of Cagliari',
    price: 175,
    image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 39.2238,
      lng: 9.1217
    },
    rating: 4.7,
    reviews: 92
  },
  // Sicily properties
  {
    id: '31',
    title: 'Taormina Sea View Villa',
    description: 'Elegant villa with breathtaking views of the Ionian Sea',
    price: 320,
    image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 37.8516,
      lng: 15.2853
    },
    rating: 4.9,
    reviews: 145
  },
  {
    id: '32',
    title: 'Palermo Historic Center Apartment',
    description: 'Charming apartment in the heart of Palermo\'s historic district',
    price: 140,
    image: 'https://images.unsplash.com/photo-1560185007-5f0bb1866cab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 38.1157,
      lng: 13.3615
    },
    rating: 4.6,
    reviews: 108
  },
  {
    id: '33',
    title: 'Syracuse Ortigia Island Loft',
    description: 'Renovated loft in the ancient island of Ortigia',
    price: 165,
    image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 37.0662,
      lng: 15.2958
    },
    rating: 4.8,
    reviews: 122
  },
  // Tuscany countryside properties
  {
    id: '34',
    title: 'Chianti Vineyard Farmhouse',
    description: 'Authentic farmhouse surrounded by vineyards in the Chianti region',
    price: 280,
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.4846,
      lng: 11.2093
    },
    rating: 4.9,
    reviews: 156
  },
  {
    id: '35',
    title: 'Val d\'Orcia Stone Villa',
    description: 'Traditional stone villa with pool overlooking the rolling hills of Val d\'Orcia',
    price: 310,
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.0285,
      lng: 11.6178
    },
    rating: 5.0,
    reviews: 189
  },
  {
    id: '36',
    title: 'Lucca Medieval Tower House',
    description: 'Unique accommodation in a restored medieval tower near Lucca\'s walls',
    price: 225,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.8429,
      lng: 10.5027
    },
    rating: 4.8,
    reviews: 134
  },
  // Puglia properties
  {
    id: '37',
    title: 'Alberobello Trullo House',
    description: 'Authentic trullo house with modern amenities in UNESCO World Heritage site',
    price: 195,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.7864,
      lng: 17.2402
    },
    rating: 4.9,
    reviews: 167
  },
  {
    id: '38',
    title: 'Polignano a Mare Cliff House',
    description: 'Stunning house built into the limestone cliffs with sea views',
    price: 275,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.9964,
      lng: 17.2246
    },
    rating: 4.8,
    reviews: 143
  },
  {
    id: '39',
    title: 'Lecce Baroque Apartment',
    description: 'Elegant apartment in a baroque building in Lecce\'s historic center',
    price: 160,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.3516,
      lng: 18.1718
    },
    rating: 4.7,
    reviews: 112
  },
  // Cinque Terre properties
  {
    id: '40',
    title: 'Vernazza Colorful House',
    description: 'Vibrant house with terrace overlooking the harbor of Vernazza',
    price: 230,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 44.1350,
      lng: 9.6837
    },
    rating: 4.8,
    reviews: 138
  },
  {
    id: '41',
    title: 'Manarola Vineyard Cottage',
    description: 'Cozy cottage surrounded by terraced vineyards with sea views',
    price: 210,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 44.1075,
      lng: 9.7263
    },
    rating: 4.7,
    reviews: 126
  },
  {
    id: '42',
    title: 'Riomaggiore Fisherman\'s House',
    description: 'Traditional fisherman\'s house renovated with modern comforts',
    price: 185,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 44.0997,
      lng: 9.7379
    },
    rating: 4.6,
    reviews: 104
  },
  // Dolomites properties
  {
    id: '43',
    title: 'Cortina Mountain Chalet',
    description: 'Luxurious wooden chalet with panoramic views of the Dolomites',
    price: 350,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 46.5404,
      lng: 12.1366
    },
    rating: 4.9,
    reviews: 152
  },
  {
    id: '44',
    title: 'Val Gardena Ski Lodge',
    description: 'Cozy lodge with direct access to ski slopes in Val Gardena',
    price: 290,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 46.5580,
      lng: 11.6760
    },
    rating: 4.8,
    reviews: 137
  },
  {
    id: '45',
    title: 'Alpe di Siusi Alpine Hut',
    description: 'Traditional alpine hut on Europe\'s largest high-altitude meadow',
    price: 240,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 46.5422,
      lng: 11.6080
    },
    rating: 4.7,
    reviews: 118
  },
  // Naples and Amalfi Coast properties
  {
    id: '46',
    title: 'Positano Cliffside Villa',
    description: 'Spectacular villa with infinity pool overlooking the Amalfi Coast',
    price: 450,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.6280,
      lng: 14.4843
    },
    rating: 5.0,
    reviews: 195
  },
  {
    id: '47',
    title: 'Capri Luxury Suite',
    description: 'Elegant suite with private terrace and views of the Faraglioni rocks',
    price: 380,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.5532,
      lng: 14.2222
    },
    rating: 4.9,
    reviews: 176
  },
  {
    id: '48',
    title: 'Naples Historic Center Loft',
    description: 'Stylish loft in a 16th-century building in the heart of Naples',
    price: 170,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.8518,
      lng: 14.2681
    },
    rating: 4.6,
    reviews: 128
  },
  // Umbria properties
  {
    id: '49',
    title: 'Assisi Stone Farmhouse',
    description: 'Restored farmhouse with garden overlooking the Umbrian valley',
    price: 220,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.0707,
      lng: 12.6198
    },
    rating: 4.8,
    reviews: 142
  },
  {
    id: '50',
    title: 'Perugia City Apartment',
    description: 'Elegant apartment in a medieval building in Perugia\'s center',
    price: 155,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.1107,
      lng: 12.3908
    },
    rating: 4.7,
    reviews: 116
  },
  {
    id: '51',
    title: 'Orvieto Countryside Villa',
    description: 'Spacious villa with pool surrounded by olive groves near Orvieto',
    price: 265,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 42.7185,
      lng: 12.1108
    },
    rating: 4.9,
    reviews: 138
  },
  // Piedmont properties
  {
    id: '52',
    title: 'Turin Historic Apartment',
    description: 'Elegant apartment in a baroque building in Turin\'s city center',
    price: 175,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.0703,
      lng: 7.6869
    },
    rating: 4.7,
    reviews: 124
  },
  {
    id: '53',
    title: 'Langhe Vineyard Estate',
    description: 'Luxurious estate with wine cellar in the UNESCO-listed Langhe region',
    price: 320,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 44.6973,
      lng: 8.0359
    },
    rating: 4.9,
    reviews: 156
  },
  {
    id: '54',
    title: 'Lake Maggiore Lakefront Villa',
    description: 'Elegant villa with private dock on the shores of Lake Maggiore',
    price: 380,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.9275,
      lng: 8.5671
    },
    rating: 4.8,
    reviews: 147
  },
  // Liguria properties
  {
    id: '55',
    title: 'Portofino Harbor View Apartment',
    description: 'Luxurious apartment overlooking the famous Portofino harbor',
    price: 340,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 44.3018,
      lng: 9.2097
    },
    rating: 4.9,
    reviews: 168
  },
  {
    id: '56',
    title: 'Genoa Historic Palace Floor',
    description: 'Entire floor in a 16th-century palace in Genoa\'s historic center',
    price: 230,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 44.4056,
      lng: 8.9463
    },
    rating: 4.8,
    reviews: 132
  },
  {
    id: '57',
    title: 'San Remo Seaside Villa',
    description: 'Mediterranean villa with garden and sea views in the city of flowers',
    price: 290,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.8162,
      lng: 7.7762
    },
    rating: 4.7,
    reviews: 125
  },
  // Emilia-Romagna properties
  {
    id: '58',
    title: 'Bologna Medieval Tower Apartment',
    description: 'Unique apartment in a restored medieval tower in Bologna\'s center',
    price: 195,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 44.4949,
      lng: 11.3426
    },
    rating: 4.8,
    reviews: 143
  },
  {
    id: '59',
    title: 'Parma Countryside Farmhouse',
    description: 'Traditional farmhouse with cooking facilities in the food valley of Parma',
    price: 210,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 44.8015,
      lng: 10.3279
    },
    rating: 4.7,
    reviews: 129
  },
  {
    id: '60',
    title: 'Ravenna Byzantine Apartment',
    description: 'Stylish apartment steps away from Ravenna\'s UNESCO mosaics',
    price: 165,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 44.4183,
      lng: 12.2035
    },
    rating: 4.6,
    reviews: 112
  },
  // Marche properties
  {
    id: '61',
    title: 'Urbino Renaissance Apartment',
    description: 'Elegant apartment in a historic building in the UNESCO city of Urbino',
    price: 150,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.7262,
      lng: 12.6365
    },
    rating: 4.7,
    reviews: 108
  },
  {
    id: '62',
    title: 'Conero Riviera Beach House',
    description: 'Modern house with direct beach access in the Conero Natural Park',
    price: 240,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 43.5507,
      lng: 13.6203
    },
    rating: 4.8,
    reviews: 136
  },
  {
    id: '63',
    title: 'Ascoli Piceno Historic Home',
    description: 'Charming home in the travertine-built historic center of Ascoli',
    price: 145,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 42.8537,
      lng: 13.5749
    },
    rating: 4.6,
    reviews: 97
  },
  // Veneto properties
  {
    id: '64',
    title: 'Venice Canal View Apartment',
    description: 'Romantic apartment with views of a quiet canal in authentic Venice',
    price: 260,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.4408,
      lng: 12.3155
    },
    rating: 4.8,
    reviews: 175
  },
  {
    id: '65',
    title: 'Verona Juliet\'s Balcony Suite',
    description: 'Luxurious suite steps away from Juliet\'s famous balcony',
    price: 220,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.4384,
      lng: 10.9916
    },
    rating: 4.7,
    reviews: 142
  },
  {
    id: '66',
    title: 'Prosecco Hills Vineyard Cottage',
    description: 'Cozy cottage surrounded by vineyards in the UNESCO Prosecco Hills',
    price: 185,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.9075,
      lng: 12.1993
    },
    rating: 4.6,
    reviews: 118
  },
  // Calabria properties
  {
    id: '67',
    title: 'Tropea Beachfront Apartment',
    description: 'Modern apartment with direct access to Tropea\'s white sandy beaches',
    price: 170,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 38.6725,
      lng: 15.8963
    },
    rating: 4.7,
    reviews: 126
  },
  {
    id: '68',
    title: 'Scilla Fisherman\'s House',
    description: 'Traditional house in the picturesque fishing village of Chianalea',
    price: 145,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 38.2513,
      lng: 15.7149
    },
    rating: 4.6,
    reviews: 104
  },
  {
    id: '69',
    title: 'Sila National Park Mountain Cabin',
    description: 'Rustic cabin surrounded by pine forests in the Sila mountains',
    price: 130,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 39.3304,
      lng: 16.4408
    },
    rating: 4.5,
    reviews: 87
  },
  // Basilicata properties
  {
    id: '70',
    title: 'Matera Cave Dwelling',
    description: 'Unique accommodation in a restored cave dwelling in the Sassi di Matera',
    price: 190,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.6654,
      lng: 16.6121
    },
    rating: 4.9,
    reviews: 158
  },
  {
    id: '71',
    title: 'Maratea Sea View Villa',
    description: 'Elegant villa overlooking the Tyrrhenian Sea in the pearl of the Mediterranean',
    price: 250,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 39.9935,
      lng: 15.7113
    },
    rating: 4.8,
    reviews: 132
  },
  {
    id: '72',
    title: 'Pollino National Park Retreat',
    description: 'Peaceful mountain retreat with hiking trails in Italy\'s largest national park',
    price: 140,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 39.9165,
      lng: 16.1769
    },
    rating: 4.6,
    reviews: 94
  },
  // Friuli-Venezia Giulia properties
  {
    id: '73',
    title: 'Trieste Harbor View Apartment',
    description: 'Elegant apartment with views of the harbor in the literary city of Trieste',
    price: 180,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.6495,
      lng: 13.7768
    },
    rating: 4.7,
    reviews: 116
  },
  {
    id: '74',
    title: 'Udine Historic Center Home',
    description: 'Charming home in the Venetian-style historic center of Udine',
    price: 155,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 46.0711,
      lng: 13.2346
    },
    rating: 4.6,
    reviews: 98
  },
  {
    id: '75',
    title: 'Julian Alps Mountain Chalet',
    description: 'Cozy wooden chalet with stunning views of the Julian Alps',
    price: 195,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 46.3693,
      lng: 13.5808
    },
    rating: 4.8,
    reviews: 127
  },
  // Trentino-Alto Adige properties
  {
    id: '76',
    title: 'Trento Mountain View Apartment',
    description: 'Modern apartment with panoramic mountain views in the city of Trento',
    price: 175,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 46.0748,
      lng: 11.1217
    },
    rating: 4.7,
    reviews: 114
  },
  {
    id: '77',
    title: 'Bolzano Vineyard Guesthouse',
    description: 'Charming guesthouse surrounded by vineyards and apple orchards',
    price: 190,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 46.4983,
      lng: 11.3548
    },
    rating: 4.8,
    reviews: 132
  },
  {
    id: '78',
    title: 'Madonna di Campiglio Ski Chalet',
    description: 'Luxurious ski-in/ski-out chalet in the famous Dolomiti di Brenta resort',
    price: 320,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 46.2316,
      lng: 10.8267
    },
    rating: 4.9,
    reviews: 156
  },
  // Molise properties
  {
    id: '79',
    title: 'Termoli Old Town Apartment',
    description: 'Cozy apartment in the walled old town overlooking the Adriatic',
    price: 130,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 42.0026,
      lng: 14.9957
    },
    rating: 4.5,
    reviews: 86
  },
  {
    id: '80',
    title: 'Campobasso Historic Home',
    description: 'Traditional home in the medieval center of Campobasso',
    price: 120,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 41.5603,
      lng: 14.6626
    },
    rating: 4.4,
    reviews: 74
  },
  {
    id: '81',
    title: 'Agnone Countryside Retreat',
    description: 'Peaceful retreat near the historic bell-making town of Agnone',
    price: 135,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 41.8115,
      lng: 14.3808
    },
    rating: 4.6,
    reviews: 92
  },
  // Valle d'Aosta properties
  {
    id: '82',
    title: 'Courmayeur Mont Blanc Chalet',
    description: 'Luxury chalet with views of Mont Blanc in the alpine resort of Courmayeur',
    price: 350,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.7971,
      lng: 6.9694
    },
    rating: 4.9,
    reviews: 164
  },
  {
    id: '83',
    title: 'Aosta Roman Villa',
    description: 'Elegant villa near Roman ruins in the historic city of Aosta',
    price: 210,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.7367,
      lng: 7.3217
    },
    rating: 4.7,
    reviews: 118
  },
  {
    id: '84',
    title: 'Cervinia Ski Apartment',
    description: 'Modern apartment with direct access to the Matterhorn ski area',
    price: 280,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.9372,
      lng: 7.6326
    },
    rating: 4.8,
    reviews: 146
  },
  // Lazio properties (outside Rome)
  {
    id: '85',
    title: 'Civita di Bagnoregio Stone House',
    description: 'Unique stone house in the "dying city" accessible only by footbridge',
    price: 200,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 42.6270,
      lng: 12.1139
    },
    rating: 4.8,
    reviews: 137
  },
  {
    id: '86',
    title: 'Sperlonga Beach Villa',
    description: 'Mediterranean villa with direct beach access in the white town of Sperlonga',
    price: 270,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 41.2672,
      lng: 13.4279
    },
    rating: 4.7,
    reviews: 128
  },
  {
    id: '87',
    title: 'Tivoli Garden Apartment',
    description: 'Elegant apartment near the Renaissance gardens of Villa d\'Este',
    price: 160,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 41.9633,
      lng: 12.7985
    },
    rating: 4.6,
    reviews: 105
  },
  // Lombardy properties (outside Milan and Lake Como)
  {
    id: '88',
    title: 'Bergamo Upper City Apartment',
    description: 'Historic apartment in the medieval upper city of Bergamo',
    price: 165,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.7042,
      lng: 9.6625
    },
    rating: 4.7,
    reviews: 119
  },
  {
    id: '89',
    title: 'Mantua Renaissance Apartment',
    description: 'Elegant apartment in the Renaissance city of the Gonzaga family',
    price: 155,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.1564,
      lng: 10.7913
    },
    rating: 4.6,
    reviews: 102
  },
  {
    id: '90',
    title: 'Franciacorta Wine Country Villa',
    description: 'Luxurious villa surrounded by the vineyards of the Franciacorta region',
    price: 290,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 45.5952,
      lng: 9.9483
    },
    rating: 4.8,
    reviews: 143
  },
  // Campania properties (outside Naples and Amalfi Coast)
  {
    id: '91',
    title: 'Paestum Archaeological Site Villa',
    description: 'Elegant villa walking distance from the ancient Greek temples of Paestum',
    price: 220,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.4230,
      lng: 15.0054
    },
    rating: 4.7,
    reviews: 126
  },
  {
    id: '92',
    title: 'Ischia Thermal Spa House',
    description: 'Charming house with private thermal pool on the volcanic island of Ischia',
    price: 260,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.7308,
      lng: 13.9015
    },
    rating: 4.8,
    reviews: 148
  },
  {
    id: '93',
    title: 'Procida Colorful Fisherman\'s House',
    description: 'Vibrant house in the picturesque fishing village of Corricella',
    price: 190,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: {
      lat: 40.7512,
      lng: 14.0269
    },
    rating: 4.7,
    reviews: 132
  },
  // Apulia additional properties
 
];
