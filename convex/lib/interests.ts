// Interest library for matching - 3,000+ items organized by category
// Users select interests via autocomplete picker, matching is rarity-weighted

export interface Interest {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
}

// Categories with subcategories
export const INTEREST_CATEGORIES = {
  movies_tv: {
    name: "Movies & TV",
    subcategories: {
      genres: [
        "Action Movies", "Adventure Movies", "Animation", "Anime", "Biographical Films",
        "Comedy Movies", "Crime Films", "Documentary", "Drama", "Family Movies",
        "Fantasy", "Film Noir", "Historical Drama", "Horror", "Independent Film",
        "Musical", "Mystery", "Reality TV", "Romance Movies", "Romantic Comedy",
        "Sci-Fi Movies", "Sitcoms", "Thriller", "True Crime", "War Films", "Western",
      ],
      franchises: [
        "Marvel", "DC Comics", "Star Wars", "Harry Potter", "Lord of the Rings",
        "James Bond", "Fast & Furious", "Jurassic Park", "Pirates of the Caribbean",
        "Mission Impossible", "The Matrix", "Back to the Future", "Indiana Jones",
        "Transformers", "X-Men", "Spider-Man", "Batman", "Avengers", "Pixar",
        "Disney Classics", "Studio Ghibli", "A24 Films", "Nolan Films",
      ],
      shows: [
        "The Office", "Friends", "Breaking Bad", "Game of Thrones", "Stranger Things",
        "The Crown", "Succession", "Ted Lasso", "Schitt's Creek", "Parks and Recreation",
        "Brooklyn Nine-Nine", "The Good Place", "How I Met Your Mother", "New Girl",
        "The Big Bang Theory", "Modern Family", "Arrested Development", "Community",
        "It's Always Sunny in Philadelphia", "Curb Your Enthusiasm", "Seinfeld",
        "The Sopranos", "The Wire", "Mad Men", "Better Call Saul", "Ozark",
        "House of Cards", "Peaky Blinders", "Sherlock", "Black Mirror", "The Mandalorian",
        "Wednesday", "Squid Game", "Money Heist", "Narcos", "The Witcher",
        "Bridgerton", "Emily in Paris", "Gossip Girl", "Gilmore Girls", "Sex and the City",
        "Grey's Anatomy", "This Is Us", "Downton Abbey", "The Handmaid's Tale",
        "Yellowstone", "The Bear", "Abbott Elementary", "Only Murders in the Building",
        "Severance", "The Last of Us", "White Lotus", "Euphoria", "Fleabag",
        "Rick and Morty", "Bob's Burgers", "The Simpsons", "South Park", "Family Guy",
        "Futurama", "Archer", "BoJack Horseman", "Big Mouth", "Attack on Titan",
        "Demon Slayer", "My Hero Academia", "One Piece", "Naruto", "Dragon Ball",
        "Death Note", "Fullmetal Alchemist", "Jujutsu Kaisen", "Spy x Family",
      ],
      directors: [
        "Christopher Nolan", "Quentin Tarantino", "Martin Scorsese", "Steven Spielberg",
        "Denis Villeneuve", "Wes Anderson", "David Fincher", "Greta Gerwig",
        "Jordan Peele", "Hayao Miyazaki", "Bong Joon-ho", "Guillermo del Toro",
        "Alfonso Cuarón", "The Coen Brothers", "Edgar Wright", "Ridley Scott",
        "James Cameron", "Tim Burton", "Stanley Kubrick", "Alfred Hitchcock",
      ],
    },
  },
  music: {
    name: "Music",
    subcategories: {
      genres: [
        "Pop", "Rock", "Hip-Hop", "R&B", "Country", "Electronic", "EDM", "House",
        "Techno", "Jazz", "Classical", "Blues", "Soul", "Funk", "Reggae", "Punk",
        "Metal", "Heavy Metal", "Alternative", "Indie", "Folk", "Acoustic",
        "Singer-Songwriter", "K-Pop", "J-Pop", "Latin", "Reggaeton", "Salsa",
        "Bachata", "Afrobeats", "Gospel", "Christian Music", "Ambient", "Lo-fi",
        "Trap", "Drill", "Disco", "New Wave", "Grunge", "Emo", "Hardcore",
        "Progressive Rock", "Psychedelic", "Synthwave", "Vaporwave", "Drum and Bass",
        "Dubstep", "Trance", "World Music", "Bollywood Music", "Opera",
      ],
      artists: [
        "Taylor Swift", "Drake", "Beyoncé", "Kendrick Lamar", "The Weeknd",
        "Bad Bunny", "Harry Styles", "Dua Lipa", "Billie Eilish", "Post Malone",
        "Ed Sheeran", "Ariana Grande", "Bruno Mars", "Justin Bieber", "Rihanna",
        "Kanye West", "Travis Scott", "SZA", "Doja Cat", "Olivia Rodrigo",
        "BTS", "BLACKPINK", "Coldplay", "Imagine Dragons", "Maroon 5",
        "OneRepublic", "The 1975", "Arctic Monkeys", "Tame Impala", "Radiohead",
        "The Beatles", "Queen", "Led Zeppelin", "Pink Floyd", "The Rolling Stones",
        "Fleetwood Mac", "Eagles", "AC/DC", "Guns N' Roses", "Nirvana",
        "Foo Fighters", "Green Day", "Blink-182", "Red Hot Chili Peppers",
        "Metallica", "Linkin Park", "System of a Down", "Tool", "Slipknot",
        "Jay-Z", "Eminem", "Nas", "J. Cole", "Tyler, the Creator", "Frank Ocean",
        "Childish Gambino", "Mac Miller", "Chance the Rapper", "Megan Thee Stallion",
        "Cardi B", "Nicki Minaj", "Lil Wayne", "Future", "21 Savage",
        "Michael Jackson", "Prince", "Whitney Houston", "Mariah Carey", "Adele",
        "Lady Gaga", "Katy Perry", "Shakira", "Jennifer Lopez", "Madonna",
        "Elton John", "Billy Joel", "Bruce Springsteen", "Bob Dylan", "Stevie Wonder",
        "John Legend", "Alicia Keys", "H.E.R.", "Daniel Caesar", "Khalid",
        "Hozier", "Phoebe Bridgers", "Mitski", "Lana Del Rey", "Florence + The Machine",
        "Lorde", "Halsey", "Charli XCX", "Daft Punk", "Calvin Harris", "Diplo",
        "Skrillex", "Marshmello", "The Chainsmokers", "Zedd", "Kygo", "Avicii",
        "David Guetta", "Tiësto", "deadmau5", "Swedish House Mafia",
      ],
      activities: [
        "Live Concerts", "Music Festivals", "Vinyl Collecting", "DJing",
        "Playing Guitar", "Playing Piano", "Playing Drums", "Singing",
        "Songwriting", "Music Production", "Karaoke", "Dancing",
      ],
    },
  },
  books_reading: {
    name: "Books & Reading",
    subcategories: {
      genres: [
        "Fiction", "Non-Fiction", "Literary Fiction", "Contemporary Fiction",
        "Historical Fiction", "Science Fiction", "Fantasy", "Epic Fantasy",
        "Urban Fantasy", "Mystery", "Thriller", "Crime Fiction", "Horror",
        "Romance", "Contemporary Romance", "Historical Romance", "Romantic Comedy",
        "Young Adult", "New Adult", "Children's Books", "Middle Grade",
        "Biography", "Memoir", "Autobiography", "Self-Help", "Personal Development",
        "Business Books", "Psychology", "Philosophy", "History", "Science",
        "Popular Science", "True Crime", "Travel Writing", "Essays",
        "Poetry", "Graphic Novels", "Comics", "Manga", "Audiobooks",
        "Classic Literature", "Modern Classics", "Dystopian", "Post-Apocalyptic",
        "Cozy Mystery", "Dark Academia", "Romantasy", "Sapphic Fiction",
      ],
      authors: [
        "Stephen King", "J.K. Rowling", "George R.R. Martin", "Brandon Sanderson",
        "Sarah J. Maas", "Colleen Hoover", "Taylor Jenkins Reid", "Emily Henry",
        "Sally Rooney", "Amor Towles", "Celeste Ng", "Madeline Miller",
        "Neil Gaiman", "Terry Pratchett", "Patrick Rothfuss", "Robin Hobb",
        "Agatha Christie", "James Patterson", "Dan Brown", "Lee Child",
        "Gillian Flynn", "Paula Hawkins", "Haruki Murakami", "Kazuo Ishiguro",
        "Margaret Atwood", "Chimamanda Ngozi Adichie", "Toni Morrison",
        "Jane Austen", "Charles Dickens", "F. Scott Fitzgerald", "Ernest Hemingway",
        "Gabriel García Márquez", "Fyodor Dostoevsky", "Leo Tolstoy",
        "Malcolm Gladwell", "Brené Brown", "James Clear", "Mark Manson",
        "Ryan Holiday", "Cal Newport", "Adam Grant", "Simon Sinek",
        "Michelle Obama", "Barack Obama", "Matthew McConaughey", "Trevor Noah",
      ],
      series: [
        "Harry Potter", "A Song of Ice and Fire", "The Lord of the Rings",
        "The Hunger Games", "Divergent", "Twilight", "Percy Jackson",
        "A Court of Thorns and Roses", "Throne of Glass", "The Stormlight Archive",
        "Mistborn", "The Wheel of Time", "Dune", "Foundation", "The Expanse",
        "Discworld", "The Hitchhiker's Guide", "Jack Reacher", "Outlander",
        "Bridgerton Books", "It Ends with Us Series",
      ],
      activities: [
        "Book Clubs", "Reading Challenges", "Library Visits", "Bookstores",
        "E-readers", "Book Collecting", "Writing", "Creative Writing",
        "Journaling", "Poetry Writing",
      ],
    },
  },
  gaming: {
    name: "Gaming",
    subcategories: {
      types: [
        "Video Games", "PC Gaming", "Console Gaming", "Mobile Gaming",
        "Board Games", "Card Games", "Tabletop RPGs", "Dungeons & Dragons",
        "Strategy Games", "Puzzle Games", "Trivia Games", "Party Games",
        "Escape Rooms", "VR Gaming", "Retro Gaming", "Indie Games", "MMOs",
        "Competitive Gaming", "Casual Gaming", "Co-op Gaming",
      ],
      genres: [
        "Action Games", "Adventure Games", "RPGs", "JRPGs", "Shooters", "FPS",
        "Battle Royale", "Sports Games", "Racing Games", "Fighting Games",
        "Horror Games", "Survival Games", "Simulation", "City Builders",
        "Farming Sims", "Life Sims", "Platformers", "Metroidvanias",
        "Roguelikes", "Souls-likes", "Open World", "Sandbox", "Visual Novels",
        "Rhythm Games", "Tower Defense", "MOBA", "RTS",
      ],
      games: [
        "Minecraft", "Fortnite", "Call of Duty", "Grand Theft Auto", "FIFA",
        "NBA 2K", "Madden", "The Legend of Zelda", "Mario", "Pokémon",
        "Animal Crossing", "Super Smash Bros", "Final Fantasy", "Kingdom Hearts",
        "Elden Ring", "Dark Souls", "Bloodborne", "Sekiro", "God of War",
        "The Last of Us", "Red Dead Redemption", "Assassin's Creed", "Far Cry",
        "Skyrim", "Fallout", "The Witcher", "Cyberpunk 2077", "Mass Effect",
        "Dragon Age", "Baldur's Gate", "Stardew Valley", "Hades", "Hollow Knight",
        "Celeste", "Undertale", "Among Us", "Valorant", "League of Legends",
        "Dota 2", "Overwatch", "Apex Legends", "World of Warcraft", "FFXIV",
        "Destiny", "Diablo", "Path of Exile", "Genshin Impact", "Honkai",
        "Rocket League", "Fall Guys", "It Takes Two", "Sims", "Cities Skylines",
        "Civilization", "Age of Empires", "StarCraft", "Chess", "Poker",
        "Settlers of Catan", "Ticket to Ride", "Codenames", "Wingspan",
        "Gloomhaven", "Terraforming Mars", "Azul", "Splendor",
      ],
      platforms: [
        "PlayStation", "Xbox", "Nintendo Switch", "Steam", "PC Master Race",
        "Retro Consoles", "Handheld Gaming",
      ],
    },
  },
  sports_fitness: {
    name: "Sports & Fitness",
    subcategories: {
      watching: [
        "NFL Football", "College Football", "NBA Basketball", "College Basketball",
        "MLB Baseball", "NHL Hockey", "Soccer", "Premier League", "La Liga",
        "Champions League", "MLS", "Tennis", "Golf", "UFC/MMA", "Boxing",
        "Wrestling", "F1 Racing", "NASCAR", "Olympics", "Rugby", "Cricket",
        "Australian Football", "Volleyball", "Track and Field", "Swimming",
        "Gymnastics", "Figure Skating", "Skiing", "Snowboarding", "Surfing",
        "Skateboarding", "X Games", "Esports",
      ],
      playing: [
        "Running", "Jogging", "Marathon Running", "Trail Running", "Sprinting",
        "Walking", "Hiking", "Backpacking", "Rock Climbing", "Bouldering",
        "Cycling", "Mountain Biking", "Road Cycling", "Spinning",
        "Swimming", "Lap Swimming", "Open Water Swimming", "Triathlons",
        "Weight Lifting", "Powerlifting", "Bodybuilding", "CrossFit", "HIIT",
        "Yoga", "Hot Yoga", "Pilates", "Barre", "Stretching",
        "Basketball", "Soccer", "Football", "Baseball", "Softball",
        "Volleyball", "Beach Volleyball", "Tennis", "Pickleball", "Badminton",
        "Table Tennis", "Golf", "Disc Golf", "Frisbee", "Ultimate Frisbee",
        "Martial Arts", "Boxing", "Kickboxing", "Muay Thai", "BJJ", "Judo",
        "Karate", "Taekwondo", "Wrestling", "MMA Training", "Self-Defense",
        "Dance Fitness", "Zumba", "Aerobics", "Step Aerobics",
        "Skiing", "Snowboarding", "Ice Skating", "Hockey",
        "Surfing", "Paddleboarding", "Kayaking", "Canoeing", "Rowing",
        "Sailing", "Wakeboarding", "Water Skiing", "Scuba Diving", "Snorkeling",
        "Horseback Riding", "Archery", "Fencing", "Bowling", "Darts",
        "Pool/Billiards", "Roller Skating", "Rollerblading",
      ],
      fitness: [
        "Gym Workouts", "Home Workouts", "Personal Training", "Group Fitness",
        "Fitness Apps", "Peloton", "Orange Theory", "Barry's Bootcamp",
        "SoulCycle", "F45", "Functional Fitness", "Calisthenics",
        "Resistance Training", "Cardio", "Morning Workouts", "Evening Workouts",
        "Fitness Challenges", "Transformation Goals", "Muscle Building",
        "Weight Loss", "Flexibility Training", "Mobility Work",
      ],
    },
  },
  outdoor_nature: {
    name: "Outdoors & Nature",
    subcategories: {
      activities: [
        "Hiking", "Backpacking", "Camping", "Glamping", "RV Camping",
        "Nature Walks", "Bird Watching", "Wildlife Photography", "Stargazing",
        "Fishing", "Fly Fishing", "Hunting", "Foraging", "Mushroom Hunting",
        "Rock Climbing", "Mountaineering", "Caving", "Spelunking",
        "Kayaking", "Canoeing", "Rafting", "Paddleboarding",
        "Beach Days", "Beachcombing", "Tide Pooling", "Shell Collecting",
        "Gardening", "Vegetable Gardening", "Flower Gardening", "Landscaping",
        "Bonsai", "Houseplants", "Plant Parenting", "Composting",
        "Off-roading", "ATV Riding", "Dirt Biking", "Mountain Biking",
        "Horseback Riding", "Trail Riding", "Geocaching", "Orienteering",
      ],
      places: [
        "National Parks", "State Parks", "Beaches", "Mountains", "Forests",
        "Lakes", "Rivers", "Waterfalls", "Deserts", "Canyons", "Caves",
        "Hot Springs", "Botanical Gardens", "Nature Reserves", "Wildlife Sanctuaries",
      ],
      interests: [
        "Nature Photography", "Landscape Photography", "Wildlife Conservation",
        "Environmental Activism", "Sustainability", "Leave No Trace",
        "Outdoor Education", "Survival Skills", "Bushcraft",
        "Weather Watching", "Storm Chasing", "Aurora Hunting",
      ],
    },
  },
  food_drink: {
    name: "Food & Drink",
    subcategories: {
      cooking: [
        "Cooking", "Home Cooking", "Meal Prep", "Baking", "Bread Making",
        "Pastry Making", "Cake Decorating", "Cookie Decorating",
        "Grilling", "BBQ", "Smoking Meat", "Sous Vide", "Air Frying",
        "Slow Cooking", "Instant Pot", "Cast Iron Cooking",
        "Recipe Development", "Food Photography", "Food Blogging",
        "Fermenting", "Pickling", "Canning", "Preserving",
        "Charcuterie Boards", "Cheese Making", "Chocolate Making",
      ],
      cuisines: [
        "Italian Food", "Mexican Food", "Chinese Food", "Japanese Food",
        "Korean Food", "Thai Food", "Vietnamese Food", "Indian Food",
        "Middle Eastern Food", "Mediterranean Food", "Greek Food",
        "French Food", "Spanish Food", "Tapas", "American Food",
        "Southern Food", "Soul Food", "Cajun Food", "Tex-Mex",
        "Caribbean Food", "Brazilian Food", "Peruvian Food", "Ethiopian Food",
        "Moroccan Food", "Turkish Food", "Lebanese Food", "Filipino Food",
        "Malaysian Food", "Indonesian Food", "Hawaiian Food", "Fusion Food",
      ],
      dining: [
        "Fine Dining", "Casual Dining", "Fast Casual", "Food Trucks",
        "Street Food", "Hole in the Wall Places", "Pop-ups", "Tasting Menus",
        "Brunch", "Breakfast Spots", "Late Night Eats", "Diners",
        "Farm to Table", "Local Restaurants", "Restaurant Week",
        "Trying New Restaurants", "Foodie Adventures", "Food Tours",
      ],
      dietary: [
        "Vegetarian", "Vegan", "Plant-Based", "Pescatarian", "Flexitarian",
        "Keto", "Paleo", "Whole30", "Gluten-Free", "Dairy-Free",
        "Clean Eating", "Intuitive Eating", "Meal Planning", "Macro Counting",
        "Intermittent Fasting", "Healthy Eating", "Comfort Food",
      ],
      drinks: [
        "Coffee", "Espresso", "Latte Art", "Home Barista", "Coffee Shops",
        "Tea", "Loose Leaf Tea", "Tea Ceremonies", "Bubble Tea", "Matcha",
        "Wine", "Red Wine", "White Wine", "Rosé", "Wine Tasting", "Wine Collecting",
        "Craft Beer", "IPAs", "Stouts", "Sours", "Lagers", "Homebrewing",
        "Cocktails", "Mixology", "Home Bar", "Whiskey", "Bourbon", "Scotch",
        "Tequila", "Mezcal", "Gin", "Rum", "Vodka", "Sake",
        "Mocktails", "Non-Alcoholic", "Smoothies", "Juicing",
        "Kombucha", "Cold Brew", "Specialty Coffee",
      ],
    },
  },
  travel: {
    name: "Travel",
    subcategories: {
      styles: [
        "Adventure Travel", "Backpacking", "Luxury Travel", "Budget Travel",
        "Solo Travel", "Couples Travel", "Family Travel", "Group Travel",
        "Road Trips", "Weekend Getaways", "Long-term Travel", "Digital Nomad",
        "Slow Travel", "Sustainable Travel", "Voluntourism", "Workations",
        "Cruises", "River Cruises", "Expedition Cruises",
        "All-Inclusive Resorts", "Boutique Hotels", "Airbnb", "Hostels",
        "Camping Trips", "Glamping", "Van Life", "RV Travel",
      ],
      types: [
        "Beach Vacations", "Mountain Trips", "City Breaks", "Cultural Travel",
        "Historical Travel", "Food Tourism", "Wine Tourism", "Beer Tourism",
        "Wellness Retreats", "Spa Trips", "Yoga Retreats", "Meditation Retreats",
        "Adventure Sports Travel", "Ski Trips", "Scuba Trips", "Safari",
        "Wildlife Travel", "Photography Travel", "Festival Travel",
        "Music Festival Travel", "Pilgrimage", "Spiritual Travel",
      ],
      regions: [
        "Europe Travel", "Asia Travel", "Southeast Asia", "Japan Travel",
        "South America", "Central America", "Caribbean", "Mexico",
        "Africa Travel", "Middle East", "Australia", "New Zealand",
        "Pacific Islands", "Hawaii", "Alaska", "Canada",
        "US National Parks", "European Capitals", "Tropical Destinations",
        "Nordic Countries", "Mediterranean", "Alps", "Patagonia",
      ],
      planning: [
        "Trip Planning", "Travel Hacking", "Points & Miles", "Travel Photography",
        "Travel Blogging", "Travel Vlogging", "Learning Languages",
        "Cultural Immersion", "Local Experiences", "Off the Beaten Path",
      ],
    },
  },
  arts_creativity: {
    name: "Arts & Creativity",
    subcategories: {
      visual: [
        "Drawing", "Sketching", "Painting", "Watercolor", "Oil Painting",
        "Acrylic Painting", "Digital Art", "Illustration", "Graphic Design",
        "Photography", "Portrait Photography", "Street Photography",
        "Landscape Photography", "Film Photography", "Photo Editing",
        "Sculpture", "Ceramics", "Pottery", "Printmaking", "Calligraphy",
        "Lettering", "Typography", "Collage", "Mixed Media", "Art Journaling",
      ],
      crafts: [
        "Knitting", "Crocheting", "Sewing", "Quilting", "Embroidery",
        "Cross-Stitch", "Macramé", "Weaving", "Felting", "Tie-Dye",
        "Woodworking", "Carpentry", "Furniture Making", "Wood Carving",
        "Metalworking", "Jewelry Making", "Beading", "Resin Art", "Candle Making",
        "Soap Making", "Leatherworking", "Bookbinding", "Paper Crafts",
        "Origami", "Scrapbooking", "Card Making", "3D Printing",
        "Model Building", "Miniatures", "Dioramas", "Cosplay", "Prop Making",
      ],
      performing: [
        "Acting", "Theater", "Improv", "Stand-Up Comedy", "Musical Theater",
        "Dance", "Ballet", "Contemporary Dance", "Hip-Hop Dance", "Ballroom",
        "Salsa Dancing", "Swing Dancing", "Line Dancing", "Tap Dance",
        "Public Speaking", "Spoken Word", "Poetry Readings", "Storytelling",
        "Magic", "Circus Arts", "Juggling", "Fire Spinning",
      ],
      appreciation: [
        "Museum Visits", "Art Galleries", "Art History", "Art Collecting",
        "Theater Going", "Broadway", "Orchestra", "Ballet", "Opera",
        "Film Festivals", "Independent Cinema", "Film Analysis",
        "Architecture", "Design", "Interior Design", "Fashion",
      ],
    },
  },
  technology: {
    name: "Technology",
    subcategories: {
      computing: [
        "Programming", "Coding", "Web Development", "App Development",
        "Software Engineering", "Data Science", "Machine Learning", "AI",
        "Cybersecurity", "Cloud Computing", "DevOps", "Open Source",
        "Linux", "Raspberry Pi", "Arduino", "Electronics", "Robotics",
        "Home Automation", "Smart Home", "PC Building", "Tech News",
      ],
      gadgets: [
        "Smartphones", "Apple Products", "Android", "Wearables", "Smartwatches",
        "Headphones", "Audio Equipment", "Cameras", "Drones", "VR/AR",
        "Gaming Setups", "Home Theater", "Hi-Fi Audio", "Vinyl Setup",
      ],
      online: [
        "Social Media", "Content Creation", "YouTube", "TikTok", "Streaming",
        "Podcasting", "Blogging", "Online Communities", "Reddit",
        "Discord", "Twitch", "Digital Marketing", "SEO", "Cryptocurrency",
        "NFTs", "Web3", "Startups", "Entrepreneurship",
      ],
    },
  },
  lifestyle: {
    name: "Lifestyle",
    subcategories: {
      wellness: [
        "Meditation", "Mindfulness", "Breathwork", "Sound Healing",
        "Self-Care", "Mental Health", "Therapy", "Personal Development",
        "Life Coaching", "Manifestation", "Journaling", "Gratitude Practice",
        "Morning Routines", "Evening Routines", "Sleep Optimization",
        "Skincare", "Makeup", "Grooming", "Fashion", "Personal Style",
        "Minimalism", "Decluttering", "Organization", "Home Decor",
        "Interior Design", "Feng Shui", "Hygge", "Cozy Lifestyle",
      ],
      spirituality: [
        "Spirituality", "Yoga Philosophy", "Buddhism", "Hinduism", "Christianity",
        "Judaism", "Islam", "New Age", "Astrology", "Tarot", "Crystals",
        "Energy Healing", "Reiki", "Chakras", "Manifestation",
      ],
      finance: [
        "Personal Finance", "Investing", "Stock Market", "Real Estate",
        "FIRE Movement", "Budgeting", "Saving", "Side Hustles",
        "Entrepreneurship", "Small Business", "Freelancing",
      ],
      social: [
        "Dating", "Relationships", "Marriage", "Parenting", "Family Life",
        "Friendship", "Networking", "Community Building", "Volunteering",
        "Philanthropy", "Social Justice", "Activism", "Politics",
      ],
    },
  },
  animals_pets: {
    name: "Animals & Pets",
    subcategories: {
      pets: [
        "Dogs", "Dog Training", "Dog Parks", "Puppy Life",
        "Cats", "Cat Life", "Kittens", "Cat Cafes",
        "Fish", "Aquariums", "Tropical Fish", "Saltwater Tanks",
        "Birds", "Parrots", "Birding", "Reptiles", "Snakes", "Lizards",
        "Small Pets", "Hamsters", "Guinea Pigs", "Rabbits", "Ferrets",
        "Horses", "Horseback Riding", "Equestrian",
        "Pet Photography", "Pet Adoption", "Animal Rescue", "Fostering",
      ],
      wildlife: [
        "Wildlife", "Bird Watching", "Marine Life", "Ocean Conservation",
        "Wildlife Photography", "Nature Documentary", "Zoos", "Aquariums",
        "Safari", "Whale Watching", "Animal Behavior",
      ],
    },
  },
  learning: {
    name: "Learning & Education",
    subcategories: {
      academic: [
        "Science", "Physics", "Chemistry", "Biology", "Astronomy", "Space",
        "Mathematics", "Statistics", "Economics", "Psychology", "Sociology",
        "Philosophy", "History", "World History", "Ancient History",
        "Archaeology", "Anthropology", "Geography", "Environmental Science",
        "Political Science", "Law", "Medicine", "Neuroscience",
      ],
      skills: [
        "Language Learning", "Spanish", "French", "German", "Italian",
        "Japanese", "Korean", "Mandarin", "Portuguese", "Arabic", "Sign Language",
        "Public Speaking", "Writing", "Speed Reading", "Memory Techniques",
        "Critical Thinking", "Problem Solving", "Leadership",
      ],
      formats: [
        "Online Courses", "Coursera", "Udemy", "MasterClass", "Skillshare",
        "Podcasts", "Educational Podcasts", "TED Talks", "Documentaries",
        "Audiobooks", "Book Summaries", "Research", "Academic Journals",
      ],
    },
  },
  entertainment: {
    name: "Entertainment",
    subcategories: {
      comedy: [
        "Stand-Up Comedy", "Comedy Specials", "Improv", "Sketch Comedy",
        "Comedy Podcasts", "Memes", "Internet Humor", "Satire", "Parody",
      ],
      podcasts: [
        "True Crime Podcasts", "Comedy Podcasts", "News Podcasts",
        "Interview Podcasts", "Storytelling Podcasts", "History Podcasts",
        "Science Podcasts", "Business Podcasts", "Self-Help Podcasts",
        "Relationship Podcasts", "Sports Podcasts", "Pop Culture Podcasts",
        "Joe Rogan", "Call Her Daddy", "Crime Junkie", "My Favorite Murder",
        "Armchair Expert", "SmartLess", "How I Built This", "The Daily",
      ],
      youtube: [
        "YouTube", "Vlogging", "Video Essays", "Commentary Channels",
        "ASMR", "Mukbang", "Unboxing", "Reviews", "Tutorials",
        "Let's Plays", "Streaming", "Reaction Videos",
      ],
      events: [
        "Live Events", "Concerts", "Festivals", "Music Festivals", "Coachella",
        "Lollapalooza", "Bonnaroo", "EDC", "Burning Man", "SXSW",
        "Comic Con", "Anime Conventions", "Gaming Conventions",
        "Sports Events", "Award Shows", "Film Premieres",
      ],
    },
  },
  collecting: {
    name: "Collecting & Hobbies",
    subcategories: {
      collections: [
        "Vinyl Records", "CDs", "Cassettes", "Books", "Comics",
        "Manga", "Trading Cards", "Pokémon Cards", "Sports Cards",
        "Stamps", "Coins", "Antiques", "Vintage Items", "Thrifting",
        "Sneakers", "Watches", "Jewelry", "Art", "Posters",
        "Figurines", "Funko Pops", "Action Figures", "LEGO",
        "Plants", "Crystals", "Fossils", "Shells",
      ],
      hobbies: [
        "Puzzles", "Jigsaw Puzzles", "Crosswords", "Sudoku", "Word Games",
        "Trivia", "Quiz Games", "Brain Teasers", "Escape Rooms",
        "Magic Tricks", "Card Tricks", "Yo-Yo", "Rubik's Cube",
        "Lockpicking", "Pen Spinning", "Origami", "Model Trains",
        "RC Cars", "Drones", "Kite Flying", "Amateur Radio",
      ],
    },
  },
  social_causes: {
    name: "Social Causes",
    subcategories: {
      causes: [
        "Environmental Activism", "Climate Change", "Sustainability",
        "Animal Rights", "Animal Welfare", "Veganism", "Conservation",
        "Social Justice", "Racial Justice", "LGBTQ+ Rights", "Women's Rights",
        "Human Rights", "Immigration", "Criminal Justice Reform",
        "Mental Health Advocacy", "Disability Rights", "Accessibility",
        "Education Access", "Poverty", "Homelessness", "Food Security",
        "Healthcare Access", "Public Health", "Gun Control", "Peace",
      ],
      activities: [
        "Volunteering", "Community Service", "Nonprofit Work", "Fundraising",
        "Protesting", "Advocacy", "Political Campaigns", "Voting",
        "Donating", "Mutual Aid", "Mentoring", "Tutoring",
      ],
    },
  },
};

