/**
 * DEVELOPMENT SEED DATA
 *
 * Every row created from this file is flagged `is_demo = true` and is visibly labelled
 * "Development example" on the public site and in the admin. These are placeholders that show
 * how Vyhel's content model works — they are NOT verified recommendations.
 *
 * - No prices, Amazon ratings, review counts or availability are stored.
 * - Amazon links point to plain amazon.in search pages with no Associate tag, and are marked
 *   `unverified`. Replace them with real Special Links from Amazon Associates before publishing
 *   real recommendations, or remove all demo content from Admin → Settings.
 * - Scores are illustrative editorial placeholders.
 */

export const demoCategories = [
  {
    name: "Tech",
    slug: "tech",
    description: "Useful hardware and accessories for work, study and everyday use.",
    featured: true,
    sortOrder: 1,
  },
  {
    name: "College",
    slug: "college",
    description: "Practical things that make hostel rooms, study desks and long semesters easier.",
    featured: true,
    sortOrder: 2,
  },
  {
    name: "Car & Bike",
    slug: "car-and-bike",
    description: "Care, cleaning and small upgrades for the vehicles you rely on every day.",
    featured: true,
    sortOrder: 3,
  },
  {
    name: "Home",
    slug: "home",
    description: "Considered objects for rooms that work a little better.",
    featured: true,
    sortOrder: 4,
  },
  {
    name: "Grooming",
    slug: "grooming",
    description: "Simple, dependable personal-care tools without the marketing noise.",
    featured: true,
    sortOrder: 5,
  },
];

type DemoProduct = {
  name: string;
  slug: string;
  brand: string | null;
  category: string;
  subcategory: string;
  shortDescription: string;
  editorialStatement: string;
  description: string;
  whyPicked: string;
  bestFor: string[];
  notFor: string[];
  thingsToKnow: string;
  pros: string[];
  cons: string[];
  whoShouldBuy: string;
  whoShouldSkip: string;
  faq: { question: string; answer: string }[];
  scores: { usefulness: number; ease: number; versatility: number; value: number; design: number };
  badge: "editors_pick" | "best_for_students" | "best_for_cars" | "worth_considering" | null;
  featured: boolean;
  editorsPick: boolean;
  searchQuery: string;
};

