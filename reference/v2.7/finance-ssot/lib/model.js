"use strict";

/* ============================================================
   1 - Baseline inputs. Changing a value here changes the
       agreed company baseline; changing one in the browser
       only changes your own scenario.
   ============================================================ */
const DEFAULTS = {
  /* vendor + unit costs */
  /* AWS SES, verified against aws.amazon.com/ses/pricing on 23 Aug 2026.
     We are on ESSENTIALS. The $0.10 the model carried until today is real but
     it is the a-la-carte rate, not ours - see sesRates below. This single
     figure moves every email margin in the document. */
  ses: 0.16,
  /* The published rate card, kept here so the plan we are on is a visible
     choice rather than a buried constant. Outbound, 0-10M emails a month. */
  sesRates: [
    {plan:'A la carte', rate:0.10, fee:0,   note:'Pay per feature. Cheapest sending, no bundled deliverability tooling.'},
    {plan:'Essentials',  rate:0.16, fee:0,   note:'What we are on today.'},
    {plan:'Pro',         rate:0.22, fee:105, note:'Plus $105 per account per region, per month.'},
    {plan:'Enterprise',  rate:0.23, fee:500, note:'Plus $500 per account per region, per month.'}
  ],          /* AWS SES, the only email cost. No managed-pool surcharge. */
  pushCost: 0.005,
  kickbox: 0.008, stage1: 0.65,
  /* How much of their list a customer actually enriches in a month. Confirmed
     19 Sep 2026: customers enrich EVERYTHING, so one full pass a month. The
     bundled allowance covers about a twenty-fifth of that; the rest bills as
     overage at the list rate, which is where the on-chain margin actually
     lives. Set to 0 to model allowance-only usage. */
  chainPassesPerMonth: 1,

  /* On-chain wallet data: Alchemy. Measured from production on 11 Sep 2026 -
     1,000 enrichments across two orgs consumed 905,520 CU costing $0.41.
     GoldRush, the previous supplier at $8.33, is not used anywhere.

     This key was called goldrush until 26 Sep 2026. The pricing source of truth
     keeps that name in the PRODUCT codebase because renaming the plan-limit key
     and the usage table there means a migration; none of that applies to a
     finance model, where the name was simply wrong. Renamed on the founder's
     instruction. The five historical rows in the decision log that mention
     GoldRush record the supplier switch and are left as written. */
  /* Our cost is per COMPUTE UNIT, not per credit: $0.000432 a wallet (960 CU at
     $0.45/M). This figure is that cost expressed per 10,000 billed credits, so it
     must move whenever credits-per-wallet does or the cost per wallet silently
     changes. At 2.95 it was $1.38; at 4 it is $1.08. Re-derived 26 Sep 2026. */
  alchemy: 1.08,
  /* No yield step on-chain any more, and this is not a reduction to zero - the
     gap it described has closed. We bill per LIVE call, so a cache hit costs
     the customer nothing and costs us nothing; caching now moves both sides of
     the line together. Kept as an input only so the sensitivity still runs. */
  cacheHit: 0,
  conciergeCost: 60, ipCost: 24.95,
  /* AI cost is derived from token rates, not assumed per action.
     DeepSeek chat in/out, OpenAI text-embedding-3-small. */
  /* DeepSeek v4 flash, PEAK rates - the conservative case. Off-peak is half.
     Cache-hit input is 3% of the miss price, so the hit rate matters more
     than any other AI input. v4-pro costs 3x and is not in use.
     $ per 1M tokens. */
  aiPriceInMiss: 0.44, aiPriceInHit: 0.014, aiPriceOut: 1.32, embedPrice: 0.02,
  aiCacheHit: 0.50,                                      /* share of input tokens served from cache */
  aiTokensIn: 2500, aiTokensOut: 625,                    /* per action */
  buffer: 0.035,
  stripePct: 0.03325, stripeFix: 0.25, stripeFx: 0.0533,

  /* list prices */
  pEmail: 1.00, pPush: 1.00, pOns: 10.00, pChain: 10.00, pAi: 6.00, pConcierge: 150,

  /* Catalogue, repriced 21 Aug 2026. Both lines are now fixed fee plus a rate.
     Suite runs off ONE contact curve with a per-tier multiplier for capability,
     so contacts are a slider and the tier only says what the product can do.
     Plan prices are therefore derived, not typed - see suitePrice() below. */
  /* Launch multiplier raised 0.55 -> 0.79 on 24 Aug 2026: at the corrected SES
     rate, 0.55 put Launch at a 58.6% floor, below the margin rule. Growth and
     Pro still clear the rule unchanged, so neither moves. */
  suite: { fixed: 16, rate: 13.30, mult: {launch:0.79, launchPlus:0.79, growth:1.00, growthPlus:1.00, pro:1.60} },
  /* THE RULE, as the CTO's pricing source of truth states it (section 6a):
     "A plan's price must exceed the cost of its own full allowance. If that
     holds, the plan cannot lose money at any usage level."
     It is a floor-PROFIT test, not a gross-margin threshold. An earlier
     revision of this document asserted a 70% margin floor; that was never in
     the source and is removed. Margins are reported as outcomes, not enforced
     as a target. */
  floorRule: {minProfit: 0},
  plans: {
    /* ONS+ is granted 1:1 with contacts, not at a tenth. Joshua, 24 Aug 2026:
       "ONS+ should match the contacts they paid for." A customer who cannot
       clean their own list without an overage bill will not clean it, and a
       dirty list costs more in deliverability than the verifications do.
       Send is the exception and stays at a tenth - see send.onsRatio. */
    /* Five packages, three capability levels. Launch+ and Growth+ are the same
       product as the tier below at a bigger size - same multiplier, same
       features - so nothing is repriced: their prices fall out of the curve that
       already priced the other three.

       Added 26 Sep 2026. The model priced every customer at the FLOOR of a band,
       so a 10,000-profile deployment was booked as a $39 customer when it has
       always priced at $118 on the curve. That was a modelling artefact, not a
       price. Packages at the sizes customers actually deploy at remove it.

       Launch+ stops at 100,000 emails deliberately: above that a dedicated IP is
       provisioned, which costs $25.82 and takes the floor margin from 55% to 26%.
       The IP threshold sets the ceiling of the package, not a round number. */
    /* On-chain credits: ONE FULL ENRICHMENT PASS of the package's contacts, i.e.
       contacts x 4 credits per wallet, the billing rate. Set by the founder, 26 Sep 2026.

       Until then the allowances were 1,000 / 4,000 / 10,000 / 20,000 / 25,000 -
       roughly 13% of a pass - and the remaining 87% was assumed to be bought as
       overage at seven times cost. That was never a cost constraint: enriching
       every contact on Launch costs $1.05 against a $39 price, and bundling the
       full pass moves every package's floor margin by two to three points. The
       old figures were arbitrary, and the usage-revenue line they produced was
       the assumption an external reviewer called the biggest issue in the
       document. Bundling the pass removes it. */
    launch:     {name:'Launch',  contacts:2500,  emails:50000,  push:25000,   chain:10000,  ai:500,   ons:2500,  ip:0, seats:2},
    launchPlus: {name:'Launch+', contacts:10000, emails:100000, push:100000,  chain:40000,  ai:2000,  ons:10000, ip:0, seats:3},
    growth:     {name:'Growth',  contacts:25000, emails:250000, push:250000,  chain:100000, ai:8000,  ons:25000, ip:1, seats:4},
    growthPlus: {name:'Growth+', contacts:50000, emails:500000, push:500000,  chain:200000, ai:16000, ons:50000, ip:1, seats:5},
    /* Pro AI: 24,000, not 16,000. The old figure was set when Pro sat directly
       above Growth's 8,000 and doubled it. With Growth+ at 16,000 that left Pro
       flat on 1.5x the contacts - the only step in the table that was not 1.5.
       Brought to the Growth-family ratio of 0.32 per contact, 26 Sep 2026. */
    /* SOLD AS ENTERPRISE, CUSTOM PRICED, from 13 Oct 2026. The public pricing
       page no longer lists Pro: the top tier is Enterprise and the price is
       negotiated. The model keeps pricing it off the curve anyway, because the
       derived $1,622 is not a guess at a deal - it is the cost of Pro's own
       full allowance plus the floor-rule margin, which makes it the number a
       negotiation must not go below.

       Two consequences worth stating. Custom deals land ABOVE this floor, so
       every Pro figure in this document is the conservative end of the top
       tier rather than the expected one. And the 10% of signups the mix puts
       here is still modelled as self-serve arrivals; a sales-led tier would be
       fewer, larger and slower, which is a change to make when there are
       Enterprise deals to measure it from, not before. */
    pro:        {name:'Pro',     soldAs:'Enterprise, custom priced', contacts:75000, emails:750000, push:1000000, chain:300000, ai:24000, ons:75000, ip:1, seats:7}
  },
  /* Scale retired 21 Aug 2026: it gated no capability Pro did not already have.
     Hours are still sold by the hour and still bundled with nothing.

     Renamed 13 Oct 2026: "Concierge" is now "Onramp extra hours", and it is off
     the public pricing page. Same $150 rate, same loaded cost, still optional on
     every tier. The variable names below keep the old spelling so the rate card,
     the buffer chain and the underwater test are not rewired for a label; the
     label is read from conciergeLabel. Hours beyond Onramp's 20 bill here. */
  conciergeLabel: 'Onramp extra hours',
  conciergeOnPricingPage: false,
  conciergeHrs: 0,

  /* ONRAMP, 13 Oct 2026, restated 13 Oct after the founder corrected it.
     ONE product, one price: $1,500 flat, priced into the offer. There is no
     such thing as "Enterprise onboarding" - Onramp is what covers an Enterprise
     deal, and it covers everything.

     What differs is the SHAPE of the delivery, not the product or the price:

       Enterprise  the entire sales cycle, six months to a year. This is the
                   real service. Every Enterprise offer carries it.
       Growth      a knock-off of it: 20 hours over 90 days, the cut-down
                   version that fits a self-serve plan. Optional.

     Not sold on Launch or Launch+.

     The flat price is the point and it is deliberate: at the modelled cycle
     Enterprise delivery costs $4,471 against the same $1,500 everyone pays, so
     the service runs at a loss on an Enterprise deal and is carried by the
     subscription it protects. Growth delivery costs $1,242 against $1,500 and
     covers itself. Both are priced into the offer rather than quoted as a
     margin line.

     Cost is never typed. It is hours x the loaded hours rate, so the programme
     follows the rate. */
  onramp: {
    price: 1500,
    /* The real service: the whole sales cycle. Cycle length from the founder,
       six months to a year; modelled at the midpoint and reported at both ends.
       HOURS A MONTH IS A PLACEHOLDER - 8, one working day - and it is the
       figure here most worth replacing once a deal has been run. */
    enterprise: {
      tiers: ['pro'],
      cycleMonths: 9, cycleMonthsLow: 6, cycleMonthsHigh: 12,
      hoursPerMonth: 8,
      takeUp: 1.00          /* every Enterprise offer carries it */
    },
    /* The knock-off, for self-serve plans. */
    growth: {
      tiers: ['growth','growthPlus'],
      months: 3, hours: 20,
      takeUp: 0.50          /* half of new Growth and Growth+ accounts */
    },
    /* Delivery capacity, counted across both shapes: an Enterprise cycle at 8
       hours a month and a Growth programme at 20 over 90 days are within an
       hour a month of each other, so one open engagement is one either way.
       Before the customer success manager the founders deliver and the cap is a
       start rate; after, it is how many may be open at once. 10 rather than the
       8 first briefed, because 3 starts a month already sustains 9 open. */
    startCapBefore: 3,
    /* 10, set by the founder on 13 Oct 2026. It was enough when Onramp was a
       90-day programme; it is not enough now that an Enterprise engagement
       holds a slot for the whole sales cycle. The cap starts binding in FY2029
       and by FY2031 the projection turns away 11.4 engagements a year: 21.8
       over the horizon, worth about GBP 10,600 of FY2031 EBITDA and GBP 18,700
       of five-year cash. 14 clears nearly all of it and 16 clears it entirely.

       That is a staffing question rather than a dial, which is why it is left
       where the founder set it: 10 open engagements is about 80 hours a month
       of delivery against a 173-hour month, so clearing the backlog means the
       customer success manager is mostly an onboarding person by FY2029, or
       there is a second person doing it. */
    concurrentCapAfter: 10,
    specialistRole: 'Customer success manager'
  },

  payg: {contacts:1000, seats:2, autos:3, topup:10},

  /* Fixed infrastructure, itemised from the provider price sheet.
     Defaults to the production stack the price sheet actually supports.
     Page 03 carries presets for today's measured spend and for the
     unevidenced $715 the plan used to carry. */
  /* HOSTING ONLY. The bills that arrive with a customer - SES sends, Alchemy
     credits, Kickbox, card fees - are NOT here; they are cost of revenue and are
     charged per customer. Confirmed 5 Aug 2026: the $715 figure the plan used to
     carry was the all-in cost of ten customers, not a hosting bill, so carrying it
     here counted every per-customer cost twice. Each line is quantity x contracted
     rate. */
  /* Send plan - email only, no wallet channel. Priced flat per subscriber,
     which is the whole point: every competitor discounts by volume, we do not.
     octopus[] are real EmailOctopus prices taken from a customer invoice. */
  send: { fixed: 6, rate: 3.95, ratio: 6,
          /* Send carries NO paid verification. The pricing source of truth puts it at
             a tenth of subscribers, but that predates the decision that Send's email
             verification is handled by our own internal filter rather than escalated
             to Kickbox. Stage one is ours and costs essentially nothing at the
             margin; stage two is the line that has a bill attached, and Send does not
             use it.

             Set to 0 on the founder's instruction, 26 Sep 2026, overriding the source
             document. Charging it added $7.25 at 25,000 subscribers to a plan whose
             whole purpose is to be the cheap, simple line. */
          onsRatio: 0,
          sizes: [1000, 2500, 5000, 10000, 16444, 25000, 50000, 100000],
          /* EmailOctopus Pro, their published ladder. Our own invoice verified
             5,000 / 10,000 / 20,000 against it exactly, which is why the rungs
             we never invoiced are trusted too. Corrected 21 Aug 2026: we had
             estimated $24 at 2,500 (real $20) and extrapolated $287 at 100,000
             (real $345). */
          octopus: [[500,10],[1000,13.50],[2500,20],[5000,31.50],[10000,44.50],
                    [25000,94.50],[50000,178],[100000,345],[250000,800],[500000,1478]],
          /* They are free to here. Below it the competing price is zero, not a
             discount, so the bottom rung converts on product, never on price. */
          octopusFree: {subs: 2500, emails: 10000} },
  /* What we can honestly claim against the field. Same scale as the
     competitors: 1 full, 0.5 partial or add-on, 0 absent. SMS is the one
     outright zero, and pretending otherwise in our own research would make
     the rest of it worthless. CRM scores full: Audience holds the contact
     record and the whole journey of every user, which is what this market
     means by CRM. Transactional scores full too - we ship the API. */
  suiteCaps: {camp:1, auto:1, forms:1, seg:1, trans:1, sms:0, ecom:0.5, crm:1, ai:1, wallet:1, chain:1},
  capLabels: [
    ['camp','Email campaigns'], ['auto','Automations'], ['forms','Forms &amp; landing pages'],
    ['seg','Segmentation'], ['ai','AI assistance'], ['trans','Transactional API'],
    ['ecom','Ecommerce'], ['sms','SMS'], ['crm','CRM &amp; journeys'],
    ['wallet','Wallet channel'], ['chain','On-chain triggers']
  ],

  /* ---- Market: 26 published ladders, each fitted to price = a x volume^b.
     Collected 21 Aug 2026. threat 3 = same buyer at the same size, 1 = a
     different buyer entirely. Prices are list, monthly, single currency. */
  market: [
    {n:"HubSpot Professional", meter:"contacts", seg:"Enterprise CRM", who:"Mid-market sales and marketing teams buying a CRM, not an ESP", a:61.8167614, b:0.3666, r2:0.9384, caps:{camp:1,auto:1,forms:1,seg:1,trans:.5,sms:1,ecom:.5,crm:1,ai:1,wallet:0,chain:0},threat:1,
     fit:"Different buyer and 10x the price. We never meet them in a deal.",
     pts:[[1000,890],[10000,1390],[50000,3190],[100000,4890]]},
    {n:"Constant Contact Standard", meter:"contacts", seg:"SMB generalist", who:"Local and offline-first small businesses", a:2.98824825, b:0.4544, r2:0.9618, caps:{camp:1,auto:.5,forms:1,seg:.5,trans:0,sms:.5,ecom:.5,crm:.5,ai:.5,wallet:0,chain:0},threat:1,
     fit:"Older, offline-leaning base. Little overlap with either of our audiences.",
     pts:[[1000,75],[10000,160],[50000,460]]},
    {n:"Kit Pro", meter:"contacts", seg:"Creator", who:"Newsletter writers, course sellers, paid subscriptions", a:1.57175117, b:0.5304, r2:0.9698, caps:{camp:1,auto:1,forms:1,seg:1,trans:0,sms:0,ecom:.5,crm:0,ai:.5,wallet:0,chain:0},threat:3,
     fit:"Free to 10,000 subscribers. The hardest competitor at the bottom of Send.",
     pts:[[1000,79],[3000,99],[5000,139],[8000,169],[20000,269],[25000,279],[45000,447],[55000,519],[75000,663],[115000,939]]},
    {n:"Kit Creator", meter:"contacts", seg:"Creator", who:"Newsletter writers starting out", a:0.47935279, b:0.6128, r2:0.9847, caps:{camp:1,auto:.5,forms:1,seg:.5,trans:0,sms:0,ecom:.5,crm:0,ai:.5,wallet:0,chain:0},threat:3,
     fit:"Free to 10,000 subscribers, unlimited sends. Our bottom rung competes with zero.",
     pts:[[1000,39],[3000,59],[5000,89],[8000,119],[20000,189],[25000,199],[45000,319],[55000,379],[75000,499],[115000,739]]},
    {n:"EmailOctopus Connect", meter:"contacts", seg:"Technical SMB", who:"Teams who bring their own AWS SES keys", a:0.15580616, b:0.6148, r2:0.9768, caps:{camp:1,auto:.5,forms:.5,seg:.5,trans:0,sms:0,ecom:0,crm:0,ai:0,wallet:0,chain:0},threat:3,
     fit:"Sells exactly our cost structure as the product. Direct threat to the Send story.",
     pts:[[500,9],[5000,26],[25000,56],[100000,178],[500000,645]]},
    {n:"MailerLite Power", meter:"contacts", seg:"SMB / creator", who:"Small businesses and creators wanting cheap automation", a:0.43486871, b:0.623, r2:0.9847, caps:{camp:1,auto:1,forms:1,seg:1,trans:0,sms:0,ecom:.5,crm:0,ai:.5,wallet:0,chain:0},threat:3,
     fit:"Cheapest credible full-feature rival across the sizes Send targets.",
     pts:[[500,25],[1000,39],[2500,49],[5000,69],[8000,99],[10000,129],[20000,219],[25000,239],[35000,309],[50000,389],[60000,419],[80000,459],[100000,489],[150000,759],[200000,1119]]},
    {n:"ActiveCampaign Pro", meter:"contacts", seg:"SMB automation", who:"Businesses buying automation depth first", a:1.01605502, b:0.6335, r2:0.9972, caps:{camp:1,auto:1,forms:1,seg:1,trans:.5,sms:1,ecom:.5,crm:1,ai:1,wallet:0,chain:0},threat:2,
     fit:"Upmarket of Send, under Suite. Competes on automation, not price.",
     pts:[[1000,79],[2500,149],[5000,205],[10000,375],[25000,629],[50000,969],[100000,1599],[200000,2135]]},
    {n:"Campaign Monitor Essentials", meter:"contacts", seg:"Agency", who:"Agencies and brand marketers managing client lists", a:0.5207479, b:0.6502, r2:0.9942, caps:{camp:1,auto:.5,forms:1,seg:.5,trans:.5,sms:0,ecom:.5,crm:0,ai:.5,wallet:0,chain:0},threat:2,
     fit:"Agency channel overlaps our partner route to market.",
     pts:[[500,31],[10000,182],[50000,644]]},
    {n:"Omnisend Pro", meter:"contacts", seg:"Ecommerce", who:"Shopify and WooCommerce stores", a:0.53404989, b:0.6552, r2:0.9, caps:{camp:1,auto:1,forms:1,seg:1,trans:0,sms:1,ecom:1,crm:.5,ai:.5,wallet:0,chain:0},threat:2,
     fit:"Ecommerce is a real slice of our web2 target.",
     pts:[[500,59],[3000,70],[5000,90],[6000,115],[12000,242],[23500,398],[31000,542],[37500,594],[100000,1334]]},
    {n:"Mailchimp Standard", meter:"contacts", seg:"SMB default", who:"The default first choice for small businesses", a:0.38491732, b:0.6554, r2:0.9883, caps:{camp:1,auto:1,forms:1,seg:1,trans:.5,sms:.5,ecom:1,crm:.5,ai:1,wallet:0,chain:0},threat:3,
     fit:"Not cheapest, but the name a buyer reaches for first. We are compared to it whether we like it or not.",
     pts:[[500,20],[1000,45],[10000,135],[50000,450],[100000,800]]},
    {n:"Brevo Standard", meter:"emails", seg:"SMB, send-metered", who:"Businesses with big lists and low send frequency", a:0.05120133, b:0.6878, r2:1.0, caps:{camp:1,auto:1,forms:1,seg:1,trans:1,sms:1,ecom:.5,crm:1,ai:.5,wallet:0,chain:0},threat:2,
     fit:"Meters emails, not contacts, so it wins large dormant lists outright.",
     pts:[[5000,18],[100000,139],[500000,429]]},
    {n:"ActiveCampaign Plus", meter:"contacts", seg:"SMB automation", who:"Smaller teams buying into the automation ladder", a:0.39767938, b:0.6886, r2:0.9925, caps:{camp:1,auto:1,forms:1,seg:1,trans:.5,sms:1,ecom:.5,crm:1,ai:.5,wallet:0,chain:0},threat:2,
     fit:"Entry rung of the automation buyer. Overlaps Growth.",
     pts:[[1000,49],[2500,95],[5000,145],[10000,189],[25000,389],[50000,609],[100000,1199],[200000,1999]]},
    {n:"Mailchimp Essentials", meter:"contacts", seg:"SMB default", who:"Price-led small businesses on the default platform", a:0.17147006, b:0.7103, r2:0.9952, caps:{camp:1,auto:.5,forms:1,seg:.5,trans:.5,sms:.5,ecom:.5,crm:.5,ai:.5,wallet:0,chain:0},threat:3,
     fit:"The rung most Send prospects are actually on today.",
     pts:[[500,13],[1000,26.5],[10000,110],[50000,385]]},
    {n:"MailerLite Comfort", meter:"contacts", seg:"SMB / creator", who:"Cost-led small businesses", a:0.12981765, b:0.7134, r2:0.9962, caps:{camp:1,auto:.5,forms:1,seg:.5,trans:0,sms:0,ecom:.5,crm:0,ai:.5,wallet:0,chain:0},threat:3,
     fit:"Direct price competitor across the whole Send range.",
     pts:[[500,12],[1000,19],[2500,33],[5000,49],[8000,69],[10000,89],[20000,159],[25000,179],[35000,249],[50000,319],[60000,359],[80000,399],[100000,439],[150000,619],[200000,819]]},
    {n:"Mailgun", meter:"emails", seg:"Developer API", who:"Engineers sending transactional mail", a:0.01611682, b:0.7338, r2:0.9353, caps:{camp:0,auto:0,forms:0,seg:0,trans:1,sms:0,ecom:0,crm:0,ai:0,wallet:0,chain:0},threat:1,
     fit:"Transactional, not campaigns. Different job entirely.",
     pts:[[10000,15],[50000,35],[100000,90]]},
    {n:"EmailOctopus Pro", meter:"contacts", seg:"Price-led SMB", who:"Small teams who found Mailchimp too expensive", a:0.06999926, b:0.7374, r2:0.9807, caps:{camp:1,auto:.5,forms:1,seg:.5,trans:0,sms:0,ecom:0,crm:0,ai:0,wallet:0,chain:0},threat:3,
     fit:"Our primary Send benchmark, and the invoice we verified against.",
     pts:[[500,10],[1000,13.5],[2500,20],[5000,31.5],[10000,44.5],[25000,94.5],[50000,178],[100000,345],[250000,800],[500000,1478]]},
    {n:"Brevo Starter", meter:"emails", seg:"SMB, send-metered", who:"Cost-led businesses metered on volume sent", a:0.01682971, b:0.7375, r2:1.0, caps:{camp:1,auto:.5,forms:1,seg:.5,trans:1,sms:1,ecom:.5,crm:.5,ai:.5,wallet:0,chain:0},threat:2,
     fit:"Cheap on paper; wins where lists are large and mostly idle.",
     pts:[[5000,9],[100000,82]]},
    {n:"Loops", meter:"contacts", seg:"SaaS", who:"Modern software companies sending product email", a:0.08165281, b:0.7562, r2:0.9844, caps:{camp:1,auto:1,forms:.5,seg:1,trans:1,sms:0,ecom:0,crm:0,ai:.5,wallet:0,chain:0},threat:2,
     fit:"Closest to us in spirit and audience. Worth watching more than any of the incumbents.",
     pts:[[5000,49],[10000,99],[25000,199],[50000,249],[100000,399],[200000,799],[500000,1999]]},
    {n:"Omnisend Standard", meter:"contacts", seg:"Ecommerce", who:"Smaller stores on the entry tier", a:0.09876804, b:0.7881, r2:0.9935, caps:{camp:1,auto:1,forms:1,seg:1,trans:0,sms:.5,ecom:1,crm:.5,ai:.5,wallet:0,chain:0},threat:2,
     fit:"Entry ecommerce. Overlaps the Send audience at small sizes.",
     pts:[[500,16],[1500,25],[3000,50],[5000,81],[6000,100],[12000,175],[23500,276],[31000,344],[37500,363],[95000,850],[100000,900]]},
    {n:"Bird Growth", meter:"emails", seg:"Enterprise CPaaS", who:"Large multi-channel messaging programmes", a:0.00849957, b:0.797, r2:0.9992, caps:{camp:.5,auto:.5,forms:0,seg:.5,trans:1,sms:1,ecom:0,crm:.5,ai:.5,wallet:0,chain:0},threat:1,
     fit:"Enterprise procurement. Not a deal we are in.",
     pts:[[100000,80],[250000,175],[500000,295],[1000000,530],[2500000,1039]]},
    {n:"Resend Scale", meter:"emails", seg:"Developer API", who:"Product teams sending from their own app", a:0.00862112, b:0.8064, r2:0.9967, caps:{camp:.5,auto:0,forms:0,seg:0,trans:1,sms:0,ecom:0,crm:0,ai:0,wallet:0,chain:0},threat:1,
     fit:"Developer tooling. Adjacent, not competing.",
     pts:[[100000,90],[200000,160],[500000,350],[1000000,650],[1500000,825],[2500000,1150]]},
    {n:"Postmark", meter:"emails", seg:"Developer API", who:"Engineers who need deliverability guarantees", a:0.00884976, b:0.8073, r2:1.0, caps:{camp:0,auto:0,forms:0,seg:0,trans:1,sms:0,ecom:0,crm:0,ai:0,wallet:0,chain:0},threat:1,
     fit:"Transactional only. Different buyer.",
     pts:[[10000,15],[50000,55]]},
    {n:"Klaviyo Email", meter:"contacts", seg:"Ecommerce premium", who:"High-value stores buying revenue attribution", a:0.10417192, b:0.818, r2:0.9944, caps:{camp:1,auto:1,forms:1,seg:1,trans:.5,sms:1,ecom:1,crm:.5,ai:1,wallet:0,chain:0},threat:2,
     fit:"Prices on value, not volume. The model Suite should study.",
     pts:[[500,20],[1000,30],[5000,100],[10000,150],[25000,400],[50000,720],[75000,1070],[100000,1380],[150000,1955]]},
    {n:"Mailjet Premium", meter:"emails", seg:"SMB / developer", who:"Mixed marketing and transactional needs", a:0.0080232, b:0.8306, r2:0.9894, caps:{camp:1,auto:.5,forms:1,seg:.5,trans:1,sms:.5,ecom:0,crm:0,ai:.5,wallet:0,chain:0},threat:2,
     fit:"Hybrid buyer. Occasionally in the same shortlist.",
     pts:[[15000,27],[50000,55],[100000,105],[250000,250],[500000,470]]},
    {n:"MailerSend Starter", meter:"emails", seg:"Developer API", who:"Product teams metered on emails sent", a:0.00427888, b:0.8505, r2:0.9929, caps:{camp:.5,auto:0,forms:.5,seg:0,trans:1,sms:.5,ecom:0,crm:0,ai:0,wallet:0,chain:0},threat:1,
     fit:"Transactional. Different job.",
     pts:[[5000,7],[50000,35],[100000,68],[250000,162.5],[500000,325],[1000000,600]]},
    {n:"Amazon SES Essentials", meter:"emails", seg:"Raw utility", who:"Anyone willing to build the product themselves", a:0.00016, b:1.0, r2:1.0, caps:{camp:0,auto:0,forms:0,seg:0,trans:1,sms:0,ecom:0,crm:0,ai:0,wallet:0,chain:0},threat:3,
     fit:"Our own supplier and the absolute price floor. Every rival is marked up from here.",
     pts:[[100000,16],[1000000,160],[10000000,1600]]}
  ],
  /* atlasServer: Atlas runs on its own droplet, "atlas-db", separate from the
     application hosting, and OnchainSuite pays for it: US$48.00 a month. The
     hosting line never showed it. Charged from month 1, because the company has
     been paying the invoice since it started. */
  infraSpec: {droplets:1, dropletRate:48, backupPct:0.20, domains:5, atlasServer:48, unallocated:0},
  /* Hosting recovery. Used to price, NOT as a second cost line: the actual
     hosting bill is already charged once in opex, so adding it to cost of
     revenue as well would double count it. These rates answer "what should a
     unit cost if it carried its share of the servers", which is a pricing
     question, not an accounting one. Capacity figures are assumed and tie
     directly to the open droplet-capacity question below. */
  hostingLoad: {emailsPerDroplet: 5000000, contactsPerDroplet: 500000, sendShare: 0.70},

  /* Tiers are contact BANDS in the product, not reference points on a slider.
     A customer at 25,000 contacts is on Growth, not Pro. Confirmed with Joshua
     22 Aug 2026: the bands are the intent. */
  bands: [
    {id:'launch',     from:0,     to:9999},
    {id:'launchPlus', from:10000, to:24999},
    {id:'growth',     from:25000, to:49999},
    {id:'growthPlus', from:50000, to:74999},
    {id:'pro',        from:75000, to:null}
  ],
  /* Minimum sellable size per tier, added 22 Aug 2026. The rule in the margin
     section was verified only at the three reference counts; across part of the
     slider below them it was false - at 2,500 contacts Growth cost $77 against
     a $49 price. Below its minimum a tier is still quoted, at the minimum's
     price, flagged as a floor. */
  minSize: {launch:2500, growth:5000, pro:7500, send:5000},
  /* Extra seats above a tier's included count. A delta, never a total - the
     tier's own seats are already paid for by its price. Priced under the
     Launch-to-Growth step on purpose, so buying a seat never cannibalises the
     upgrade it is meant to defer. A seat costs essentially nothing to serve. */
  extraSeat: {price: 10, maxPerCheckout: 50},

  /* Measured hosting capacity, 21 Aug 2026. The tier we run now carries 150
     customers; past that we move to the larger droplet, which carries 500.
     Beyond 500 we add another 500-customer block. This replaces the old
     placeholder that assumed a step every 10 customers. */
  infraTiers: [
    {maxUsers: 150, rate: 48},
    {maxUsers: 500, rate: 80}
  ],
  /* Legacy single-number capacity, kept only for the page 03 per-user maths. */
  infraCapacity: {users: 10, mode: 'flat'},      /* mode: flat | stepped */

  /* The CTO's all-in figure, kept as a live cross-check rather than an input:
     hosting plus everything `users` customers consume should land on `total`. */
  benchmark: {total: 715, users: 10},

  /* Measured spend. July is the last clean month; August carries July items. */
  spend: {actual:72.05, users:1, budgetBuffer:0.20},

  /* What has actually happened. The projection starts from here, not from zero. */
  actuals: [
    {m:'July 2026',   customers:1, revenue:125, cost:72.05,
     note:'vault777 on the old Growth plan, 52k emails. Azure $3, AWS $12.50, Neon $10.94, Render $45.61.'},
    {m:'August 2026', customers:2, revenue:98, cost:196,
     note:'Yauga and Surgence on Launch. Corrected 23 Sep 2026: Datum Labs had been counted as a third paying customer and has never paid. Render $96, Neon $50, AWS $50. Not final; includes July carryover.'}
  ],

  /* blend + retention */
  /* Stress case by default, 21 Aug 2026: every customer consumes their whole
     allowance. Nothing in this document assumes light usage any more. */
  util: 1.00,
  /* Tier mix, revised 19 Sep 2026. Growth and Pro are the target bins: the
     go-to-market is large accounts, so most Suite customers land in the two
     upper tiers and Launch becomes the entry point rather than the bulk.
     Shares are of SUITE customers only. */
  /* Share of new Suite customers landing on each package. Keyed rather than
     three scalars, because there are five packages now. Must sum to 1. */
  mix: {launch: 0.15, launchPlus: 0.25, growth: 0.30, growthPlus: 0.20, pro: 0.10},
  /* Suite is the main product and the focus. Send is a secondary line: a flat
     quarter of new signups, set 22 Aug 2026. share0 and shareEnd are equal, so
     the share does not drift - set them apart to model a Send line that grows
     or fades over time. */
  sendPlan: { share0: 0.25, shareEnd: 0.25, avgSubs: 8000 },
  planChurn: 0.05,        /* fixed by decision, not a placeholder */
  cac: 0,                 /* customers arrive through MOUs, not paid acquisition */
  ltvCacTarget: 3,
  /* A contact may own several wallets, and enrichment is priced per wallet.
     This is what decides whether a bundled on-chain allowance covers a list. */
  /* One identifier is one contact. An email is a contact, a wallet is a contact,
     a Telegram handle is a contact, an X handle is a contact. A person holding
     three wallets is three contacts for billing. Set by the founder, 26 Sep 2026.

     Until then this was 3 - "a contact is a person, wallets fan out from them" -
     and every enrichment figure was multiplied by it. The pricing source of
     truth never had that multiplier: its enrichment-gap table gives Growth
     75,000 credits for a full pass, which is 25,000 contacts x 3 credits, and
     at 1 wallet per contact the model reached the same ~13% coverage the
     document stated. The multiplier was the whole of the gap between them.
     Later the same day the allowances were raised to a full pass, so coverage
     is now 100% and the 13% is history. */
  /* creditsPerWallet is the RATE a wallet enrichment bills to the customer: 4 credits,
     $0.004 at the $10-per-10,000 list price, the same at import and at overage. Set by
     the founder, 26 Sep 2026. The 2.95 it replaces was the 11 Sep MEASUREMENT - an
     average of billed credits across 1,000 enrichments, which includes cache hits
     that bill fewer. For sizing a full pass at import every call is live, so the
     rate is the right number, not the average. */
  walletsPerContact: 1, creditsPerWallet: 4,

  /* Agencies and foundations are the primary channel, and an agency partner
     programme carries a revenue share. It is a cost on revenue, so it lands in
     cost of revenue and reduces gross margin directly. Defaults to zero
     coverage: nothing is signed yet, so the forecast claims no partner
     revenue and pays no partner cost. */
  partner: {coverage: 0, cut: 0.20},

  /* Founders draw nothing until BOTH conditions hold:
       1. external capital is secured (a raise with a non-zero amount, from `month`)
       2. gross profit covers every other cost with the full draw left over
     Grants are deliberately absent: non-equity and uncertain, so they are upside
     rather than a line anyone plans against. */
  /* founderTotalYear covers the TWO part-time founders only. The CEO is paid the
     stipend above from January 2027, so leaving the pool at three would pay that
     person twice from month 13 onward. Still gated on the raise and on gross
     profit covering it. */
  /* The pool covers ONE part-time founder from 10 Oct 2026. The CTO goes full
     time on a salary in the raise month, so the pool that used to cover two now
     covers Joel alone: US$18,000 a year, GBP 1,106 a month. It is gated on the
     raise and on gross profit covering it, and the raise lands the same month
     the CTO starts, so the gate changes nothing on its own. */
  raise: {month: 13, amount: 150000, founderTotalYear: 18000},

  /* Company overheads: the cost of being a company rather than running a
     product. Entered in GBP because that is how they are billed, converted at
     the rate below. Everything else in this model is USD. */
  fx: {gbpUsd: 1.3556},          /* Frankfurter, 19 Aug 2026 */
  /* UK company overheads, GBP per month unless marked. Estimates, not invoices:
     page 09 has listed these as open since August and a plan cannot be built
     without them. Every line is an input - replace with real figures as bills
     arrive. Office is zero because the company is remote; it is kept as a line
     so taking space is a visible decision rather than a silent one. */
  /* What the company actually pays, confirmed by the founder 23 Sep 2026.
     These replaced researched estimates that had put overheads at GBP 798 a
     month; nobody had checked them against a bank statement. The company runs
     deliberately lean, so most lines are genuinely zero. */
  overheads: {
    legal:          0,   /* no retainer. Legal spend is lumpy - incorporation,
                            the raise - and is not a monthly cost */
    accounting: 16.67,   /* GBP 200 a year: accounting is done on Tide, and an
                            accountant is bought by the hour at year end
                            (GBP 100 per 2 hours) */
    insurance:     60,   /* professional indemnity and cyber */
    software:       0,   /* Notion free, GitHub free, the website is ours.
                            Paid tooling is in cost of revenue, not here.
                            This stops being zero when the team is 5 people */
    office:         0,   /* remote */
    marketing:      0,   /* no paid acquisition - the same decision that holds
                            CAC at zero. Content is written in house */
    bank:          10,   /* business account and FX */
    ico:         4.33,   /* data protection fee, GBP 52 a year - INVOICED,
                            not estimated. Tier 1 rose from GBP 40 in Feb 2024 */
    operations:    25    /* domains, filings, sundries */
  },
  /* One-off costs that arrive with a hire rather than with a month. Equipment
     is capital: it buys an asset and depreciates over its life. */
  /* recruitPct 0 from 7 Oct 2026: hiring is done by the founders through their own
     network, so there is no agency fee to allow for. Equipment stays - a hire still
     needs a machine, and it is capital rather than an expense. */
  perHire: {recruitPct: 0, equipmentGbp: 1500, equipLifeMonths: 36},

  /* Two overheads that are not flat, because the obligations behind them are not.

     Accounting: GBP 200 a year holds only while there is no payroll. From June
     2027 the CEO is on PAYE and that is a monthly filing; from FY2029 there are
     three on payroll, plus VAT returns once revenue passes the GBP 90,000
     threshold in FY2028, plus annual accounts and a corporation tax return.
     'from' is a model month.

     Software: free tiers carry three founders and do not carry a team. The line
     starts when headcount reaches five - August 2029 on the current hire list -
     and is charged per seat for workspace, project and password tooling. Until
     then the model promised this cost in a comment and never charged it. */
  accountingSteps: [
    {from: 1,  gbp: 16.67, why: 'Tide, plus an accountant bought by the hour at year end'},
    {from: 10, gbp: 100,   why: 'PAYE becomes a monthly filing once the CEO is on payroll'},
    {from: 36, gbp: 200,   why: 'three on payroll, VAT returns, accounts and a CT computation'}
  ],
  softwarePerSeat: {gbp: 25, fromHeadcount: 5},

  /* Balance sheet inputs. Share capital is the nominal value of the founders'
     shares; founder investment is cash they put in to bridge before the raise,
     which the model sizes rather than assumes. Insurance is paid annually in
     advance, which is what creates a prepayment; employer on-costs go to HMRC
     the month after they are incurred, which is what creates a payroll
     creditor. */
  balance: {shareCapitalGbp: 100, founderInvestment: 5000, insurancePaidAnnually: true},

  /* UK corporation tax. Small-profits rate to the lower limit, main rate above
     the upper, marginal relief between. Losses carry forward against future
     profits. Paid nine months and a day after the year end, so the charge and
     the cash movement are different months - which is the whole reason the
     balance sheet needs a tax creditor. */
  /* We charge and earn in dollars; we file in pounds. Every figure in this
     document is computed in USD and converted for display only, at fx.gbpUsd.
     'usd' | 'gbp' | 'both'. */
  ccy: 'both',

  tax: {
    /* The founders control Datum Labs as well, and companies under common
       control share one set of limits (CTA 2010 s.18E), so the bands divide by
       (1 + n). Confirmed by the founder 23 Sep 2026; worth re-confirming with
       the accountant, because it is a control test, not an ownership one. */
    associatedCompanies: 1,
    smallRate: 0.19, mainRate: 0.25,
    lowerGbp: 50000, upperGbp: 250000,
    marginalFraction: 3/200,
    payMonthsAfterYearEnd: 9
  },   /* GBP per month */

  /* Worst-case settings for the runway requirement on page 08.
     Founder pay is excluded by definition: it starts when funding lands. */
  worst: {months:12, churn:0.08, newPerMonth:0, util:1.00, droplets:3,
          contingency:0.20},   /* the same 20% buffer rule already used on spend */

  /* projection */
  /* The forecast is anchored to the public beta, not to the date we happen to
     write it. Before launch we are testing, not selling, so signups are a
     trickle of design partners; after it they ramp to full velocity over
     rampMonths rather than starting there. Written 22 Aug 2026 in response to
     feedback that a pre-launch company projecting full-velocity sales from
     month one is harder to defend, not easier. */
  launch: {
    month: 3,            /* month 1 is September 2026, so month 3 is November */
    rampMonths: 6,       /* months from launch to full velocity */
    preLaunch: 0.5       /* design partners a month while still in private beta */
  },
  fin: {
    months: 59, startCash: 3.95,
    startMonth: 9, startYear: 2026,      /* month 1 = September 2026 */
    /* Statutory year end is 31 July (Companies House). Financial years are cut
       on that boundary, so FY1 runs Aug 2026 - Jul 2027 and picks up the August
       actual; 59 forecast months then closes exactly five statutory years. */
    fyEndMonth: 7,
    /* The book as it stands, by name rather than by applying a target mix to a
       headcount. The mix describes who we WIN, not who we already have, and
       using it to seed the opening book overstated MRR by 82%. */
    /* The opening book, one row per customer rather than a headcount.
       An external reviewer asked for actual prices, currencies, first-paid dates
       and plan changes per customer, and a set of counts cannot carry any of
       that. startBook below is COUNTED from this list, so the list is the fact
       and the counts are derived - which is the way round this document works
       everywhere else.

       status:
         paying   - invoiced and paid, counts toward opening MRR
         pipeline - using or onboarding, not yet paying, deliberately OUTSIDE MRR.
                    Not described as "signed": no agreement has been confirmed to
                    this document, and a reviewer was right to ask.
         churned  - paid once and stopped; historical revenue only
         internal - our own company; never counted as a customer

       Only 'paying' seeds the projection. Anything else is recorded here so the
       book can be audited against the invoices rather than taken on trust. */
    customers: [
      /* opening:true means the customer was already trading when the forecast
         opens, so it seeds month 1.

         Corrected 4 Oct 2026: four accounts recorded here as paying - Predict
         Street, Mey Network, DDSC and Abiflo - are onboarding rather than
         invoiced, and are now marked as such. Three customers are paying. No
         forecast figure moves, because the projection already opened with those
         three; what changes is the cover count and the measured gross profit
         tile, both of which were describing a book that did not exist. */
      {name: 'Yauga',          plan: 'send',   status: 'paying', opening: true, since: '2026-08', use: 'off-chain'},
      {name: 'Rehitage',       plan: 'send',   status: 'paying', opening: true,                   use: 'off-chain'},
      {name: 'Surgence',       plan: 'launch', status: 'paying', opening: true, since: '2026-08', use: 'off-chain'},
      {name: 'Predict Street', plan: 'growth', status: 'pipeline', stage: 'Onboarding', use: 'on-chain'},
      {name: 'Mey Network',    plan: 'growth', status: 'pipeline', stage: 'Onboarding', use: 'on-chain'},
      {name: 'DDSC',           plan: 'send',   status: 'pipeline', stage: 'Onboarding', use: 'off-chain'},

      {name: 'Deadstock',      plan: 'growth', status: 'pipeline', stage: 'Onboarding',
       note: 'Growth expected. Outside paid MRR until payment starts.'},
      {name: 'DexWin',         plan: 'growth', status: 'pipeline', stage: 'Using the product, payment pending',
       note: 'Growth expected. Outside paid MRR until payment starts.'},
      {name: 'vault777',       plan: 'growth', status: 'churned', since: '2026-07', until: '2026-09',
       note: 'First paying customer, on the old Growth plan. Historical revenue is in the actuals; it is not in the opening book.'},
      {name: 'Datum Labs',     plan: null,     status: 'internal',
       note: 'Our own company. Counted as a paying customer in the August actual until 23 Sep 2026; it has never paid.'}
    ],
    newPerMonth: 5, newGrowth: 0.05, churn: 0.05, overageRate: 0,
    /* Compounding 5% for sixty months is a sales organisation we do not have.
       Growth decays toward a floor after the ramp; churn does NOT improve,
       because it has never been measured and assuming it falls would be
       inventing good news. */
    growthDecay: 0.94, growthFloor: 0.01,
    founders: 1,   /* the one on the pool; CEO and CTO are on salaries */
    /* Hires, priced against UK market rates researched 19 Sep 2026 and held
       mid-market. Both hires are JUNIOR, and each sits just above its own UK
       average rather than at a London rate: junior backend developers average
       £31,061 (London £31,461, range £24-38k) and junior data engineers average
       £33,817 (London £34,645, graduates £28-38k). A pre-seed company outside
       prime London does not pay the £80-100k senior band, and pretending
       otherwise makes the plan fail on contact with a reviewer. The marketer is
       a UK content marketing hire at the national average (Indeed £39,561,
       Payscale £43,884, typical range £36-52k) - added 19 Sep 2026 after being
       ruled out twice, because the large-account go-to-market needs one.
       Customer success at GBP 45,000 against a UK base range of GBP 42-68k, and
       a product manager at GBP 60,000 against a UK average of GBP 60-68k
       (GBP 55-70k outside London).
       NOTE: there is NO sales hire. An account executive was modelled and then
       removed. 71% of the FY2031 book is Pro, and nothing in this plan is paid
       to win or close those accounts - founders carry the whole sales motion. Paid in sterling, converted at fx.gbpUsd.
       Phased so the raise plus revenue can carry them - all three from month 13
       is $253k a year against a $150k round. */
    hires: [
      /* Two founder salary lines, then four hires. No hire starts in FY2028:
         the raise funds the CTO going full time, the founder pool and the node
         stack, and the UK hires begin in August 2028, the first month of FY2029,
         two at once.

         The CEO steps up GBP 6,000 once the raise lands, from GBP 24,785 to
         GBP 30,785: the stipend is what the company can carry before the money
         arrives, not what the job is worth. bumpGbp/bumpFrom carry that.

         Salaries levelled 10 Oct 2026. The earlier list put customer success on
         GBP 45,000 and marketing on GBP 38,000 against founders on GBP 24,785
         and GBP 32,000, which made the two founders the lowest paid people in
         the company.

         The three non-engineering hires start at GBP 25,000: the National Living
         Wage from April 2026 is GBP 12.71 an hour, GBP 24,785 at 37.5 hours over
         52 weeks, and the offer is rounded up to a round number rather than
         advertised at the legal floor to the pound. The developer is GBP 32,000,
         the researched UK average for the work. The CEO's pre-raise stipend
         stays on the NLW figure itself, GBP 24,785, because it is what the
         company can carry for three months rather than an offer being made to
         anyone; it steps to GBP 30,785 when the raise lands, and no hire starts
         before then, so nobody is ever paid above a founder during it.

         Both founder lines are ungated: the company owes a wage from the month
         the person starts, whether or not the round closes. Neither carries a
         recruitment fee or new equipment. */
      {role:'Founder stipend, CEO',     gbp:24785, start:10, bumpGbp:6000, bumpFrom:13, ungated:true, recruit:false, equipment:false},
      {role:'Founder salary, CTO',      gbp:28000, start:13, ungated:true, recruit:false, equipment:false},
      {role:'Customer success manager', gbp:25000, start:24, recruit:false},
      {role:'Junior data engineer',     gbp:25000, start:24, recruit:false},
      {role:'Developer',                gbp:32000, start:36, recruit:false},
      {role:'Marketing manager',        gbp:25000, start:48, recruit:false}
    ],
    /* Employer national insurance and pension on top of gross salary. A hire
       costs more than the salary line, and month 13 is where that lands. */
    employerOncost: 0.18,
    supportMin: 0, loadedHourly: 60   /* founders support customers directly; no cash cost */
  },

  /* ui only */
  vPlan: 'growth', scenario: 'base'
};