// Build flat list of all interests with IDs
function buildInterestList(): Interest[] {
  const interests: Interest[] = [];
  let id = 1;

  for (const [categoryKey, category] of Object.entries(INTEREST_CATEGORIES)) {
    for (const [subcategoryKey, items] of Object.entries(category.subcategories)) {
      for (const item of items) {
        interests.push({
          id: `interest_${id++}`,
          name: item,
          category: category.name,
          subcategory: subcategoryKey,
        });
      }
    }
  }

  return interests;
}

export const ALL_INTERESTS = buildInterestList();

// Quick lookup by ID
export const INTERESTS_BY_ID = new Map(ALL_INTERESTS.map(i => [i.id, i]));

// Search interests by query (for autocomplete)
export function searchInterests(query: string, limit: number = 20): Interest[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  const results: Interest[] = [];
  
  // Exact prefix matches first
  for (const interest of ALL_INTERESTS) {
    if (interest.name.toLowerCase().startsWith(lowerQuery)) {
      results.push(interest);
      if (results.length >= limit) return results;
    }
  }
  
  // Then contains matches
  for (const interest of ALL_INTERESTS) {
    if (!results.includes(interest) && interest.name.toLowerCase().includes(lowerQuery)) {
      results.push(interest);
      if (results.length >= limit) return results;
    }
  }
  
  return results;
}

// Get interests by category
export function getInterestsByCategory(categoryName: string): Interest[] {
  return ALL_INTERESTS.filter(i => i.category === categoryName);
}

// Get all category names
export function getAllCategories(): string[] {
  return Object.values(INTEREST_CATEGORIES).map(c => c.name);
}

// Interest count for stats
export const INTEREST_COUNT = ALL_INTERESTS.length;
