/* The Yauga growth and retention strategy, for Yauga's team. It is a strategy
   for the whole ecosystem, with OnchainSuite as the layer that holds the
   member record and sends the communication. It opens on the idea, told
   through one member and one case study, then the strategy and its layers as
   sub-pages (the front door, streaks and points, city culture, and
   communication in four parts), then what we measure, the platform, and what
   we need and never send.
   Source: the Yauga email marketing plan, October 2026, and Kris's
   confirmation on 28 October 2026 of Yauga's product lines and loop, with the
   Yauga App and Haus OS as one platform with different permissions. Event
   names are a working draft for Yauga's developers to confirm, and "Yauga
   Cult" is used throughout pending confirmation of the spelling. The parkrun
   case study is from public sources (parkrun's own history and press
   coverage of its twentieth anniversary, October 2024).
   This page is reached by its link only: it is not on the landing page. */

import {
  CAMPAIGNS,
  LIFECYCLE,
  LOOPS,
  RETENTION_TRIGGERS,
} from "./communication";
import { MEASURE, NEED, PLATFORM } from "./delivery";
import { CULTURE, FRONT_DOOR, REWARDS } from "./experience";
import { OVERVIEW, STRATEGY } from "./idea";
import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";

export const YAUGA: Chapter = {
  id: "yauga",
  number: "04",
  title: "Yauga growth and retention strategy",
  dek: "How Yauga's live experiences bring people in and the rest of the ecosystem gives them a reason to stay, from the front door to the ring and back.",
  sections: [
    OVERVIEW,
    STRATEGY,
    FRONT_DOOR,
    REWARDS,
    CULTURE,
    CAMPAIGNS,
    LOOPS,
    LIFECYCLE,
    RETENTION_TRIGGERS,
    MEASURE,
    PLATFORM,
    NEED,
  ],
};