const PLAN_IDS = ['launch','launchPlus','growth','growthPlus','pro'];

/* The opening book as counts, from the named list. Only customers who are
   actually paying seed the projection: a signed customer who has not paid is
   not revenue, and our own company was never a customer at all. */
function countBook(s){
  const book = {launch:0, growth:0, pro:0, send:0};
  for(const c of (s.fin && s.fin.customers) || []){
    if(c.status !== 'paying' || !c.opening || !c.plan) continue;
    if(book[c.plan] === undefined) continue;
    book[c.plan] += 1;
  }
  return book;
}
const STORE_KEY = 'onchainsuite-finance-ssot';

/* Bump whenever the agreed baseline in DEFAULTS changes. Locally saved
   scenarios from an older baseline are discarded rather than silently
   overriding the new agreed numbers - the whole point of an SSOT is that
   two people reading it see the same figures. */
const BASELINE = '2026-10-13.f';

/* Rebuilt 19 Sep 2026. The previous set moved `util` and `overageRate`, which
   no longer drive the model - enrichment volume does. Each scenario moves the
   four things that actually decide the outcome: how many arrive, how fast that
   grows, how many stay, and which tier they land on. Bear also assumes
   customers enrich only half their list. */
const SCENARIOS = {
  /* chainPassesPerMonth stays at 1 in every scenario. With a full pass bundled,
     overage is max(0, full x passes - full), so a value below 1 is inert and
     bear's old "customers enrich only half their list" changed nothing. */
  bear: {churn:0.08, newPerMonth:3, newGrowth:0.03, chainPassesPerMonth:1,
         mix:{launch:0.35, launchPlus:0.30, growth:0.25, growthPlus:0.08, pro:0.02}},
  base: {churn:0.05, newPerMonth:5, newGrowth:0.05, chainPassesPerMonth:1,
         mix:{launch:0.15, launchPlus:0.25, growth:0.30, growthPlus:0.20, pro:0.10}},
  bull: {churn:0.03, newPerMonth:7, newGrowth:0.08, chainPassesPerMonth:1,
         mix:{launch:0.10, launchPlus:0.20, growth:0.30, growthPlus:0.25, pro:0.15}}
};