export const demoProducts: DemoProduct[] = [
  {
    name: "Adjustable Aluminium Laptop Stand",
    slug: "adjustable-laptop-stand",
    brand: null,
    category: "tech",
    subcategory: "Desk accessories",
    shortDescription: "Raises your laptop screen closer to eye level and folds flat for a backpack.",
    editorialStatement:
      "A simple laptop stand that improves desk ergonomics without taking over the desk.",
    description:
      "A laptop stand lifts the screen so you look ahead rather than down. Paired with an external keyboard and mouse, it turns a laptop into a far more comfortable desk setup. Folding aluminium designs are the most practical type for students and people who move between rooms.",
    whyPicked:
      "Most people who work on a laptop for hours end up hunched over it. A stand is one of the least expensive changes that meaningfully improves posture at a desk, and the folding aluminium style balances stability, airflow under the laptop and portability better than fixed or plastic designs.",
    bestFor: ["Students", "Desk setups", "Remote work"],
    notFor: ["Typing directly on the laptop keyboard", "Very small desks with no room for a keyboard"],
    thingsToKnow:
      "A stand raises the keyboard along with the screen, so typing on the laptop itself becomes less comfortable. Plan on an external keyboard and mouse. Check the maximum supported laptop size and weight, and look for rubber pads that keep the laptop from sliding.",
    pros: [
      "Brings the screen closer to eye level",
      "Folds flat enough to carry",
      "Open design lets air reach the laptop's underside",
      "No setup or power required",
    ],
    cons: [
      "Needs an external keyboard to be comfortable",
      "Cheaper hinges can loosen over time",
      "Adds one more thing to carry",
    ],
    whoShouldBuy:
      "Anyone who uses a laptop at a desk for more than an hour or two a day and already has, or is willing to buy, a separate keyboard and mouse.",
    whoShouldSkip:
      "If you mostly use your laptop on the sofa, in bed or on the move, a stand won't get much use. Skip it too if you don't want to add an external keyboard.",
    faq: [
      {
        question: "Do I need an external keyboard with a laptop stand?",
        answer:
          "For comfortable long sessions, yes. Raising the screen also raises the built-in keyboard to an awkward angle.",
      },
      {
        question: "Does a laptop stand help with heat?",
        answer:
          "An open stand lets more air reach the underside of the laptop than a flat desk does. It is not a substitute for a cooling pad if your laptop throttles under heavy load.",
      },
    ],
    scores: { usefulness: 9, ease: 9, versatility: 8, value: 9, design: 8 },
    badge: "editors_pick",
    featured: true,
    editorsPick: true,
    searchQuery: "adjustable aluminium laptop stand foldable",
  },
  {
    name: "7-in-1 USB-C Hub",
    slug: "usb-c-hub-7-in-1",
    brand: null,
    category: "tech",
    subcategory: "Adapters & hubs",
    shortDescription: "Adds HDMI, USB-A, card readers and pass-through charging to a single USB-C port.",
    editorialStatement: "The small adapter that makes a thin laptop work like a desk computer.",
    description:
      "Modern laptops often have only one or two USB-C ports. A 7-in-1 hub adds the ports most people still need — HDMI for a monitor, USB-A for older accessories, SD and microSD readers and USB-C power pass-through — so you can connect everything with one plug.",
    whyPicked:
      "It solves a very common, very specific problem. For people with a thin laptop, a hub is often the difference between a usable desk setup and a tangle of single-purpose dongles.",
    bestFor: ["Thin laptops", "Desk setups", "Students"],
    notFor: ["High-refresh external monitors", "Laptops without USB-C data/video support"],
    thingsToKnow:
      "Not every USB-C port supports video output — check that your laptop's port supports DisplayPort Alt Mode or Thunderbolt before relying on the HDMI port. Many compact hubs limit HDMI to 4K at 30Hz, which is fine for documents but feels less smooth for fast motion. Hubs can get warm during heavy use.",
    pros: ["One plug for monitor, storage and accessories", "Compact and travel-friendly", "Pass-through charging keeps a single port free"],
    cons: ["HDMI is often limited to 30Hz at 4K", "Runs warm under load", "Depends on your laptop's USB-C capabilities"],
    whoShouldBuy:
      "Owners of thin laptops who regularly connect a monitor, pen drives or camera cards and are tired of juggling adapters.",
    whoShouldSkip:
      "If your laptop already has HDMI and USB-A ports, or you need a high-refresh-rate external display, look at a dedicated dock or cable instead.",
    faq: [
      {
        question: "Will this hub charge my laptop?",
        answer:
          "Hubs with USB-C Power Delivery pass-through can, using your existing USB-C charger. The hub itself uses a little of that power, so the laptop receives slightly less than the charger's rating.",
      },
    ],
    scores: { usefulness: 9, ease: 9, versatility: 9, value: 8, design: 7 },
    badge: "worth_considering",
    featured: true,
    editorsPick: false,
    searchQuery: "7 in 1 usb c hub hdmi sd card",
  },
  {
    name: "Cordless Handheld Car Vacuum",
    slug: "cordless-car-vacuum",
    brand: null,
    category: "car-and-bike",
    subcategory: "Cleaning",
    shortDescription: "A compact rechargeable vacuum for quick clean-ups of seats, mats and footwells.",
    editorialStatement: "For keeping the car tidy between proper cleanings — not for replacing them.",
    description:
      "A small cordless vacuum lives in the boot or glovebox and handles the everyday mess: crumbs, sand, dust and hair on seats and mats. Rechargeable models avoid trailing a cable from the 12V socket.",
    whyPicked:
      "It's the kind of tool that gets used because it's always there. For people who don't have easy access to a car wash with vacuums, it keeps the cabin manageable with five minutes of effort.",
    bestFor: ["Cars", "New car owners", "Pet owners"],
    notFor: ["Deep cleaning carpets", "Wet spills"],
    thingsToKnow:
      "Handheld vacuums have far less suction than a full-size or car-wash vacuum, and battery life is usually short. They are excellent for light, frequent cleaning and disappointing for embedded dirt. Look for a washable filter and a crevice tool for gaps between seats.",
    pros: ["Always on hand for quick clean-ups", "No cable to manage", "Crevice tools reach between seats"],
    cons: ["Limited suction compared with full-size vacuums", "Short battery life", "Small dust bin needs frequent emptying"],
    whoShouldBuy: "Daily drivers, parents and pet owners who want to stop small messes from building up.",
    whoShouldSkip: "If you already get your car professionally cleaned regularly, this will mostly sit unused.",
    faq: [],
    scores: { usefulness: 8, ease: 9, versatility: 7, value: 8, design: 7 },
    badge: "best_for_cars",
    featured: true,
    editorsPick: false,
    searchQuery: "cordless handheld car vacuum cleaner",
  },
  {
    name: "WD-40 Multi-Use Product",
    slug: "wd-40-multi-use",
    brand: "WD-40",
    category: "car-and-bike",
    subcategory: "Maintenance",
    shortDescription: "A general-purpose spray for loosening stuck parts, displacing moisture and quietening squeaks.",
    editorialStatement: "The can that earns its place on the shelf by fixing small, annoying problems.",
    description:
      "WD-40 Multi-Use is a general-purpose aerosol for loosening rusted bolts, displacing moisture from metal parts, quieting squeaky hinges and removing sticky residue. It's a first-response tool for many household and vehicle niggles.",
    whyPicked:
      "Few products cover as many small maintenance jobs around a home, car or bike. It's a sensible thing to own before you need it.",
    bestFor: ["Home maintenance", "Cars", "Bikes"],
    notFor: ["Long-term chain lubrication", "Use near open flames"],
    thingsToKnow:
      "It is a multi-use product, not a dedicated long-term lubricant. For bicycle or motorcycle chains, a purpose-made chain lube lasts longer. It is a flammable aerosol: use it in a ventilated area, keep it away from heat and read the label before using it on plastics, rubber or electrical components.",
    pros: ["Covers many small maintenance jobs", "Loosens stuck and rusted parts", "Widely available"],
    cons: ["Not a long-lasting lubricant", "Strong smell", "Flammable aerosol — store carefully"],
    whoShouldBuy: "Anyone who owns a vehicle, a toolbox or a door that squeaks.",
    whoShouldSkip: "If you need lubrication for a specific part, such as a chain, buy the specialist product for that job.",
    faq: [
      {
        question: "Can I use WD-40 Multi-Use on my bike chain?",
        answer:
          "It can clean and displace moisture, but it's not designed as a long-lasting chain lubricant. Follow it with a dedicated chain lube.",
      },
    ],
    scores: { usefulness: 9, ease: 10, versatility: 10, value: 9, design: 6 },
    badge: null,
    featured: false,
    editorsPick: false,
    searchQuery: "wd-40 multi use product",
  },
  {
    name: "LED Desk Lamp with Adjustable Colour Temperature",
    slug: "led-desk-lamp",
    brand: null,
    category: "home",
    subcategory: "Lighting",
    shortDescription: "A focused, adjustable light for reading and late-night study without lighting the whole room.",
    editorialStatement: "Better light where you actually work, without disturbing whoever else is in the room.",
    description:
      "A good desk lamp puts even, glare-free light on your work surface. Models with adjustable brightness and colour temperature let you switch between bright, cool light for focused work and warmer light in the evening.",
    whyPicked:
      "Overhead room lighting is rarely right for reading or writing at a desk, and in a shared hostel room it isn't always available. An adjustable lamp is a small change that makes a desk usable at any hour.",
    bestFor: ["Students", "Shared rooms", "Reading"],
    notFor: ["Lighting an entire room"],
    thingsToKnow:
      "Look for an adjustable arm or head so you can angle light away from screens to avoid reflections. USB-powered lamps are convenient but may be dimmer than mains-powered ones. Touch controls are tidy but can be triggered accidentally.",
    pros: ["Focused light that doesn't disturb roommates", "Adjustable brightness and warmth", "Small footprint"],
    cons: ["USB-powered models can be dim", "Touch controls can be fiddly", "Not a substitute for room lighting"],
    whoShouldBuy: "Students and anyone who reads, writes or works at a desk after dark.",
    whoShouldSkip: "If your desk already has good overhead or task lighting, you won't gain much.",
    faq: [],
    scores: { usefulness: 8, ease: 9, versatility: 7, value: 8, design: 8 },
    badge: "best_for_students",
    featured: true,
    editorsPick: false,
    searchQuery: "led desk lamp adjustable colour temperature",
  },
];

