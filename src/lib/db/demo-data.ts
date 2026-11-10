import type { PlaceType } from "@/types/domain";

/**
 * SYNTHETIC SAMPLE CONTENT — NOT THE OWNER'S TRAVEL HISTORY.
 *
 * Everything here is stored with `is_demo = true`, rendered with a "DEMO" stamp, excluded from
 * stats when demo content is switched off, and removable in one click from the dashboard
 * (or with `npm run db:purge-demo`). Landmarks are real places with real coordinates so the
 * map is genuinely exercised; the visits, dates, ratings and stories are invented.
 */

export const DEMO_NOTICE =
  "> **Demo entry.** This place is real, but the visit is made up — sample content so you can see how a journal page feels. Replace it with your own story from the dashboard.";

export interface DemoTrip {
  key: string;
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface DemoPlace {
  slug: string;
  title: string;
  type: PlaceType;
  lat: number;
  lng: number;
  city: string;
  region?: string;
  countryCode: string;
  countryName: string;
  placeName: string;
  formattedAddress: string;
  visitedAt: string;
  excerpt: string;
  funnyMoment: string;
  story: string;
  rating: number | null;
  tripKey?: string;
  tags: string[];
  /** Draft demo entries prove that unpublished content stays private. */
  status?: "draft" | "published";
  approximate?: boolean;
}

export interface DemoBucketItem {
  placeName: string;
  lat: number;
  lng: number;
  countryCode: string;
  countryName: string;
  note: string;
  status: "planned" | "completed";
  /** Slug of the demo place this completed item links to (the only way it counts as a visit). */
  linkedPlaceSlug?: string;
}

export const demoTrips: DemoTrip[] = [
  {
    key: "wrong-turns",
    slug: "wrong-turns-tour-demo",
    title: "The Wrong Turns Tour (demo)",
    startDate: "2023-03-02",
    endDate: "2023-03-24",
    description:
      "Three cities, zero working itineraries. A sample trip so the timeline has something to group.",
  },
  {
    key: "north-and-south",
    slug: "north-and-south-demo",
    title: "North & South (demo)",
    startDate: "2024-02-08",
    endDate: "2024-11-12",
    description: "Cold coffee in the north, warm wind in the south. Sample trip, invented dates.",
  },
];

export const demoPlaces: DemoPlace[] = [
  {
    slug: "demo-belem-tower-lisbon",
    title: "Belém Tower",
    type: "attraction",
    lat: 38.6916,
    lng: -9.216,
    city: "Lisbon",
    countryCode: "PT",
    countryName: "Portugal",
    placeName: "Torre de Belém",
    formattedAddress: "Av. Brasília, 1400-038 Lisboa, Portugal",
    visitedAt: "2023-03-03",
    excerpt:
      "A tower that looks like a very elaborate chess piece, and a queue that looked like a protest.",
    funnyMoment:
      "I confidently walked the wrong way along the river for forty minutes. The river did not mind.",
    story:
      "I arrived with a plan, a map, and unreasonable optimism.\n\nThe tower was lovely. The pastries nearby were lovelier. I would like to formally apologise to my itinerary.\n\n**Lesson learned:** the best way to see Lisbon is to be slightly lost on purpose.",
    rating: 4,
    tripKey: "wrong-turns",
    tags: ["views", "wrong-turns"],
  },
  {
    slug: "demo-the-demo-cafe-lisbon",
    title: "The Demo Café",
    type: "cafe",
    lat: 38.711,
    lng: -9.13,
    city: "Lisbon",
    countryCode: "PT",
    countryName: "Portugal",
    placeName: "The Demo Café (not a real business)",
    formattedAddress: "Alfama, Lisboa, Portugal",
    visitedAt: "2023-03-04",
    excerpt: "One espresso, one custard tart, and a three-hour conversation with a stranger's dog.",
    funnyMoment: "Ordered 'a small coffee'. Received a very small coffee. Respect.",
    story:
      "This café is a placeholder — imagine a tiny table, a wobbly chair, and the best coffee of the trip.\n\nIn the real version of this page you would get the name, the address and the exact pin, found with the geocoder and nudged into place by hand.",
    rating: 5,
    tripKey: "wrong-turns",
    tags: ["coffee", "food"],
  },
  {
    slug: "demo-secret-rooftop-lisbon",
    title: "A Rooftop I'm Not Telling You About",
    type: "other",
    lat: 38.7139,
    lng: -9.1334,
    city: "Lisbon",
    countryCode: "PT",
    countryName: "Portugal",
    placeName: "Undisclosed rooftop",
    formattedAddress: "Baixa, Lisboa, Portugal",
    visitedAt: "2023-03-05",
    excerpt: "Sunset, a very good view, and a location that is deliberately blurry.",
    funnyMoment: "Whispered the address to a friend. The pigeons overheard.",
    story:
      "This demo entry uses **approximate location**: the public pin is rounded to roughly 11 km and the street address is hidden — handy for private spots or trips still in progress.",
    rating: 5,
    tripKey: "wrong-turns",
    tags: ["views"],
    approximate: true,
  },
  {
    slug: "demo-hagia-sophia-istanbul",
    title: "Hagia Sophia",
    type: "attraction",
    lat: 41.0086,
    lng: 28.98,
    city: "Istanbul",
    region: "Istanbul",
    countryCode: "TR",
    countryName: "Türkiye",
    placeName: "Hagia Sophia Grand Mosque",
    formattedAddress: "Sultan Ahmet, Ayasofya Meydanı, 34122 Fatih/İstanbul, Türkiye",
    visitedAt: "2023-03-10",
    excerpt: "Came for the dome. Stayed because the cats clearly run the city.",
    funnyMoment: "Lost a staring contest with a cat over a sunny step. The cat is undefeated.",
    story:
      "A dome that makes you forget how to talk for a minute, followed by a cat that reminds you how.\n\nI planned a perfectly organised day. Then I found a tea garden, met three cats, and the itinerary quietly left the chat.",
    rating: 5,
    tripKey: "wrong-turns",
    tags: ["cats", "views"],
  },
  {
    slug: "demo-shibuya-crossing-tokyo",
    title: "Shibuya Crossing",
    type: "attraction",
    lat: 35.6595,
    lng: 139.7005,
    city: "Tokyo",
    countryCode: "JP",
    countryName: "Japan",
    placeName: "Shibuya Scramble Crossing",
    formattedAddress: "Shibuya City, Tokyo, Japan",
    visitedAt: "2023-03-21",
    excerpt:
      "The world's most organised chaos, and me standing in the middle of it holding a map upside down.",
    funnyMoment: "Crossed four times. Only one of them was on purpose.",
    story:
      "Thousands of people crossing at once, and nobody bumps into anybody. Meanwhile I bumped into a lamppost.\n\nWould recommend the view from above, a snack from below, and absolutely no sudden direction changes.",
    rating: 4,
    tripKey: "wrong-turns",
    tags: ["city", "wrong-turns"],
  },
  {
    slug: "demo-pretend-noodle-bar-tokyo",
    title: "Pretend Noodle Bar",
    type: "restaurant",
    lat: 35.6938,
    lng: 139.7034,
    city: "Tokyo",
    countryCode: "JP",
    countryName: "Japan",
    placeName: "Pretend Noodle Bar (not a real business)",
    formattedAddress: "Shinjuku City, Tokyo, Japan",
    visitedAt: "2023-03-22",
    excerpt: "Just one more bowl of ramen. Famous last words.",
    funnyMoment: "Bowl number three arrived. I regret nothing and also everything.",
    story:
      "A placeholder for the kind of tiny counter where you press a button on a vending machine and hope for the best.\n\nSteam, slurping, and the quiet pride of finishing the broth.",
    rating: 5,
    tripKey: "wrong-turns",
    tags: ["food"],
  },
  {
    slug: "demo-capsule-hotel-tokyo",
    title: "A Capsule Hotel With Ambition",
    type: "hotel",
    lat: 35.6984,
    lng: 139.7731,
    city: "Tokyo",
    countryCode: "JP",
    countryName: "Japan",
    placeName: "Capsule hotel (not a real business)",
    formattedAddress: "Chiyoda City, Tokyo, Japan",
    visitedAt: "2023-03-23",
    excerpt: "A bed the size of a very optimistic bookshelf.",
    funnyMoment: "Tried to sit up. Discovered the ceiling had opinions.",
    story:
      "Slept like a log in a tiny pod. Woke up like a log hitting a ceiling.\n\n10/10 would hit my head again — it's part of the charm.",
    rating: 3,
    tripKey: "wrong-turns",
    tags: ["wrong-turns"],
  },
  {
    slug: "demo-hallgrimskirkja-reykjavik",
    title: "Hallgrímskirkja",
    type: "attraction",
    lat: 64.1417,
    lng: -21.9266,
    city: "Reykjavík",
    countryCode: "IS",
    countryName: "Iceland",
    placeName: "Hallgrímskirkja",
    formattedAddress: "Hallgrímstorg 1, 101 Reykjavík, Iceland",
    visitedAt: "2024-02-10",
    excerpt: "A church shaped like basalt columns, and wind shaped like a personal grudge.",
    funnyMoment: "My hat left Iceland without me.",
    story:
      "It is very cold. It is also very beautiful. These two facts coexist whether or not you are wearing enough socks.\n\nBest hot chocolate of my life was within a five-minute shuffle.",
    rating: 4,
    tripKey: "north-and-south",
    tags: ["views", "coffee"],
  },
  {
    slug: "demo-iceland",
    title: "Iceland",
    type: "country",
    lat: 64.9631,
    lng: -19.0208,
    city: "",
    countryCode: "IS",
    countryName: "Iceland",
    placeName: "Iceland",
    formattedAddress: "Iceland",
    visitedAt: "2024-02-12",
    excerpt: "A whole country that feels like a different planet with better coffee.",
    funnyMoment: "Asked a local for directions. Received a story, a snack and then directions.",
    story:
      "Country pins are for the big picture: a whole nation, one pin. Zoom in for the specific adventures, zoom out for the bragging rights.",
    rating: 5,
    tripKey: "north-and-south",
    tags: ["nature"],
  },
  {
    slug: "demo-table-mountain-cape-town",
    title: "Table Mountain",
    type: "attraction",
    lat: -33.9628,
    lng: 18.4098,
    city: "Cape Town",
    region: "Western Cape",
    countryCode: "ZA",
    countryName: "South Africa",
    placeName: "Table Mountain",
    formattedAddress: "Table Mountain, Cape Town, South Africa",
    visitedAt: "2024-11-06",
    excerpt: "The mountain that is also a tablecloth, depending on the clouds.",
    funnyMoment: "Planned a sunrise hike. Slept through sunrise. Hiked at brunch.",
    story:
      "A flat-topped mountain with a cloud that spills over the edge like a tablecloth.\n\nThe view is worth the climb; the climb is worth a very large sandwich.",
    rating: 5,
    tripKey: "north-and-south",
    tags: ["nature", "views"],
  },
  {
    slug: "demo-cusco-peru",
    title: "Cusco",
    type: "city",
    lat: -13.532,
    lng: -71.9675,
    city: "Cusco",
    region: "Cusco",
    countryCode: "PE",
    countryName: "Peru",
    placeName: "Cusco",
    formattedAddress: "Cusco, Peru",
    visitedAt: "2022-08-18",
    excerpt: "High altitude, higher hopes, and a lot of coca tea.",
    funnyMoment:
      "Climbed one staircase. Needed a nap. Climbed a second staircase. Needed a longer nap.",
    story:
      "At 3,400 metres every staircase is a negotiation.\n\nThe streets are old, the llamas are unbothered, and the tea is strongly recommended.",
    rating: 4,
    tags: ["views", "nature"],
  },
  {
    slug: "demo-faisal-mosque-islamabad",
    title: "Faisal Mosque",
    type: "attraction",
    lat: 33.7295,
    lng: 73.0372,
    city: "Islamabad",
    countryCode: "PK",
    countryName: "Pakistan",
    placeName: "Faisal Mosque",
    formattedAddress: "Shah Faisal Ave, Islamabad, Pakistan",
    visitedAt: "2025-01-18",
    excerpt: "Hills behind, a huge white mosque in front, and chai in my hand.",
    funnyMoment: "The coffee was a plan. The three-hour conversation was not.",
    story:
      "Sample story: a landmark with the Margalla Hills as a backdrop. Add your own favourite café, the exact pin, and the full tale — this one is just here to show how a journal page reads.",
    rating: 5,
    tags: ["views", "coffee"],
  },
  {
    slug: "demo-draft-patagonia",
    title: "Somewhere Windy in Patagonia",
    type: "other",
    lat: -50.9423,
    lng: -73.4068,
    city: "Torres del Paine",
    countryCode: "CL",
    countryName: "Chile",
    placeName: "Torres del Paine (draft)",
    formattedAddress: "Torres del Paine, Chile",
    visitedAt: "2025-02-02",
    excerpt: "Unfinished draft — visible only in the dashboard.",
    funnyMoment: "",
    story: "Drafts are private. This demo draft proves it: it never appears on the public site.",
    rating: null,
    tags: [],
    status: "draft",
  },
];

export const demoBucketItems: DemoBucketItem[] = [
  {
    placeName: "Torres del Paine",
    lat: -51.0,
    lng: -73.0,
    countryCode: "CL",
    countryName: "Chile",
    note: "Hike until my knees file a complaint.",
    status: "planned",
  },
  {
    placeName: "Tromsø",
    lat: 69.6492,
    lng: 18.9553,
    countryCode: "NO",
    countryName: "Norway",
    note: "Chase the northern lights. Pack more snacks than seems reasonable.",
    status: "planned",
  },
  {
    placeName: "Petra",
    lat: 30.3285,
    lng: 35.4444,
    countryCode: "JO",
    countryName: "Jordan",
    note: "Walk through the Siq at sunrise like it's no big deal.",
    status: "planned",
  },
  {
    placeName: "Kyoto",
    lat: 35.0116,
    lng: 135.7681,
    countryCode: "JP",
    countryName: "Japan",
    note: "Cherry blossom season — this time with an actual plan (unlikely).",
    status: "planned",
  },
  {
    placeName: "Table Mountain",
    lat: -33.9628,
    lng: 18.4098,
    countryCode: "ZA",
    countryName: "South Africa",
    note: "Done! The sunrise hike became a brunch hike.",
    status: "completed",
    linkedPlaceSlug: "demo-table-mountain-cape-town",
  },
  {
    placeName: "Santorini sunrise",
    lat: 36.3932,
    lng: 25.4615,
    countryCode: "GR",
    countryName: "Greece",
    note: "Marked complete — but there's no journal entry, so it doesn't count as a visit on the passport.",
    status: "completed",
  },
];