/* Assumption register.
   basis, after an external reviewer asked for the categories to be separated:
     o = observed actual      measured from our own production or invoices
     c = contracted/published a supplier's rate card or contracted price
     e = estimate             sized from something, but not measured
     d = management decision  chosen, not observed. A decision is not evidence,
                              and counting one as measured overstates how much of
                              this document rests on data. */
const ASSUMPTIONS = [
  {n:'Onramp take-up',                basis:'d', own:'Founders',    val:(s)=>fmt(s.onramp.takeUp,'p0')+' of new Growth and Growth+', why:'Set at half of new Growth and Growth+ accounts. It drives the Onramp line in full, both the fees and the founder-delivered hours, so it moves that line proportionally and nothing else: no plan price depends on it and subscription revenue does not move with it. Updated from the measured rate once ten Growth accounts have started.'},
  {n:'Onramp delivery hours',         basis:'d', own:'Founders',    val:(s)=>fmt(s.onramp.hours,'n0')+' over 90 days', why:'The scope of the programme, and it sets the cost directly: cost is hours times the loaded rate, so each hour of scope creep is $62 off a $258 delivery profit and four hours over puts the programme at break-even. Worth re-scoping against the first few deliveries rather than the plan.'},
  {n:'Monthly churn',                 basis:'d', own:'Founders',    val:(s,D)=>fmt(s.planChurn,'p0'),        why:'Fixed at 5% by decision rather than left open. Still the number that decides LTV and whether the unit economics are a business, so it gets replaced by real cohort data the moment there is any.'},
  {n:'Credits per wallet',            basis:'c', own:'Product',     val:(s)=>fmt(s.creditsPerWallet,'n0'),   why:'The rate: 4 credits, $0.004 at list, the same at import and at overage. Set 26 Sep 2026. The 2.95 it replaces was the 11 Sep measured average of billed credits, which includes cache hits; for sizing a full import pass every call is live, so the rate is the right figure. Our own cost is per compute unit and does not move with this.'},
  {n:'Wallets per contact',           basis:'d', own:'Founders',    val:(s)=>fmt(s.walletsPerContact,'n0'),  why:'One, by definition: an identifier is a contact, so a wallet is a contact. Set 26 Sep 2026. This was 3 and unmeasured, and it multiplied every enrichment cost and every usage-revenue figure by three. At one, the model agrees with the pricing source of truth on allowance coverage.'},
  {n:'Average allowance utilisation', basis:'d', own:'Product',     val:(s)=>fmt(s.util,'p0'),               why:'Sets blended gross profit per customer and therefore every break-even figure.'},
  {n:'CAC per customer',              basis:'d', own:'Founders',    val:(s)=>fmt(s.cac,'m0'),                why:'Zero for years one and two by decision: customers arrive through MOUs rather than paid acquisition. Becomes an assumption again the moment we buy a customer.'},
  {n:'Partner revenue share',         basis:'d', own:'Founders',    val:(s,D)=>fmt(D.partnerRate,'p0')+' effective', why:'Agencies and foundations are the primary channel and an agency programme carries a revenue share. Modelled at zero coverage because nothing is signed. Every point of effective share is a point straight off gross margin.'},
  {n:'Extra-credit revenue',          basis:'d', own:'Product',     val:(s,D)=>fmt(D.fin.years[0].rev>0 ? D.fin.rows.filter(r=>D.fin.fyOf(r.m)===D.fin.years[0].fy).reduce((a,r)=>a+r.overage,0)/D.fin.years[0].rev : 0,'p0')+' of FY2027 sales', why:'Zero by decision, 26 Sep 2026. Every package bundles one full enrichment pass of its own contacts, so a customer enriching their list once a month buys nothing extra. Until that day the bundles covered about 13% of a pass and this line was about a third of sales, resting on a purchase decision nobody had observed - the assumption an external reviewer called the biggest issue in the document. Bundling the pass costs two to three points of floor margin per package and removes the assumption. Consumption beyond one pass a month, driven by wallet activity, would still bill here; it is unmeasured and now a cost question rather than a revenue one.'},
  {n:'Infrastructure itemisation',    basis:'c', own:'Engineering', val:(s,D)=>fmt(D.dq.infraItemised,'p0'), why:'Hosting is now rebuilt from contracted provider rates; only the small unattributed remainder is guesswork. One month of invoices closes it entirely.'},
  {n:'Support minutes per customer',  basis:'d', own:'Founders',    val:(s)=>fmt(s.fin.supportMin,'n0')+' min', why:'Zero by decision: founders support every customer directly, so there is no cash cost. It is real time rather than free time, and becomes a cost the day it is handed to someone on payroll.'},
  {n:'Stage-one filter catch rate',   basis:'e', own:'Engineering', val:(s)=>fmt(s.stage1,'p0'),             why:'Every 10 points moves ONS+ margin by roughly 8 points.'},
  {n:'On-chain cache-hit rate',       basis:'d', own:'Engineering', val:(s)=>fmt(s.cacheHit,'p0'),           why:'Sets effective on-chain cost. We are covered even at zero, but the upside is entirely here.'},
  {n:'AI tokens per action',          basis:'e', own:'Engineering', val:(s)=>fmt(s.aiTokensIn,'n0')+' in / '+fmt(s.aiTokensOut,'n0')+' out', why:'Sized for a real action - a subject line, a wallet classification, a segment summary - rather than back-solved from a target price. The resulting cost lands inside the $0.50 to $2.00 per 1,000 range engineering already quoted, which is the corroboration.'},
  {n:'Emails a droplet carries',       basis:'e', own:'Engineering', val:(s)=>fmt(s.hostingLoad.emailsPerDroplet,'n0')+' / mo', why:'Sets how much hosting each 1,000 emails should carry, and therefore the floor under any send-only price. Same measurement as the droplet-capacity question; answering one answers both.'},
  {n:'AI cache-hit rate',             basis:'e', own:'Engineering', val:(s)=>fmt(s.aiCacheHit,'p0'),         why:'Cached input costs 3% of uncached, so this is the single biggest lever on AI cost. Assumed at 50% because prompt prefixes repeat heavily across actions. Directly observable from the provider dashboard.'},
  {n:'DigitalOcean Droplet rates',     basis:'c', own:'Engineering', val:(s,D)=>fmt(D.itemised,'m0'), why:'Published list prices, 20 Aug 2026. Self-hosted, so the dollar cost is contracted but the operational cost - backups, failover, patching - falls on us and is not priced anywhere.'},
  {n:'July 2026 actual spend',        basis:'o', own:'Founders',    val:(s)=>fmt(s.spend.actual,'m2'),       why:'The only fully observed cost figure we have. Anchors cost per user and the spend budget.'},
  {n:'AWS SES send cost',             basis:'c', own:'Engineering', val:(s)=>fmt(s.ses,'m2'),                why:'Published rate, billed monthly.'},
  {n:'Kickbox verification rate',     basis:'c', own:'Engineering', val:(s)=>fmt(s.kickbox,'m3'),            why:'Contracted rate.'},
  {n:'Alchemy cost per 10,000 credits', basis:'o', own:'Engineering', val:(s)=>fmt(s.alchemy,'m2'),  why:'Measured from production 11 Sep 2026 and metered in arrears. Our cost is per compute unit, $0.000432 a wallet; this is that cost expressed per 10,000 billed credits at 4 credits a wallet, which is why it moved from $1.38 to $1.08 when the rate did. Until 26 Sep this entry read a retired GoldRush-era input and showed $1.38 after the real figure had changed.'},
  {n:'Dedicated IP cost',             basis:'c', own:'Engineering', val:(s)=>fmt(s.ipCost,'m2'),             why:'Published rate.'},
  {n:'Stripe rate',                   basis:'c', own:'Founders',    val:(s)=>fmt(s.stripePct,'p2')+' + '+fmt(s.stripeFix,'m2'), why:'Contracted. Rises to '},
];