export const demoCollections = [
  {
    name: "The Student Setup",
    slug: "student-setup",
    tagline: "Useful products for building a better college desk.",
    description: "Products that make a college desk more useful.",
    intro:
      "Most student desks are small, shared and used at odd hours. This collection focuses on things that make that space work harder: a better screen height, fewer cables, and light that doesn't keep a roommate awake. Nothing here is essential — but each item solves a specific, common problem.",
    featured: true,
    sortOrder: 1,
    status: "published" as const,
    products: ["adjustable-laptop-stand", "usb-c-hub-7-in-1", "led-desk-lamp"],
  },
  {
    name: "First Car Essentials",
    slug: "first-car-essentials",
    tagline: "Useful products for new car owners.",
    description: "Practical things worth keeping in a new car.",
    intro:
      "A new car comes with a manual, not a kit. These are small, practical items that help keep a car clean and handle minor maintenance before it turns into a trip to the workshop.",
    featured: true,
    sortOrder: 2,
    status: "published" as const,
    products: ["cordless-car-vacuum", "wd-40-multi-use"],
  },
  {
    name: "Better Desk",
    slug: "better-desk",
    tagline: "Products for improving a work or study environment.",
    description: "Small upgrades that make a desk more comfortable and less cluttered.",
    intro:
      "A better desk is mostly about three things: screen height, cable control and light. These picks address each one without turning your desk into a project.",
    featured: true,
    sortOrder: 3,
    status: "published" as const,
    products: ["adjustable-laptop-stand", "led-desk-lamp", "usb-c-hub-7-in-1"],
  },
  {
    name: "Creator Setup",
    slug: "creator-setup",
    tagline: "Useful accessories for people making content.",
    description: "Accessories that make filming, editing and uploading smoother.",
    intro:
      "Making content on a laptop means constantly moving files and working long sessions at a desk. These accessories focus on the unglamorous parts: getting footage off cards and keeping your screen at a sensible height.",
    featured: true,
    sortOrder: 4,
    status: "published" as const,
    products: ["usb-c-hub-7-in-1", "adjustable-laptop-stand", "led-desk-lamp"],
  },
  {
    name: "Under ₹1,000",
    slug: "under-1000",
    tagline: "Budget-friendly discoveries.",
    description:
      "Kept as a draft: price-based collections should only go live once current prices can be shown through an approved Amazon mechanism.",
    intro: null,
    featured: false,
    sortOrder: 5,
    status: "draft" as const,
    products: ["wd-40-multi-use"],
  },
];

