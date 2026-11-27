/**
 * In-app legal text. Keep this in step with docs/PRIVACY_POLICY.md, which is the
 * version to publish at the URL in app.json (extra.privacyPolicyUrl).
 */
export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "What Elsewhere does",
    paragraphs: [
      "Elsewhere helps you explore the realistic consequences of a decision. You describe a decision, optionally add some details about yourself, and choose how to see it: three possible futures, or five pros and five cons. The analysis draws on current, cited sources.",
    ],
  },
  {
    heading: "Information you provide",
    paragraphs: [
      "Decision text: the decision you type in.",
      "Profile details (all optional): age, location, savings, income, education, employment, career goals, priorities, and notes you choose to add.",
      "Your profile is stored only on your device. It is not sent anywhere until you run an analysis, and you can delete it at any time from the Profile screen.",
    ],
  },
  {
    heading: "What is sent to our analysis service",
    paragraphs: [
      "When you run an analysis, the decision and any profile details you have entered are sent to Elsewhere's analysis service over an encrypted connection (HTTPS). The service asks an artificial intelligence model, Anthropic's Claude, to write search queries and then to write your analysis. Claude also runs web searches to find information relevant to your decision.",
      "We do not sell your information, use it for advertising, or combine it with other data about you.",
      "The analysis service does not store your decision, profile, or analysis after the response is returned. It keeps your IP address in memory for up to one hour, only to limit how many requests one device can make. Error messages may be written to server logs without your personal details.",
    ],
  },
  {
    heading: "Service providers",
    paragraphs: [
      "Anthropic processes the content of your analysis requests to provide the AI model and web search. Anthropic's handling of that data is governed by its own terms and data policies for its API.",
    ],
  },
  {
    heading: "Your choices",
    paragraphs: [
      "You are asked for permission before your first analysis, and you can change your mind at any time by deleting your data in the Profile screen. Deleting the app removes everything stored on your device.",
    ],
  },
  {
    heading: "Children",
    paragraphs: ["Elsewhere is not intended for children under 18 and does not knowingly collect information from them."],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      "If we change how information is used, we will update this policy and, where the change is material, ask for your permission again before the next analysis.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: ["Questions about privacy can be sent to the support address listed on the store page for Elsewhere."],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "Not professional advice",
    paragraphs: [
      "Elsewhere produces hypothetical analyses to help you think. They are not financial, legal, tax, medical, or professional advice, and they are not predictions or guarantees. Check important decisions with a qualified professional.",
    ],
  },
  {
    heading: "Accuracy of information",
    paragraphs: [
      "Facts in an analysis are shown with the source they came from. Other figures are estimates or assumptions. Sources can change or be wrong, so check anything that matters before you act on it.",
    ],
  },
  {
    heading: "Acceptable use",
    paragraphs: [
      "Use Elsewhere for lawful personal decision-making. Do not use it to harass others, to generate content about a real private person, or to attempt to misuse the service.",
    ],
  },
  {
    heading: "Availability",
    paragraphs: ["The service depends on internet access and third-party providers. Analyses may be unavailable at times."],
  },
  {
    heading: "Liability",
    paragraphs: [
      "To the fullest extent the law allows, Elsewhere is provided as is, and we are not liable for decisions made using an analysis.",
    ],
  },
];