/* The single-file document kept a module-level mutable S. In the app React
   owns state, so there is none here: derive(s) and fmt(v, f, opts) are pure
   and take everything they need. This is the only structural change made
   while porting; the arithmetic below is byte-identical to pricing/. */

/* ============================================================
   2 - Derivation. Pure: same inputs, same outputs, no DOM.
   ============================================================ */
function derive(s, opts){
  opts = opts || {};
  const buf = v => v * (1 + s.buffer);
  const D = {};

  /* --- raw unit costs --- */
  D.emailRaw = s.ses;
  D.onsGross = s.kickbox * 1000;
  D.stage2   = 1 - s.stage1;
  D.onsEsc   = 1000 * D.stage2;
  D.onsRaw   = D.onsEsc * s.kickbox;
  D.chainRaw = s.alchemy * (1 - s.cacheHit);

  /* --- loaded costs --- */
  D.bEmail = buf(D.emailRaw);   D.bPush  = buf(s.pushCost);
  D.bOns   = buf(D.onsRaw);     D.bChain = buf(D.chainRaw);
  /* Input splits between cached and uncached tokens; output is never cached. */
  D.aiInHit    = s.aiTokensIn * s.aiCacheHit;
  D.aiInMiss   = s.aiTokensIn * (1 - s.aiCacheHit);
  D.aiCostRaw  = 1000*((D.aiInHit/1e6)*s.aiPriceInHit
                     + (D.aiInMiss/1e6)*s.aiPriceInMiss
                     + (s.aiTokensOut/1e6)*s.aiPriceOut);
  D.aiCost     = Math.round(D.aiCostRaw*100)/100;
  D.aiBlendedIn= s.aiCacheHit*s.aiPriceInHit + (1-s.aiCacheHit)*s.aiPriceInMiss;
  D.bAi    = buf(D.aiCost);     D.bConcierge = buf(s.conciergeCost);
  D.bIp    = buf(s.ipCost);
  D.bufPct = s.buffer;

  /* Fixed + rate is not a power law, but it behaves like one over the range we
     sell. Its effective exponent is measured across the published ladder rather
     than assumed, and it rises toward 1 as the fixed fee stops mattering. */
  D.sendPrice = n => s.send.fixed + s.send.rate*(n/1000);
  /* One average Send customer, as a tier the projection can carry. Metered cost
     uses the vendor rate, not the hosting-loaded one, because hosting is charged
     once in opex - loading it here as well would count the servers twice. */
  D.sendEco = (function(){
    const n = s.sendPlan.avgSubs;
    const price   = D.sendPrice(n);
    const email   = (n*s.send.ratio/1000)*D.bEmail;
    const ons     = (n*(s.send.onsRatio||0)/1000)*D.bOns;
    const metered = email + ons;
    const stripe  = price*s.stripePct + s.stripeFix;
    return {name:'Send', subs:n, price, email, ons, metered, ip:0, conc:0, stripe,
            floor: price - metered - stripe,
            floorGM: price > 0 ? (price - metered - stripe)/price : 0};
  })();


  /* --- rate card --- */
  const rateRow = (cost, price) => ({
    profit: price - cost,
    markup: cost > 0 ? price / cost : Infinity,
    margin: price !== 0 ? (price - cost) / price : 0
  });
  D.rate = {
    email:rateRow(D.bEmail,s.pEmail), push:rateRow(D.bPush,s.pPush),
    ons:rateRow(D.bOns,s.pOns),       chain:rateRow(D.bChain,s.pChain),
    ai:rateRow(D.bAi,s.pAi),          concierge:rateRow(D.bConcierge,s.pConcierge)
  };
  D.emailSpread = s.pEmail - D.bEmail;

  /* --- What one credit is, in words a buyer can picture ---
     Asked by a reader on 13 Oct 2026: define one credit the way Apollo does,
     where one credit is one person enriched.

     Ours is not that. A credit is a quarter of a wallet enrichment, because
     enriching one wallet bills 4 credits. Nobody can picture a quarter of
     anything, which is the whole problem with the unit.

     The intuitive unit is the wallet, and the plans already line up with it
     exactly: every package's on-chain allowance is one full pass of its own
     contacts, so "credits" and "contacts" are the same number multiplied by 4
     for no reason the buyer benefits from. Both views are published here so the
     document can answer the question either way. */
  D.creditDef = (() => {
    const perCredit = s.pChain/10000;
    const perWallet = s.creditsPerWallet * perCredit;
    return {
      creditsPerWallet: s.creditsPerWallet,
      pricePerCredit: perCredit,
      pricePerWallet: perWallet,
      costPerWallet: s.creditsPerWallet * D.bChain/10000,
      /* If a credit were redefined as one wallet enriched: revenue neutral, the
         price per credit multiplies by creditsPerWallet and every allowance
         divides by it, landing exactly on the plan's contact count. */
      ifOneWallet: {
        pricePerCredit: perWallet,
        per10k: perWallet * 10000,
        allowances: PLAN_IDS.map(id => ({
          name: s.plans[id].name,
          contacts: s.plans[id].contacts,
          creditsNow: s.plans[id].chain,
          creditsAfter: s.plans[id].chain / s.creditsPerWallet,
          equalsContacts: s.plans[id].chain / s.creditsPerWallet === s.plans[id].contacts
        }))
      }
    };
  })();

  /* --- Onramp: one product, one price, two delivery shapes ---
     The price is flat. What changes is how long delivery runs and therefore
     what it costs us, so each shape gets its own economics and the SKU-level
     answer is reported per shape rather than averaged into something that
     describes neither. */
  D.onramp = (() => {
    const o = s.onramp, rate = D.bConcierge;
    const shape = (hours, months, takeUp, tiers, name) => {
      const cost   = hours * rate;
      const stripe = o.price * s.stripePct;
      return {
        name, tiers, takeUp, hours, months, rate,
        price: o.price, perMonth: o.price/months,
        cost, stripe,
        profit: o.price - cost,
        margin: (o.price - cost)/o.price,
        profitAllIn: o.price - cost - stripe,
        marginAllIn: (o.price - cost - stripe)/o.price,
        coversCost: o.price >= cost
      };
    };
    const e = o.enterprise, gr = o.growth;
    const ent = {
      ...shape(e.cycleMonths*e.hoursPerMonth, e.cycleMonths, e.takeUp, e.tiers, 'Enterprise'),
      cycleLow: e.cycleMonthsLow, cycleHigh: e.cycleMonthsHigh,
      hoursPerMonth: e.hoursPerMonth,
      costLow:  e.cycleMonthsLow  * e.hoursPerMonth * rate,
      costHigh: e.cycleMonthsHigh * e.hoursPerMonth * rate,
      perExtraHourPerMonth: e.cycleMonths * rate
    };
    return {
      price: o.price, rate,
      enterprise: ent,
      growth: shape(gr.hours, gr.months, gr.takeUp, gr.tiers, 'Growth'),
      /* The rule is a floor-PROFIT test on the thing being sold. The Growth
         shape clears it; the Enterprise shape does not, by design, because the
         flat price is carried by the subscription it protects. */
      clearsRuleGrowth: (o.price - gr.hours*rate) > s.floorRule.minProfit
    };
  })();

  /* --- What one credit is, in words a buyer can picture ---
     Asked by a reader on 13 Oct 2026: define one credit the way Apollo does,
     where one credit is one person enriched.

     Ours is not that. A credit is a quarter of a wallet enrichment, because
     enriching one wallet bills 4 credits. Nobody can picture a quarter of
     anything, which is the whole problem with the unit.

     The intuitive unit is the wallet, and the plans already line up with it
     exactly: every package's on-chain allowance is one full pass of its own
     contacts, so "credits" and "contacts" are the same number multiplied by 4
     for no reason the buyer benefits from. Both views are published here so the
     document can answer the question either way. */
  D.creditDef = (() => {
    const perCredit = s.pChain/10000;
    const perWallet = s.creditsPerWallet * perCredit;
    return {
      creditsPerWallet: s.creditsPerWallet,
      pricePerCredit: perCredit,
      pricePerWallet: perWallet,
      costPerWallet: s.creditsPerWallet * D.bChain/10000,
      /* If a credit were redefined as one wallet enriched: revenue neutral, the
         price per credit multiplies by creditsPerWallet and every allowance
         divides by it, landing exactly on the plan's contact count. */
      ifOneWallet: {
        pricePerCredit: perWallet,
        per10k: perWallet * 10000,
        allowances: PLAN_IDS.map(id => ({
          name: s.plans[id].name,
          contacts: s.plans[id].contacts,
          creditsNow: s.plans[id].chain,
          creditsAfter: s.plans[id].chain / s.creditsPerWallet,
          equalsContacts: s.plans[id].chain / s.creditsPerWallet === s.plans[id].contacts
        }))
      }
    };
  })();

  /* Onramp across the book: both shapes together, per 100 Suite signups, so
     the flat price can be seen against what the two shapes actually cost. */
  D.onrampBook = (() => {
    const o = s.onramp, O = D.onramp;
    const share = t => t.tiers.reduce((a,id)=>a + (s.mix[id]||0), 0) * t.takeUp;
    const eN = share(o.enterprise), gN = share(o.growth);
    const n = eN + gN;
    const rev  = n * o.price;
    const cost = eN*O.enterprise.cost + gN*O.growth.cost;
    return {
      enterpriseStarts: eN, growthStarts: gN, starts: n,
      per100: {starts: 100*n, enterprise: 100*eN, growth: 100*gN,
               rev: 100*rev, cost: 100*cost, net: 100*(rev-cost)},
      marginOnBook: rev > 0 ? (rev - cost)/rev : 0,
      coversCost: rev >= cost
    };
  })();

  /* Any meter selling below what it costs us. On-chain is tested against its
     uncached cost so a cache failure cannot quietly put us underwater. */
  D.underwater = [
    {name:'Email',        price:s.pEmail,     cost:D.bEmail},
    {name:'In-app push',  price:s.pPush,      cost:D.bPush},
    {name:'ONS+',         price:s.pOns,       cost:D.bOns},
    {name:'On-chain',     price:s.pChain,     cost:(1+s.buffer)*s.alchemy},
    {name:'AI actions',   price:s.pAi,        cost:D.bAi},
    {name:s.conciergeLabel, price:s.pConcierge, cost:D.bConcierge}
  ].filter(function(m){ return m.price < m.cost; })
   .map(function(m){ m.margin = m.price !== 0 ? (m.price-m.cost)/m.price : 0; return m; });

  /* --- fixed infrastructure, built up line by line --- */
  const sp = s.infraSpec;
  const droplets = sp.droplets * sp.dropletRate;
  D.infra = {
    droplets:     droplets,
    backups:      droplets * sp.backupPct,
    domains:      sp.domains,
    /* Atlas runs on its own droplet, separate from the application hosting, and
       we pay the invoice. It was missing from this line entirely. */
    atlasServer:  sp.atlasServer || 0,
    unallocated:  sp.unallocated
  };
  D.infraTotal = Object.values(D.infra).reduce((a,b)=>a+b,0);
  D.itemised   = D.infraTotal - D.infra.unallocated;

  /* Hosting for n customers: the cheapest tier that carries them, plus another
     full block for every multiple of the largest tier beyond it. */
  D.infraAt = (n) => {
    const tiers = (s.infraTiers||[]).slice().sort((a,b)=>a.maxUsers-b.maxUsers);
    if(!tiers.length) return D.infraTotal;
    const top = tiers[tiers.length-1];
    const t = tiers.find(t => n <= t.maxUsers) || top;
    const blocks = n <= top.maxUsers ? 1 : Math.ceil(n/top.maxUsers);
    const droplets = sp.droplets * t.rate * blocks;
    return droplets + droplets*sp.backupPct + sp.domains + (sp.atlasServer||0) + sp.unallocated;
  };
  D.topTierUsers = (s.infraTiers||[]).reduce((a,t)=>Math.max(a,t.maxUsers), 0);
  D.infraTierRows = (s.infraTiers||[]).map(t => ({
    maxUsers: t.maxUsers, rate: t.rate, total: D.infraAt(t.maxUsers),
    perUser: t.maxUsers > 0 ? D.infraAt(t.maxUsers)/t.maxUsers : 0
  }));

  /* --- capacity --- */
  D.capUsers        = s.infraCapacity.users;
  D.infraPerUserCap = D.capUsers > 0 ? D.infraTotal/D.capUsers : 0;
  D.capUsedToday    = D.capUsers > 0 ? s.spend.users/D.capUsers : 0;
  D.renderSwing     = sp.renderInstances*(sp.renderRate - 25);   /* Pro vs Standard */
  D.vercelSwing     = sp.vercelSeats*sp.vercelRate;              /* Pro vs Hobby */
  D.spendPerUser = s.spend.users > 0 ? s.spend.actual/s.spend.users : 0;
  /* Trading history to date. */
  D.act = {rows:[], revenue:0, cost:0, net:0};
  for(const a of s.actuals){
    D.act.revenue += a.revenue; D.act.cost += a.cost;
    D.act.net += a.revenue - a.cost;
    D.act.rows.push({...a, net:a.revenue-a.cost, cum:D.act.net});
  }
  D.act.last = s.actuals[s.actuals.length-1];
  D.act.arpuNow = D.act.last.customers > 0 ? D.act.last.revenue/D.act.last.customers : 0;
  D.spendBudget  = s.spend.actual*(1 + s.spend.budgetBuffer);
  D.spendAnnual  = D.spendBudget*12;
  D.infraGap     = D.infra.unallocated;
  D.infraVsLegacy= D.itemised > 0 ? D.infraTotal/D.itemised : 0;
  /* how many of the cheapest paid plan it takes to cover the buffered budget */
  D.budgetInLaunch = s.plans.launch.price > 0 ? D.spendBudget/s.plans.launch.price : 0;
  D.budgetInGrowth = D.spendBudget > 0 ? s.plans.growth.price/D.spendBudget : 0;

  /* --- Suite price comes off the shared contact curve, not a typed number.
     price = (F + rate x contacts/1,000) x tier multiplier, rounded to the dollar. */
  D.suitePrice = (contacts, mult) => (s.suite.fixed + s.suite.rate*(contacts/1000)) * mult;
  for(const id of PLAN_IDS){
    s.plans[id].price = Math.round(D.suitePrice(s.plans[id].contacts, s.suite.mult[id]));
  }

  /* ---- Market analysis -------------------------------------------------
     Two ways to read a competitor. The fitted curve answers "what would they
     charge at any size"; the published points answer "what do they actually
     charge". We use the points where they exist and the curve only between
     them, because a fitted value outside a vendor's published range is a
     guess wearing a decimal point. */
  const ladderAt = (pts, n) => {
    if(!pts || pts.length < 2 || n <= 0) return null;
    const p = pts.slice().sort((x,y)=>x[0]-y[0]);
    let i = 0;
    while(i < p.length-2 && n > p[i+1][0]) i++;
    const A = p[i], B = p[i+1];
    if(A[0] <= 0 || B[0] <= 0 || A[1] <= 0 || B[1] <= 0 || A[0] === B[0]) return null;
    const e = Math.log(B[1]/A[1])/Math.log(B[0]/A[0]);
    return A[1]*Math.pow(n/A[0], e);
  };
  D.marketSizes = [1000, 10000, 50000, 100000];
  D.market = (s.market||[]).map(c => {
    const pts = c.pts.slice().sort((a,b)=>a[0]-b[0]);
    const lo = pts[0][0], hi = pts[pts.length-1][0];
    /* Half this field meters emails sent, the other half meters contacts held.
       Comparing them at the same number is meaningless: 10,000 emails is not
       10,000 subscribers. Everything is converted onto the subscriber axis
       first, at our own sends-per-subscriber assumption. */
    const axis = n => c.meter === 'emails' ? n*s.send.ratio : n;
    const prices = D.marketSizes.map(n => {
      const x = axis(n);
      /* outside their published range we say so rather than extrapolating */
      return {n, price: ladderAt(pts, x), quoted: x >= lo && x <= hi};
    });
    /* Two different things get called competitors. A product is sold to a
       marketer and does campaigns, lists and automation. Infrastructure is sold
       to an engineer and does delivery only - it is the floor every product is
       marked up from, including ours. Comparing Send to raw sending is the same
       error as comparing a restaurant to a wholesaler. */
    const infra = c.seg === 'Developer API' || c.seg === 'Enterprise CPaaS' || c.seg === 'Raw utility';
    return {...c, lo, hi, prices, kind: infra ? 'infrastructure' : 'product',
            loSubs: c.meter === 'emails' ? lo/s.send.ratio : lo,
            hiSubs: c.meter === 'emails' ? hi/s.send.ratio : hi,
            /* what a customer pays per 1,000 subscribers at 10,000 subscribers */
            per1k: (()=>{ const v = ladderAt(pts, axis(10000)); return v === null ? null : v/10; })()};
  });
  /* Our own line, on the same basis. */
  D.marketOurs = D.marketSizes.map(n => ({n, price: D.sendPrice(n)}));
  D.marketOursPer1k = D.sendPrice(10000)/10;
  /* The market's shape, as one number. Median exponent across every ladder. */
  D.marketExpMedian = (()=>{
    const b = (s.market||[]).map(c=>c.b).sort((x,y)=>x-y);
    if(!b.length) return 0;
    const m = Math.floor(b.length/2);
    return b.length % 2 ? b[m] : (b[m-1]+b[m])/2;
  })();
  D.marketExpMin = Math.min(...(s.market||[]).map(c=>c.b));
  D.marketExpMax = Math.max(...(s.market||[]).map(c=>c.b));
  D.marketCount  = (s.market||[]).length;
  /* Only the ladders aimed at a buyer we actually meet. */
  /* Products only. Raw sending is a real alternative for a technical buyer, but
     it is not a peer on this table - it has no product to compare against. */
  D.marketDirect = D.market.filter(c => c.threat === 3 && c.kind === 'product');
  /* Segment rollup: how many vendors chase each audience, and what the
     cheapest of them charges at 10,000. */
  D.marketSegments = (()=>{
    const by = {};
    for(const c of D.market){
      const k = c.seg;
      if(!by[k]) by[k] = {seg:k, who:c.who, n:0, threat:0, cheapest:null, cheapestName:''};
      by[k].n++;
      by[k].threat = Math.max(by[k].threat, c.threat);
      const v = c.prices.find(p=>p.n===10000);
      if(v && v.price !== null && (by[k].cheapest === null || v.price < by[k].cheapest)){
        by[k].cheapest = v.price; by[k].cheapestName = c.n;
      }
    }
    return Object.values(by).sort((a,b)=> b.threat - a.threat || a.seg.localeCompare(b.seg));
  })();
  /* Who is cheapest at each size, and where we land against them. */
  D.marketBySize = D.marketSizes.map(n => {
    const cheapest = (kind) => {
      let best = null;
      for(const c of D.market){
        if(c.kind !== kind) continue;
        const v = c.prices.find(p=>p.n===n);
        if(v && v.quoted && v.price !== null && (best === null || v.price < best.price))
          best = {name:c.n, price:v.price, seg:c.seg};
      }
      return best;
    };
    const best = cheapest('product'), floor = cheapest('infrastructure');
    const ours = D.sendPrice(n);
    return {n, ours, best, floor,
            delta: best ? ours/best.price - 1 : null,
            overFloor: floor ? ours/floor.price : null,
            free: n <= (s.send.octopusFree ? s.send.octopusFree.subs : 0)};
  });
  D.marketProducts = D.market.filter(c => c.kind === 'product');
  D.marketInfra    = D.market.filter(c => c.kind === 'infrastructure');
  /* Median product price at 10,000 subscribers - the middle of the market we sell into. */
  D.marketMedian10k = (()=>{
    const v = D.marketProducts.map(c=>{const x=c.prices.find(p=>p.n===10000); return x&&x.quoted?x.price:null;})
      .filter(x=>x!==null).sort((a,b)=>a-b);
    if(!v.length) return null;
    const m = Math.floor(v.length/2);
    return v.length % 2 ? v[m] : (v[m-1]+v[m])/2;
  })();
  D.marketVsMedian10k = D.marketMedian10k ? D.sendPrice(10000)/D.marketMedian10k - 1 : null;
  /* ---- Suite, benchmarked on the same axis as everyone else -------------
     Every rival meters contacts held, and so does Suite. Growth (x1.00) is the
     mainstream tier and the fair like-for-like; Launch and Pro bracket it. */
  /* The multiplier belongs to the band the contact count falls in. This used to
     hardcode the Growth multiplier for every size, so the market comparison
     priced a 10,000-contact customer at the raw curve - $149 - when the Launch+
     package they would actually buy is $118. It was wrong at every size and in
     both directions: too dear below Growth, far too cheap in Pro. Raised by an
     external reviewer, 6 Oct 2026. */
  D.bandAt = n => {
    const b = (s.bands||[]).find(b => n >= b.from && (b.to == null || n <= b.to));
    return b ? b.id : 'growth';
  };
  D.suiteAt = n => D.suitePrice(n, s.suite.mult[D.bandAt(n)]);
  D.suiteBySize = D.marketSizes.map(n => {
    const ours = D.suiteAt(n);
    let cheapest = null, dearest = null;
    const vals = [];
    for(const c of D.marketProducts){
      const v = c.prices.find(p=>p.n===n);
      if(!v || !v.quoted || v.price === null) continue;
      vals.push(v.price);
      if(cheapest === null || v.price < cheapest.price) cheapest = {name:c.n, price:v.price};
      if(dearest  === null || v.price > dearest.price)  dearest  = {name:c.n, price:v.price};
    }
    vals.sort((a,b)=>a-b);
    const med = vals.length ? (vals.length%2 ? vals[(vals.length-1)/2]
                : (vals[vals.length/2-1]+vals[vals.length/2])/2) : null;
    return {n, ours, median:med, cheapest, dearest,
            vsMedian: med ? ours/med - 1 : null,
            /* how many priced products cost more than Suite at this size */
            dearerThanUs: vals.filter(v => v > ours).length, priced: vals.length};
  });
  /* The claim that matters: Suite sits at the market rate for email alone,
     and the wallet channel comes with it rather than on top of it. */
  /* The same comparison at Pro size. 2.5 compares at 10,000 contacts, where we are
     under the median; at 75,000 we are the dearest product in the field bar one,
     because Pro carries a 1.6x multiplier by design. Showing price alone there
     hands a buyer an objection at the tier carrying most of Suite's gross profit.
     Showing price beside capability is the honest comparison: nobody in this field
     ships the wallet channel or on-chain triggers at any price. */
  D.proSize = s.plans.pro ? s.plans.pro.contacts : 75000;
  D.proAtSize = D.suiteAt(D.proSize);
  D.proH2h = (function(){
    const caps = s.capLabels.map(c=>c[0]);
    const score = c => caps.reduce((a,k)=>a + ((c && c[k]) || 0), 0);
    return s.market
      .filter(c => c.kind !== 'infrastructure' && (c.pts||[]).length)
      .map(c => {
        const pts = c.pts, hi = pts[pts.length-1][0];
        const at = c.meter === 'emails' ? D.proSize * s.send.ratio : D.proSize;
        return {
          name: c.n, seg: c.seg, meter: c.meter,
          theirs: c.a * Math.pow(at, c.b),
          quoted: at <= hi,
          score: score(c.caps),
          wallet: (c.caps && c.caps.wallet) || 0,
          chain:  (c.caps && c.caps.chain)  || 0,
          vsSuite: D.proAtSize ? c.a * Math.pow(at, c.b) / D.proAtSize - 1 : null
        };
      })
      .sort((a,b) => a.theirs - b.theirs);
  })();
  D.proQuotedMedian = (function(){
    const q = D.proH2h.filter(r=>r.quoted).map(r=>r.theirs).sort((a,b)=>a-b);
    if(!q.length) return null;
    return q.length % 2 ? q[(q.length-1)/2] : (q[q.length/2-1] + q[q.length/2]) / 2;
  })();
  D.proRivalsWithChain = D.proH2h.filter(r => r.wallet > 0 || r.chain > 0).length;

  D.suiteAt10k     = D.suiteAt(10000);
  D.suiteVsMedian  = D.marketMedian10k ? D.suiteAt10k/D.marketMedian10k - 1 : null;

  /* ---- Head to head: us against each product, capability by capability ---- */
  const capKeys = (s.capLabels||[]).map(c=>c[0]);
  const score = caps => capKeys.reduce((a,k)=>a + (caps && caps[k] ? caps[k] : 0), 0);
  D.suiteScore = score(s.suiteCaps);
  D.h2h = D.marketProducts.map(c => {
    const v = c.prices.find(p=>p.n===10000);
    const theirs = (v && v.quoted && v.price !== null) ? v.price : null;
    /* what they have that we do not, and the reverse - both, or it is marketing */
    const theyWin = [], weWin = [];
    for(const [k,label] of (s.capLabels||[])){
      const us = s.suiteCaps[k] || 0, them = (c.caps && c.caps[k]) || 0;
      if(them > us) theyWin.push(label);
      if(us > them) weWin.push(label);
    }
    return {name:c.n, seg:c.seg, who:c.who, threat:c.threat, meter:c.meter,
            theirs, score: score(c.caps),
            suitePrice: D.suiteAt10k,
            vsSuite: theirs ? D.suiteAt10k/theirs - 1 : null,
            sendPrice: D.sendPrice(10000),
            vsSend: theirs ? D.sendPrice(10000)/theirs - 1 : null,
            theyWin, weWin};
  }).sort((a,b) => b.threat - a.threat || (b.theirs||0) - (a.theirs||0));
  /* Where we are genuinely behind, counted rather than asserted. */
  D.h2hGaps = (()=>{
    const g = {};
    for(const h of D.h2h) for(const w of h.theyWin) g[w] = (g[w]||0)+1;
    return Object.entries(g).map(([label,n])=>({label,n})).sort((a,b)=>b.n-a.n);
  })();
  const suite10k = D.suiteBySize.find(r=>r.n===10000);
  D.suiteDearerCount = suite10k ? suite10k.dearerThanUs : 0;
  D.suitePricedCount = suite10k ? suite10k.priced : 0;
  const suite100k = D.suiteBySize.find(r=>r.n===100000);
  D.suiteVs100k = suite100k ? suite100k.vsMedian : null;
  D.marketProductCount = D.marketProducts.length;
  D.marketInfraCount   = D.marketInfra.length;
  D.sendAt10k = D.sendPrice(10000);

  D.suiteGrowthLine = c => D.suitePrice(c, 1);
  /* Same tier, smaller customer - shows that the tier is capability, not size. */
  D.proAt25k = D.suitePrice(25000, s.suite.mult.pro);

  /* --- per-plan economics. In-app push costs nothing per unit. --- */
  D.partnerRate = s.partner.coverage * s.partner.cut;
  const partnerRate = D.partnerRate;
  D.eco = {};
  for(const id of PLAN_IDS){
    const p = s.plans[id];
    const metered = (p.emails/1000)*D.bEmail + (p.chain/10000)*D.bChain
                  + (p.ai/1000)*D.bAi + (p.ons/1000)*D.bOns;
    /* No plan bundles concierge hours any more - it is sold by the hour only. */
    const ip = p.ip*D.bIp, conc = 0;
    const stripe = p.price*s.stripePct + s.stripeFix;
    const partner = p.price * partnerRate;
    const fixed = ip + conc + stripe + partner;
    const ceiling = metered + fixed;
    const list = (p.emails/1000)*s.pEmail + (p.push/1000)*s.pPush + (p.chain/10000)*s.pChain
               + (p.ai/1000)*s.pAi + (p.ons/1000)*s.pOns;
    D.eco[id] = {
      name:p.name, price:p.price, metered, ip, conc, stripe, partner, fixed, ceiling, list,
      floor: p.price - ceiling,
      floorGM: p.price !== 0 ? (p.price - ceiling)/p.price : 0,
      save: list !== 0 ? (list - p.price)/list : 0,
      overMult: p.price !== 0 ? list/p.price : 0,
      gp(u){ return p.price + Math.max(0,u-1)*list - (fixed + u*metered); },
      gpPct(u){ return p.price !== 0 ? this.gp(u)/p.price : 0; }
    };
  }
  /* Cost to serve one customer for a month at the modelled utilisation.
     Independent of how many customers there are - this is the number that
     does not move with scale. */
  D.serve = {};
  for(const id of PLAN_IDS){
    const e = D.eco[id];
    const metered = s.util*e.metered;
    const total = metered + e.ip + e.conc + e.stripe + e.partner;
    D.serve[id] = {metered, ip:e.ip, conc:e.conc, stripe:e.stripe, partner:e.partner, total,
                   pct: e.price > 0 ? total/e.price : 0};
  }
  const mixOf = {...s.mix};
  D.serveBlend  = PLAN_IDS.reduce((a,id)=>a + mixOf[id]*D.serve[id].total, 0);
  D.supportCost = (s.fin.supportMin/60)*s.fin.loadedHourly;
  D.varPerCustomer = D.serveBlend + D.supportCost;
  /* The same customers we have today, on the new hosting. */
  D.act.onNewStack = D.act.last.revenue - (D.infraTotal + D.act.last.customers*D.serve.launch.total);
  D.act.swing = D.act.onNewStack - (D.act.last.revenue - D.act.last.cost);

  D.minFloorGM = Math.min(...PLAN_IDS.map(id=>D.eco[id].floorGM));
  D.maxFloorGM = Math.max(...PLAN_IDS.map(id=>D.eco[id].floorGM));
  D.proImplied = D.eco.pro.overMult > 0 ? 1/D.eco.pro.overMult : 0;

  /* --- the V walkthrough --- */
  const vid = PLAN_IDS.includes(s.vPlan) ? s.vPlan : 'growth';
  const vp = s.plans[vid], ve = D.eco[vid];
  D.v = {
    id:vid, name:vp.name, price:vp.price, emails:vp.emails, floor:ve.floor, overPct:0.5,
    rows:[0,0.5,1,1.5].map(u=>({
      u, emails: vp.emails*u,
      overRev: Math.max(0,u-1)*ve.list,
      revenue: vp.price + Math.max(0,u-1)*ve.list,
      cost: ve.fixed + u*ve.metered,
      profit: ve.gp(u)
    }))
  };
  D.v.narr = D.v.rows.map((r,i)=>(i===0?'':'then ')+fmt(r.profit,'m0')).join(', ')+'.';

  /* --- blend --- */
  const mix = {...s.mix};
  D.mix = mix;
  D.mixSum = PLAN_IDS.reduce((a,id)=>a + (s.mix[id]||0), 0);
  D.gpUtil = {};
  for(const id of PLAN_IDS) D.gpUtil[id] = D.eco[id].gp(s.util);
  D.blendGP = PLAN_IDS.reduce((a,id)=>a + mix[id]*D.gpUtil[id], 0);
  D.arpu    = PLAN_IDS.reduce((a,id)=>a + mix[id]*s.plans[id].price, 0);
  /* Two ARPUs, because there are two businesses. D.arpu is Suite only; the
     blended figure below weights Send in at the share it reaches by the end of
     the projection, and it is much lower - Send is a volume line, not a
     revenue line. Quoting D.arpu alone overstates the business. */
  D.arpuSend = D.sendEco.price;
  D.sendShareEnd = s.sendPlan.shareEnd;
  D.arpuAll = (1 - D.sendShareEnd)*D.arpu + D.sendShareEnd*D.arpuSend;

  /* Gross profit has the same two-businesses problem as ARPU, and until now only
     the Suite figure existed. D.blendGP weights the three Suite tiers and stops
     there, so quoting it as "gross profit per customer" counts a quarter of the
     book at a number they do not earn. D.blendGPAll weights Send in at its share.
     Raised by an external reviewer, 24 Sep 2026. */
  D.sendGP = D.sendEco.price - D.sendEco.metered - D.sendEco.stripe;
  D.blendGPAll = (1 - D.sendShareEnd)*D.blendGP + D.sendShareEnd*D.sendGP;

  /* D.blendGPAll is a FORECAST-MIX metric: it weights the target mix and a 25% Send
     share. The book we actually have is 57% Send and has no Pro at all, so the
     measured average of today's customers is a different and much smaller number.
     Both belong in the document; only one of them is evidence. */
  D.gpMeasured = (function(){
    const pay = ((s.fin && s.fin.customers) || []).filter(c => c.status === 'paying' && c.plan);
    if(!pay.length) return 0;
    return pay.reduce((a,c) => a + (c.plan === 'send' ? D.sendGP : (D.gpUtil[c.plan] || 0)), 0) / pay.length;
  })();
  D.payingCount = ((s.fin && s.fin.customers) || []).filter(c => c.status === 'paying').length;

  /* --- LTV / CAC --- */
  D.life         = s.planChurn > 0 ? 1/s.planChurn : Infinity;
  D.ltvBlend     = D.blendGP * D.life;
  /* Lifetime value across the whole book, not just the Suite part of it. */
  D.ltvBlendAll  = D.blendGPAll * D.life;
  D.ltvGrowthPlan= D.gpUtil.growth * D.life;
  /* On the whole-book LTV, not the Suite-only one. Raised by an external reviewer,
     25 Sep 2026: the blended LTV had been corrected to include Send but the ceiling
     built on it had not, so it still read $2,991 - Suite LTV divided by the 3:1
     target - against a true $2,290. */
  D.cacCeiling   = s.ltvCacTarget > 0 ? D.ltvBlendAll/s.ltvCacTarget : Infinity;
  D.cacCeilingSuite = s.ltvCacTarget > 0 ? D.ltvBlend/s.ltvCacTarget : Infinity;
  D.payback      = D.blendGP > 0 ? s.cac/D.blendGP : Infinity;
  D.ltvCacActual = s.cac > 0 ? D.ltvBlend/s.cac : Infinity;

  /* --- static break-even --- */
  D.beZero = D.blendGP > 0 ? Math.ceil(D.infraTotal/D.blendGP) : Infinity;
  D.overheadGbp   = Object.values(s.overheads).reduce((a,b)=>a+b,0);
  D.overheadTotal = D.overheadGbp * s.fx.gbpUsd;   /* USD, as everything else is */
  D.founderMonthly = s.raise.founderTotalYear/12;
  D.founderEach    = s.fin.founders > 0 ? D.founderMonthly/s.fin.founders : 0;
  D.founderEachYr  = s.fin.founders > 0 ? s.raise.founderTotalYear/s.fin.founders : 0;
  /* What the company actually spends a month today, beyond hosting. This was 0
     with the note "founders draw nothing today", which conflated founder pay
     being zero with there being no operating costs at all - so a tile claiming
     to cover "infrastructure and operating costs" was covering hosting only. */
  D.opexNow = D.overheadTotal;
  /* On the whole-book average, not the Suite-only one: a quarter of customers
     are on Send and earn far less, so asking how many customers cover the costs
     has to use the customer we actually get. */
  D.beFull  = D.blendGPAll > 0 ? Math.ceil((D.infraTotal + D.opexNow)/D.blendGPAll) : Infinity;

  /* --- projection --- */
  /* With a flat intake, the base does not grow forever: it settles where new
     signups equal churn. This ceiling binds harder than anything on the
     acquisition side, and it is why churn is the number worth measuring first. */
  /* The opening book, summed from who is actually on it. */
  /* Counted from fin.customers, so the named list is the single fact and nothing
     can drift between a headcount and the names beside it. */
  const bk = countBook(s);
  D.startSuite = (bk.launch||0)+(bk.growth||0)+(bk.pro||0);
  D.startSend  = bk.send||0;
  D.startCustomers = D.startSuite + D.startSend;
  D.startMrr = (bk.launch||0)*s.plans.launch.price + (bk.growth||0)*s.plans.growth.price
             + (bk.pro||0)*s.plans.pro.price + (bk.send||0)*D.sendEco.price;
  D.plateau = s.fin.churn > 0 ? s.fin.newPerMonth/s.fin.churn : Infinity;
  /* A hire costs salary plus employer on-costs, for a year. */
  /* The SES plan is a live cost lever, so price the alternatives rather than
     leaving the choice buried in one constant. */
  D.sesPlanRows = (s.sesRates||[]).map(r => ({...r,
    current: Math.abs(r.rate - s.ses) < 1e-9,
    deltaPer1k: r.rate - s.ses}));
  D.sesAlacarte = (s.sesRates||[]).reduce((a,r)=> r.rate < a ? r.rate : a, s.ses);
  D.sesSaving   = s.ses - D.sesAlacarte;
  /* Annualised at the final projected month's send volume. */
  D.sesSavingYear = 0;
  /* Every hire, loaded, for a full year. */
  D.hireTrueCost = (s.fin.hires||[]).reduce((a,h)=>a + h.gbp*s.fx.gbpUsd*(1 + (s.fin.employerOncost||0)), 0);
  D.headcountPlanned = (s.fin.hires||[]).length;

  /* ---- Calendar. A forecast that says "month 7" invites the reader to assume
     month 7 starts today. Naming the month is what ties the ramp to the launch. */
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  D.monthLabel = (m) => {
    const idx = (s.fin.startMonth - 1) + (m - 1);
    return MONTHS[((idx % 12) + 12) % 12] + ' ' + (s.fin.startYear + Math.floor(idx/12));
  };
  D.launchLabel = D.monthLabel(s.launch.month);
  D.launchMonth = s.launch.month;
  D.rampMonths  = s.launch.rampMonths;

  /* ---- Enrichment beyond the bundled allowance ---------------------------
     A full pass is every contact's wallets, once. The plan bundles a fraction
     of it; the remainder is overage, billed at the list rate against a cost of
     bChain. This is the single largest revenue line the model was missing. */
  D.chainFull = {}; D.chainOverCredits = {}; D.chainOverCost = {}; D.chainOverRev = {};
  for(const id of PLAN_IDS){
    const full = s.plans[id].contacts * s.walletsPerContact * s.creditsPerWallet
               * (s.chainPassesPerMonth || 0);
    const over = Math.max(0, full - s.plans[id].chain);
    D.chainFull[id]        = full;
    D.chainOverCredits[id] = over;
    D.chainOverCost[id]    = (over/10000) * D.bChain;
    D.chainOverRev[id]     = (over/10000) * s.pChain;
  }
  D.chainPassMultiple = s.plans.growth.chain > 0
    ? D.chainFull.growth / s.plans.growth.chain : 0;

  D.fin = project(s, D);
  /* ---- What the ramp actually claims, stated plainly. Each of these answers
     an objection raised against the previous version of this forecast. */
  (function(){
    const R = D.fin.rows;
    const at = m => R[m-1] || null;
    const sum = (a,b,k) => R.slice(a-1,b).reduce((t,r)=>t+(r[k]||0),0);
    /* the "15 paying customers in 90 days" claim, restated */
    const d90 = at(3);
    D.assessor = {
      cust90:      d90 ? d90.allCust : 0,
      added90:     d90 ? d90.allCust - D.startCustomers : 0,
      rev90:       sum(1,3,'revenue'),
      /* first full year after the public beta, which is the number worth quoting */
      revYearAfterLaunch: sum(s.launch.month, s.launch.month + 11, 'revenue'),
      addsFirst6:  sum(1,6,'gained') + sum(1,6,'gainedSend')
    };
    /* Sum the last twelve projected months rather than annualising one month -
     the base is still growing, so the final month overstates the year. */
  (function(){
    const rows = D.fin.rows.slice(-12);
    if(!rows.length) return;
    const mix = {...s.mix};
    let thousands = 0;
    for(const r of rows){
      for(const id of PLAN_IDS) thousands += r.customers*mix[id]*(s.plans[id].emails/1000)*s.util;
      thousands += r.sendCust*(s.sendPlan.avgSubs*s.send.ratio/1000);
    }
    D.sesSavingYear = thousands * D.sesSaving * (1 + s.buffer);
  })();
  D.actualsRevenue = (s.actuals||[]).reduce((t,a)=>t+a.revenue,0);
    D.actualsCustomers = (s.actuals||[]).length ? s.actuals[s.actuals.length-1].customers : 0;
  })();

  /* --- data quality --- */
  D.dq = {
    measured:  ASSUMPTIONS.filter(a=>a.basis==='o').length,
    contracted:ASSUMPTIONS.filter(a=>a.basis==='c').length,
    estimated: ASSUMPTIONS.filter(a=>a.basis==='e').length,
    decided:   ASSUMPTIONS.filter(a=>a.basis==='d').length,
    assumed:   ASSUMPTIONS.filter(a=>a.basis==='d').length,
    total:     ASSUMPTIONS.length,
    infraItemised: D.infraTotal > 0 ? D.itemised/D.infraTotal : 0
  };
  D.dq.pctMeasured = D.dq.measured/D.dq.total;
  D.infraShareOfGP = D.blendGP > 0 ? D.infraPerUserCap/D.blendGP : 0;

  /* --- live cross-check against the CTO's all-in figure ---
     Cash out only: support is founder time and carries no invoice. */
  const bmMix = {...s.mix};
  D.cashPerCustomer = PLAN_IDS.reduce((a,id)=>
    a + bmMix[id]*(s.util*D.eco[id].metered + D.eco[id].ip + D.eco[id].stripe + D.eco[id].partner), 0);
  D.bmUsers    = s.benchmark.users;
  D.bmConsumed = D.bmUsers * D.cashPerCustomer;
  D.bmModel    = D.infraTotal + D.bmConsumed;
  D.bmTarget   = s.benchmark.total;
  D.bmDelta    = D.bmModel - D.bmTarget;
  D.bmOk       = Math.abs(D.bmDelta) <= 0.02*D.bmTarget;
  D.varPctArpu     = D.arpu > 0 ? D.varPerCustomer/D.arpu : 0;
  D.marginCeiling  = 1 - D.varPctArpu;
  /* Hosting split by what drives it, then divided by what a droplet carries. */
  D.hostPer1kEmail   = s.hostingLoad.emailsPerDroplet > 0
    ? (D.infraTotal*s.hostingLoad.sendShare)/(s.hostingLoad.emailsPerDroplet/1000) : 0;
  D.hostPer1kContact = s.hostingLoad.contactsPerDroplet > 0
    ? (D.infraTotal*(1-s.hostingLoad.sendShare))/(s.hostingLoad.contactsPerDroplet/1000) : 0;
  /* Fully loaded: vendor cost plus the hosting that unit causes. Price off this. */
  D.bEmailFull = D.bEmail + D.hostPer1kEmail;
  D.hostShareOfEmail = D.bEmail > 0 ? D.hostPer1kEmail/D.bEmail : 0;

  /* ---- Send plan ----------------------------------------------------
     Any plan curve is price = k * subscribers^e. A flat per-subscriber
     rate has e = 1: double the list, double the bill. Every competitor
     sits below 1, which is what "volume discount" means written as a
     number. We read their e straight off two of their own price points. */
  const eoPts = (s.send.octopus||[]).slice().sort((a,b)=>a[0]-b[0]);
  const expBetween = (a,b) =>
    (a && b && a[0]>0 && b[0]>0 && a[1]>0 && b[1]>0 && a[0]!==b[0])
      ? Math.log(b[1]/a[1])/Math.log(b[0]/a[0]) : null;
  /* Log-log interpolation between published anchors; extrapolate on the
     end segments so the curve keeps its shape past the last quoted tier. */
  const eoAt = (n) => {
    if(eoPts.length < 2 || n <= 0) return null;
    let i = 0;
    while(i < eoPts.length-2 && n > eoPts[i+1][0]) i++;
    const a = eoPts[i], b = eoPts[i+1], e = expBetween(a,b);
    return e === null ? null : a[1]*Math.pow(n/a[0], e);
  };
  D.eoAt = eoAt;
  D.sendExp = Math.log(D.sendPrice(100000)/D.sendPrice(1000))/Math.log(100);
  D.eoExp   = expBetween(eoPts[0], eoPts[eoPts.length-1]);
  D.sendRate = s.send.rate;

  const sendRow = (n) => {
    const price  = D.sendPrice(n);
    const emails = n*s.send.ratio;
    /* SES plus the hosting it causes, plus ONS+ at a tenth of subscribers. The
       verification line was missing here as well as in sendEco, so every
       published Send margin was overstated. */
    const ons    = (n*(s.send.onsRatio||0)/1000)*D.bOns;
    const cost   = (emails/1000)*D.bEmailFull + ons;
    const stripe = price > 0 ? price*s.stripePct + s.stripeFix : 0;
    const gross  = price - cost - stripe;
    const eo     = eoAt(n);
    return {n, emails, price, cost, ons, stripe, gross,
            margin: price > 0 ? gross/price : 0,
            eo, delta: (eo && eo > 0) ? price/eo - 1 : null};
  };
  D.sendRows = (s.send.sizes||[]).map(sendRow);
  D.sendRow  = sendRow;
  /* The size where a straight line crosses their bending one. Below it we
     undercut them; above it they pull away and we stop being the cheap option. */
  D.sendCross = (function(){
    /* Search only inside the range EmailOctopus actually publishes. Starting
       below their lowest rung compared our price against a null, which made
       every crossover look like "no crossover". */
    const pts = (s.send.octopus||[]).slice().sort((a,b)=>a[0]-b[0]);
    if(pts.length < 2) return null;
    let lo = pts[0][0], hi = pts[pts.length-1][0];
    const f = n => { const e = eoAt(n); return e === null ? null : sendRow(n).price - e; };
    const flo = f(lo), fhi = f(hi);
    if(flo === null || fhi === null) return null;
    if(flo * fhi > 0) return null;
    for(let i=0;i<60;i++){
      const mid = Math.sqrt(lo*hi);                     /* bisect in log space */
      if(f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
    }
    const n = Math.round(Math.sqrt(lo*hi));
    return {n, price:D.sendPrice(n)};
  })();
  /* Worst margin across the published sizes - the number that has to stay healthy. */
  /* Either we cross them somewhere inside their published ladder, or we do not
     cross at all within it - both are real answers, neither is a blank. */
  D.sendCrossText = D.sendCross
    ? 'cross at ' + fmt(D.sendCross.n,'n0') + ' subscribers'
    : 'do not cross anywhere on their published ladder';
  D.sendCrossN = D.sendCross ? D.sendCross.n : null;
  D.sendMarginMin = D.sendRows.length ? Math.min(...D.sendRows.map(r=>r.margin)) : 0;
  D.sendMarginMax = D.sendRows.length ? Math.max(...D.sendRows.map(r=>r.margin)) : 0;
  /* Because cost is linear in volume and so is price, margin converges instead
     of decaying forever. This is the floor it converges to. */
  D.sendFloor = s.send.rate > 0
    ? 1 - (s.send.ratio*D.bEmailFull/1000)/(s.send.rate/1000) - s.stripePct : 0;
  const atSize = n => { const r = sendRow(n); return r.delta; };
  D.sendVs5k   = atSize(5000);
  D.sendVs100k = atSize(100000);
  const r1k = sendRow(1000);
  D.sendStripeShare1k = r1k.price > 0 ? r1k.stripe/r1k.price : 0;
  for(const id of PLAN_IDS){
    const p = s.plans[id];
    D.eco[id].hosting     = (p.emails/1000)*D.hostPer1kEmail + (p.contacts/1000)*D.hostPer1kContact;
    D.eco[id].ceilingFull = D.eco[id].ceiling + D.eco[id].hosting;
    D.eco[id].floorFull   = p.price - D.eco[id].ceilingFull;
    D.eco[id].floorGMFull = p.price !== 0 ? D.eco[id].floorFull/p.price : 0;
  }
  D.minFloorGMFull = Math.min(...PLAN_IDS.map(id=>D.eco[id].floorGMFull));

  /* One Enterprise deal, first year, end to end. Enterprise is the Pro tier
     sold custom, and Onramp is part of the offer: $1,500 of fee against a
     sales-cycle delivery that costs more than that, carried by the subscription
     it protects. This is the whole deal in one place. */
  D.onrampPro = (() => {
    const e = D.eco.pro, ent = D.onramp.enterprise;
    const yearPrice = 12 * e.price;
    const yearRun   = 12 * e.ceilingFull;          /* allowance, card fees, hosting */
    const revenue   = yearPrice + ent.price;       /* subscription plus the Onramp fee */
    const profit    = revenue - yearRun - ent.cost;
    const profitAt  = months => revenue - yearRun - months*ent.hoursPerMonth*D.bConcierge;
    return {
      contacts: s.plans.pro.contacts,
      price: e.price, yearPrice,
      onrampFee: ent.price,
      revenue,
      yearRun,
      onrampCost: ent.cost,
      onrampCostLow: ent.costLow, onrampCostHigh: ent.costHigh,
      profit, margin: profit/revenue,
      profitLow:  profitAt(ent.cycleLow),
      profitHigh: profitAt(ent.cycleHigh),
      clearsRule:     profit               > s.floorRule.minProfit,
      clearsRuleHigh: profitAt(ent.cycleHigh) > s.floorRule.minProfit,
      /* The hours at which the deal stops covering its own costs. */
      breakEvenHours: (revenue - yearRun) / D.bConcierge,
      perExtraHourPerMonth: ent.perExtraHourPerMonth
    };
  })();


  D.infraPerUser   = n => n > 0 ? D.infraTotal/n : 0;
  D.infraPerUserEnd= D.fin.endCustomers > 0 ? D.infraTotal/D.fin.endCustomers : 0;
  D.serveAtCap     = D.infraPerUserCap + D.varPerCustomer;
  D.serveAtEnd     = D.infraPerUserEnd + D.varPerCustomer;
  D.infraBlocks    = n => D.capUsers > 0 ? Math.max(1, Math.ceil(n/D.capUsers)) : 1;
  D.infraSteppedPU = n => n > 0 ? D.infraBlocks(n)*D.infraTotal/n : 0;
  D.conciergeUpside= s.pConcierge - D.bConcierge;   /* per hour, if sold */

  /* Same drivers, infrastructure stepped with capacity instead of flat. */
  if(!opts.skipSens){
    const alt = structuredClone(s);
    alt.infraCapacity.mode = (s.infraCapacity.mode === 'stepped') ? 'flat' : 'stepped';
    D.altFin = derive(alt, {skipSens:true}).fin;
  }

  /* --- labels --- */
  D.sendMult   = s.plans.growth.contacts > 0 ? s.plans.growth.emails/s.plans.growth.contacts : 0;
  D.lgMult     = s.plans.launch.emails > 0 ? s.plans.growth.emails/s.plans.launch.emails : 0;
  /* Does a bundled on-chain allowance cover one full pass over the contact list? */
  D.enrich = {};
  for(const id of PLAN_IDS){
    const p = s.plans[id];
    const needed = p.contacts * s.walletsPerContact * s.creditsPerWallet;
    D.enrich[id] = {needed, bundled: p.chain,
      coverage: needed > 0 ? p.chain/needed : 0,
      shortfall: Math.max(0, needed - p.chain),
      overageCost: Math.max(0, needed - p.chain)/10000 * s.pChain};
  }
  D.launchChainShare = s.plans.growth.chain > 0 ? s.plans.launch.chain/s.plans.growth.chain : 0;
  D.gChainMult = s.plans.launch.chain > 0 ? s.plans.growth.chain/s.plans.launch.chain : 0;
  D.stripeVsBr = s.stripePct/0.0075;
  D.concRevenue= s.conciergeHrs*s.pConcierge;
  D.concCost   = s.conciergeHrs*s.conciergeCost;
  D.mixLabel   = PLAN_IDS.map(id=>Math.round((s.mix[id]||0)*100)).join(' / ');
  D.today      = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});

  /* --- 12-month runway requirement, worst case, founders unpaid --- */
  if(!opts.skipSens){
    const w = s.worst;
    const c = structuredClone(s);
    c.fin.months = w.months;
    c.fin.churn = w.churn; c.planChurn = w.churn;
    c.fin.newPerMonth = w.newPerMonth; c.fin.newGrowth = 0;
    c.fin.hires = [];                 /* no hire without funding */
    c.raise.amount = 0;               /* founders never paid: that is the point */
    c.util = w.util;
    c.infraSpec.droplets = w.droplets;
    /* Today's real mix, not the target: every customer is on Launch. */
    c.mix = {launch:1, launchPlus:0, growth:0, growthPlus:0, pro:0};
    const wd = derive(c, {skipSens:true});
    const sum = k => wd.fin.rows.reduce((a,r)=>a+r[k],0);
    D.worstCase = {
      months: w.months,
      hosting: sum('oInf'), vendor: sum('cMet')+sum('cIp')+sum('cConc')+sum('cStripe')+sum('cPart'),
      support: sum('oSup'), acquisition: sum('oCac'), overheads: sum('oOvh'),
      cost: sum('cogs')+sum('opex'), revenue: sum('revenue'),
      endCustomers: wd.fin.rows[w.months-1].customers
    };
    /* Miscellaneous and contingency, at the company's existing 20% buffer rule. */
    D.worstCase.contingency = D.worstCase.cost * w.contingency;
    D.worstCase.costPlus    = D.worstCase.cost + D.worstCase.contingency;
    D.worstCase.shortfall   = Math.max(0, D.worstCase.costPlus - D.worstCase.revenue);
    D.worstCase.monthly     = D.worstCase.costPlus/w.months;
  }

  /* --- sensitivity (guarded against recursion) --- */
  if(!opts.skipSens){
    D.sens    = sensitivity(s, D);
    D.bizSens = bizSensitivity(s, D);
  }
  /* ONS+ is the largest line in every Suite ceiling now that it is granted 1:1,
     and the catch rate that sets it has never been measured. */
  D.onsCostLaunch     = (s.plans.launch.ons/1000)*D.bOns;
  D.onsCostLaunchZero = (s.plans.launch.ons/1000)*((1+s.buffer)*s.pOns);

  /* The rule, exactly as the source states it: a plan's price must exceed the
     cost of its own full allowance. Positive floor profit, nothing more. */
  const minP = (s.floorRule ? s.floorRule.minProfit : 0);
  D.floorBreaches = [];
  for(const id of PLAN_IDS){
    if(D.eco[id].floor <= minP)
      D.floorBreaches.push({name: D.eco[id].name, got: D.eco[id].floor});
  }
  if(D.sendEco.floor <= minP) D.floorBreaches.push({name:'Send', got: D.sendEco.floor});
  D.floorsOk = D.floorBreaches.length === 0;

  return D;
}

