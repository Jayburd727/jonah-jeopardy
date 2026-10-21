// ============================================================
//  JONAH JEOPARDY — QUESTIONS
//  Edit anything in this file to change the game.
//  Each category needs exactly 5 clues (easiest first).
//  Verse references are shown when the answer is revealed.
// ============================================================

const GAME_TITLE = "JONAH JEOPARDY";
const GAME_SUBTITLE = "Chapters 1–3";

const POINT_VALUES = [100, 200, 300, 400, 500];

// How many hidden Daily Doubles to place on the board (random each game)
const DAILY_DOUBLE_COUNT = 2;

const CATEGORIES = [
  {
    name: "Runaway Prophet",
    clues: [
      { q: "God told Jonah to go preach against this “great city.”", a: "Nineveh", ref: "Jonah 1:2" },
      { q: "Instead of obeying, Jonah bought a ticket on a ship headed for this faraway place.", a: "Tarshish", ref: "Jonah 1:3" },
      { q: "Jonah went down to this port city to find a ship.", a: "Joppa", ref: "Jonah 1:3" },
      { q: "The Bible says Jonah wasn't just running from Nineveh — he was trying to run from THIS.", a: "The presence of the LORD", ref: "Jonah 1:3" },
      { q: "Name Jonah's dad.", a: "Amittai", ref: "Jonah 1:1" },
    ],
  },
  {
    name: "Storm Chasers",
    clues: [
      { q: "While the storm raged and the sailors panicked, Jonah was doing THIS below deck.", a: "Sleeping (fast asleep!)", ref: "Jonah 1:5" },
      { q: "To lighten the ship, the terrified sailors threw THIS overboard.", a: "The cargo", ref: "Jonah 1:5" },
      { q: "The sailors used this method to figure out who was to blame for the storm.", a: "They cast lots (and it fell on Jonah)", ref: "Jonah 1:7" },
      { q: "Jonah said he worshiped “the LORD, the God of heaven, who made…” what?", a: "The sea and the dry land", ref: "Jonah 1:9" },
      { q: "Before finally throwing Jonah overboard, the sailors tried THIS to save everyone.", a: "They rowed hard to get back to land", ref: "Jonah 1:13" },
    ],
  },
  {
    name: "Something Smells Fishy",
    clues: [
      { q: "TRUE or FALSE: The book of Jonah says Jonah was swallowed by a whale.", a: "FALSE — it says a “great fish”", ref: "Jonah 1:17" },
      { q: "Who provided (or “prepared”) the big fish?", a: "The LORD / God", ref: "Jonah 1:17" },
      { q: "How did Jonah finally get out of the fish? (Gross answer required.)", a: "God commanded the fish and it vomited Jonah onto dry land", ref: "Jonah 2:10" },
      { q: "In his prayer, Jonah says THIS was wrapped around his head.", a: "Seaweed (weeds)", ref: "Jonah 2:5" },
      { q: "Finish the last line of Jonah's prayer: “Salvation…”", a: "“…comes from the LORD” (“is of the LORD”)", ref: "Jonah 2:9" },
    ],
  },
  {
    name: "Who Said It?",
    clues: [
      { q: "“Pick me up and throw me into the sea, and it will become calm.”", a: "Jonah", ref: "Jonah 1:12" },
      { q: "“Go to the great city of Nineveh and preach against it, because its wickedness has come up before me.”", a: "God", ref: "Jonah 1:2" },
      { q: "“How can you sleep? Get up and call on your god!”", a: "The ship's captain", ref: "Jonah 1:6" },
      { q: "“Who knows? God may yet relent and with compassion turn from his fierce anger so that we will not perish.”", a: "The king of Nineveh", ref: "Jonah 3:9" },
      { q: "“Please, LORD, do not let us die for taking this man's life.”", a: "The sailors", ref: "Jonah 1:14" },
    ],
  },
  {
    name: "Nineveh's Big Turnaround",
    clues: [
      { q: "When they heard Jonah's message, the people of Nineveh did THIS (name one).", a: "Believed God, declared a fast, and put on sackcloth", ref: "Jonah 3:5" },
      { q: "The Ninevites wore this scratchy material to show they were sorry.", a: "Sackcloth", ref: "Jonah 3:5" },
      { q: "When the king heard the news, he got off his throne, took off his royal robes, and sat down in THIS.", a: "Dust / ashes", ref: "Jonah 3:6" },
      { q: "The king's decree said not only people, but THESE had to fast and wear sackcloth too!", a: "The animals (herds and flocks)", ref: "Jonah 3:7–8" },
      { q: "The king told everyone to give up their evil ways and this specific sin.", a: "Violence", ref: "Jonah 3:8" },
    ],
  },
  {
    name: "By the Numbers",
    clues: [
      { q: "How many days and nights was Jonah inside the fish?", a: "3", ref: "Jonah 1:17" },
      { q: "Jonah warned that Nineveh would be overthrown in how many days?", a: "40", ref: "Jonah 3:4" },
      { q: "In chapter 3, the word of the LORD came to Jonah for the ___ time.", a: "Second", ref: "Jonah 3:1" },
      { q: "Nineveh was so big it took how many days to go through it?", a: "3 days", ref: "Jonah 3:3" },
      { q: "How far into the city did Jonah walk before he started preaching?", a: "One day's journey", ref: "Jonah 3:4" },
    ],
  },
];

const FINAL_JEOPARDY = {
  category: "The Plot Twist",
  q: "When God saw that the people of Nineveh turned from their evil ways, what did He do?",
  a: "He relented / had compassion and did NOT bring the destruction He had threatened",
  ref: "Jonah 3:10",
  teaser: "So… was Jonah happy about this? Find out in Chapter 4.",
};
