/* The opening of the Yauga book: the idea, told through one member and one
   case study, then the strategy across Yauga's product lines and the four
   layers it runs on. */

import type { ChapterSection } from "@/onchain-suite-website/types/retention-playbook";

export const OVERVIEW: ChapterSection = {
  id: "overview",
  title: "Overview of our idea",
  blocks: [
    {
      kind: "p",
      text: "Picture Ada, who sees a Vienna creator's post about Yauga Haus, joins the waitlist on Yauga's website and three weeks later walks into her first evening at the Haus. She goes home feeling better than she has in weeks, and then nothing happens, because the Haus knows she came but nothing in the rest of Yauga uses that to give her a reason to come back.",
    },
    {
      kind: "p",
      text: "Yauga has built far more than a venue, with product lines that run from the Haus Network and the platform behind it to the app, the Yauga Cult ring, connected products for the home and Yauga Enterprise, and the idea behind all of them fits in one line:",
    },
    {
      kind: "pull",
      text: "Live experiences acquire people. ==The ecosystem gives them a reason to stay.==",
    },
    {
      kind: "p",
      text: "What is missing is the thread between them. Only the Haus and Yauga Letters send email today, so a person who comes to a Haus and then starts practising in the app is still a stranger to the rest of Yauga, ==and every product has to win them over again on its own.==",
    },
    {
      kind: "p",
      text: "We are coming to Yauga as a partner for growth and retention, so this is a strategy for the whole ecosystem rather than an email plan. Our idea is to turn Yauga into a culture people belong to: we learn who a person is at the front door and add to it at every step, give them something to keep up every day and a city to belong to, and only ever talk to them about what they did. Email is one of the ways we do that, and OnchainSuite is the tool we would run it on.",
    },
    {
      kind: "artifact",
      code: "04.01",
      title: "Ada, from a creator's post to bringing a friend",
      diagram: {
        type: "timeline",
        points: [
          { when: "Day 0", label: "Sees a post, joins the Vienna waitlist" },
          { when: "Day 20", label: "Checks in at the Haus" },
          { when: "Day 22", label: "Joins the app, pairs the ring" },
          { when: "Day 36", label: "Seven-day streak, first points" },
          { when: "Day 50", label: "Points buy her next Haus ticket" },
          { when: "Day 64", label: "Brings a friend" },
        ],
      },
    },
    {
      kind: "p",
      text: "None of this is a new idea, and parkrun is the clearest proof we know of that it works for live, local gatherings.",
    },
    {
      kind: "callout",
      tone: "note",
      title: "Case study: parkrun",
      items: [
        "It started on 2 October 2004 as a time trial in Bushy Park, London, with 13 runners",
        "Every runner has one barcode, so every run at every event adds to one record",
        "Each runner is emailed their result on the same day as the run",
        "Milestones at 25, 50, 100, 250 and 500 runs give people a reason to come back next week",
        "It now runs at more than 2,000 locations in over 20 countries, with more than ten million people registered",
      ],
    },
    {
      kind: "p",
      text: "What parkrun does is simple: it keeps one record per runner, tells them the same day what they did, marks their milestones and gives them a park full of people who expect them back, without ever chasing them. Yauga already has the live experience that makes this work, so what would the same thing look like across the whole of Yauga?",
    },
  ],
};

export const STRATEGY: ChapterSection = {
  id: "strategy",
  title: "Yauga retention and growth strategy",
  blocks: [
    {
      kind: "p",
      text: "The strategy has one aim, which is that once a person comes through Yauga's front door, every product they touch gives them a reason to stay and tells Yauga a little more about them. It starts from Yauga's product lines, with the record of each member between them:",
    },
    {
      kind: "artifact",
      code: "04.02",
      title: "The Yauga ecosystem, joined by one member record",
      diagram: {
        type: "hub",
        centre: {
          label: "One member record",
          note: "who they are, what they did",
        },
        spokes: [
          {
            label: "Yauga Haus Network",
            note: "the front door: the Haus, Ritual Rooms, Run Club, Social Club",
          },
          {
            label: "Yauga App and Haus OS",
            note: "one platform: members practise, city leads run events",
            dir: "both",
          },
          { label: "Yauga Cult", note: "the ring: daily practice and streaks" },
          { label: "Website", note: "the online front door" },
          {
            label: "Yauga Enterprise",
            note: "people who come in through their employer",
          },
          {
            label: "Connected Products",
            note: "at-home rituals, a branch for later",
            tone: "grey",
          },
        ],
      },
    },
    {
      kind: "p",
      text: "The Yauga App and Haus OS are one platform with different permissions, so a city lead creates and runs events while a member books, practises and holds a membership, and both report into the same record. Every person moves round the same loop:",
    },
    {
      kind: "artifact",
      code: "04.03",
      title: "The Yauga loop",
      diagram: {
        type: "funnel",
        stages: [
          {
            label: "Discover",
            note: "a local community, a creator or a venue",
          },
          { label: "Attend", note: "the Haus, a Ritual Room or the Run Club" },
          {
            label: "Join",
            note: "the app, a membership or the Cult ring: the step that matters most",
            tone: "orange",
          },
          { label: "Practise", note: "meditation, challenges and recovery" },
          { label: "Connect", note: "shared sits and a city to belong to" },
          {
            label: "Return and refer",
            note: "back again, and bringing someone",
          },
        ],
      },
    },
    {
      kind: "p",
      text: "Every turn of the loop runs on four layers, with the member record at the bottom because everything above it depends on how well we know the person:",
    },
    {
      kind: "artifact",
      code: "04.04",
      title: "The four layers of the strategy",
      diagram: {
        type: "stack",
        layers: [
          { label: "Culture", note: "belonging to a city" },
          { label: "Sticky experiences", note: "streaks, points" },
          {
            label: "Communication",
            note: "Letters, campaigns, Loops, triggers",
          },
          { label: "One member record", note: "filled in at every step" },
        ],
      },
    },
    {
      kind: "p",
      text: "The record and the communication run on OnchainSuite, while the sticky experiences and the culture live in Yauga's own products and Hauses, and we would design them with Yauga's team. We would build it in three steps:",
    },
    {
      kind: "list",
      ordered: true,
      items: [
        "The front door, where the website and the Haus fill one record, with Yauga Letters and the Welcome and After the Haus Loops",
        "The daily habit, where the app and the ring bring streaks, points, the First practice Loop and the retention triggers",
        "Belonging and return, with city milestones, referrals, the lifecycle stages and the Slipping, Bring someone and Dormant Loops",
      ],
    },
    {
      kind: "p",
      text: "Yauga Enterprise and the connected products join the same record when they are ready, so nothing has to be rebuilt for them. The first step decides how well every later one works, so what should Yauga ask a person when they first arrive?",
    },
  ],
};