/* ------------------------------------------------------------
   The projection. Customers arrive, churn, consume their
   allowances and pay Stripe. Everything else follows.
   ------------------------------------------------------------ */
function project(s, D){
  const partnerRate = D.partnerRate;
  const months = Math.max(1, Math.min(120, Math.round(s.fin.months)));
  /* One provisioned block serves `infraCapacity.users`. In flat mode the model
     charges a single block however many customers arrive - which is only right
     while the base is genuinely fixed. */
  const rz = s.raise, founderPool = rz.founderTotalYear/12;
  /* Hosting now steps on measured capacity: 150 customers on this tier, 500 on
     the next. Every customer counts toward it, Send and Suite alike. */
  const infraFor = n => D.infraAt(n);
  const mix = {...s.mix};
  /* The onboarding specialist, found by role rather than by a month typed in two
     places. The hire is gated on the raise like every other non-founder, so no
     raise means no specialist and the founders keep delivering. */
  const OR = s.onramp;
  const orSpec = (s.fin.hires||[]).find(h => h.role === OR.specialistRole) || null;
  const orSpecOn = m => !!orSpec && m >= orSpec.start
                      && (orSpec.ungated || (rz.amount > 0 && m >= rz.month));
  /* Share of each month's signups that take Send rather than Suite, drifting
     from share0 to shareEnd over the life of the projection. */
  /* Signups by month. Flat trickle before the public beta, then a straight-line
     ramp to full velocity, and only after that does growth compound. */
  const L = s.launch || {month:1, rampMonths:1, preLaunch:0};
  const addsAt = m => {
    if(m < L.month) return L.preLaunch;
    const k    = m - L.month + 1;
    const ramp = Math.min(1, k/Math.max(1, L.rampMonths));
    /* Growth compounds after the ramp, but the RATE itself decays toward a
       floor, so month 60 is not month 12 with sixty doublings behind it. */
    let grow = 1, g = s.fin.newGrowth;
    for(let i = 0; i < Math.max(0, k - L.rampMonths); i++){
      grow *= (1 + g);
      g = Math.max(s.fin.growthFloor || 0, g * (s.fin.growthDecay ?? 1));
    }
    return s.fin.newPerMonth * ramp * grow;
  };
  const sp2 = s.sendPlan;
  const sendShareAt = m => months <= 1 ? sp2.share0
    : sp2.share0 + (sp2.shareEnd - sp2.share0)*((m-1)/(months-1));
  /* Each tier is its own stock. New customers arrive on the target mix; the
     opening book is whoever is actually on the books today. */
  const book = countBook(s);
  /* The loop runs twice. Corporation tax is computed from the finished year,
     but the cash line needs to know when it is paid - so pass one produces the
     profits, the tax is worked out from them, and pass two re-runs the same
     months with the payment schedule in hand. */
  let rows = [], lowest = 0, breakeven = null, runway = null, firstPaidM = null;
  const runPass = (taxSchedule) => {
    rows = []; breakeven = null; runway = null; firstPaidM = null;
    /* Every accumulator resets: the second pass re-runs the same months, and a
       stock left over from the first would start it on a full book. */
    const stock = {}; for(const id of PLAN_IDS) stock[id] = book[id] || 0;
    let customers = PLAN_IDS.reduce((a,id)=>a + stock[id], 0);
    let sendCust  = book.send || 0;
    let cash = s.fin.startCash;
    let equipGross = 0, equipDep = 0;   /* equipment at cost, and accumulated depreciation */
    /* Onramp starts by month, so concurrency can be counted and revenue spread.
       Per pass: the second pass re-runs the same months and a surviving array
       would start it with programmes already open. */
    const orStartsEnt = [], orStartsGro = [];
    let prepaid = 0, payrollPayable = 0, taxPayable = 0, retained = 0;
    let founderIn = 0, raisedIn = 0;
    lowest = cash;
    /* Founders top the account up to zero rather than by a round number: the
       model sizes the bridge instead of assuming one. */
    const founderTopUp = 0;

    for(let m = 1; m <= months; m++){
      const gainedAll = addsAt(m);
      const sendShare = Math.max(0, Math.min(1, sendShareAt(m)));
      const gainedSend = gainedAll * sendShare;
      const gained     = gainedAll - gainedSend;          /* Suite signups */

      const churned     = customers * s.fin.churn;
      const churnedSend = sendCust  * s.fin.churn;
      for(const id of PLAN_IDS)
        stock[id] = Math.max(0, stock[id]*(1 - s.fin.churn) + gained*mix[id]);
      customers = PLAN_IDS.reduce((a,id)=>a + stock[id], 0);
      sendCust  = Math.max(0, sendCust - churnedSend + gainedSend);
      const allCust = customers + sendCust;

      const byTier = {};
      for(const id of PLAN_IDS) byTier[id] = stock[id];

      /* --- Onramp: one product, two delivery shapes ---
         Every new Enterprise account carries it as part of the offer; half of
         new Growth and Growth+ accounts take the cut-down version. The price is
         the same $1,500 either way; what differs is how long delivery runs, so
         each shape recognises and costs over its own number of months.

         Delivery is capacity-bound and the projection may not sell faster than
         someone can deliver: a start rate while the founders do it, a limit on
         how many are open at once afterwards, counted across both shapes. */
      const orDemandEnt = OR.enterprise.takeUp *
        OR.enterprise.tiers.reduce((a,id)=>a + gained*(mix[id]||0), 0);
      const orDemandGro = OR.growth.takeUp *
        OR.growth.tiers.reduce((a,id)=>a + gained*(mix[id]||0), 0);
      const orDemand = orDemandEnt + orDemandGro;
      const orSpecialist = orSpecOn(m);
      /* Open engagements are whatever started inside its own delivery window. */
      const openOf = (arr, months) => {
        let n = 0;
        for(let k = 1; k <= months - 1; k++) n += (arr[m-k]||0);
        return n;
      };
      const orCap = orSpecialist
        ? Math.max(0, OR.concurrentCapAfter
            - openOf(orStartsEnt, OR.enterprise.cycleMonths) - openOf(orStartsGro, OR.growth.months))
        : OR.startCapBefore;
      const orStart = Math.min(orDemand, orCap);
      /* Rationing hits both shapes alike: an Enterprise deal already won does
         not queue behind a Growth signup. */
      const orFill = orDemand > 0 ? orStart/orDemand : 0;
      orStartsEnt[m] = orDemandEnt * orFill;
      orStartsGro[m] = orDemandGro * orFill;
      const orUnmet   = orDemand - orStart;
      const orRunning = orStart
                      + openOf(orStartsEnt, OR.enterprise.cycleMonths)
                      + openOf(orStartsGro, OR.growth.months);
      /* Recognised, and costed, across each shape's own delivery months. */
      let orRevenue = 0, orCost = 0;
      for(const [arr, shape] of [[orStartsEnt, D.onramp.enterprise], [orStartsGro, D.onramp.growth]]){
        for(let k = 0; k < shape.months; k++){
          const sm = m - k;
          if(sm < 1) continue;
          orRevenue += (arr[sm]||0) * (OR.price/shape.months);
          /* Founder hours are a real cost until the customer success manager is
             on; after that they sit inside that salary and charging them here
             as well would count them twice. */
          if(!orSpecialist) orCost += (arr[sm]||0) * (shape.cost/shape.months);
        }
      }
      const orStartEnt = orStartsEnt[m], orStartGro = orStartsGro[m];

      const subsSuite = PLAN_IDS.reduce((a,id)=>a + byTier[id]*s.plans[id].price, 0);
      const subsSend  = sendCust * D.sendEco.price;
      const subs = subsSuite + subsSend;
      /* Usage above the allowance bills at full list, exactly as page 05 says it
         does. Without this the projection charged the extra cost of heavy use
         without ever collecting the overage that pays for it. */
      const overUse = Math.max(0, s.util - 1);
      const overage = subs*s.fin.overageRate
                    + PLAN_IDS.reduce((a,id)=>a + byTier[id]*overUse*D.eco[id].list, 0)
                    + PLAN_IDS.reduce((a,id)=>a + byTier[id]*D.chainOverRev[id], 0);
      /* Onramp sits in revenue, so it carries the card fee and the partner share
         like every other line. That is why the booked margin is lower than the
         delivery margin the SKU quotes. */
      const revenue = subs + overage + orRevenue;

      const cMet  = PLAN_IDS.reduce((a,id)=>a + byTier[id]*s.util*D.eco[id].metered, 0)
                  + PLAN_IDS.reduce((a,id)=>a + byTier[id]*D.chainOverCost[id], 0)
                  + sendCust*D.sendEco.metered;
      const cIp   = PLAN_IDS.reduce((a,id)=>a + byTier[id]*D.eco[id].ip, 0);
      const cConc = PLAN_IDS.reduce((a,id)=>a + byTier[id]*D.eco[id].conc, 0);
      const cStripe = revenue*s.stripePct + allCust*s.stripeFix;
      const cPart   = revenue*partnerRate;
      const cogs = cMet + cIp + cConc + cStripe + cPart + orCost;
      const gp = revenue - cogs;

      /* Hiring is gated on the raise, exactly like founder pay: the team is not
         expanded out of revenue. Until capital lands the company runs on the
         people already here - two developers (one a contractor paid personally
         by a founder) and two data and lifecycle staff. */
      const secured   = rz.amount > 0 && m >= rz.month;
      /* Payroll: every hire whose start month has arrived, but only once capital
         has landed. The team is not expanded out of revenue. */
      const oncost = 1 + (s.fin.employerOncost||0);
      /* A hire runs once the raise has landed, unless it is marked ungated -
         the founder stipend is a wage the company owes from the month it starts,
         whether or not the round closes. */
      const live = h => (h.ungated || secured) && m >= h.start;
      /* A salary can step: the CEO's rises once the raise lands, because the
         stipend before it is what the company can carry rather than what the
         job is worth. */
      const payGbp = h => h.gbp + ((h.bumpFrom && m >= h.bumpFrom) ? (h.bumpGbp||0) : 0);
      const oEng = (s.fin.hires||[]).reduce((a,h)=> a + (live(h) ? (payGbp(h)*s.fx.gbpUsd/12)*oncost : 0), 0);
      const headcount = (s.fin.hires||[]).filter(live).length;
      const oSup = allCust * (s.fin.supportMin/60) * s.fin.loadedHourly;
      const oCac = gainedAll * s.cac;
      const oInf = infraFor(allCust);
      /* Recruitment and equipment arrive with a hire, not with a month. */
      const oHire = (s.fin.hires||[]).reduce((a,h)=>
        a + ((h.recruit !== false) && (h.ungated || secured) && m === h.start
             ? h.gbp*s.perHire.recruitPct*s.fx.gbpUsd : 0), 0);
      /* Equipment is capital: it buys an asset, so it leaves cash but does not
         hit the P&L. It depreciates over its life instead. */
      const capex = (s.fin.hires||[]).reduce((a,h)=>
        a + ((h.equipment !== false) && (h.ungated || secured) && m === h.start
             ? s.perHire.equipmentGbp*s.fx.gbpUsd : 0), 0);
      equipGross += capex;
      /* Per asset, not pooled. Charging 1/36 of the whole gross pool every month
         keeps depreciating assets that have already reached the end of their life,
         which understated FY2031 net book value by about GBP 460. Each machine
         depreciates over its own 36 months and then stops. */
      const life = s.perHire.equipLifeMonths || 36;
      const unit = s.perHire.equipmentGbp * s.fx.gbpUsd;
      const deprec = (s.fin.hires||[]).reduce((a,h)=> {
        if(h.equipment === false || !(h.ungated || secured)) return a;
        const age = m - h.start + 1;
        return a + (age >= 1 && age <= life ? unit/life : 0);
      }, 0);
      equipDep += deprec;
      /* Overheads are not flat: accounting steps with the filing obligations and
         software starts when the team does. */
      const acct = (s.accountingSteps||[]).reduce((a,x)=> m >= x.from ? x.gbp : a, 0);
      const seats = headcount >= (s.softwarePerSeat?.fromHeadcount ?? Infinity)
        ? headcount * (s.softwarePerSeat?.gbp || 0) : 0;
      const stepGbp = (acct - (s.overheads.accounting || 0)) + seats;
      const oOvh = D.overheadTotal + stepGbp*s.fx.gbpUsd + oHire;
      const otherOpex = oEng + oSup + oCac + oInf + oOvh;
      const covers    = (gp - otherOpex) >= founderPool;
      const oFnd      = (secured && covers) ? founderPool : 0;
      if(oFnd > 0 && firstPaidM === null) firstPaidM = m;

      const oSal = oFnd + oEng;
      const opex = oSal + oSup + oCac + oInf + oOvh;

      /* Insurance is paid annually in advance: cash out once, charged monthly. */
      const fyStart = (((s.fin.startMonth - 1) + (m - 1)) % 12) + 1 === (s.fin.fyEndMonth % 12) + 1;
      const insMo   = (s.overheads.insurance||0)*s.fx.gbpUsd;
      const prepayOut = (s.balance.insurancePaidAnnually && (m === 1 || fyStart)) ? insMo*12 : 0;
      if(prepayOut) prepaid += prepayOut;
      const prepaidAmort = Math.min(prepaid, insMo);
      prepaid -= prepaidAmort;

      /* Employer on-costs reach HMRC the month after they are incurred. */
      const oncostThisMonth = oEng - (oEng/oncost);
      const payrollPaidOut  = payrollPayable;
      payrollPayable = oncostThisMonth;

      const ebitda = gp - opex;
      /* Depreciation is a charge, not a payment: it reduces profit and the asset,
         never cash. Capex is the reverse - cash out, no charge. */
      const ebit = ebitda - deprec;
      /* Founders draw nothing until the gate opens, so `ebitda` above is before
         any founder compensation. That is a runway fact, not a profit: the
         business is being subsidised by three people working unpaid. This line
         charges the full pool every month regardless, which is what the business
         actually costs to run. Both are shown wherever EBITDA appears. */
      const ebitdaPaid = ebitda + oFnd - founderPool;
      /* Cash is not profit. It moves for capex, for the timing of payroll taxes
         and prepayments, and for corporation tax nine months after a year end. */
      const taxDue = taxSchedule[m] || 0;
      taxPayable = Math.max(0, taxPayable - taxDue);
      const projected = cash + ebitda - capex - prepayOut + prepaidAmort
                      + oncostThisMonth - payrollPaidOut - taxDue;
      /* The founder bridge exists to cover the months BEFORE the raise, and
         stops there. Left uncapped it became a bottomless wallet: the bear case
         drew $185,025 of founder money and still reported a zero cash floor,
         which hid the shortfall instead of showing it. After the raise, a
         negative balance is a funding gap and must read as one. */
      const bridge = (projected < 0 && m < rz.month) ? -projected : 0;
      founderIn += bridge;
      cash += ebitda - capex - prepayOut + prepaidAmort
            + oncostThisMonth - payrollPaidOut - taxDue + bridge;
      if(m === rz.month){ cash += rz.amount; raisedIn += rz.amount; }   /* the raise lands */
      if(cash < lowest) lowest = cash;
      if(breakeven === null && ebitda > 0) breakeven = m;
      if(runway === null && cash < -0.005) runway = m - 1;

      rows.push({m, preLaunch: m < L.month, headcount, oHire, capex, deprec, ebit,
                 prepaid, payrollPayable, taxPayable, taxDue, founderIn, raisedIn,
                 equipNbv: equipGross - equipDep, equipGross, equipDep, ebitdaPaid, founderPool, byTier, customers, sendCust, allCust, subsSuite, subsSend,
                 sendShare, gained, gainedSend, churned, churnedSend, churnedAll: churned + churnedSend, subs, overage, revenue,
                 cMet, cIp, cConc, cStripe, cPart, cogs, gp,
                 orStart, orStartEnt, orStartGro, orRunning, orDemand, orUnmet, orRevenue, orCost, orSpecialist,
                 gm: revenue > 0 ? gp/revenue : 0,
                 oFnd, oEng, oSal, oSup, oCac, oInf, oOvh, opex, ebitda, cash});
    }
    return {rows, lowest, breakeven, runway};
  };

  let pass = runPass({});
  /* Financial years are cut on the statutory year end (31 July), not on the
     model's own start month. FY1 therefore runs Aug 2026 - Jul 2027 and is a
     stub of 11 forecast months; the August 2026 actual belongs to it too. */
  const fyEnd = s.fin.fyEndMonth || 12;
  const fyOf = (m) => {
    const idx = (s.fin.startMonth - 1) + (m - 1);
    const cal = (idx % 12) + 1, yr = s.fin.startYear + Math.floor(idx/12);
    return cal > fyEnd ? yr + 1 : yr;
  };
  const fyList = [...new Set(rows.map(r => fyOf(r.m)))].sort((a,b)=>a-b);
  const fySpan = (fy, key) => rows.filter(r => fyOf(r.m) === fy).reduce((t,r)=>t + (r[key]||0), 0);
  const years = fyList.map((fy, i) => {
    const rs = rows.filter(r => fyOf(r.m) === fy), last = rs[rs.length-1] || {};
    return {fy, label:'FY'+fy, index:i+1, months:rs.length,
      rev:fySpan(fy,'revenue'), cogs:fySpan(fy,'cogs'), gp:fySpan(fy,'gp'),
      opex:fySpan(fy,'opex'), ebitda:fySpan(fy,'ebitda'), ebitdaPaid:fySpan(fy,'ebitdaPaid'),
      deprec:fySpan(fy,'deprec'), ebit:fySpan(fy,'ebit'), capex:fySpan(fy,'capex'),
      endCash:last.cash||0, endCust:last.allCust||0, endMrr:last.subs||0};
  });
  /* ---- Corporation tax -------------------------------------------------
     Charged on the year's taxable profit after losses brought forward, at the
     small-profits rate to the lower limit and the main rate above the upper,
     with marginal relief between. Thresholds are sterling; the model is in
     dollars, so they convert. Paid nine months after the year end, which is
     why the charge and the payment sit in different years. */
  (function(){
    const T = s.tax, fx = s.fx.gbpUsd;
    /* Limits are divided between associated companies and pro-rated for an
       accounting period shorter than 12 months (CTA 2010 s.18D/s.18E). FY2027
       is an 11-month stub, so both adjustments bite in year one. */
    const div = 1 + (T.associatedCompanies || 0);
    let lossesBf = 0;
    for(const y of years){
      const pro = (y.months || 12)/12;
      const lower = (T.lowerGbp/div)*pro*fx, upper = (T.upperGbp/div)*pro*fx;
      const profit = y.ebit;      /* the actual accounting result: after what we
                                     really paid ourselves, and after depreciation */
      const offset = profit > 0 ? Math.min(profit, lossesBf) : 0;
      const taxable = Math.max(0, profit - offset);
      let charge = 0;
      if(taxable > 0){
        if(taxable <= lower) charge = taxable * T.smallRate;
        else if(taxable >= upper) charge = taxable * T.mainRate;
        else charge = taxable*T.mainRate - T.marginalFraction*(upper - taxable);
      }
      y.lossesBf = lossesBf;
      y.lossUsed = offset;
      y.taxable  = taxable;
      y.tax      = charge;
      y.profitAfterTax = profit - charge;
      y.effRate  = profit > 0 ? charge/profit : 0;
      lossesBf = profit < 0 ? lossesBf - profit + 0 : lossesBf - offset;
      y.lossesCf = lossesBf;
      /* The month the cash actually leaves: nine months after the year end. */
      y.taxPaidInFy = y.fy + 1;
    }
  })();

  /* Pass two: the same months, now knowing when the tax leaves the account.
     Corporation tax is due nine months and a day after the year end, so a
     charge in FY2027 is a payment in the following April. */
  const monthOfFyPayment = (fy) => {
    const payCal = ((fyEnd + s.tax.payMonthsAfterYearEnd - 1) % 12) + 1;
    const payYear = fy + (fyEnd + s.tax.payMonthsAfterYearEnd > 12 ? 1 : 0);
    for(const r of rows){
      const idx = (s.fin.startMonth - 1) + (r.m - 1);
      const cal = (idx % 12) + 1, yr = s.fin.startYear + Math.floor(idx/12);
      if(cal === payCal && yr === payYear) return r.m;
    }
    return null;
  };
  const taxSchedule = {};
  for(const y of years){
    const when = monthOfFyPayment(y.fy);
    if(when !== null && y.tax > 0) taxSchedule[when] = (taxSchedule[when]||0) + y.tax;
    y.taxPaidMonth = when;
  }
  pass = runPass(taxSchedule);
  rows = pass.rows;
  /* Year totals are recomputed off the second pass, but the tax charge itself
     does not change - it is a function of profit, which the schedule does not
     move. Only the cash line and the creditor move. */
  for(const y of years){
    const rs = rows.filter(r => fyOf(r.m) === y.fy), last = rs[rs.length-1] || {};
    y.endCash = last.cash || 0; y.endCust = last.allCust || 0; y.endMrr = last.subs || 0;
    y.founderIn = last.founderIn || 0; y.raisedIn = last.raisedIn || 0;
  }

  /* ---- Cash flow, per financial year -----------------------------------
     Cash is not profit. This reconciles the two: operating cash is EBITDA less
     the tax actually paid and the movement in working capital; investing is
     equipment; financing is the founder bridge and the raise. The closing
     balance must equal the balance sheet's cash or one of them is wrong. */
  let cfPrevPrepaid = 0, cfPrevPayroll = 0, cfPrevFounder = 0, cfPrevRaised = 0;
  let cfOpen = s.fin.startCash;
  const cashflow = years.map(y => {
    const rs = rows.filter(r => fyOf(r.m) === y.fy), last = rs[rs.length-1] || {};
    const first = rs[0] || {};
    const sum = k => rs.reduce((a,r)=>a + (r[k]||0), 0);
    const prepaidMove  = -( (last.prepaid||0) - (cfPrevPrepaid) );
    const payrollMove  =  ( (last.payrollPayable||0) - (cfPrevPayroll) );
    const taxPaid      = sum('taxDue');
    const operating    = y.ebitda - taxPaid + prepaidMove + payrollMove;
    const investing    = -sum('capex');
    const financing    = ((last.founderIn||0) - cfPrevFounder) + ((last.raisedIn||0) - cfPrevRaised);
    const net          = operating + investing + financing;
    const row = {label:y.label, open:cfOpen, ebitda:y.ebitda, taxPaid, prepaidMove, payrollMove,
                 operating, investing, financing, net, close: cfOpen + net,
                 actualClose: last.cash||0};
    cfOpen = cfOpen + net;
    cfPrevPrepaid = last.prepaid||0; cfPrevPayroll = last.payrollPayable||0;
    cfPrevFounder = last.founderIn||0; cfPrevRaised = last.raisedIn||0;
    return row;
  });

  /* ---- Balance sheet, at each year end ---------------------------------
     Assets = liabilities + equity, or the model is wrong. Retained earnings
     accumulate profit after tax; the tax creditor is the charge not yet paid;
     the payroll creditor is the on-costs owed to HMRC for the final month. */
  const shareCapital = (s.balance.shareCapitalGbp||0)*s.fx.gbpUsd;
  /* The opening sheet has to balance too. The company holds startCash and has
     issued shareCapital; the difference is what trading has consumed since
     incorporation, which is an opening retained deficit. Without it every year
     is out by exactly that amount. */
  let re = s.fin.startCash - shareCapital, taxCred = 0;
  const balanceSheet = years.map(y => {
    const rs = rows.filter(r => fyOf(r.m) === y.fy), last = rs[rs.length-1] || {};
    re += (y.ebit - y.tax);
    taxCred = taxCred + y.tax - (rows.filter(r => fyOf(r.m) === y.fy)
                                    .reduce((a,r)=>a + (r.taxDue||0), 0));
    const assets = {cash: last.cash||0, prepaid: last.prepaid||0, equipment: last.equipNbv||0};
    const liabilities = {payroll: last.payrollPayable||0, tax: Math.max(0, taxCred),
                         directorsLoan: last.founderIn||0};
    /* The founder bridge is a DIRECTOR'S LOAN, not equity. It is cash a founder
       puts in to stop the account going negative and no shares are issued for
       it, so it is money the company owes. It sat under share capital until
       6 Oct 2026, which overstated net assets and would have been a filing
       error. It carries no interest and no repayment date inside the forecast,
       so it runs to July 2031 unchanged - which is what an unrepaid loan looks
       like. A repayment date would be a new input. */
    const equity = {shareCapital, capitalRaised: last.raisedIn||0, retained: re};
    const totalAssets = assets.cash + assets.prepaid + assets.equipment;
    const totalLiab   = liabilities.payroll + liabilities.tax + liabilities.directorsLoan;
    const totalEquity = equity.shareCapital + equity.capitalRaised + equity.retained;
    return {label:y.label, assets, liabilities, equity, totalAssets, totalLiab, totalEquity,
            check: totalAssets - (totalLiab + totalEquity)};
  });

  const span = (a,b,key) => rows.slice(a,b).reduce((t,r)=>t + r[key], 0);
  const y1 = Math.min(12, rows.length), y2 = Math.min(24, rows.length),
        y3 = Math.min(36, rows.length);
  const last = rows[rows.length-1];

  /* First month the base outgrows the tier we run today. */
  const firstTier = (s.infraTiers||[])[0];
  const outgrew = firstTier ? rows.find(r => r.allCust > firstTier.maxUsers) : null;
  /* Total Alchemy spend across the horizon: bundled allowance AND overage.
     Quoting the allowance alone understated it 24x. */
  const alchemy5y = rows.reduce((a,r)=> a + PLAN_IDS.reduce((b,id)=>
      b + r.byTier[id]*((s.plans[id].chain/10000)*D.bChain + D.chainOverCost[id]), 0), 0);
  const preLow = rows.reduce((a,r)=>Math.min(a, r.cash - (r.founderIn||0) - (r.raisedIn||0)), Infinity);
  return {
    months, rows, years, fyOf, balanceSheet, cashflow, taxSchedule, alchemy5y,
    capacityMonth: outgrew ? outgrew.m : null,
    firstPaidMonth: firstPaidM,
    raiseMonth: rz.month, raiseAmount: rz.amount,
    /* Deepest hole before the raise lands - what the raise has to cover. */
    /* The bridge tops cash back to zero every pre-raise month, so the low point
       of r.cash can never be negative. What the founders actually put in IS the
       gap, so read the bridge itself. */
    gapBeforeRaise: (()=>{ const r = rows.find(r => r.m === rz.month - 1);
      return r ? (r.founderIn || 0) : 0; })(),
    infraAtEnd: infraFor(last.allCust),
    blocksAtEnd: 1,
    y1Rev: span(0,y1,'revenue'), y1Gp: span(0,y1,'gp'), y1Cogs: span(0,y1,'cogs'),
    y1Opex: span(0,y1,'opex'),   y1Ebitda: span(0,y1,'ebitda'),
    y1EbitdaPaid: span(0,y1,'ebitdaPaid'),
    y2EbitdaPaid: span(12,y2,'ebitdaPaid'),
    y3EbitdaPaid: span(24,y3,'ebitdaPaid'),
    founderCostYear: rows[0] ? rows[0].founderPool*12 : 0,
    y2Rev: span(12,y2,'revenue'),y2Gp: span(12,y2,'gp'), y2Cogs: span(12,y2,'cogs'),
    y2Opex: span(12,y2,'opex'),  y2Ebitda: span(12,y2,'ebitda'),
    y3Rev: span(24,y3,'revenue'),y3Gp: span(24,y3,'gp'), y3Cogs: span(24,y3,'cogs'),
    y3Opex: span(24,y3,'opex'),  y3Ebitda: span(24,y3,'ebitda'),
    y3GM: span(24,y3,'revenue') > 0 ? span(24,y3,'gp')/span(24,y3,'revenue') : 0,
    /* Where the revenue actually comes from, by line rather than by tier. */
    y1RevSend: span(0,y1,'subsSend'), y1RevSuite: span(0,y1,'subsSuite'),
    y3RevSend: span(24,y3,'subsSend'), y3RevSuite: span(24,y3,'subsSuite'),
    endSend: last.sendCust, endSuite: last.customers,
    y1GM: span(0,y1,'revenue') > 0 ? span(0,y1,'gp')/span(0,y1,'revenue') : 0,
    y2GM: span(12,y2,'revenue') > 0 ? span(12,y2,'gp')/span(12,y2,'revenue') : 0,
    endCustomers: last.allCust, endMrr: last.subs, endCash: last.cash,
    /* Measured BEFORE the bridge and the raise are injected. Taking the low
       point of the post-financing path asks "how much do we need, given we
       already got it", which can only ever answer zero. */
    peakBurn: preLow,
    raiseNeeded: preLow < -0.005 ? -preLow : 0,
    breakevenMonth: breakeven === null ? 'beyond '+months+' mo' : breakeven,
    runway: runway === null ? 'no cash-out' : runway
  };
}

