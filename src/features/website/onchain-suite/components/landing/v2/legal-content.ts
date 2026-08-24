/**
 * Legal documents (Privacy, Terms, DPA, Sub-processors), ported 1:1 from the
 * marketing site. Blocks: `h` (section heading), `p` (paragraph), `li` (list
 * item; consecutive `li` render as one list). Bracketed `[...]` notes are the
 * source docs' own legal-review placeholders - left as-is, edit with counsel.
 */
export interface LegalBlock {
  t: "h" | "p" | "li";
  x: string;
}
export interface LegalDoc {
  slug: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  blocks: LegalBlock[];
}

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    subtitle:
      "How we collect, use, share, and protect personal data, and the rights you have under UK GDPR and the Data Protection Act 2018.",
    lastUpdated: "Last updated: 11 August 2026",
    blocks: [
      { t: "h", x: "1. Who we are" },
      {
        t: "p",
        x: "This policy is issued by OnchainSuite Ltd (“OnchainSuite”, “we”, “us”), a company registered in England and Wales (company number 17370357), with its registered office at 31 Nash Square, Birmingham, United Kingdom, B42 2EX. We have applied to register with the UK Information Commissioner’s Office (ICO) as a fee payer (application number C2013999); this page will show our registration reference once the ICO confirms it.",
      },
      {
        t: "p",
        x: "For questions about this policy or your personal data, contact privacy@onchainsuite.com, or our data protection contact at dpo@onchainsuite.com.",
      },
      { t: "h", x: "2. When we are a controller vs a processor" },
      {
        t: "p",
        x: "OnchainSuite plays two different roles, and which one applies determines whose privacy policy governs:",
      },
      {
        t: "li",
        x: "As a controller, for personal data we decide the purposes of: website visitors, prospects who request early access, and the administrators of customer accounts. This policy covers that data.",
      },
      {
        t: "li",
        x: "As a processor, for personal data we process on behalf of our customers (the protocols and teams who use the platform), including the on-chain and engagement data of their end users. There, the customer is the controller, their own privacy notice applies to their end users, and our Data Processing Agreement governs how we handle that data on their instructions.",
      },
      { t: "h", x: "3. Personal data we collect" },
      { t: "h", x: "Website & marketing" },
      {
        t: "li",
        x: "Contact details you submit (name, work email, protocol/company, role, and anything in free-text fields).",
      },
      {
        t: "li",
        x: "Usage and device data (pages viewed, referrer, approximate location from IP, browser) via cookies and analytics, see our Cookie Policy.",
      },
      { t: "h", x: "Account & billing (for customers)" },
      {
        t: "li",
        x: "Account administrator details, authentication data, and billing/contact information.",
      },
      { t: "h", x: "On-chain & wallet data" },
      {
        t: "p",
        x: "The platform reads public blockchain data (wallet addresses and their on-chain activity). On its own a wallet address is pseudonymous, but it can become personal data under UK GDPR when it is, or can be, linked to an identifiable person. An email address or other contact identifier is linked to a wallet only where the wallet holder opts in. We do not custody assets and never initiate or sign transactions; on-chain access is read-only.",
      },
      { t: "h", x: "4. Our lawful bases (UK GDPR Article 6)" },
      {
        t: "li",
        x: "Consent, for non-essential cookies/analytics and optional marketing communications. You may withdraw consent at any time.",
      },
      {
        t: "li",
        x: "Contract, to provide the service to customers and administer accounts.",
      },
      {
        t: "li",
        x: "Legitimate interests, to operate, secure, and improve the site and product, and to respond to enquiries, balanced against your rights.",
      },
      {
        t: "li",
        x: "Legal obligation, to comply with law (e.g. tax, accounting, and responding to lawful requests).",
      },
      { t: "h", x: "5. How we use personal data" },
      {
        t: "li",
        x: "To respond to early-access requests, schedule calls, and communicate about the product.",
      },
      {
        t: "li",
        x: "To provide, maintain, secure, and improve the website and platform.",
      },
      {
        t: "li",
        x: "To process payments and manage the customer relationship.",
      },
      {
        t: "li",
        x: "To meet legal, regulatory, and security obligations and to detect and prevent abuse.",
      },
      { t: "h", x: "6. Sharing and sub-processors" },
      {
        t: "p",
        x: "We share personal data with vendors who help us run the service (hosting, email delivery, analytics, scheduling, payments). These act as our processors under contract and only on our instructions. A current list is on our Sub-processors page. We may also disclose data where required by law, to protect our rights, or as part of a corporate transaction. We do not sell personal data.",
      },
      { t: "h", x: "7. International transfers" },
      {
        t: "p",
        x: "Some vendors are located outside the UK (for example, in the United States). Where personal data is transferred outside the UK, we put in place an approved safeguard, the UK International Data Transfer Agreement (IDTA) or the UK Addendum to the EU SCCs, and/or reliance on the EU-US Data Privacy Framework (UK Extension) where the recipient is certified. Details are on our International Data Transfers page.",
      },
      { t: "h", x: "8. Retention" },
      {
        t: "p",
        x: "We keep personal data only as long as necessary for the purposes above, then delete or anonymise it. Prospect and enquiry data is retained for up to 24 months from last contact; customer account and billing records are kept for the life of the contract and for 6 years afterwards to meet legal and tax obligations. Data we process on behalf of customers is retained per the DPA.",
      },
      { t: "h", x: "9. Your rights" },
      { t: "p", x: "Under UK GDPR you have the right to:" },
      { t: "li", x: "access a copy of your personal data;" },
      { t: "li", x: "rectify inaccurate data and complete incomplete data;" },
      {
        t: "li",
        x: "erase data (“right to be forgotten”) in certain circumstances;",
      },
      {
        t: "li",
        x: "restrict or object to certain processing, including direct marketing;",
      },
      { t: "li", x: "data portability; and" },
      {
        t: "li",
        x: "withdraw consent at any time, without affecting prior lawful processing.",
      },
      {
        t: "p",
        x: "To exercise any right, contact privacy@onchainsuite.com. You also have the right to complain to the ICO at ico.org.uk (or your local supervisory authority), though we’d appreciate the chance to resolve it first. If your data is processed by a customer of ours (us acting as processor), please direct requests to that customer.",
      },
      { t: "h", x: "10. Security" },
      {
        t: "p",
        x: "We use technical and organisational measures appropriate to the risk, including encryption in transit and at rest, access controls and least-privilege, read-only and non-custodial on-chain access, logging, and vendor due diligence. Our detailed measures are described in the annex to the DPA. No system is perfectly secure, but we work to protect your data and to notify the relevant parties promptly if a reportable breach occurs.",
      },
      { t: "h", x: "11. Cookies" },
      {
        t: "p",
        x: "We use cookies and similar technologies as described in our Cookie Policy. Non-essential cookies are set only with your consent.",
      },
      { t: "h", x: "12. Children" },
      {
        t: "p",
        x: "The service is for business use and is not directed at children. We do not knowingly collect personal data from anyone under 18.",
      },
      { t: "h", x: "13. Changes to this policy" },
      {
        t: "p",
        x: "We may update this policy from time to time. Material changes will be posted here with a revised “last updated” date and, where appropriate, notified to you directly.",
      },
      { t: "h", x: "14. Contact" },
      {
        t: "p",
        x: "OnchainSuite Ltd, 31 Nash Square, Birmingham, United Kingdom, B42 2EX. Privacy enquiries: privacy@onchainsuite.com. Data protection contact: dpo@onchainsuite.com.",
      },
    ],
  },
  terms: {
    slug: "terms",
    title: "Terms of Service",
    subtitle:
      "The agreement between you and OnchainSuite for access to and use of the platform and early-access programme.",
    lastUpdated: "Last updated: 11 August 2026",
    blocks: [
      { t: "h", x: "1. Agreement" },
      {
        t: "p",
        x: "These Terms of Service (“Terms”) are a binding agreement between you (or the organisation you represent, the “Customer”) and OnchainSuite Ltd (“OnchainSuite”), registered in England and Wales (company number 17370357). By accessing the website, requesting early access, or using the platform, you agree to these Terms. If you do not agree, do not use the service.",
      },
      { t: "h", x: "2. Eligibility & authority" },
      {
        t: "p",
        x: "The service is for business use. You confirm that you are at least 18, that you have authority to bind the organisation you act for, and that your use complies with all laws applicable to you.",
      },
      { t: "h", x: "3. The service and early access" },
      {
        t: "p",
        x: "OnchainSuite provides behaviour-triggered retention tooling for Web3 teams: it reads public on-chain activity, normalises it, and lets you trigger in-app and email messaging. During the early-access period the service is provided on an “as is” and “as available” basis, may change or be discontinued, and may contain features that are incomplete or evolving. Founding rates offered during early access apply on the terms communicated to you at sign-up.",
      },
      { t: "h", x: "4. Accounts & acceptable use" },
      {
        t: "p",
        x: "You are responsible for your account, credentials, and the activity under it. You agree not to:",
      },
      {
        t: "li",
        x: "use the service unlawfully, or to send unlawful, deceptive, or unsolicited messages (you are responsible for your own compliance with PECR/UK GDPR and equivalent marketing and anti-spam laws);",
      },
      {
        t: "li",
        x: "infringe others’ rights, or upload data you have no lawful basis or consent to process;",
      },
      {
        t: "li",
        x: "attempt to breach security, reverse engineer, scrape, overload, or disrupt the service; or",
      },
      {
        t: "li",
        x: "resell or provide the service to third parties except as expressly permitted.",
      },
      { t: "h", x: "5. Customer data, privacy, and data protection" },
      {
        t: "p",
        x: "For personal data you process through the platform, you are the controller and OnchainSuite is your processor. Our Data Processing Agreement forms part of these Terms and applies to that processing. You warrant that you have a valid lawful basis and have given all required notices for the wallet, contact, and engagement data you bring to the platform, including for any opt-in linking of wallets to contact identifiers. Our handling of your own data is described in the Privacy Policy.",
      },
      { t: "h", x: "6. Fees" },
      {
        t: "p",
        x: "We offer two lines: Suite (four tiers, PAYG, Launch, Growth and Pro) and Send (email only, priced per subscriber). Your plan is billed monthly as described at sign-up or in an order, and usage above a plan’s allowance bills at list price. Fees are exclusive of VAT and other taxes, which you are responsible for. During early access, pricing may be discounted or waived and is subject to the founding-rate terms provided to you.",
      },
      { t: "h", x: "7. Intellectual property" },
      {
        t: "p",
        x: "OnchainSuite and its licensors own all rights in the service, software, and brand. We grant you a limited, non-exclusive, non-transferable right to use the service during your subscription. You retain all rights in your data; you grant us the rights needed to provide the service. Feedback you give may be used without obligation.",
      },
      { t: "h", x: "8. Third-party services and on-chain data" },
      {
        t: "p",
        x: "The service reads public blockchain data and may integrate third-party services that have their own terms. We are non-custodial: we never hold assets and never initiate or sign transactions. Nothing in the service is financial, investment, legal, or tax advice.",
      },
      { t: "h", x: "9. Disclaimers" },
      {
        t: "p",
        x: "To the fullest extent permitted by law, the service is provided “as is” without warranties of any kind, express or implied, including fitness for a particular purpose, accuracy, and non-infringement. We do not warrant that the service will be uninterrupted or error-free, or that on-chain data will be complete or accurate.",
      },
      { t: "h", x: "10. Limitation of liability" },
      {
        t: "p",
        x: "Nothing in these Terms limits liability that cannot be limited by law (including for death or personal injury caused by negligence, or for fraud). Subject to that, OnchainSuite is not liable for indirect, incidental, or consequential loss, or loss of profits, revenue, data, or goodwill; and our total aggregate liability is limited to the greater of the fees you paid in the [12] months before the claim or £[100]. [Liability caps must be set with legal advice.]",
      },
      { t: "h", x: "11. Indemnity" },
      {
        t: "p",
        x: "You will indemnify OnchainSuite against claims arising from your data, your use of the service in breach of these Terms, or your breach of applicable law.",
      },
      { t: "h", x: "12. Term & termination" },
      {
        t: "p",
        x: "These Terms apply while you use the service. Either party may terminate as set out in an order or, for early-access use, on notice. We may suspend or terminate access for breach or risk to the service. On termination, your right to use the service ends and data is handled per the DPA and Privacy Policy.",
      },
      { t: "h", x: "13. Governing law & jurisdiction" },
      {
        t: "p",
        x: "These Terms and any dispute arising from them are governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction.",
      },
      { t: "h", x: "14. Changes & contact" },
      {
        t: "p",
        x: "We may update these Terms; material changes will be posted here with a revised date. Questions: legal@onchainsuite.com.",
      },
    ],
  },
  dpa: {
    slug: "dpa",
    title: "Data Processing Agreement",
    subtitle:
      "The Article 28 terms governing personal data that OnchainSuite processes on behalf of customers, including the technical and organisational measures we apply.",
    lastUpdated: "Last updated: 11 August 2026",
    blocks: [
      { t: "h", x: "1. Parties and role" },
      {
        t: "p",
        x: "This Data Processing Agreement (“DPA”) forms part of the Terms of Service between the Customer (the “Controller”) and OnchainSuite Ltd (the “Processor”). It applies where OnchainSuite processes personal data on the Customer’s behalf. Where there is a conflict on data protection matters, this DPA prevails.",
      },
      { t: "h", x: "2. Definitions" },
      {
        t: "p",
        x: "“UK GDPR”, “controller”, “processor”, “personal data”, “processing”, “data subject”, and “personal data breach” have the meanings in the UK GDPR and the Data Protection Act 2018. “Applicable Data Protection Law” means the UK GDPR, the DPA 2018, and, where relevant, the EU GDPR.",
      },
      { t: "h", x: "3. Processing on documented instructions" },
      {
        t: "p",
        x: "OnchainSuite processes personal data only on the Customer’s documented instructions (including as set out in the Terms and this DPA), unless required by law, in which case we will inform the Customer unless legally prohibited. We will tell the Customer if, in our opinion, an instruction infringes Applicable Data Protection Law.",
      },
      { t: "h", x: "4. Details of processing (Annex 1)" },
      { t: "h", x: "5. Confidentiality" },
      {
        t: "p",
        x: "We ensure that personnel authorised to process personal data are bound by confidentiality and are trained on their obligations, on a need-to-know, least-privilege basis.",
      },
      { t: "h", x: "6. Security" },
      {
        t: "p",
        x: "Taking account of the state of the art and the risk, we implement the technical and organisational measures set out in Annex 2 below, and may update them provided protection is not materially reduced.",
      },
      { t: "h", x: "7. Sub-processors" },
      {
        t: "p",
        x: "The Customer gives general authorisation for OnchainSuite to engage sub-processors to provide the service. A current list is maintained on our Sub-processors page. We impose data protection obligations on each sub-processor that are no less protective than this DPA and remain responsible for their performance. We will give at least 30 days’ notice of new sub-processors (via the Sub-processors page or email), during which the Customer may object on reasonable data protection grounds.",
      },
      { t: "h", x: "8. Assistance to the Controller" },
      {
        t: "li",
        x: "We assist the Customer, by appropriate measures, to respond to data subject requests (access, rectification, erasure, restriction, portability, objection).",
      },
      {
        t: "li",
        x: "We assist with the Customer’s obligations on security, breach notification, data protection impact assessments, and prior consultation (Articles 32–36), taking account of the information available to us.",
      },
      {
        t: "li",
        x: "We notify the Customer without undue delay after becoming aware of a personal data breach affecting their data, with the information reasonably available to help them meet their notification duties.",
      },
      { t: "h", x: "9. Return or deletion" },
      {
        t: "p",
        x: "On termination, and at the Customer’s choice, we delete or return the personal data and delete existing copies, unless retention is required by law. Routine deletion occurs within 90 days of termination.",
      },
      { t: "h", x: "10. Audits" },
      {
        t: "p",
        x: "We make available information necessary to demonstrate compliance with Article 28 and allow for and contribute to audits, including inspections, by the Customer or an auditor it mandates, subject to reasonable notice, confidentiality, and frequency. We may satisfy audit requests by providing third-party reports or certifications where available.",
      },
      { t: "h", x: "11. International transfers" },
      {
        t: "p",
        x: "Any transfer of personal data outside the UK is made under an approved transfer mechanism as described on our International Data Transfers page, which forms part of this DPA.",
      },
      { t: "h", x: "12. Liability & governing law" },
      {
        t: "p",
        x: "Each party’s liability under this DPA is subject to the limitations in the Terms. This DPA is governed by the laws of England and Wales.",
      },
      { t: "h", x: "Annex 2, Technical and organisational measures" },
      {
        t: "li",
        x: "Encryption, personal data encrypted in transit (TLS) and at rest.",
      },
      {
        t: "li",
        x: "Access control, role-based, least-privilege access; unique credentials; multi-factor authentication for administrative access; prompt revocation on role change.",
      },
      {
        t: "li",
        x: "Non-custodial, read-only chain access, we never custody assets and never initiate or sign transactions; on-chain access is read-only.",
      },
      {
        t: "li",
        x: "Pseudonymisation & data minimisation, we collect and link contact identifiers only on opt-in and only what is needed for the service.",
      },
      {
        t: "li",
        x: "Network & application security, segregation, hardened infrastructure, secrets management, dependency and vulnerability management.",
      },
      {
        t: "li",
        x: "Logging & monitoring, audit logging of administrative access and security-relevant events.",
      },
      {
        t: "li",
        x: "Resilience, backups, recovery procedures, and tested business continuity.",
      },
      {
        t: "li",
        x: "Vendor management, due diligence and data protection terms with sub-processors.",
      },
      {
        t: "li",
        x: "Personnel, confidentiality undertakings and security awareness training.",
      },
      {
        t: "li",
        x: "Breach response, documented incident response and notification process.",
      },
      {
        t: "p",
        x: "[Align this annex with your actual implemented controls and any certification you hold or are pursuing (e.g. ISO 27001 / SOC 2).]",
      },
    ],
  },
  subprocessors: {
    slug: "subprocessors",
    title: "Sub-processors",
    subtitle:
      "The third parties we engage to help provide the service. We impose data protection obligations on each and remain responsible for their performance.",
    lastUpdated: "Last updated: 11 August 2026",
    blocks: [
      { t: "h", x: "Current sub-processors" },
      {
        t: "p",
        x: "OnchainSuite engages the categories of sub-processor below to deliver the service, as permitted under our Data Processing Agreement. We list them by category; the specific vendors within each category are available to customers on request under NDA. Transfers outside the UK are safeguarded as described on our International Data Transfers page.",
      },
      { t: "h", x: "Changes & notifications" },
      {
        t: "p",
        x: "We update this page when sub-processors change. As set out in the DPA, we give at least 30 days’ notice of new sub-processors, during which customers may object on reasonable data protection grounds. To be notified of changes, contact privacy@onchainsuite.com.",
      },
    ],
  },
};
