// Generated from pricing/src/parts/pages.html, the single-file document this app replaces.
// The decision log is a historical record: every figure in it is a literal, frozen at the date
// of the decision. It is data rather than markup so the build can guarantee that - a live value
// rendered into a dated entry rewrites its own history, which is how the 21 August tier-mix row
// came to report the 19 September mix.
export type LogTable = { caption: string; columns: string[]; rows: string[][] };

export const DECISION_LOG: LogTable[] = [
  {
    "caption": "Decisions affecting what we sell and for how much",
    "columns": [
      "Date",
      "Decision",
      "From",
      "To",
      "Reason"
    ],
    "rows": [
      [
        "~Jun 2026",
        "Original catalogue",
        "—",
        "$29 / $199 / $499 + PAYG",
        "First public lineup. Annual at two months free, PAYG capped at 25,000 contacts."
      ],
      [
        "4 Aug 2026",
        "Pricing v4",
        "$29 / $199 / $499",
        "$49 / $349 / $799 / $2,299",
        "Nine decisions in one revision. Scale introduced; Starter and Pro Plus retired."
      ],
      [
        "4 Aug 2026",
        "On-chain credit rate",
        "$2.50 / 10k",
        "$10.00 / 10k",
        "$2.50 sat below the uncached GoldRush cost of $8.33. Every sale lost money unless the cache held."
      ],
      [
        "4 Aug 2026",
        "Bundled on-chain allowance",
        "200,000 (Pro)",
        "25,000 (Pro)",
        "GoldRush capacity is prepaid. Smaller bundles keep cash in before it goes out."
      ],
      [
        "4 Aug 2026",
        "Annual discount",
        "2 months free",
        "removed",
        "No discounting until there is churn data worth trading against."
      ],
      [
        "4 Aug 2026",
        "Send multiplier",
        "1× contacts",
        "10× contacts",
        "At 1× the sticker price was fiction and overage priced ordinary use."
      ],
      [
        "4 Aug 2026",
        "ONS+ list protection",
        "n/a",
        "$10 / 1,000",
        "New meter. Two-stage filter: 65% cleared in-house free, 35% escalated to Kickbox."
      ],
      [
        "4 Aug 2026",
        "PAYG contact cap",
        "25,000",
        "1,000",
        "25,000 free contacts made Launch unsellable."
      ],
      [
        "5 Aug 2026",
        "Intelligence opened to every paid tier",
        "Pro & Scale",
        "Launch upward",
        "Launch bundles 1,000 credits, 10% of Growth’s. It could not be given to Launch alone: Growth already carried credits, and a capability cannot exist at $49, vanish at $349 and return at $799."
      ],
      [
        "5 Aug 2026",
        "In-app push opened to Launch",
        "Growth upward",
        "25,000 (Launch)",
        "Push costs nothing per unit and reaches wallets with no email address. Withholding it protected no margin. Side effect: Launch’s overage multiple moved 1.12× to 1.66×."
      ],
      [
        "5 Aug 2026",
        "PAYG gets every capability",
        "gated",
        "ungated",
        "Nothing is capability-gated at any tier. Tiers differ on allowance depth, seats, dedicated IP and discount depth. PAYG pays full list and keeps hard caps."
      ],
      [
        "5 Aug 2026",
        "Concierge unbundled",
        "5 hrs in Scale",
        "optional add-on",
        "Few customers are expected to take it, so no plan price and no forecast leans on it. Scale became the best-margin tier, 68.4% to 83.7%."
      ],
      [
        "5 Aug 2026",
        "Standalone Push SKU",
        "proposed",
        "declined",
        "Push Lite / Growth / Pro at $39 / $149 / $449 was considered. The offers are priced together."
      ],
      [
        "20 Aug 2026",
        "AI list price",
        "$5.00 / 1k",
        "$6.00 / 1k",
        "DeepSeek v4 rates are three times the old ones. At $5.00 the meter ran at −14%."
      ],
      [
        "20 Aug 2026",
        "Two-tier split",
        "proposed",
        "declined",
        "Base messaging tier plus an Intelligence tier. Killed by the arithmetic: Intelligence is 8–17% of each plan’s price, so the premium would have been $2 on Launch."
      ],
      [
        "20 Aug 2026",
        "Intelligence as an add-on",
        "proposed",
        "shelved",
        "Sized to one full enrichment pass a month: Launch $5, Growth $75, Pro $195, Scale $415. No downside with plan prices held. Shelved when pricing was closed."
      ],
      [
        "20 Aug 2026",
        "Send plan introduced",
        "n/a",
        "$3.95 / 1,000 subs",
        "A web2 line for customers with no wallet audience, sold as Suite off. Priced flat per subscriber rather than in tiers. Trialled at 60% margin and at $3 and $5 per 1,000 before settling here."
      ],
      [
        "20 Aug 2026",
        "Send excludes ONS+ and Kickbox",
        "bundled",
        "removed",
        "List cleaning is a Suite capability. Send carries AWS SES and its hosting share only, so the two lines do not cross-subsidise. No dedicated IP either."
      ],
      [
        "20 Aug 2026",
        "Hosting recovered once, not twice",
        "priced into Send",
        "operating cost only",
        "Hosting is already carried in opex. It stays a pricing check on the Send rate rather than a second charge, which would have double-counted it."
      ],
      [
        "20 Aug 2026",
        "Flat rate over a volume curve",
        "proposed",
        "accepted",
        "Competitors price at an exponent near 0.72; ours is 0.80. Accepted knowing a flat rate wins small lists on price and loses large ones. Superseded 21 Aug by the base-fee shape, which wins both."
      ],
      [
        "20 Aug 2026",
        "Pricing closed",
        "open",
        "frozen",
        "Plan and meter prices fixed. Changes require reopening deliberately."
      ],
      [
        "21 Aug 2026",
        "Freeze reopened",
        "frozen",
        "repriced",
        "Reopened deliberately after a competitor study of 27 published ladders. Both lines moved to fixed fee plus a rate; meter list prices unchanged."
      ],
      [
        "21 Aug 2026",
        "Send plan reshaped",
        "$2.60 / 1,000 flat",
        "$6 + $2.60 / 1,000",
        "A flat rate decayed margin at the bottom, where Stripe’s fixed fee took a quarter of a small bill. The base fee reverses that and margin now settles at 70.2% instead of sliding, so no cap is needed."
      ],
      [
        "21 Aug 2026",
        "Suite priced off one curve",
        "4 typed prices",
        "$16 + $13.30 / 1,000 contacts",
        "Tiers become capability multipliers on a shared contact curve, so contacts are a slider. Growth at 25,000 is unchanged at $349, protecting the 60% cohort."
      ],
      [
        "21 Aug 2026",
        "Launch repriced",
        "$49",
        "$39",
        "At 0.79× the Launch line clears the floor-profit rule at any list size, so its contact cap becomes a product decision rather than a margin one."
      ],
      [
        "21 Aug 2026",
        "Pro repriced",
        "$799",
        "$1,622",
        "At 1.60× on the curve, at its 75,000-contact reference size. A Pro customer at 25,000 contacts pays $558; the tier no longer carries a fixed allowance."
      ],
      [
        "21 Aug 2026",
        "Competitor data corrected",
        "2 estimates",
        "published ladder",
        "EmailOctopus at 2,500 was an estimate ($24 against a real $20) and 100,000 was extrapolated ($287 against a real $345). Their free tier to 2,500 subscribers was missing entirely."
      ],
      [
        "21 Aug 2026",
        "Hosting capacity measured",
        "10 users / tier, assumed",
        "150, then 500",
        "This tier carries 150 customers; the $80 droplet carries 500. Replaces a placeholder that had been flagged unresolved since 20 Aug."
      ],
      [
        "21 Aug 2026",
        "Send enters the projection",
        "priced only",
        "a customer segment",
        "Send customers were priced but never modelled. They now arrive, churn and carry hosting like any other customer, at an assumed 8,000-subscriber average list."
      ],
      [
        "21 Aug 2026",
        "Stress case is the default",
        "45% utilisation",
        "100%",
        "Every figure in this document now assumes customers consume their whole allowance. Nothing depends on light usage."
      ],
      [
        "21 Aug 2026",
        "Tier mix revised",
        "20 / 60 / 20",
        "20 / 50 / 20",
        "Pro trimmed as a share of new business. Superseded on 19 Sep, when the go-to-market moved to large accounts and the mix became 20 / 50 / 30."
      ],
      [
        "21 Aug 2026",
        "Projection extended",
        "24 months",
        "59 months",
        "Acquisition growth cut from 10% to 5% a month: 10% compounding implied 84 signups in month 36, which is a sales organisation we do not have."
      ],
      [
        "21 Aug 2026",
        "Scale retired",
        "$2,299",
        "withdrawn",
        "It gated no capability Pro did not already have, and sat 44% above its own curve. Nothing in the forecast moves: its share of the mix was already 0%."
      ]
    ]
  },
  {
    "caption": "What we run on and what we pay for it",
    "columns": [
      "Date",
      "Decision",
      "From",
      "To",
      "Reason"
    ],
    "rows": [
      [
        "~Jul 2026",
        "Email provider",
        "Azure ACS $0.262 / 1k",
        "AWS SES $0.16 / 1k",
        "39% off every send at the corrected $0.16 Essentials rate (62% at the $0.10 we then believed we were paying). Now exclusively AWS; no Azure line remains."
      ],
      [
        "4 Aug 2026",
        "Payment rail",
        "Blockradar 0.75%",
        "Stripe 3.33% + $0.25",
        "4.4× more expensive, and now an explicit cost line in every plan price rather than a rounding error."
      ],
      [
        "4 Aug 2026",
        "Dedicated IPs",
        "2 per customer",
        "1 + shared pool",
        "Halves the fixed cost per account and the volume needed before dedicated sending helps."
      ],
      [
        "20 Aug 2026",
        "Hosting",
        "Render, Neon, Upstash, Vercel",
        "DigitalOcean Droplets",
        "Managed-service cost was scaling 2.7× while revenue grew 1.2×. Postgres and Redis now self-hosted. Backups, failover and patching become ours and are priced nowhere."
      ],
      [
        "20 Aug 2026",
        "Managed warm pool",
        "$0.08 / 1k surcharge",
        "removed",
        "Email is SES only at one rate. Loaded cost fell from $0.128 to $0.104."
      ],
      [
        "20 Aug 2026",
        "AI model",
        "$0.14 / $0.28 per 1M",
        "DeepSeek v4 flash",
        "$0.44 in / $1.32 out at peak, with cached input at $0.014. v4-pro available at three times the cost, not in use."
      ]
    ]
  },
  {
    "caption": "How the company is run",
    "columns": [
      "Date",
      "Decision",
      "What it means"
    ],
    "rows": [
      [
        "13 Oct 2026",
        "Onramp restated: one service, one price, two delivery shapes",
        "Corrected by the founder the same day, and it supersedes the three entries below it. There is no such thing as Enterprise onboarding: Onramp is what covers an Enterprise deal and it covers everything. It is one service at one flat price, $1,500, priced into the offer. What differs is the shape of the delivery. On Enterprise it runs the entire sales cycle, six months to a year, and that is the real service; on Growth and Growth+ it is a knock-off of the same thing, 20 hours over 90 days, sized to fit a self-serve plan. Not sold on Launch or Launch+.\n\nThe flat price means the Enterprise shape runs at a loss on its own and that is deliberate: 72 hours at the loaded rate is $4,471 of delivery against the same $1,500 everyone pays. It is carried by the subscription it protects. The Growth shape costs $1,242 and covers itself at 17.2%. One Enterprise deal in its first year: $19,464 of subscription plus the $1,500 fee, less $6,074 to run them and $4,471 to deliver, leaves $10,418 at a 49.7% margin. It holds at both ends of the cycle, $11,909 at six months and $8,928 at twelve, and the deal only stops covering its own costs past 240 hours of delivery, which is three and a third times the cycle as modelled. The 8 hours a month is a placeholder until a cycle has been run end to end; each extra hour a month is $559 on a deal.\n\nThe capacity cap now binds, which it did not when Onramp was 90 days. An Enterprise engagement holds a delivery slot for the whole cycle, so at 10 open at once the projection turns away 3.1 engagements in FY2029, 7.3 in FY2030 and 11.4 in FY2031 - 21.8 over the horizon, about GBP 10,600 of FY2031 EBITDA and GBP 18,700 of five-year cash. 14 clears nearly all of it, 16 clears it entirely. Left at 10 because it is a staffing question and not a dial: 10 open engagements is about 80 hours a month against a 173-hour month, so clearing it means the customer success manager is mostly an onboarding person by FY2029 or a second person is doing it."
      ],
      [
        "13 Oct 2026",
        "Enterprise onboarding is costed as the sales cycle, and the hours are a placeholder",
        "Cycle length from the founder: six months to a year. Modelled at the nine-month midpoint and 8 hours a month - one working day - because no hours figure exists yet. 72 hours at the loaded rate of $62.10 is $4,471 a deal, $2,981 at six months and $5,962 at twelve, given free on every Enterprise deal. The deal still clears the floor rule at either end: a first-year Enterprise contract earns $13,390 above the cost of its own allowance with hosting charged, onboarding spends 33% of that and leaves $8,918 at a 45.8% margin, or $7,428 on a full twelve-month cycle. The deal stops covering its own allowance at 216 hours, which is the point past which it is being bought rather than sold.\n\nThe cost is material and it lands early: $8,655 in FY2027 and $21,225 in FY2028 in pounds, which takes FY2027 EBITDA from GBP 12,764 to GBP 4,109 and FY2028 from GBP 27,316 to GBP 9,410. It is zero from FY2029 under the same rule as Onramp hours, when the work sits inside the customer success manager's salary. Every extra hour a month is $559 on a deal, so 8 is the number in this document most worth replacing with a measurement.\n\nOne inconsistency is now visible and left open deliberately. The tier mix puts 10% of signups on Pro as self-serve arrivals, which is 6.4 Enterprise deals in FY2028, each with a six-to-twelve-month sales cycle attached. A genuinely sales-led tier would be fewer, larger and slower. Tested rather than assumed: cutting Pro to 3% of signups makes the company WORSE, not better - FY2028 EBITDA GBP 527 and five-year cash GBP 222,602 against GBP 384,828 - because Pro is the most profitable tier and losing the subscription costs far more than the onboarding saves. Enterprise deals are worth having at this cost. The mix stays until there are real deals to re-cut it from.\n\nTiming is wrong by a month or more, on purpose. The hours are spent across the cycle, before the account signs, which makes this closer to an acquisition cost than a delivery one; the model books the whole figure in the month of signing because it cannot spend against a deal that has not arrived. The total per deal is right."
      ],
      [
        "13 Oct 2026",
        "Onramp is not a Pro or Enterprise product",
        "Enterprise onboarding runs the entire sales cycle, not 20 hours over 90 days, so modelling it as one included Onramp was modelling the wrong engagement rather than discounting the right one. Onramp is a Growth and Growth+ product and includedTiers is now empty. Two effects. The line pays for itself: every 100 Suite signups starts 25 programmes for $37,500 of fees against $31,050 of hours, $6,450 ahead at the SKU's own 17.2% margin, and it is EBITDA-positive from the first year instead of negative in FY2027 and FY2028. And the Enterprise engagement is now explicitly uncosted - it is real work spanning the whole cycle and no figure in this document carries it. In place of a guess the document reports the headroom: a first-year Pro deal earns $13,390 above the cost of its own allowance once hosting is charged, which is 216 hours at the loaded rate of $62.10. That is the budget a deal can absorb before the floor rule breaks, and it wants a length and an hours-a-month from whoever runs the cycle to become a cost."
      ],
      [
        "13 Oct 2026",
        "One credit is a quarter of a wallet, and that is the problem",
        "A reader asked for one credit to be defined the way Apollo defines it, where one credit is one person enriched. Ours is not comparable: enriching one wallet bills 4 credits, so a credit is a quarter of a wallet enrichment at $0.0010, and the unit a buyer is asked to price in is one nobody can picture. The intuitive unit is the wallet at $0.0040, against a cost to us of $0.00045, an 8.9x markup. The plans already line up with it exactly - every package's on-chain allowance is one full pass of its own contacts - so under a one-credit-is-one-wallet definition the allowance and the contact count become the same number and Growth reads as 25,000 wallet enrichments for 25,000 contacts rather than 100,000 credits. Redefining is revenue neutral, and that was tested rather than asserted: running the model with the credit redefined and diffing every derived number against the current one moves 25 figures, all of them credit counts or per-credit rates, and nothing else at all. Revenue, EBITDA, cash, every plan price and every floor margin are identical to the last decimal, and the floor rule still passes everywhere. Documented and not yet changed, because the published unit is a customer-facing decision."
      ],
      [
        "13 Oct 2026",
        "Pro is sold as Enterprise, custom priced, and the model keeps the derived floor",
        "The public pricing page no longer lists Pro: the top tier is Enterprise and the price is negotiated per deal. The model goes on pricing it off the curve at $1,622 a month for 75,000 contacts, because that figure is not an estimate of a deal - it is the cost of Pro's own full allowance plus the margin the floor rule requires, so it is the number a negotiation must not go below. Modelling an average custom deal instead would mean inventing a price with no closed Enterprise contract behind it, which is a worse number than a derived floor. Custom deals land above the floor, so every Pro figure in this document is the conservative end of the top tier. Two things left deliberately unchanged until there are Enterprise deals to measure: the tier still takes 10% of signups as self-serve arrivals, where a sales-led tier would be fewer, larger and slower, and Onramp is still included at no charge, which costs 6.4 points of a 69.8% first-year margin."
      ],
      [
        "13 Oct 2026",
        "Onramp introduced",
        "Optional on Growth and Growth+ at $1,500 ($500 x 3 months), cost $1,250, 20 hours over 90 days. Included on Pro. Not on Launch. Concierge renamed Onramp extra hours and removed from the public page. Reason: buyers in this market want a service more than a tool; the service is priced to cover its cost and sold to keep the subscription, not to earn. Benchmarks in the offer doc of the same date.\n\nThree things the model says that the instruction did not. First, the cost is $1,242, not $1,250: it is 20 hours at the loaded hours rate of $62.10, derived rather than typed, so it follows the rate if the rate moves. Delivery margin 17.2%, and 13.9% once the card fee is charged against it like every other line. Second, the SKU clears the floor-profit rule on its own and Pro still clears it with the programme added to its first year - $19,464 of price against $7,117 of allowance and programme, a floor of $12,347, and it still clears with hosting charged too. Third, the Onramp LINE on its own is negative while the founders deliver it: every 100 Suite signups starts 35 programmes, collects on 25 and pays for all 35, which is $37,500 of fees against $43,470 of hours, and that is why the line is EBITDA-negative in FY2027 and FY2028 and positive after. That is a view of one SKU in isolation and it is not a loss on a customer. Pro earns $19,464 in its first year and costs $5,875 to serve: $13,589 of profit at a 69.8% margin without the programme, $12,347 at 63.4% with it. Giving Onramp away on Pro costs 6.4 points of a 69.8% margin. No tier loses money.\n\nCapacity is capped at 3 starts a month until the customer success manager starts, then 10 running at once. It was briefed as 8, which does not line up with the cap it replaces: 3 a month sustains 9 open at once, so 8 would have made capacity fall in the month of the hire and turned away demand already won. Set to 10 the same day so the hire adds capacity. No hire is called onboarding specialist, so the capacity switch follows the customer success manager, which is the role put first in the hire list because onboarding is the work the founders cannot carry alone.\n\nEnterprise is recorded and not priced: there is no Enterprise plan in the model, only an Enterprise line in the partner fee table, so included-on-Enterprise costs nothing anywhere until Enterprise is a plan. Confirmed absent while in here: no $100 done-with-you fee and no 7% Growth discount exist anywhere in the model or the pages. The only discount the document ever carried was two months free on annual, removed 4 Aug 2026."
      ],
      [
        "10 Oct 2026",
        "The three non-engineering hires are offered GBP 25,000, not the legal floor",
        "Customer success manager, junior data engineer and marketing manager go from GBP 24,785 to GBP 25,000: GBP 29,500 loaded, GBP 2,458 a month each. The National Living Wage from April 2026 is GBP 12.71 an hour, which is GBP 24,785 at 37.5 hours over 52 weeks, and advertising a role at the legal minimum to the pound reads as a company counting pennies at the people it is hiring. GBP 215 a head a year, GBP 645 base and GBP 761 loaded across the three, buys a round number on the offer. The CEO's pre-raise stipend stays on GBP 24,785 itself, because it is what the company can carry for three months rather than an offer being made to anyone, and no hire starts before the step to GBP 30,785, so nobody is ever paid above a founder while it runs. Six roles, GBP 165,785 base and GBP 195,626 loaded at full strength. Five-year end cash GBP 342,347 against GBP 343,844, and EBITDA stays positive every year."
      ],
      [
        "10 Oct 2026",
        "The CEO steps up GBP 6,000 once the raise lands; the CTO starts at GBP 28,000",
        "The stipend is what the company can carry before the money arrives, not what the job is worth, so the CEO runs at GBP 24,785 from June 2027 and GBP 30,785 from September 2027, the raise month: GBP 36,326 loaded, GBP 3,027 a month. The CTO starts at GBP 28,000 rather than GBP 32,000, GBP 33,040 loaded and GBP 2,753 a month, which leaves the developer hire the only person in the company paid above a founder and puts the two founders second and third. The two together cost GBP 5,781 a month from September 2027 against GBP 2,437 before it. Six roles, GBP 165,140 base and GBP 194,865 loaded at full strength. Salaries run GBP 4,874 in FY2027, GBP 66,023 in FY2028 and GBP 194,865 in FY2031; EBITDA stays positive every year, GBP 11,919 to GBP 108,283, and five-year end cash is GBP 343,844 against GBP 350,420 before the change. The step is conditional on the raise in the sense that the money pays for it, but it is not gated in the model: if the raise does not land the founders are back to deciding what the company can carry, which is the same decision the stipend represents today."
      ],
      [
        "10 Oct 2026",
        "Salaries levelled: the founders were the lowest paid",
        "The hire list had customer success on GBP 45,000 and marketing on GBP 38,000 against founders on GBP 24,785 and GBP 32,000, which made the two people carrying the company the two lowest paid in it. Everyone now starts near the National Living Wage of GBP 24,785, except the engineering roles - the researched UK average for the work. Superseded twice the same day: the CTO came down to GBP 28,000 and the three non-engineering hires were rounded up to GBP 25,000, both entries above. Four hires, GBP 106,355 base and GBP 125,499 loaded, against GBP 150,000 and GBP 177,000 before the levelling and GBP 210,000 and GBP 247,800 before the list was rebuilt."
      ],
      [
        "10 Oct 2026",
        "No hire starts in FY2028",
        "Customer success manager and junior data engineer both start August 2028, the first month of FY2029. Nothing starts in FY2028, so the raise funds the CTO going full time, the founder pool and the node stack rather than headcount. The developer follows in August 2029 and the marketing manager in August 2030, taking the slot the product manager held: product education, documentation and qualified discovery are work the founders can hand over, product management is not yet."
      ],
      [
        "10 Oct 2026",
        "CTO full time from the raise month at GBP 32,000",
        "September 2027, inside operating costs, with the 18% employer-cost allowance: GBP 37,760 loaded, GBP 3,147 a month, GBP 34,613 in FY2028 for eleven months. The figure is the researched UK average for the engineering work he does and the same salary the developer hire carries. Ungated like the CEO's, and he takes no new equipment because he is already working on the product."
      ],
      [
        "10 Oct 2026",
        "The Atlas server was never in the hosting line",
        "Atlas runs on its own droplet, atlas-db, separate from the application hosting, and OnchainSuite pays the invoice: US$48.00 a month, GBP 35.41. The hosting line showed droplets, backups and domains and not this. Added from month 1, because the company has been paying it since it started. Hosting goes GBP 46.18 to GBP 81.59 a month, and GBP 74.51 to GBP 109.91 once the book crosses the first capacity tier. Operating costs rise GBP 389 in FY2027 and about GBP 425 a year after. If the Atlas indexing bill raised on 6 October is this same server it is now covered; if it is separate it still needs adding."
      ],
      [
        "10 Oct 2026",
        "Hire list rebuilt: four hires, customer success first",
        "Customer success manager becomes the first hire, September 2027, because onboarding and renewals are the work the founder cannot carry alone once intake reaches five a month; the backend developer moves to August 2029; the content marketer is removed because documentation and discovery stay with the founders. Four hires, GBP 172,000 base, GBP 202,960 loaded, against GBP 210,000 and GBP 247,800 before. Equipment stays GBP 1,500 a hire over 36 months and there is no recruitment fee."
      ],
      [
        "10 Oct 2026",
        "CTO full time from the raise month",
        "CTO full time from the raise month at GBP 24,785 base, the National Living Wage and the same basis as the CEO, because paying one founder a wage and the other a different one needs a reason this document does not have. GBP 29,246 loaded, GBP 2,437 a month, inside operating costs, ungated like the CEO's. He takes no new equipment: he is already working on the product. The founder pool covers the remaining part-time founder only."
      ],
      [
        "10 Oct 2026",
        "Founder pool down to one part-time founder",
        "US$36,000 to US$18,000, GBP 1,106 a month, from the CTO's full-time month. The gross-profit gate stays and the raise gate stays: the raise and the CTO start in the same month, so keeping it changes nothing and removing it would be a change without a reason."
      ],
      [
        "10 Oct 2026",
        "Software seats arrive a year earlier than planned",
        "The rule is unchanged - GBP 25 a seat once headcount reaches five - but adding the CTO to payroll means headcount reaches five in August 2029 rather than August 2030, so software starts then at five seats, GBP 125 a month. Accounting steps to GBP 200 the same month, now justified by four on payroll rather than three. Overheads read GBP 116 to May 2027, GBP 199 from June 2027, GBP 424 from August 2029 and GBP 449 from August 2030."
      ],
      [
        "9 Oct 2026",
        "Break-even covered hosting but not overheads",
        "The tile said one customer covers infrastructure and operating costs. Operating costs were literally zero in that sum: D.opexNow was 0 with the note “founders draw nothing today”, which confused founder pay being zero with the company having no running costs. It now carries the GBP 116 a month of overheads, and the sum uses the whole-book average gross profit rather than the Suite-only one, because a quarter of customers are on Send and earn far less. Two customers cover hosting and overheads; one covers hosting alone."
      ],
      [
        "9 Oct 2026",
        "Page 04 rounded the buffer up",
        "Page 04 described a 4% buffer. The live input is 3.5% and always was: the label formatted it to zero decimal places and 3.5 rounded to 4. The value was never wrong, only the label. It now prints to one decimal."
      ],
      [
        "7 Oct 2026",
        "Recruitment allowance removed; equipment stays",
        "The 15% of starting salary allowed for recruitment goes to zero: hiring is done by the founders through their own network, so there is no agency fee. Equipment stays at GBP 1,500 a hire, because a hire still needs a machine and it is capital rather than an expense. Operating costs fall GBP 4,800 in FY2028, 3,037 in FY2029, 12,450 in FY2030 and 9,000 in FY2031, nothing in FY2027 because the first hire lands in month 13."
      ],
      [
        "7 Oct 2026",
        "Depreciation was pooled and over-charged",
        "Depreciation charged one thirty-sixth of the whole equipment pool every month, so it kept depreciating machines that had already reached the end of their life. It now runs per asset. Only FY2031 moves, because that is the first year after an asset completes its 36 months: the charge falls from GBP 2,500 to GBP 2,042 and net book value rises from GBP 1,542 to GBP 2,000. Raised in the September audit and not applied until now."
      ],
      [
        "7 Oct 2026",
        "Accounting and software stop being flat",
        "GBP 200 a year of accounting holds only while there is no payroll. From June 2027 the CEO is on PAYE, which is a monthly filing, and accounting steps to GBP 100 a month. From August 2029 there are three on payroll, plus VAT returns once revenue passes the GBP 90,000 threshold in FY2028, plus annual accounts and a corporation tax return, and it steps to GBP 200 a month. Software was a comment in the model promising a cost it never charged: free tiers carry three founders and do not carry a team, so a line of GBP 25 per seat a month starts when headcount reaches five, which is August 2029 on the current hire list. Monthly overheads go GBP 116, to GBP 199 from June 2027, to GBP 424 from August 2029. Five-year end cash GBP 226,505 to GBP 219,531."
      ],
      [
        "7 Oct 2026",
        "Buffer confirmed at 3.5%",
        "Checked against the live input after a reviewer asked: s.buffer is 0.035. The sensitivity page's label of 3.5% is correct, so the figure to change is in 7.5 rather than 7.11."
      ],
      [
        "6 Oct 2026",
        "The market comparison priced Suite off the wrong curve",
        "Page 02 priced Suite at US$149 for 10,000 contacts. The package a 10,000-contact customer actually buys is Launch+ at US$118. The cause was not a stale price: D.suiteAt hardcoded the Growth multiplier for every size, so it returned the raw curve rather than the band's price. It was wrong at every size and in both directions - US$49 instead of US$39 at 2,500, US$149 instead of US$118 at 10,000, and US$1,014 instead of US$1,622 at 75,000. The Pro error is the one that mattered most: it made us look far cheaper than we are at exactly the sizes where we are expensive. Every comparison on page 02 moved. At 10,000 contacts Suite is now 12% under the market median rather than above it, 92% under HubSpot, 69% under ActiveCampaign, 41% under Omnisend, 22% under Klaviyo, 13% under Mailchimp, and 20% dearer than Brevo. Raised by an external reviewer, who had worked out the corrected figures independently; they match."
      ],
      [
        "4 Oct 2026",
        "Four accounts were recorded as paying and are onboarding",
        "Predict Street, Mey Network, DDSC and Abiflo were all recorded as paying customers. They are onboarding, not invoiced. Three customers pay: Yauga and Rehitage on Send, Surgence on Launch. No forecast figure moves, because the projection already opened with those three - what was wrong was the cover count and the measured gross profit tile, both of which described a book that did not exist. Measured gross profit per paying customer falls from US$68.90 to US$25.46 as a result, because the two Growth accounts that carried that average are not paying. Abiflo was removed from the register entirely on 4 October: the deal is dead, so it is neither a customer nor a prospect and counting it in either would overstate the pipeline."
      ],
      [
        "3 Oct 2026",
        "CEO goes on payroll from the month he goes full time",
        "From June 2027, model month 10, the CEO is paid GBP 24,785 a year - the National Living Wage of GBP 12.71 an hour from April 2026, checked on gov.uk, at 37.5 hours over 52 weeks. Loaded with the model's own 18% on-cost rule it is GBP 29,246 a year, GBP 2,437 a month. Real employer NI for a one-employee director company is nearer GBP 2,970 at this salary, so 18% is slightly conservative; it is kept for consistency with every other hire. The April 2027 uplift is unknown and the rate stays flat rather than being guessed.\n\nJune 2027 is the month the CEO leaves outside employment and goes full time on OnchainSuite. That is the reason for the date: the stipend begins when the person begins. It is also the month the book can carry it - a January start was tested and put four consecutive months into deficit (January to April 2027) and needed GBP 4,311 of founder money to bridge, for a full-year result of US$393. A profit that close to zero invites the question of what was tuned to land it there. At June the first year is US$16,912 of EBITDA, US$13,699 after tax, with one month in the red - September 2026, before any stipend - and US$939 of bridge.\n\nUnlike every other hire this one is NOT gated on the raise: the company owes a wage from the month the person starts, whether or not the round closes. It carries no recruitment fee and no equipment, because neither applies to appointing your own CEO."
      ],
      [
        "3 Oct 2026",
        "Founder pool cut to the two part-time founders",
        "US$54,000 a year becomes US$36,000, across two founders instead of three. The CEO is now paid the stipend above, so leaving the pool at three would have paid that person twice from month 13 onward. The pool is still gated on the raise landing AND on gross profit covering it. The CEO's pay rises above the stipend only when gross profit allows."
      ],
      [
        "3 Oct 2026",
        "Opening book cut to the three customers trading when the forecast opens",
        "The projection was seeded with all seven paying customers, which let it open with a book it had not modelled winning. It now opens with the three that were trading at the model start - Yauga and Rehitage on Send, Surgence on Launch - and earns the rest. Opening MRR US$887 becomes US$114. The other four remain recorded as paying customers; they are simply not a starting position. Revenue barely moves across five years, because at 5% monthly churn almost none of the opening book survives to month 59, but the forecast no longer claims credit for acquisition it never modelled."
      ],
      [
        "3 Oct 2026",
        "What those three changes cost",
        "End cash across five years US$352,989 becomes US$272,226, a fall of US$80,763. The stipend is about US$165,200 of gross cost over months 10 to 59, offset by roughly US$64,500 saved on the smaller founder pool and by the tax relief on both. FY2027 EBITDA falls from US$26,845 to US$16,912 - two months of stipend inside an eleven-month year that now opens with three customers rather than seven."
      ],
      [
        "25 Sep 2026",
        "Opening book corrected to seven paying customers",
        "The book was modelled as three. It is seven: Yauga, Rehitage, DDSC and Abiflo on Send, Surgence on Launch, Predict Street and Mey Network on Growth. Two more, Deadstock and DexWin, are signed but not yet paying and are deliberately outside MRR. Two names were also on the wrong plan — Yauga is Send, not Launch, and Surgence is Launch, not Send. Opening MRR $425.60 → $887.40. FY2027 revenue $99,223 → $104,737; the five-year figures barely move, because at 5% monthly churn almost none of today's book survives to month 59. The book is now a named register rather than a headcount, so prices, dates and plan changes have somewhere to live."
      ],
      [
        "25 Sep 2026",
        "The book we have is not the book we plan to win",
        "Four of seven paying customers are on Send, 57% of the book, against a forecast that assumes 25% of new signups. That gap is real, and the mix shifting after launch is an assumption that needs support rather than a fact. Two claims made alongside it earlier the same day were wrong and are corrected here. On-chain adoption was reported as two of seven; four of those seven are on Send, where the wallet channel is off by design and cannot be used, so the honest figure is two of the three customers who have the feature, 67%. And the book was read as a warning when it is the opposite: seven paying customers and two more signed, before launch, with no paid acquisition and nobody employed to sell. The model assumes 0.5 signups a month pre-launch; the actual rate is about 3.3, seven times the assumption and already two thirds of the velocity the plan expects after launching. On acquisition the forecast is conservative, not aggressive. What remains genuinely unmeasured is enrichment intensity: using the on-chain layer is not the same as enriching a whole list every month, and the forecast assumes the latter."
      ],
      [
        "Jul 2026",
        "First paying customer",
        "vault777, on the old Growth plan at $125, sending 52,000 emails. Revenue $125 against $72.05 of cost."
      ],
      [
        "Aug 2026",
        "Three customers, all Launch",
        "Yauga, Surgence and Datum Labs at $49 each. Revenue $147 against $196 of cost, the month that triggered the hosting move."
      ],
      [
        "5 Aug 2026",
        "Founder pay is triggered, not scheduled",
        "No draw until external capital is secured and gross profit covers everything else with the full draw left over. Pool is $54,000 a year across three founders."
      ],
      [
        "5 Aug 2026",
        "No paid acquisition",
        "Customers arrive through agency and foundation partners. CAC modelled at $0 for years one and two."
      ],
      [
        "5 Aug 2026",
        "Founders do support",
        "No support headcount and no cash cost. Real time, not free time; it becomes a cost the day it moves to payroll."
      ],
      [
        "5 Aug 2026",
        "Grants are upside only",
        "Non-equity and uncertain, so absent from every projection. Anything won beats plan."
      ],
      [
        "22 Aug 2026",
        "Forecast anchored to the public beta",
        "Signups run at 0.5 a month until November 2026, then ramp to full velocity over 6 months. Previously the model sold at full velocity from month one, while still in private beta."
      ],
      [
        "11 Sep 2026",
        "GoldRush replaced by Alchemy",
        "Alchemy is the sole on-chain provider. The goldrush* identifiers survive in the codebase — renaming them means a migration and a plan-catalog change — but they meter Alchemy. Wherever the word appears it is an identifier, never a supplier."
      ],
      [
        "11 Sep 2026",
        "On-chain cost measured, not modelled",
        "1,000 production enrichments consumed 905,520 compute units costing $0.41 and billed 2,950 credits: $1.38 per 10,000. Vendor rate was $8.33. Cross-checked against a 7.2× markup computed independently from the same run."
      ],
      [
        "11 Sep 2026",
        "On-chain yield step removed",
        "Not reduced to zero — the gap it described closed. We bill per live call, so a cache hit costs the customer nothing and costs us nothing. Loaded cost $3.02 → $1.43, on-chain margin 69.8% → 85.7%."
      ],
      [
        "11 Sep 2026",
        "Credits per wallet measured",
        "Was assumed at 1 and flagged as a possible 30× error. Measured at 2.95 — 2,950 billed credits over 1,000 wallets. The question is closed."
      ],
      [
        "11 Sep 2026",
        "Prepaid working capital retired",
        "GoldRush sold 300,000-credit blocks at $250 bought before use. Alchemy meters in arrears, so the cash-flow question dies with the supplier rather than being resolved."
      ],
      [
        "19 Sep 2026",
        "Horizon extended to five statutory years",
        "59 forecast months, September 2026 to July 2031. Years are cut on the 31 July year end at Companies House rather than the month the model starts, so FY2027 is an 11-month stub and the August 2026 actual belongs to it."
      ],
      [
        "19 Sep 2026",
        "Opening book corrected",
        "Yauga on Launch, ADI Predict Street on Growth, Vault777 and Surgence Lab on Send. The model had applied the target mix to a headcount of three, which put two thirds of a Pro customer on the books and overstated opening MRR by 82% — $705 against a real $463. Tiers are now stocks seeded by name; the mix describes who we win, not who we have."
      ],
      [
        "19 Sep 2026",
        "Raise set at $150,000, for infrastructure",
        "$300,000 to $150,000 to $250,000 and back to $150,000. The purpose is owning the on-chain stack — running our own nodes rather than reading Alchemy. This is a capability argument, not a cost saving: Alchemy costs $207,402 across the whole five years, 4.6% of revenue — corrected 23 Sep 2026, having been stated as $8,424, which counted only the bundled allowance and ignored the overage turned on in the row above. The case for owning nodes is Sei being unenrichable, ADI having no data plane and no price feed, and single-supplier risk — not the bill."
      ],
      [
        "19 Sep 2026",
        "Marketer hired after all",
        "Ruled out twice, then added once the raise had a purpose and the mix moved to large accounts. UK content marketer at GBP 38,000 from August 2029, the first month of FY2030. Recorded as a reversal rather than quietly slipped in."
      ],
      [
        "19 Sep 2026",
        "Stale hiring controls removed",
        "Page 07 still carried an Engineers count, an engineer salary and an earliest-hire month left over from before the hire list existed. They drove nothing but read as headcount, and a break-even rung was hardcoded to “founder pool plus 3 engineers”. The ladder now builds itself from the hire list, so it cannot drift from the plan again."
      ],
      [
        "19 Sep 2026",
        "Two junior hires, at researched UK rates",
        "Junior backend developer at GBP 32,000 (UK average GBP 31,061, London GBP 31,461, range GBP 24–38k) and junior data engineer at GBP 35,000 (UK average GBP 33,817, London GBP 34,645, graduates GBP 28–38k). Each sits just above its own average rather than at a London senior rate. A content marketer at GBP 38,000 joins in August 2029 — UK content marketing roles average GBP 39,561. One hire per financial year, which is what keeps every year profitable."
      ],
      [
        "19 Sep 2026",
        "Customer success and product manager added",
        "Customer success at GBP 45,000 from August 2029 as the base crosses 100 customers, against a UK base range of GBP 42–68k. Product manager at GBP 60,000 from August 2030, against a UK average of GBP 60–68k."
      ],
      [
        "19 Sep 2026",
        "No sales hire, and what that means",
        "An account executive was modelled at GBP 55,000 and then removed. 71% of the FY2031 book is Pro — about 45 accounts at $1,622 — and nobody in this plan is paid to win them. Founders carry the entire sales motion for five years alongside everything else. That is a deliberate choice, recorded here because the revenue line depends on it holding."
      ],
      [
        "19 Sep 2026",
        "Cash flow statement added",
        "Operating cash is EBITDA less tax actually paid and the movement in working capital; investing is equipment; financing is the bridge and the raise. Closing cash ties to the balance sheet in every year, so the two statements are consistent and neither has to be derived from the other."
      ],
      [
        "19 Sep 2026",
        "Bear and bull rebuilt",
        "The old scenarios moved util and overageRate, neither of which drives the model any more. They now move churn, intake, acquisition growth and mix, with bear also assuming customers enrich only half their list."
      ],
      [
        "19 Sep 2026",
        "Founder bridge capped at the raise",
        "The bridge sized itself to keep cash at zero with no ceiling, so the bear case quietly drew $185,025 of founder money and still reported a zero cash floor. It now covers only the months before the raise; after that a negative balance reads as the funding gap it is. Bear needed $182,063 beyond the raise when this was written; at the corrected overheads it is $134,063."
      ],
      [
        "19 Sep 2026",
        "Overage turned on: customers enrich everything",
        "Confirmed by the founder. A full enrichment pass is 22.1× the bundled on-chain allowance, so the plan bundles about a twenty-fifth and the rest bills at the list rate. The model previously charged the bundled allowance and collected nothing for the rest — wrong in both directions, and much larger on the revenue side. FY2031 revenue $1,125,993 → $1,624,168. On-chain overage runs at an 85.7% margin."
      ],
      [
        "19 Sep 2026",
        "Owning the node stack: noted, not modelled",
        "The raise is for bringing on-chain data in house. It is deliberately not in the model — there is no spec yet for chains, node count or archive versus full. What is known: Alchemy is variable at $1.43 per 10,000 while nodes are a fixed bill, so it is purely a volume question. Under about $4,000 a month, owning pays back inside the plan; above $8,000 it does not at full-pass volumes. Model it when the spec exists."
      ],
      [
        "19 Sep 2026",
        "Wallet transaction rate: unquantified",
        "Re-enrichment fires on ingested events, so cost can scale with transaction volume rather than list size. There is not enough data to estimate it and nothing in this model assumes any. The 15-minute debounce is what bounds it; if that ever regresses the exposure is unbounded. Left out rather than guessed."
      ],
      [
        "19 Sep 2026",
        "Mix reweighted to the upper tiers",
        "Launch 40/50/10 becomes 20% / 50% / 30%. The go-to-market is large accounts, so most Suite customers land in Growth and Pro and Launch becomes the entry point rather than the bulk. Intake rises from 4 to 5 a month. FY2031 revenue moves $482,531 → $1,125,993."
      ],
      [
        "19 Sep 2026",
        "Concentration risk this creates",
        "Pro becomes 22% of customers and 71% of revenue — about 45 accounts at $1,622 carrying $72,263 of a $101,219 monthly book. No customer has ever bought Pro. The highest price ever invoiced is $349. The mix is a decision about who we sell to, not an observation, and this plan does not work if those accounts do not land."
      ],
      [
        "19 Sep 2026",
        "Data engineer pushed to FY2029",
        "Start moved from March 2028 to August 2028, the first month of FY2029, so the two hires land in different financial years. Salaries split $46,922 / $107,174 across FY2028 and FY2029 instead of stacking. Every year is now profitable after tax — FY2028 goes from −$283 to +$13,724 — and retained earnings are positive throughout."
      ],
      [
        "19 Sep 2026",
        "Junior hires remove the loss year entirely",
        "Loaded payroll falls from $191,952 to $107,174 a year. FY2028 was the only year in deficit at −$46,130, because both hires landed while gross profit was $98,231; at junior rates salaries are $70,249 and FY2028 turns positive. Retained earnings never go negative, and FY2031 EBITDA rises from $40,941 to $125,720."
      ],
      [
        "19 Sep 2026",
        "Acquisition growth decays",
        "5% a month decaying to a 1% floor. Compounding 5% for sixty months is a sales organisation we do not have. Churn stays flat at 5% — it has never been measured and assuming it improves would be inventing good news."
      ],
      [
        "19 Sep 2026",
        "Corporation tax modelled",
        "19% to GBP 50,000, 25% above GBP 250,000, marginal relief between, charged on profit after depreciation. Losses carry forward. Paid nine months after the year end, which is why the charge and the payment sit in different years."
      ],
      [
        "19 Sep 2026",
        "UK overheads filled in",
        "Ten lines — legal, accounting, insurance, software, office, marketing, bank, ICO, operations — plus recruitment and equipment per hire. Open on page 09 since August. GBP 798 a month against GBP 175 before; office is zero because the company is remote."
      ],
      [
        "19 Sep 2026",
        "Balance sheet added",
        "Cash, prepayments and equipment against payroll and tax creditors, share capital, founder investment, capital raised and retained earnings. It balances to zero in every year, including an opening retained deficit for share capital issued and spent before the model starts."
      ],
      [
        "23 Sep 2026",
        "vault777 churned — opening book 4 → 3",
        "The first paying customer, won in July 2026, is no longer paying. Send falls 2 → 1 and the book is Yauga on Launch, ADI Predict Street on Growth, Surgence Lab on Send. Opening MRR $463.20 → $425.60, down 8.1%. The forecast moves far less: FY2027 revenue $99,531 → $99,223, FY2031 $1,624,168 → $1,624,139. That is the real lesson here — at 5% monthly churn only 4.8% of today’s book survives to month 59, so the five-year plan rests almost entirely on customers not yet won, and losing a current one barely touches it. Churn stays at 5%: one loss out of four is not a rate, and moving the assumption on a single event would be fitting a curve to one point. It is, however, the first churn this company has measured; the 5% remains an assumption."
      ],
      [
        "23 Sep 2026",
        "Overheads corrected to what we actually pay",
        "The ten overhead lines added on 19 September were researched estimates, never checked against a bank statement, and four of them were wrong. Marketing GBP 200 → 0 — it contradicted the standing decision that holds CAC at zero. Software GBP 150 → 0 — Notion and GitHub are on free tiers and the website is ours; paid tooling sits in cost of revenue. Legal GBP 150 → 0 — there is no retainer, and legal spend is lumpy rather than monthly. Accounting GBP 200 → GBP 16.67 — accounting runs on Tide and an accountant is bought by the hour at year end. ICO GBP 40 → GBP 52 a year — the tier 1 fee rose in February 2024 and ours is already paid, so that line is an invoice rather than an estimate. Insurance, domains and bank charges stand. Overheads GBP 798 → GBP 116 a month, and the 12-month worst-case funding requirement falls $15,143 → $1,804 — a burn of $584 a month rather than $1,696. Software returns as a cost when the team reaches about five people."
      ],
      [
        "23 Sep 2026",
        "AI-assisted review: what it found, and what it is not",
        "An AI-assisted review, not professional assurance. Five AI agents were run over the whole document independently, each given a different remit - revenue and unit economics, forecast and scenarios, capital and cash flow, statutory accounts and tax, and cross-document consistency - and each required to cite a file and line and show its arithmetic. The findings were then checked by hand before anything was changed. This entry previously described them as three CFA reviews, a chartered accountant and a financial analyst. That wording was wrong and an external reviewer was right to challenge it: no qualified professional has reviewed this document, and the agents' role titles were prompts, not credentials. Corrected 25 Sep 2026. The pattern the review found is worth keeping: almost every error was a sentence that stayed true to a decision after the decision changed. The numbers were mostly right; the prose around them had drifted."
      ],
      [
        "23 Sep 2026",
        "The scenario buttons were destroying the document",
        "Bear, Base and Bull each blanked the utilisation input, because the handler still assigned sc.util and sc.overageRate after SCENARIOS stopped carrying them on 19 Sep. Utilisation multiplies every metered cost, so one click zeroed every number on every page — including “Base”, which anyone would press to get back. It also applied only 2 of the 5 levers. Now applies churn, intake, growth, mix and enrichment passes, and nothing else. The scenario table on page 08 was always correct; only the buttons were stale."
      ],
      [
        "23 Sep 2026",
        "“Funding needed: $0” was a circular measurement",
        "raiseNeeded, peakBurn and gapBeforeRaise were all read off the cash path after the raise and the founder bridge had been injected — asking how much we need given we already have it, which can only answer zero. The cover KPI read $0, page 08 read “cash goes negative in month 0” from floating-point residue of −4.5e−14. All three now measure the pre-financing path. Base needs $442; on the same basis bear needs about $285,000 against a $150,000 round, and bear has no trough inside the horizon — it is still widening at month 59."
      ],
      [
        "23 Sep 2026",
        "Alchemy was understated 24×, and it is the argument for the raise",
        "The 19 Sep entry quoted $8,424 across five years, 0.3% of revenue. That was the bundled allowance only — and the entry two rows above it had just turned on full-pass overage, which adds $199,015. True cost $207,402, 4.6% of revenue, reaching about $6,200 a month by FY2031. That lands inside the band where this document says owning nodes is a live financial question, so “capability argument, not a cost saving” no longer follows from its own arithmetic. Now derived, not typed."
      ],
      [
        "23 Sep 2026",
        "Datum Labs was never a paying customer",
        "August 2026 was recorded as three customers at $147 — Yauga, Surgence and Datum Labs. Datum Labs is the founders’ own company and has never paid. The actual month is two customers at $98. This matters beyond the $49: a third of the only revenue this company has ever recorded was booked against itself, and any external reader counting customers was counting one that did not exist."
      ],
      [
        "23 Sep 2026",
        "ADI Predict Street onboarded",
        "Signed in September 2026, on Growth. This is what takes the book from the August actual of $98 to an opening MRR of $425.60 — a step that previously appeared in the model with nothing next to it explaining where it came from."
      ],
      [
        "23 Sep 2026",
        "Founder pay is waived, not deferred",
        "Confirmed by the founder: the founder pool the founders do not draw before the raise is given up, not owed. From 3 Oct 2026 that pool is $36,000 across two founders, because the CEO is paid a stipend instead. So no creditor arises and the model is right to charge nothing — but the distinction is worth $49,500 of FY2027 liability and roughly $9,500 of tax, so it should not rest on a conversation. Get it signed and dated by all three founders, covering the pre-raise period. Without that an accountant can argue it accrued, and it becomes a debt nobody intended."
      ],
      [
        "23 Sep 2026",
        "Datum Labs is an associated company: tax rises",
        "The founders control Datum Labs as well, and companies under common control share one set of corporation tax limits. The bands halve: the 19% rate now stops at GBP 25,000, not GBP 50,000. Combined with pro-rating the limits for the 11-month FY2027 stub — which the model had not been doing either — FY2027 tax goes $13,070 → $15,823 and the five-year charge rises about $3,765. Small, because from FY2029 the profits sit above the upper limit regardless. Worth confirming with the accountant: it is a control test, not an ownership one."
      ],
      [
        "17 Sep 2026",
        "Retracted: an invented margin rule and an unsanctioned ONS+ policy",
        "This document had carried a 70% gross-margin floor that appears nowhere in the pricing source of truth. The source’s rule is “a plan’s price must exceed the cost of its own full allowance” — a floor-profit test, which every plan passes. Acting on the invented rule, an import-then-meter ONS+ policy was applied to Suite; that proposal belongs to Send, sits in section 7d as a lever not yet taken, and was never about contacts. Both removed. ONS+ stays 1:1 with contacts as decided on 24 Aug."
      ],
      [
        "24 Aug 2026",
        "ONS+ granted 1:1 with contacts",
        "Joshua: “ONS+ should match the contacts they paid for.” 2,500 / 25,000 / 75,000, reversing the 10× cut made in the 22 Aug enforcement PR. A customer who cannot clean their list without an overage bill will not clean it. This breaks the margin rule on Launch and Growth — see page 04. Send stays at a tenth: its rate cannot carry 1:1."
      ],
      [
        "22 Aug 2026",
        "Tiers are contact bands",
        "Launch 0–24,999, Growth 25,000–74,999, Pro 75,000+. Confirmed with Joshua: the bands are the intent, and the slider reading on this page was what needed correcting. There is no Pro at 25,000 contacts — that size is Growth."
      ],
      [
        "22 Aug 2026",
        "Minimum sellable size per tier",
        "Launch 2,500 · Growth 5,000 · Pro 7,500 contacts; Send 5,000 subscribers. The margin rule had only ever been checked at the three reference counts; below them it was false — at 2,500 contacts Growth cost $77 against a $49 price."
      ],
      [
        "22 Aug 2026",
        "Extra seats priced",
        "$10 per seat per month above a tier’s included count, capped at 50 per checkout. A delta, never a total. Priced under the Launch-to-Growth step so a seat never cannibalises the upgrade it defers."
      ],
      [
        "25 Aug 2026",
        "In-app push got its own meter",
        "It had gated on emailsPerMonth: a Growth customer sending 250,000 pushes exhausted their entire email allowance without sending one email. The allowances were always sized as separate lines; only the meter was shared."
      ],
      [
        "22 Aug 2026",
        "Scale retired, not deleted",
        "Marked sellable: false with price and limits preserved, so nothing reprices underneath a live subscriber."
      ],
      [
        "22 Aug 2026",
        "Both live customers moved to Send",
        "Surgence Labs and vault777 held zero wallets and zero in-app sends — pure email on Suite plans. MRR fell $398 → $160, −60%. That is the cost of pricing what people actually use, and it leaves the book below monthly opex."
      ],
      [
        "23 Aug 2026",
        "AWS SES corrected to $0.16 per 1,000",
        "Verified against Amazon’s published rate card. The model had carried $0.10, which is the &agrave; la carte rate, not the Essentials rate we are on. Email cost rose 60% and broke the margin rule on Launch and on Send."
      ],
      [
        "24 Aug 2026",
        "Staying on SES Essentials",
        "&Agrave; la carte at $0.10 would have restored every margin with no price change and saved about $38,608 a year, but Essentials keeps the bundled deliverability tooling. Cost accepted; prices adjusted instead."
      ],
      [
        "24 Aug 2026",
        "Launch repriced to $39",
        "Multiplier 0.79×, up from 0.55. At the corrected email cost the old $27 gave a 58.6% floor, below the rule. Growth and Pro still clear it and do not move."
      ],
      [
        "24 Aug 2026",
        "Send repriced to the same floor as Suite",
        "Rate $2.60 → $3.95 per 1,000 subscribers, lifting the floor to 70.2%. One margin rule now covers both lines. The cost is price leadership at the top of the range: we cross EmailOctopus at 9,411 subscribers and are dearer beyond it. A briefly-declared lower floor for Send was considered and rejected in favour of holding one rule."
      ],
      [
        "22 Aug 2026",
        "Raise sized at $150,000",
        "Target for the year-two raise, modelled as landing in month 13. It funds founder pay and the first hires; neither begins before it lands. Founder pay first draws in the month gross profit can carry it, not on the day the money arrives."
      ],
      [
        "22 Aug 2026",
        "Suite is the main product; Send held at 25%",
        "Send takes a flat quarter of new signups rather than growing to a majority. At that share it is 25% of customers and about 2% of revenue — market coverage and a route into web2 accounts, not a revenue line. An earlier 70% assumption was the model’s, never the company’s."
      ],
      [
        "22 Aug 2026",
        "Capability scoring corrected",
        "CRM scores full via Audience, which holds the contact record and the journey of every user, and the transactional API scores full. Both had been marked absent in the market comparison. SMS is the only capability in the field we do not ship."
      ],
      [
        "22 Aug 2026",
        "Hiring is gated on the raise",
        "No hire appears in any month until capital lands, the same trigger as founder pay. Previously the first engineer was scheduled at month 13 regardless, which made a slow ramp look like a funding gap when it was really a discretionary hire. Removing it, the downside case never runs out of cash."
      ],
      [
        "22 Aug 2026",
        "Team recorded",
        "Two developers and two data and lifecycle staff. One developer is a contractor paid by Datum Labs, not by OnchainSuite and not personally by a founder — corrected 26 Sep 2026, having been recorded here as a founder paying him directly. Core systems are covered without hiring. The cost sits with Datum Labs, so it is outside OnchainSuite’s numbers rather than hidden inside them. It is not an OnchainSuite payroll expense and none is invented here."
      ],
      [
        "22 Aug 2026",
        "Employer on-costs added",
        "National insurance and pension at 18% on salary. A hire costs that much more than its salary line, and the hire list together comes to $335,918 a year loaded."
      ],
      [
        "22 Aug 2026",
        "Quote measured numbers once they exist",
        "Post-launch trading replaces the forecast as soon as there is any. Until then the figure to quote is the first twelve months after launch, not a calendar year that is half pre-launch."
      ],
      [
        "22 Aug 2026",
        "R&D cost curve deferred",
        "Development cost per customer should fall as the product matures and belongs in the model as a visible curve. Deferred deliberately: the revenue ramp was the credibility problem, not cost. Build it against post-launch data."
      ],
      [
        "20 Aug 2026",
        "Raise targeted at year two",
        "Runway funding first, covering operating cost only. Founder pay begins when that capital lands, not before."
      ],
      [
        "26 Sep 2026",
        "One identifier is one contact",
        "An email, a wallet, a Telegram handle and an X handle each count as one contact; a person holding three wallets is three contacts for billing. The model had assumed 3 wallets per contact, unmeasured, and multiplied every enrichment cost and every usage-revenue figure by it. The pricing source of truth never carried that multiplier - its enrichment-gap table gives Growth 75,000 credits for a full pass, which is 25,000 contacts x 3 credits - and at one wallet per contact the model reaches the same ~13% coverage the document states. Five-year usage revenue falls $1,095,686 to $332,260 and its share of FY2027 sales from 34% to 14%; FY2031 revenue $1,135,913 to $864,002. Every year stays profitable. This closes the open question on wallets per contact, and it shrinks the assumption an external reviewer called the biggest issue in the document to less than half its size."
      ],
      [
        "26 Sep 2026",
        "Every package bundles a full enrichment pass",
        "On-chain credits are now contacts x 2.95 on every package: 7,375 / 29,500 / 73,750 / 147,500 / 221,250. The old allowances of 1,000 to 25,000 covered about 13% of a pass and were never a cost constraint - enriching every contact on Launch costs $1.05 against a $39 price, and bundling the full pass moves each package's floor margin by two to three points, all staying above 50%. The remaining 87% had been assumed to be purchased as overage at seven times cost, which put a third of projected revenue on a decision nobody had observed. Five-year usage revenue goes $332,260 to $0; FY2031 revenue $864,002 to $745,655; FY2031 cash $620,117 to $360,169; capital needed $551. Every year stays profitable. The assumption an external reviewer called the biggest issue in the document no longer exists, and bear's chainPassesPerMonth of 0.5, which the bundled pass made inert, is set to 1 so the scenario no longer claims an effect it cannot have."
      ],
      [
        "26 Sep 2026",
        "A wallet enrichment bills 4 credits, at import and at overage",
        "$0.004 a wallet at the $10-per-10,000 list price, the same rate whenever it happens. The model had carried 2.95, the 11 September measured average of billed credits, which includes cache hits; for sizing a full import pass every call is live, so the rate is the right figure. Our own cost is per compute unit - $0.000432 a wallet - and does not move, so the cost per 10,000 credits is re-derived from $1.38 to $1.08 rather than left to inflate our cost by 35%. The bundled full pass becomes round: 10,000 / 40,000 / 100,000 / 200,000 / 300,000 credits. Margins move by two tenths of a point and FY2031 revenue is unchanged. Markup on enrichment goes 6.8x to 9.3x. The 300,000 on Pro is the figure a meeting note had recorded against Pro and that this document twice failed to reconcile as contacts or wallets; it may have been credits."
      ],
      [
        "26 Sep 2026",
        "The goldrush name is gone from the model; the supplier is Alchemy",
        "The on-chain cost rate was still keyed as goldrush, a supplier not used anywhere since 11 September. The pricing source of truth keeps that name in the product codebase because renaming the plan-limit key and the usage table there means a migration; none of that applies to a finance model, where the name was simply wrong. Renamed to alchemy. With it went the retired GoldRush prepaid-block working capital - grBlock, grPrice, grCustomers and the figures derived from them - which nothing had rendered since 17 September, and the GoldRush-era customer price that fed a break-even against it. One live defect surfaced on the way: the register entry labelled Alchemy billed-credit rate was reading the retired grPrice input and showing $1.38 after the real rate had moved to $1.08. It now reads the live figure. The five historical log rows that mention GoldRush record the supplier switch and stand as written."
      ]
    ]
  },
  {
    "caption": "Corrections",
    "columns": [
      "Date",
      "What was wrong",
      "Effect"
    ],
    "rows": [
      [
        "5 Aug 2026",
        "$715 was treated as a hosting bill",
        "It is the all-in monthly cost of ten customers. Carrying it as hosting counted every per-customer cost twice: ten customers appeared to cost $1,490 instead of $715."
      ],
      [
        "5 Aug 2026",
        "Concierge was buffered inconsistently",
        "The static v4 document charged concierge into the plan ceiling at the raw rate while buffering every other meter."
      ],
      [
        "5 Aug 2026",
        "Overage row contradicted the chart",
        "The static document labelled a 50%-over month as email-only overage while its stated profit assumed every meter. The all-meter reading is used throughout."
      ],
      [
        "20 Aug 2026",
        "Projection collected no overage",
        "Above 100% usage it charged the extra cost but never billed the customer. At 150% usage year-one EBITDA was understated by $107,000."
      ],
      [
        "20 Aug 2026",
        "Design rule 1 checked one meter",
        "It tested on-chain only, so it sat silent while AI went underwater. It now tests every meter against its loaded cost."
      ],
      [
        "20 Aug 2026",
        "July spend was Render alone",
        "Recorded as $45.61 when the real total across all providers was $72.05."
      ],
      [
        "5 Aug 2026",
        "Scale concierge was bundled and mis-buffered",
        "The static v4 document bundled 5 hours into the Scale price and charged them into the ceiling at the raw $60/hr while buffering every other meter. Concierge became an optional add-on, which took Scale’s floor margin from 68.4% to 83.7%. Scale itself was retired on 21 Aug 2026."
      ],
      [
        "20 Aug 2026",
        "Projection started from zero",
        "It began with no customers and no cash instead of the actual position: 3 customers and $3.95 of accumulated trading profit."
      ]
    ]
  },
  {
    "caption": "Decisions not yet taken",
    "columns": [
      "Question",
      "Owner",
      "Why it is waiting"
    ],
    "rows": [
      [
        "What cut does an agency partner take?",
        "Founders",
        "Modelled at zero because nothing is signed. Every point of effective share comes straight off gross margin."
      ]
    ]
  }
];