/* Cost drivers, ranked by what 10 points does to blended GP. */
function sensitivity(s, D){
  const trials = [
    {n:'On-chain cache-hit rate', k:'cacheHit',      d:-0.10, cur:fmt(s.cacheHit,'p0'),      own:'Engineering'},
    {n:'Stage-one filter catch',  k:'stage1',        d:-0.10, cur:fmt(s.stage1,'p0'),        own:'Engineering'},
    {n:'AI cache-hit rate',       k:'aiCacheHit',    d:-0.20, cur:fmt(s.aiCacheHit,'p0'),    own:'Engineering'},
    {n:'SES send rate',           k:'ses',           d: 0.25, cur:fmt(s.ses,'m2'),           own:'Engineering', mult:true},
    {n:'Company buffer',          k:'buffer',        d: 0.015,cur:fmt(s.buffer,'p1'),        own:'Founders'},
    {n:'Allowance utilisation',   k:'util',          d: 0.10, cur:fmt(s.util,'p0'),          own:'Product'}
  ];
  return trials.map(t => {
    const c = structuredClone(s);
    c[t.k] = t.mult ? c[t.k]*(1+t.d) : c[t.k] + t.d;
    const d2 = derive(c, {skipSens:true});
    return {
      n:t.n, own:t.own, cur:t.cur,
      moved: t.mult ? (t.d>0?'+':'')+Math.round(t.d*100)+'%' : (t.d>0?'+':'')+fmt(Math.abs(t.d), t.k==='aiCost'?'m2':'p1').replace('$',''),
      to: t.mult ? fmt(c[t.k], t.k==='ses'?'m2':'p0') : fmt(c[t.k], t.k==='buffer'?'p1':'p0'),
      gp: d2.blendGP, delta: d2.blendGP - D.blendGP
    };
  }).sort((a,b)=>Math.abs(b.delta) - Math.abs(a.delta));
}