export const demoGuides = [
  {
    title: "7 Useful Accessories for a College Laptop Setup",
    slug: "college-laptop-accessories",
    subtitle: "What actually helps on a small shared desk — and what you can safely skip.",
    excerpt:
      "A laptop can be a perfectly good study machine. A few inexpensive accessories make it far more comfortable to use for long sessions.",
    guideType: "buying_guide" as const,
    category: "college",
    featured: true,
    products: ["adjustable-laptop-stand", "usb-c-hub-7-in-1", "led-desk-lamp"],
    content: `Most students do almost everything on one laptop: lectures, assignments, coding, streaming, the lot. The machine is usually fine. The problem is everything around it — a screen that's too low, too few ports, and a desk that's too dark at 1 a.m.

This guide covers the accessories that solve those problems, in roughly the order we'd buy them.

## 1. A laptop stand

Looking down at a laptop for hours is the single most common source of desk discomfort. A folding stand raises the screen closer to eye level. It works best alongside the next two items, because raising the screen also raises the keyboard.

**Worth it if:** you spend more than an hour or two a day at a desk.

## 2. An external keyboard

Once the screen is raised, you'll want a separate keyboard. It doesn't need to be fancy. A full-size or compact wired keyboard is reliable and never needs charging.

## 3. An external mouse

Trackpads are fine for short bursts but tiring for long documents, spreadsheets or design work. A basic mouse is one of the cheapest comfort upgrades available.

## 4. A USB-C hub

Thin laptops often have just one or two USB-C ports. A hub adds HDMI for a monitor or projector, USB-A for pen drives, and card readers — and lets you connect everything through one plug.

**Check first:** whether your laptop's USB-C port supports video output. Not all do.

## 5. A desk lamp

Shared rooms make lighting awkward. A small adjustable lamp lights your work without lighting the whole room, which your roommate will appreciate.

## 6. A cable organiser

Clips or a small cable tray stop chargers from sliding off the desk every time you stand up. It's a small thing that removes a daily irritation.

## 7. A protective sleeve

If your laptop travels between hostel, library and classroom every day, a padded sleeve protects it inside a backpack that's also carrying a water bottle.

## What you can skip

- **RGB accessories.** They don't make studying easier.
- **Cooling pads**, unless your laptop actually throttles under load. An open stand already improves airflow.
- **Expensive docks.** A compact hub covers what most students need.

## Where to start

If you buy only one thing, make it the stand plus a basic keyboard and mouse. That combination changes how a laptop feels to use for long sessions more than anything else on this list.`,
    conclusion:
      "Start with posture (stand, keyboard, mouse), then fix connectivity (hub), then light. Everything else is optional.",
  },
  {
    title: "How to Build a Better Study Desk",
    slug: "better-study-desk",
    subtitle: "Height, light and clutter: the three things that matter most.",
    excerpt:
      "You don't need a big desk to study well. You need the screen at the right height, decent light, and fewer things in the way.",
    guideType: "problem_solver" as const,
    category: "college",
    featured: true,
    products: ["adjustable-laptop-stand", "led-desk-lamp"],
    content: `A good study desk isn't about how it looks in a photo. It's about whether you can sit at it for two hours without your neck aching, squinting, or shuffling things around to find space.

Here's a practical way to improve any desk, in order of impact.

## Start with screen height

The top of your screen should sit roughly at eye level when you're sitting upright. With a laptop on a flat desk, it's usually well below that, which pulls your head forward.

Fixes, from cheapest to most effective:

1. A stack of sturdy books under the laptop.
2. A folding laptop stand.
3. A separate monitor at the right height.

Whichever you choose, add an external keyboard and mouse so your hands stay at a comfortable height.

## Then fix the light

Overhead lights often cast your own shadow onto the page. A lamp placed to the side of your writing hand avoids that. Warmer light is easier on the eyes late at night; cooler, brighter light helps with detailed work.

Angle the lamp so it doesn't reflect off your screen.

## Clear the surface

A small desk fills up fast. A few rules help:

- Keep only what you use every day on the desk itself.
- Move chargers and cables to the back edge with clips.
- Use vertical space — a small shelf or riser — for books and stationery.

## Make the chair work

If the chair isn't adjustable, a firm cushion can raise you to the right height, and a rolled towel can support your lower back. Your feet should rest flat on the floor or a footrest.

## A five-minute reset

At the end of each day, clear the desk back to its baseline. It takes five minutes and makes starting the next session much easier.`,
    conclusion:
      "Raise the screen, light the work surface, and clear the clutter. Those three changes do more than any single product.",
  },
  {
    title: "5 Practical Products Every New Car Owner Should Consider",
    slug: "new-car-owner-essentials",
    subtitle: "Small, unglamorous things that make owning a car easier.",
    excerpt:
      "Beyond the accessories the showroom offers, a few inexpensive items handle the everyday reality of owning a car.",
    guideType: "buying_guide" as const,
    category: "car-and-bike",
    featured: true,
    products: ["cordless-car-vacuum", "wd-40-multi-use"],
    content: `The first few months with a new car come with plenty of upsell offers. Most of those you can skip. These five categories are the ones that keep proving useful.

## 1. A compact vacuum

Sand, crumbs and dust build up quickly in footwells. A small cordless vacuum stored in the boot lets you deal with it in a few minutes, before it gets ground into the mats.

**Know the limits:** handheld vacuums are for light, frequent cleaning, not deep cleaning.

## 2. Microfibre cloths

A pack of good microfibre cloths handles dashboards, windows and quick dust-offs without scratching. Keep separate cloths for glass and for interior surfaces.

## 3. A multi-use maintenance spray

A can of multi-use spray loosens stuck parts, displaces moisture and quietens squeaks. It isn't a substitute for proper servicing, but it handles many small annoyances.

## 4. A tyre pressure gauge

Correct tyre pressure affects safety, handling and fuel efficiency. Petrol station gauges vary in accuracy; a personal gauge gives you a consistent reading. Your car's correct pressures are usually on a sticker inside the driver's door frame.

## 5. A basic emergency kit

Jumper cables, a torch, a reflective triangle and a small first-aid kit take up little space and matter a great deal on the one day you need them.

## What to be cautious about

- **Dashboard gadgets** that block your view or airbags.
- **Coatings and treatments** with vague claims. Follow your manufacturer's care guidance first.`,
    conclusion:
      "Keep it simple: something to clean with, something to fix small problems with, and something for emergencies.",
  },
  {
    title: "USB-C Accessories That Actually Make Sense",
    slug: "usb-c-accessories-that-make-sense",
    subtitle: "Cutting through the dongle drawer.",
    excerpt:
      "USB-C promised one port for everything. In practice, a few well-chosen accessories make that promise real.",
    guideType: "buying_guide" as const,
    category: "tech",
    featured: false,
    products: ["usb-c-hub-7-in-1"],
    content: `USB-C is a connector shape, not a guarantee of what a port can do. Two ports that look identical can support very different speeds, charging power and video output. That's why some accessories work brilliantly on one laptop and not at all on another.

## First, check what your port supports

Look for small icons next to the port or check your laptop's specifications for:

- **Power Delivery (PD)** — can it charge through this port?
- **DisplayPort Alt Mode or Thunderbolt** — can it output video?
- **Data speed** — 5Gbps, 10Gbps or faster?

## A compact hub

For most people, a 7-in-1 style hub is the most useful single USB-C accessory. It adds HDMI, USB-A, card readers and pass-through charging.

## A good USB-C cable

Cheap cables may charge slowly or not support data or video at all. A cable rated for the charging power you need is worth having, and avoids the question of whether the cable is the problem.

## A USB-C charger with enough power

If you want one charger for both phone and laptop, check that its wattage meets your laptop's requirement. Underpowered chargers may charge very slowly or not at all under load.

## What usually doesn't make sense

- **Single-purpose dongles** once you own a hub.
- **Very cheap hubs** with no clear specifications — if the listing doesn't say what HDMI resolution and refresh rate it supports, assume the minimum.`,
    conclusion:
      "Check your port first, then buy one good hub and one good cable. That covers most needs.",
  },
];
