
import { Product, ProductCategory, ProductColour, CoachingPackage, Testimonial, BlogPost, FAQItem, LearnItem, WallArtProduct, WallArtCategory } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'She Wore Her Favourite Scarf to Mahjong',
    price: 75,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Multi],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/399df203-db69-4502-83e9-e72011873fd6/IMG_7205.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/399df203-db69-4502-83e9-e72011873fd6/IMG_7205.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p2',
    name: 'She Had an Unexpected Yearning for Aubergine and Violet',
    price: 65,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Pink],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/f0063dcd-13a8-454b-8a4f-cb0eb1b0205f/IMG_7227.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/f0063dcd-13a8-454b-8a4f-cb0eb1b0205f/IMG_7227.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'In stock - Ships in 1-3 days'
  },
  {
    id: 'p3',
    name: 'Korean Barbecue Had Fast Become Her Favourite',
    price: 90,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Red],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/0c98d855-104a-46d7-b5c1-5d586ba0943b/IMG_7248.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/0c98d855-104a-46d7-b5c1-5d586ba0943b/IMG_7248.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p4',
    name: 'Spearmint and Roses Spilled From Her String Bag',
    price: 65,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Blue, ProductColour.Pink],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/659fd3e1-0184-4fdd-88a8-71dbe1ee413b/IMG_7258.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/659fd3e1-0184-4fdd-88a8-71dbe1ee413b/IMG_7258.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p5',
    name: 'She Could Hear the Butcher Birds Sing From Her Kitchen',
    price: 70,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Black],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/123528c7-c43a-4488-9c57-8b44b35da550/IMG_7250.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/123528c7-c43a-4488-9c57-8b44b35da550/IMG_7250.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p6',
    name: "She Didn't Care Much for Polite Conversation",
    price: 65,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Blue],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a8ff94e9-9baf-4d3d-9976-a69fbab2b09d/IMG_7295.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a8ff94e9-9baf-4d3d-9976-a69fbab2b09d/IMG_7295.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p7',
    name: 'By Day She Hid Her Superpowers',
    price: 85,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Blue],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a85780a1-576e-4295-b0a2-bab6b1af7a2b/IMG_7310.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a85780a1-576e-4295-b0a2-bab6b1af7a2b/IMG_7310.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p8',
    name: "She'd Let Go of What They Said a Long Time Ago",
    price: 75,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Black],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/d6d73718-9d91-49c5-8450-21fb253bcdb3/IMG_7316.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/d6d73718-9d91-49c5-8450-21fb253bcdb3/IMG_7316.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p9',
    name: 'She Loved a Whiskey Sour',
    price: 70,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Yellow],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/63df1a4f-1d2c-41c1-862e-98029a7c863d/IMG_7328.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/63df1a4f-1d2c-41c1-862e-98029a7c863d/IMG_7328.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p10',
    name: 'She Dreamed of Dragonflies and the Sweet Smell of Jonquils',
    price: 80,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Yellow, ProductColour.Blue],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/1ce7a083-5268-4790-87ab-5f3f31fd743e/IMG_7336.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/1ce7a083-5268-4790-87ab-5f3f31fd743e/IMG_7336.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'In stock - Ships in 1-3 days'
  },
  {
    id: 'p11',
    name: 'She Basked in Silence',
    price: 60,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Black],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/8462337b-4873-4a02-b6e0-f35672ff76f4/IMG_7344.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/8462337b-4873-4a02-b6e0-f35672ff76f4/IMG_7344.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p12',
    name: 'She Often Wondered What Sound Each Colour Made',
    price: 80,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Multi],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/d295b70f-19d2-4d13-ba17-3b32081ee889/IMG_7348.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/d295b70f-19d2-4d13-ba17-3b32081ee889/IMG_7348.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'In stock - Ships in 1-3 days'
  },
  {
    id: 'p13',
    name: 'She Could Hear the Wildflowers',
    price: 90,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Multi],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/3a6482ae-ab1a-43b7-ba20-039fe81a7f6d/IMG_7367.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/3a6482ae-ab1a-43b7-ba20-039fe81a7f6d/IMG_7367.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'In stock - Ships in 1-3 days'
  },
  {
    id: 'p14',
    name: "'What Flavour Would the Sun Be?' She Wondered.",
    price: 65,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Yellow, ProductColour.Red],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/7df8a08f-4188-4c1b-af11-5c544fe14dbd/IMG_7372.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/7df8a08f-4188-4c1b-af11-5c544fe14dbd/IMG_7372.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p15',
    name: 'A Splash of Orange Always Made Her Smile',
    price: 75,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Red],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/0a482f3d-5236-473b-a30d-bb823813fb39/IMG_7391.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/0a482f3d-5236-473b-a30d-bb823813fb39/IMG_7391.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p16',
    name: 'She Owned Her Own Creativity',
    price: 70,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Pink],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/047d526b-bfbe-42b1-a836-99c13ad3e4f7/IMG_7407.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/047d526b-bfbe-42b1-a836-99c13ad3e4f7/IMG_7407.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p17',
    name: 'Purple Started to Appear Everywhere',
    price: 75,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Pink],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/8e2b31aa-fbea-4955-aecb-a1532062ebf4/IMG_7416.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/8e2b31aa-fbea-4955-aecb-a1532062ebf4/IMG_7416.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p18',
    name: 'Red Brought Out Her Inner Warrior',
    price: 70,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Red],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/7bdd23dd-1ec5-4fd9-8657-31e4db6a01f7/IMG_7430.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/7bdd23dd-1ec5-4fd9-8657-31e4db6a01f7/IMG_7430.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p19',
    name: 'She Remembered wearing Shoulder Pads in the 90s',
    price: 65,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Pink],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a46ad2ee-24a8-462b-8ecb-9b3bc36d1470/IMG_7442.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a46ad2ee-24a8-462b-8ecb-9b3bc36d1470/IMG_7442.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p20',
    name: 'In Her Mind She Played the Cello',
    price: 75,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Yellow],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/82f01dea-7d17-45db-9a97-4f180eee77d9/IMG_7455.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/82f01dea-7d17-45db-9a97-4f180eee77d9/IMG_7455.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p21',
    name: 'She Could Be Verbose If She Wanted To',
    price: 65,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Blue],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/1776d71f-15b7-4c74-8f1d-db5ca73dcc3e/IMG_7459.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/1776d71f-15b7-4c74-8f1d-db5ca73dcc3e/IMG_7459.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p22',
    name: 'She Danced While the Kettle Boiled',
    price: 65,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Blue],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/427ea6f0-5146-4dec-b4b2-1ec9f672bd0a/IMG_7469.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/427ea6f0-5146-4dec-b4b2-1ec9f672bd0a/IMG_7469.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p23',
    name: 'She Said Yes to the Red Lipstick',
    price: 75,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Red],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/efe2015b-6cd1-420f-bedb-0cbbd124bb24/IMG_7478.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/efe2015b-6cd1-420f-bedb-0cbbd124bb24/IMG_7478.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p24',
    name: 'She Let the Wild In Gently',
    price: 125,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Blue],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/12b94a48-585e-419e-9576-3092500b9eae/IMG_7485.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/12b94a48-585e-419e-9576-3092500b9eae/IMG_7485.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p25',
    name: 'She Packed Three Outfits. For Brunch.',
    price: 65,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Multi],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/fcb65748-9aba-42dc-b0ed-3d88bb7464ab/IMG_7530.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/fcb65748-9aba-42dc-b0ed-3d88bb7464ab/IMG_7530.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p26',
    name: 'She Had a Theory About Magic',
    price: 55,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Pink],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/28dbefb4-4006-4a1e-99f7-c7622d46fc70/IMG_7507.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/28dbefb4-4006-4a1e-99f7-c7622d46fc70/IMG_7507.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p27',
    name: 'She Knew Her Worth (and Charged Tax)',
    price: 60,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Yellow],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/0a144a8f-ec1a-4cfb-bd32-3326b580d244/IMG_7513.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/0a144a8f-ec1a-4cfb-bd32-3326b580d244/IMG_7513.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p28',
    name: 'Sandals Were Not an Option',
    price: 65,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Black],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/2c829e7f-9133-4aae-a491-8f4bc4f97b0c/IMG_7522.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/2c829e7f-9133-4aae-a491-8f4bc4f97b0c/IMG_7522.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p29',
    name: 'Deep Down She Knew',
    price: 65,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    colours: [ProductColour.Blue],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media earrings. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/7166c0ab-1ef3-40b9-bf36-3634e8f636c1/IMG_5903.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/7166c0ab-1ef3-40b9-bf36-3634e8f636c1/IMG_5903.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'In stock - Ships in 1-3 days'
  },
  {
    id: 'p30',
    name: 'A Brooch a Day Keeps the Doctor Away',
    price: 75,
    currency: 'AUD',
    category: ProductCategory.Brooches,
    colours: [ProductColour.Multi],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media brooch. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/3f5ddb6d-601f-438e-a3be-fb9c0432d00e/IMG_7395.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/3f5ddb6d-601f-438e-a3be-fb9c0432d00e/IMG_7395.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p31',
    name: 'She Wore Her Sharp Tongue and a Great Coat',
    price: 75,
    currency: 'AUD',
    category: ProductCategory.Brooches,
    colours: [ProductColour.Red],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media brooch. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/449d8e43-a9cc-489c-97fb-04105e12eeea/IMG_7197.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/449d8e43-a9cc-489c-97fb-04105e12eeea/IMG_7197.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'In stock'
  },
  {
    id: 'p32',
    name: 'A Touch of Black Fixed Every Outfit',
    price: 60,
    currency: 'AUD',
    category: ProductCategory.Brooches,
    colours: [ProductColour.Black],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media brooch. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/6c8c4263-6fc9-490d-8f9e-261125b6bea8/IMG_7498.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/6c8c4263-6fc9-490d-8f9e-261125b6bea8/IMG_7498.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  },
  {
    id: 'p33',
    name: 'She Had Questions.',
    price: 60,
    currency: 'AUD',
    category: ProductCategory.Brooches,
    colours: [ProductColour.Pink],
    shortDescription: 'Wearable art for the artist.',
    longDescription: 'Handmade ceramic and mixed media brooch. Each piece is one of a kind, crafted with intention and designed to be worn as a quiet statement.',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a92fe3cc-de42-4718-9463-3cdebc601538/IMG_7187.jpg?format=500w',
    detailImages: ['https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a92fe3cc-de42-4718-9463-3cdebc601538/IMG_7187.jpg?format=500w'],
    badge: 'ONE OF A KIND',
    availability: 'Sold out'
  }
];