/* Whole-business drivers, ranked by what they do to end cash. */
function bizSensitivity(s, D){
  const trials = [
    {n:'Monthly churn',        path:['fin','churn'],       to:s.fin.churn + 0.03,       f:'p0'},
    {n:'Acquisition growth',   path:['fin','newGrowth'],   to:s.fin.newGrowth - 0.05,   f:'p0'},
    {n:'New customers, mo 1',  path:['fin','newPerMonth'], to:s.fin.newPerMonth + 2,    f:'n1'},
    {n:'Overage revenue',      path:['fin','overageRate'], to:s.fin.overageRate + 0.08, f:'p0'},
    {n:'Acquisition cost',     path:['cac'],               to:s.cac*2,                  f:'m0'},
    {n:'Allowance utilisation',path:['util'],              to:s.util + 0.20,            f:'p0'},
    {n:'Support per customer', path:['fin','supportMin'],  to:s.fin.supportMin*2,       f:'n0'}
  ];
  return trials.map(t => {
    const c = structuredClone(s);
    let o = c; for(let i=0;i<t.path.length-1;i++) o = o[t.path[i]];
    const key = t.path[t.path.length-1];
    const base = o[key];
    o[key] = t.to;
    const d2 = derive(c, {skipSens:true});
    return {n:t.n, base:fmt(base,t.f), tested:fmt(t.to,t.f),
            cash:d2.fin.endCash, delta:d2.fin.endCash - D.fin.endCash};
  }).sort((a,b)=>Math.abs(b.delta) - Math.abs(a.delta));
}

