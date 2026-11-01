/* The first three layers under the Yauga strategy: what the front door asks
   for and how the record grows, the streaks and points the ring makes
   possible, and the city culture that brings people back for each other. The
   points are worked examples: Yauga sets their values, because the balance
   lives in the Yauga App. */

import type { ChapterSection } from "@/onchain-suite-website/types/retention-playbook";

export const FRONT_DOOR: ChapterSection = {
  id: "front-door",
  parent: "strategy",
  title: "The front door",
  blocks: [
    {
      kind: "p",
      text: "Yauga has two front doors. The website is where people arrive online, from a creator's post, a friend or a search, and the Haus is where they really come in, because nobody becomes part of Yauga without being in the room. Both fill the same record, and every source gets a tag, so we can see which creators, venues and communities bring in people who stay.",
    },
    {
      kind: "table",
      head: ["Where", "What we ask", "Why"],
      rows: [
        [
          "The website",
          "Name, email, city and focus, with a phone number optional",
          "Enough to welcome them, add them to their city and send the right first practice",
        ],
        [
          "Booking a ticket",
          "The event, and a tick for Yauga's news",
          "What they came for, and what we may send",
        ],
        [
          "Check-in at the Haus",
          "Nothing new, because the check-in is the signal",
          "The moment the rest of the loop depends on",
        ],
        [
          "The app and a membership",
          "Their goal and their plan",
          "Which practices to suggest, and what they have joined",
        ],
        [
          "The Cult ring",
          "A delivery address, when they buy it",
          "The one place an address is needed",
        ],
        [
          "Yauga Enterprise",
          "Their employer, as a source",
          "So people who come in through work get the same welcome",
        ],
      ],
    },
    {
      kind: "p",
      text: "We ask for each thing once, at the step that needs it, and use everything we ask for. A home address on the website form would cost sign-ups and give us nothing to send, and European privacy law asks for only what is needed, so it waits for the ring. After the front door, the record grows on its own from what people do:",
    },
    {
      kind: "artifact",
      code: "04.05",
      title: "What the record learns at each step",
      diagram: {
        type: "flow",
        nodes: [
          { label: "Discover", note: "who, city, focus, source" },
          { label: "Attend", note: "which formats, which Haus" },
          { label: "Join", note: "plan, goal, the ring" },
          { label: "Practise", note: "streaks, favourite practice" },
          { label: "Connect", note: "shared sits, guests brought" },
          { label: "Return", note: "what brought them back" },
        ],
      },
    },
    {
      kind: "p",
      text: "Each door also sets what we may send. The website forms, and an opt-in tick at booking or at app sign-up, carry news consent confirmed by email, while a ticket bought without the tick carries service only, so that person gets their ticket and event follow-ups but never Letters, launches or city news. Where nobody can show what the people on Yauga's existing Haus list agreed to, the first email asks.",
    },
    {
      kind: "p",
      text: "A full record tells us who someone is, so what gives them a reason to come back tomorrow?",
    },
  ],
};

export const REWARDS: ChapterSection = {
  id: "rewards",
  parent: "strategy",
  title: "Streaks, points and rewards",
  blocks: [
    {
      kind: "p",
      text: "The Cult ring is connected to the app, which makes it the natural home for a daily habit. A member keeps a streak by practising each day, measured against their own last week rather than against anyone else, and the streak earns points they can spend on the things that bring them back to the room.",
    },
    {
      kind: "table",
      head: ["Earns points", "Spends points"],
      rows: [
        [
          "A day's practice, logged by the ring",
          "A ticket to the next Haus in their city",
        ],
        [
          "A seven-day streak, or a challenge completed",
          "A Ritual Room or Run Club session",
        ],
        ["A check-in at a Haus", "Something from the Yauga store"],
        [
          "Bringing someone who checks in",
          "A partner brand's reward, once partners are signed",
        ],
      ],
    },
    {
      kind: "p",
      text: "These are worked examples, and Yauga sets what each one is worth, because the balance lives in the Yauga App. The loop we want is the one below, where the reward for practising at home is a reason to be back in the room:",
    },
    {
      kind: "artifact",
      code: "04.06",
      title: "The loop the points keep turning",
      diagram: {
        type: "flow",
        nodes: [
          { label: "Practise daily", note: "logged by the ring" },
          { label: "Keep the streak", note: "against your own last week" },
          { label: "Earn points", note: "for showing up" },
          { label: "Spend them", note: "on the next Haus ticket" },
          { label: "Back in the room", note: "and the streak goes on" },
        ],
      },
    },
    {
      kind: "callout",
      tone: "rules",
      title: "How the points stay healthy",
      items: [
        "Points reward showing up and never a body reading, so nobody is rewarded for a sleep score or a heart rate",
        "One rest day a week keeps a streak alive, because recovery is part of the practice",
        "The best rewards bring people back to a Haus, so the points feed the live experience rather than replacing it",
        "Partner brands come later, so a member can keep a streak and earn points through a partner's class or product once Yauga's own rewards have shown they bring people back",
      ],
    },
    {
      kind: "p",
      text: "OnchainSuite hears when points are earned and spent, never the readings behind them, and tells a member when a reward is within reach. A streak keeps one person coming back, but a movement needs people to come back for each other, so what makes a city feel like it belongs to its members?",
    },
  ],
};

export const CULTURE: ChapterSection = {
  id: "culture",
  parent: "strategy",
  title: "A city to belong to",
  blocks: [
    {
      kind: "p",
      text: "At parkrun, people come back for the same faces every Saturday as much as for their times, and Yauga already has what that needs, with a Haus in each city, a city lead and shared sits. The strategy is to make that belonging something members can see:",
    },
    {
      kind: "table",
      head: ["Idea", "What it looks like"],
      rows: [
        [
          "City identity",
          "Members belong to Yauga Vienna or Yauga Chicago, and the app shows how much their city practised this week",
        ],
        [
          "Shared sits",
          "A time each week when the whole city practises together, at the Haus or at home",
        ],
        [
          "Milestones",
          "The 10th, 25th and 50th check-in, marked by the city lead at the Haus, the way parkrun marks its milestone runs",
        ],
        [
          "Bring someone",
          "A guest pass after a member's third check-in, with points when the guest checks in",
        ],
        [
          "Creators and venues",
          "Each has its own sign-up link, so the people who bring others in get the credit",
        ],
      ],
    },
    {
      kind: "pull",
      text: "A member who belongs to a city ==comes back for the people in it.==",
    },
    {
      kind: "p",
      text: "City leads are the local voice, and their news goes out through HQ in the same voice as everything else, so a member hears one Yauga wherever they are. Each of these moments is also a reason to say something to a member, and the next four pages cover how we say it.",
    },
  ],
};