export const COACHING_PACKAGES: CoachingPackage[] = [
  {
    id: 'c1',
    title: 'The Oxygen Package',
    price: '$155/month',
    description: '6-month commitment',
    features: [
      '1 x 60-minute coaching call per month (Zoom)',
      'Email support between sessions',
      'Custom tools and resources aligned with your goals',
      'Reflection and review every two months',
      'Save 10% with upfront payment: $837 total'
    ],
    ctaText: 'APPLY FOR OXYGEN',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/63df1a4f-1d2c-41c1-862e-98029a7c863d/IMG_7328.jpg?format=500w'
  },
  {
    id: 'c2',
    title: 'The Momentum Package',
    price: '$135/month',
    description: '12-month commitment',
    badge: 'BEST VALUE',
    features: [
      '1 x 60-minute coaching call per month (Zoom)',
      'Priority email access',
      'Quarterly strategic planning sessions',
      'Tailored frameworks and progress reviews',
      'Save 10% with upfront payment: $1,458 total'
    ],
    ctaText: 'APPLY FOR MOMENTUM',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/8462337b-4873-4a02-b6e0-f35672ff76f4/IMG_7344.jpg?format=500w'
  }
];

export const LEARN_ITEMS: LearnItem[] = [
  {
    id: 'l1',
    title: 'The Oxygen Series',
    subtitle: 'Creative Momentum 2025',
    type: 'ONLINE',
    price: '$105 AUD',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/63df1a4f-1d2c-41c1-862e-98029a7c863d/IMG_7328.jpg?format=500w',
    description: 'A self-paced digital course designed to reignite your creative fire and build sustainable momentum. Perfect for creatives feeling stuck, scattered, or ready to finally commit to their practice.',
    duration: '6 weeks',
    format: 'Self-paced video + workbook',
    level: 'All levels',
    enrolledCount: 147,
    includes: [
      '12 video lessons (4+ hours)',
      'Downloadable workbook & exercises',
      'Private community access',
      'Lifetime access to materials',
      'Certificate of completion'
    ],
    outcomes: [
      'Develop a sustainable creative routine that fits your life',
      'Overcome perfectionism and creative blocks',
      'Build confidence to share your work publicly',
      'Create a personal creative manifesto'
    ],
    modules: [
      { title: 'Module 1: The Creative Audit', description: 'Assess where you are and identify what\'s blocking you' },
      { title: 'Module 2: Permission & Play', description: 'Reconnect with the joy of making without judgement' },
      { title: 'Module 3: Rhythm & Routine', description: 'Design a creative practice that actually sticks' },
      { title: 'Module 4: Visibility & Voice', description: 'Share your work with confidence and authenticity' },
      { title: 'Module 5: The Long Game', description: 'Build momentum that lasts beyond the course' },
      { title: 'Module 6: Integration', description: 'Bring it all together with your personal creative plan' }
    ],
    testimonial: {
      text: "This course was the gentle push I needed. I've created more in the past month than in the entire previous year.",
      author: "Mel D.",
      role: "Textile Artist, Melbourne"
    }
  },
  {
    id: 'l2',
    title: 'Concept to Create',
    subtitle: 'Wearable Art Workshop',
    type: 'WORKSHOP',
    price: '$135 AUD',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/8462337b-4873-4a02-b6e0-f35672ff76f4/IMG_7344.jpg?format=500w',
    description: 'A hands-on live workshop where you\'ll learn the techniques and mindset behind creating distinct wearable art. From initial concept to finished piece, discover how to translate your ideas into tangible artifacts.',
    duration: '3 hours',
    format: 'Live online workshop',
    level: 'Beginner friendly',
    nextDate: 'February 15, 2025',
    enrolledCount: 89,
    includes: [
      'Live 3-hour workshop via Zoom',
      'Materials list & sourcing guide',
      'Technique demonstration videos',
      'Workshop recording for 30 days',
      'Q&A session with Lyne'
    ],
    outcomes: [
      'Understand the principles of wearable art design',
      'Learn essential techniques for mixed-media jewellery',
      'Develop your unique creative voice and aesthetic',
      'Complete a finished piece during the workshop'
    ],
    modules: [
      { title: 'Part 1: Concept Development', description: 'Finding inspiration and developing your design language' },
      { title: 'Part 2: Materials & Techniques', description: 'Working with ceramics, mixed media, and found objects' },
      { title: 'Part 3: Hands-On Making', description: 'Create your own piece with live guidance' },
      { title: 'Part 4: Finishing & Presentation', description: 'Professional finishing techniques and photography tips' }
    ],
    testimonial: {
      text: "I came in with zero jewellery experience and left with a piece I'm genuinely proud of. Lyne makes complex techniques feel accessible.",
      author: "Sarah K.",
      role: "Workshop Attendee, Brisbane"
    }
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    text: "Lyne's coaching gave me the clarity and confidence I needed to finally launch my creative business. Her approach is intelligent, intuitive, and deeply transformative.",
    author: "Sarah Chen",
    role: "Ceramic Artist & Designer, Brisbane",
    type: "coaching",
    rating: 5
  },
  {
    id: 't2',
    text: "Wearing Lyne's work feels like wearing a secret. It grounds me before every presentation.",
    author: "Sarah J.",
    role: "Architect",
    type: "shop",
    rating: 5
  },
  {
    id: 't3',
    text: "Every Time I speak with Lyne it's like the problems I thought I had dissolve and suddenly I realise they're super powers in disguise. When you can flick your limiting beliefs into signposts that guide you towards and away from things it is life (and art) changing. I can't thank you enough Lyne - see you next month for our session!",
    author: "Tanya B.",
    role: "Coaching Client",
    type: "coaching",
    rating: 5
  },
  {
    id: 't4',
    text: "I didn't realise how much I was holding back until I started learning with Lyne. Her classes blend practical skill and deep mindset shifts.",
    author: "Melanie C.",
    role: "Workshop Attendee",
    type: "learn",
    rating: 5
  },
  {
    id: 't5',
    text: "Her jewellery isn't just beautiful -it feels like a part of me. I wear it when I need to feel strong, and when I want to show up fully.",
    author: "Sandie M.",
    role: "Collector",
    type: "shop",
    rating: 5
  },
  {
    id: 't6',
    text: "I am generally hesitant to pay for a course such as this, from finding someone online. I was comfortable because I knew Lyne, and trusted that it was worth the price.",
    author: "Art of Instagram Attendee",
    role: "Course Participant",
    type: "learn",
    rating: 5
  },
  {
    id: 't7',
    text: "Lyne is a nurturing teacher. Allowing you to explore without expectation. It's refreshing to attend an art class without feeling like there is any expectation you need to live up to. A night to let go and embrace your inner artist!",
    author: "Bel Y.",
    role: "Workshop Attendee",
    type: "learn",
    rating: 5
  },
  {
    id: 't8',
    text: "It was as if I was seen for the first time in my life - from the minute Lyne spoke about common blocks like Imposter Syndrome & limiting beliefs to the practical steps she was able to make accessible to me through her decades of experience coaching and teaching, leading and learning I just felt as if I could breathe again. Funny thing is I didn't know I wasn't. To say I'm grateful is inadequate.",
    author: "Andréa Z.",
    role: "Coaching Client",
    type: "coaching",
    rating: 5
  },
  {
    id: 't9',
    text: "Lyne is a wealth of knowledge when it comes to all things brain to website building. I feel blessed to have found her.",
    author: "Jenny M.",
    role: "Business Client",
    type: "coaching",
    rating: 5
  },
  {
    id: 't10',
    text: "I can't say enough about how exploring the psychology behind my branding and messaging has helped me. Lyne takes what would take me years of study to comprehend and distils into a fifteen minute chat with easy to follow actionable steps for me to take away every time.",
    author: "Vicki D.",
    role: "Business Client",
    type: "coaching",
    rating: 5
  },
  {
    id: 't11',
    text: "Lyne's unique way of guiding us all to unique ideas was profound. We all felt it - we all used it - we all needed it. Thanks Lyne.",
    author: "Tracey D.",
    role: "Workshop Attendee",
    type: "learn",
    rating: 5
  },
  {
    id: 't12',
    text: "What can I say? She's worth the time and money.",
    author: "Mel G.",
    role: "Coaching Client",
    type: "coaching",
    rating: 5
  },
  {
    id: 't13',
    text: "I thought I knew how to use Instagram - I have over 11,000 followers (but little conversion). Honestly, I was doing Lyne a favour taking the class - within the first 30 minutes I realised I knew almost nothing and she wasn't charging enough. Book your ticket before she realises she needs to up her prices is my advice!",
    author: "Liza M.",
    role: "Art of Instagram Attendee",
    type: "learn",
    rating: 5
  },
  {
    id: 't14',
    text: "I knew I would learn things from Lyne. I didn't know it would change who I am, how I see the world and how I approach all things business, love and life.",
    author: "Sue V.",
    role: "Coaching Client",
    type: "coaching",
    rating: 5
  }
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'b1',
    title: 'Stop Hiding the Good Stuff: Why Visibility Is the Missing Piece',
    excerpt: 'You’re not showing off. You’re showing up. Visibility is part of your practice. It’s not the enemy of authenticity. It’s how authenticity becomes findable.',
    content: `Written By Lyne Tilt

There’s a strange paradox I see in so many creatives and business owners -especially the thoughtful ones, the values-led ones, the ones who are really good at what they do.

They’re sitting on incredible work. Original ideas. Beautiful products. Game-changing offers. But hardly anyone knows about them.

Why?

Because somewhere along the line, they learned that being “seen” is risky. Maybe they were told not to take up too much space. Maybe they got burned when they shared something vulnerable. Or maybe they’re waiting until it’s perfect -until they feel perfect -before stepping forward.

And so they hold back.
Not because they’re unsure about the work.
But because they’re unsure about being visible with it.

Visibility Isn’t Vanity -It’s Strategy

Visibility gets a bad rap. It’s often confused with ego, oversharing, or the hustle for attention. But real visibility -the kind that builds connection, community, and impact -is none of those things.

It’s not a performance. It’s a service.

If you’re creating something meaningful and no one knows about it, the problem isn’t your talent. It’s your strategy. People can’t connect with work they can’t see. They can’t buy from someone they don’t know exists. They can’t join your course or wear your piece or hire you if they don’t know what you offer.

That doesn’t mean you need to be loud. It means you need to be clear, consistent, and confident about putting your work where people can find it.

The Shame Loop (and How to Interrupt It)

Researcher Brené Brown reminds us that shame thrives in silence. When we keep our best work hidden, it’s often shame that’s running the show. The inner dialogue sounds like:

“I don’t want to seem salesy.”
“I’m not ready yet.”
“Other people are doing it better.”
“What if they don’t like it?”

This is completely normal -and completely interruptible.

Start small. Name the discomfort. Show up anyway. Show your process, not just your product. Share why your work matters to you, and trust that it will matter to others.

Your Brain Wants to Protect You

According to neuroscientist Dr Tara Swart, our brains are wired to resist risk. Visibility -especially if you’ve experienced judgment or criticism in the past -registers as a threat. Your nervous system will do everything it can to keep you in the safe zone: quiet, hidden, and out of range.

But staying there also keeps you stuck.

Your job isn’t to silence the discomfort. It’s to build capacity for it. To learn how to feel the visibility fear and keep showing up. To create a system that makes sharing part of your practice, not a heroic one-off effort.

What Hiding Costs You

Every time you downplay your work, wait too long to post, or avoid pitching your offer because it’s “not ready,” you create more distance between what you create and the people who need it.

And here’s the truth: your people want to see the good stuff.
They want to connect with your perspective, your process, your voice.
They want to believe in something -and you’re not giving them the chance if you stay invisible.

It’s Time to Stop Hiding

You’re not showing off. You’re showing up.

Whether you’re a maker, an artist, a coach, a teacher, or a builder -visibility is part of your practice. It’s not the enemy of authenticity. It’s how authenticity becomes findable.

🔗 Ready to show up more fully?

Join my newsletter for honest mindset tools, visibility prompts, and behind-the-scenes insight into creative life and business.
And if you’re ready to step out of hiding, explore the jewellery in the shop -a collection designed to help you show up boldly, intentionally, and completely as yourself.

Because clarity is power. And your good stuff deserves to be seen.`,
    date: '7/3/25',
    category: 'Mindset',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a85780a1-576e-4295-b0a2-bab6b1af7a2b/IMG_7310.jpg?format=500w'
  },
  {
    id: 'b2',
    title: 'Permission to Want More: Reframing Ambition in Creative Lives',
    excerpt: 'Ambition doesn’t have to be extractive or performative. It can be elegant, clear, and deeply rooted in service. It can be about scaling impact, not just income.',
    content: `Written By Lyne Tilt

There’s a quiet tension many creatives and values-led people carry -especially those who’ve built their lives around generosity, care, and meaning.

You’ve done the work. You’ve shown up for others. You’ve made art, taught, given, listened. You’ve built a business or a practice rooted in purpose. But deep down, there’s a new thought forming.

What if I want more?

More income. More visibility. More ease. More creative freedom.
And just as that thought rises, something else kicks in -guilt, self-doubt, even shame.

Who am I to want more?
Does that make me ungrateful?
Is this too much?

Let’s reframe that.

Wanting More Doesn’t Make You Greedy -It Makes You Honest

For so long, particularly in artistic and caregiving spaces, ambition has been side-eyed. We’re taught to value modesty, restraint, and "just enough." Especially for those of us raised in environments where survival was prioritised over expression, the idea of wanting more can feel like a betrayal.

But the truth is: wanting more is a sign of growth. Not dissatisfaction, but expansion.

More doesn’t mean you’re rejecting where you’ve been. It means you’re honouring where you’re going.

Ambition Can Be Conscious and Creative

We need to reclaim the word ambition. Not as hard-edged hustle, but as purposeful direction.

Dr. Tara Swart, neuroscientist and author of The Source, explains that our brains are driven by goals -when those goals are aligned with our values and identity, we enter a flow state that enhances motivation, clarity, and fulfilment.

But when we suppress those goals to “stay small” or “not be too much,” we break that connection. We start to stagnate. We dull our own signal.

Ambition doesn’t have to be extractive or performative. It can be elegant, clear, and deeply rooted in service. It can be about scaling impact, not just income. It can be about expression, not just exposure.

Brene Brown and the Shame of Wanting

Brené Brown reminds us that shame shows up any time we fear disconnection. Wanting more can feel dangerous -like we’re asking too much, pushing too hard, risking rejection.

But here’s the truth she offers: you are worthy now. Not when you reach a goal. Not when you’ve earned it through burnout or perfection. Now.

From that place of worthiness, it becomes safe to want.
To want joy. To want money. To want rest. To want more reach for your work.

Not because it proves anything -but because you’re finally ready to stop hiding.

How to Honour the Want

If this resonates, you don’t need to overhaul your life today. But you can begin to ask bigger questions:

What would “more” look like -on my terms?

What am I afraid ambition will cost me?

What would I gain if I let it lead me?

Write those down. Sit with them. Let them stir something.

You don’t need to wait for permission.
You get to lead your creative life with as much depth, scale, and fire as you choose.

💌 Want more clarity and courage in your inbox?

Sign up for my newsletter where I share honest mindset tools, creative strategy, and real conversations about building a life and business that reflects your whole self.

And if you're ready to express more, earn more, and expand -on your own terms -browse the jewellery collection and claim a piece that speaks to who you're becoming.

Because art is oxygen. And ambition is not a flaw -it’s fuel.`,
    date: '6/2/25',
    category: 'Growth',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/1ce7a083-5268-4790-87ab-5f3f31fd743e/IMG_7336.jpg?format=500w'
  },
  {
    id: 'b3',
    title: 'Why Beautiful Things Matter (Even When Life Feels Messy)',
    excerpt: 'When you surround yourself with things that speak to your identity, you create a feedback loop. You remind your nervous system who you are and what you’re building.',
    content: `Written By Lyne Tilt

And how they can help you reconnect to who you are becoming

Let’s be honest: beauty sometimes gets dismissed.

It’s written off as indulgent, impractical, or optional -especially when life feels chaotic or uncertain. When you're stretched running a household, building a business, caregiving, or simply surviving another week, it can feel selfish to focus on aesthetics.

But here’s what I’ve learned after decades as an artist, educator, and someone who’s navigated both personal loss and professional growth:

Beautiful things aren’t frivolous. They’re functional. They’re fortifying. They’re how we remember ourselves.

Beauty as an Anchor

In my own life, beauty has never been about perfection or excess. It’s been about anchoring. A handmade ring I never take off. A corner of my studio arranged just right. A painting I made in the middle of grief that still catches my breath.

These moments of visual and tactile beauty are small declarations. They say:
I’m still here. I still care. I still get to choose what surrounds me.

And that’s not superficial -it’s spiritual. Sensory. Grounded. Vital.

Your Space Shapes Your Energy

Neuroscience backs this up. Dr Tara Swart explains that our physical environment has a measurable impact on cognitive function, emotional state, and clarity of thought. What you see, wear, and touch every day can either drain your energy -or return it.

That’s why curating your space (and your self-expression) isn’t vanity. It’s strategy.

When you surround yourself with things that speak to your identity, your aspirations, and your strength, you create a feedback loop. You remind your nervous system who you are and what you’re building -even on the days when your mindset lags behind.

Why I Create the Way I Do

The jewellery and artwork I create are designed with this purpose in mind. They’re made to be worn with meaning, not just matched to outfits. They’re small but powerful signals -of creativity, courage, elegance, softness, structure, boldness… whatever part of you wants to be seen today.

Some clients wear their pieces like talismans. Others use them to mark a transition. Some just say, “I don’t know what it is about this one -I just felt it.”
That’s the oxygen moment. When something beautiful breathes life back into you.

Your Invitation

If life feels messy, don’t wait for it to be tidy to surround yourself with things that make you feel strong, expressed, or grounded. That’s not indulgent -it’s intelligent.

Buy the art. Wear the piece. Make the corner of your world just a little more beautiful.

It doesn’t need to fix everything. It just needs to remind you of who you are becoming.

💌 Want more of this in your inbox?

Sign up for my newsletter for grounded insights, honest mindset tools, and a behind-the-scenes look at life and business as a creative professional.
And if something in you is asking to be honoured, visit the shop and choose a piece of jewellery that captures your energy, your edge, or your quiet power. Let it be your anchor.

Because beauty isn’t a distraction from the work. Sometimes, it is the work.`,
    date: '10/1/25',
    category: 'Aesthetics',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/d295b70f-19d2-4d13-ba17-3b32081ee889/IMG_7348.jpg?format=500w'
  },
  {
    id: 'b4',
    title: 'When the Past Shows Up at the Easel (or the Launch Pad)',
    excerpt: 'Whether you\'re picking up a paintbrush or preparing to launch, you\'re not just managing the task in front of you -you’re managing every story you\'ve ever been told.',
    content: `Written By Lyne Tilt

Why the mindset work matters when you’re building something new

There’s a moment many artists and business builders know well. You sit down to begin -whether it’s a canvas, a collection, a class, or a new offer -and suddenly you’re flooded. Not with inspiration, but with uncertainty.

Who do I think I am?
Am I good enough?
What if they don’t like it? What if they’re right?

You’re not alone. That voice? It’s normal. But it’s not the truth.

Whether you're picking up a paintbrush after years of silence or preparing to launch a new product or service, you're not just managing the task in front of you -you’re managing every story you've ever been told (or told yourself) about who you’re allowed to be.

This is where mindset work becomes more than just a nice-to-have. It becomes the foundation.

The Oxygen of Art  - And the Resistance to Breathing Deeply

When I say art is oxygen, I don’t just mean the act of making. I mean the space it creates. The clarity it offers. The strength that emerges when we finally stop performing and start expressing.

But for many of us, the moment we move toward that kind of clarity -through art, through business, through visibility -our nervous system registers risk. And with good reason. Many of us were raised in systems or environments where being visible, confident, or self-expressed wasn’t encouraged. It was labelled as “too much.”

So when we dare to take ourselves seriously now, the body sometimes fights back with doubt. It’s not sabotage -it’s survival logic. And that’s where self-awareness becomes strategy.

What Brene Brown and Neuroscience Can Teach Us

Research professor Brené Brown writes extensively on shame and vulnerability. She reminds us that “vulnerability is the birthplace of innovation, creativity and change.” But she also teaches that shame -the voice of “not good enough” -grows in silence.

Naming it out loud, sharing the feeling, and making a conscious decision to act anyway is the first step toward freedom.

Dr Tara Swart, neuroscientist and executive advisor, explains this in neurological terms: the brain’s resistance to change is biological. It prefers the predictable, even if the predictable is painful. The unfamiliar -like stepping into a new identity, or charging more, or showing your work -feels threatening until it becomes integrated.

This is why mindset work isn’t fluff. It’s neurobiological. It’s the difference between a system that shuts down in fear and one that can tolerate -and even seek -growth.

Clarity Is the Turning Point

The best thing I ever did for my own creative and professional growth was stop trying to earn my place, and start creating from clarity. That meant:

Getting specific about what I wanted

Building systems to support it

And rewriting the narrative that said I had to stay small to stay safe

When I work with clients -whether they’re artists, educators, or entrepreneurs -we’re often doing exactly this. Peeling back the performance. Dropping the shame. Making a new plan.

Because when you know who you are, what you offer, and how you want to lead, you stop second-guessing and start building with integrity.

Final Thoughts

Yes, the mindset stuff comes up. Yes, it’s messy. But the voice that asks “Am I good enough?” isn’t there to stop you -it’s asking you to listen more closely. It’s asking you to choose clarity over fear.

And clarity? That’s what gives your work power.

Whether you’re creating something beautiful or building something bold -
Art is oxygen. Clarity is power. And you are absolutely allowed to breathe.`,
    date: '7/12/24',
    category: 'Process',
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/3a6482ae-ab1a-43b7-ba20-039fe81a7f6d/IMG_7367.jpg?format=500w'
  }
];