/* ============================================================
   3 - Formatting
   ============================================================ */
function fmt(v, f, opts){
  if(v === undefined || v === null) return '';
  if(typeof v === 'string') return v;
  if(!isFinite(v)) return '∞';
  /* Everything is computed in dollars. Pounds are a display conversion at the
     single rate on page 09 - the same rate the GBP salary and overhead lines
     are converted with, so the two directions cannot disagree. */
  const rate = (opts && opts.rate) || DEFAULTS.fx.gbpUsd;
  const mode = (opts && opts.ccy) || 'usd';
  const usd = (n,d) => (n < 0 ? '−$' : '$') +
    Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const gbp = (n,d) => (n < 0 ? '−£' : '£') +
    Math.abs(n/rate).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const money = (n,d) => mode === 'usd' ? usd(n,d)
                       : mode === 'gbp' ? gbp(n,d)
                       : usd(n,d) + ' (' + gbp(n,d) + ')';
  const shortOne = (n,sym,div) => {
    const a = Math.abs(n)/div, sign = n < 0 ? '−' : '';
    if(a >= 1e6) return sign+sym+(a/1e6).toFixed(a >= 1e7 ? 1 : 2)+'m';
    if(a >= 1e4) return sign+sym+Math.round(a/1e3)+'k';
    return null;
  };
  const short = n => {
    const u = shortOne(n,'$',1), g = shortOne(n,'£',rate);
    if(mode === 'usd') return u !== null ? u : usd(n,0);
    if(mode === 'gbp') return g !== null ? g : gbp(n,0);
    return (u !== null ? u : usd(n,0)) + ' (' + (g !== null ? g : gbp(n,0)) + ')';
  };
  switch(f){
    case 'm0':  return money(v,0);
    case 'm2':  return money(v,2);
    case 'm2z': return v === 0 ? '—' : money(v,2);
    case 'm3':  return money(v,3);
    case 'm5':  return money(v,5);
    case 'mk':  return short(v);
    case 'n0':  return Math.round(v).toLocaleString('en-US');
    case 'n1':  return (Math.round(v*10)/10).toLocaleString('en-US');
    case 'n2':  return v.toFixed(2);
    case 'n3':  return v.toFixed(3);
    case 'c0':  return Math.round(v*100)+' cents';
    case 'p0':  return (v*100).toFixed(0)+'%';
    case 'p1':  return (v*100).toFixed(1)+'%';
    case 'p2':  return (v*100).toFixed(2)+'%';
    case 'p3':  return (v*100).toFixed(3).replace(/0$/,'')+'%';
    /* signed gap, for "how we compare" figures where direction is the point */
    case 'pd0': return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v*100).toFixed(0)+'%';
    case 'x0':  return (Math.round(v*10)/10)+'×';
    case 'x1':  return v.toFixed(1)+'×';
    case 'x2':  return v.toFixed(2)+'×';
    case 'mo1': return v.toFixed(1)+' mo';
    case 'mon': return 'M'+Math.round(v);
    default:    return String(v);
  }
}
function fmtInput(v,f){
  switch(f){
    case 'n0':  return Math.round(v).toLocaleString('en-US');
    case 'n1':  return String(Math.round(v*10)/10);
    case 'm0':  return v.toLocaleString('en-US',{maximumFractionDigits:0});
    case 'm2':  return v.toFixed(2);
    case 'm3':  return String(v);
    case 'p0':  return (v*100).toFixed(0);
    case 'p1':  return String(+(v*100).toFixed(2));
    case 'p2':  return String(+(v*100).toFixed(3));
    case 'p3':  return String(+(v*100).toFixed(4));
    default:    return String(v);
  }
}
function parseInput(txt,f){
  const n = parseFloat(String(txt).replace(/[^0-9.\-]/g,''));
  if(!isFinite(n)) return null;
  return (f === 'p0'||f === 'p1'||f === 'p2'||f === 'p3') ? n/100 : n;
}

const getPath = (o,p) => p.split('.').reduce((a,k)=>(a == null ? a : a[k]), o);
function setPath(o,p,v){ const ks = p.split('.'), last = ks.pop(); ks.reduce((a,k)=>a[k],o)[last] = v; }


/* ---------------------------------------------------------------------------
   Ported from pricing/src/parts/model.js. Kept as JavaScript on purpose: the
   arithmetic in this file is the company's financial model and has been
   audited line by line, so it moves without being retyped. tsconfig has
   allowJs, and lib/model.d.ts gives the pages the shapes they consume.
   --------------------------------------------------------------------------- */
export {
  DEFAULTS, SCENARIOS, ASSUMPTIONS, PLAN_IDS, BASELINE, STORE_KEY,
  derive, project, sensitivity, bizSensitivity,
  fmt, fmtInput, parseInput, getPath, setPath
};