export const FAQS: FAQItem[] = [
  {
    question: "How long does shipping take?",
    answer: "Ready-to-ship items are dispatched within 1-3 business days. Custom pieces take 2-3 weeks.",
    category: "Shop"
  },
  {
    question: "Do you offer international shipping?",
    answer: "Yes, we ship worldwide from our studio in Brisbane, Australia.",
    category: "Shop"
  },
  {
    question: "Can I refund a coaching session?",
    answer: "Sessions can be rescheduled up to 24 hours in advance. Refunds are not available once the session is booked, but credits can be applied.",
    category: "Coaching"
  },
  {
    question: "How long do I have access to online courses?",
    answer: "You have lifetime access to all course materials. Once enrolled, you can revisit lessons, download workbooks, and access the community whenever you like.",
    category: "Learn"
  },
  {
    question: "Are workshops live or recorded?",
    answer: "Workshops are live via Zoom, creating an interactive experience where you can ask questions in real-time. Recordings are available for 30 days after the session for those who can't attend live.",
    category: "Learn"
  },
  {
    question: "What skill level do I need for the courses?",
    answer: "Most offerings are designed for all levels. Each course clearly states the recommended skill level. If you're unsure, reach out -I'm happy to help you find the right fit.",
    category: "Learn"
  },
  {
    question: "Can I get a refund if a course isn't right for me?",
    answer: "Yes. If you're unsatisfied within the first 14 days of purchase (and haven't completed more than 30% of the course), I offer a full refund. For workshops, refunds are available up to 48 hours before the session.",
    category: "Learn"
  },
  {
    question: "Do I need any special materials or software?",
    answer: "Online courses only require a device with internet access. Workshops include a materials list sent upon registration -most items are easily sourced locally or online.",
    category: "Learn"
  }
];

export const WALL_ART_PRODUCTS: WallArtProduct[] = [];
