/* ==========================================================================
   HBW Live Call Assistant — Content & Form Schema
   All copy sourced/adapted from HBW_Home_Live_Call_Form.xlsm
   ========================================================================== */

const HOME_INSURERS = [
  "State Farm", "Allstate", "Liberty Mutual", "USAA", "Travelers",
  "American Family", "Farmers", "Nationwide", "Chubb", "Amica",
  "Erie Insurance", "Other"
];

const AUTO_INSURERS = [
  "State Farm", "Progressive", "Geico", "Allstate", "USAA", "Farmers",
  "Liberty Mutual", "Travelers", "Nationwide", "Amica", "Erie",
  "Auto-Owners", "AAA", "Other"
];

/* -------------------------------------------------------------------------
   HOME CALL FORM SCHEMA
   ------------------------------------------------------------------------- */
const HOME_SCHEMA = [
  { type: "script", text: "Hello, this is Martha calling on behalf of (___ Insurance) on a recorded line, how are you today? Great! (___ Insurance) is offering comparison quotes to home owners in your area." },

  { type: "question", id: "h_q1", num: "1", script: "Are you currently a homeowner?",
    note: "If NO and not spouse/wife/partner of homeowner → DQ", dqHint: true,
    input: { kind: "select", options: ["Yes", "No"] } },

  { type: "question", id: "h_q2", num: "2", script: "Have you had any claims on your home in the last 5 years?",
    note: "More than 1 claim in 5 years → DQ. If YES, ask type of damage.", dqHint: true,
    input: { kind: "select", options: ["No claims", "1 claim", "More than 1 claim"] } },

  { type: "question", id: "h_q2a", num: "2A", indent: true, script: "If YES: What kind of damage was it? (hail, water, fire, etc.)",
    note: "If NO claims, leave claim box BLANK in system.",
    conditional: a => a.h_q2 && a.h_q2 !== "No claims",
    input: { kind: "text", placeholder: "Type of damage" } },

  { type: "question", id: "h_q3", num: "3", script: "Am I speaking with [Name on Blooper]?",
    note: "Person you speak with is Primary.",
    input: { kind: "text", placeholder: "Confirmed name" } },

  { type: "question", id: "h_q4", num: "4", script: "Are you still at [Address on Blooper]?",
    note: "No PO Box. Attempt physical street address; if refused, get ZIP.",
    input: { kind: "text", placeholder: "Confirmation / notes" } },

  { type: "question", id: "h_q5", num: "5", script: "What company do you use for home insurance?",
    note: "Friend/relative is current insurance agent → DQ", dqHint: true,
    input: { kind: "select", options: HOME_INSURERS } },

  { type: "question", id: "h_q6", num: "6", script: "What year or decade was your home built?",
    note: "(70’s, 80’s, 90’s)",
    input: { kind: "text", placeholder: "e.g. 1994 or 90’s" } },

  { type: "question", id: "h_q7", num: "7", script: "What is the square footage of your home?",
    note: "Ask square footage FIRST.",
    input: { kind: "text", inputType: "number", placeholder: "Square feet" } },

  { type: "question", id: "h_q7a", num: "7A", indent: true, script: "If unsure: How many bedrooms and bathrooms?",
    note: "Use only if customer does not know square footage.",
    input: { kind: "text", placeholder: "e.g. 3 bed / 2 bath" } },

  { type: "question", id: "h_q8", num: "8", script: "Is this home a single story, two story, or more?",
    input: { kind: "text", placeholder: "Number of stories" } },

  { type: "question", id: "h_q9", num: "9", script: "Do you have any special property features such as a pool, shed, or basement?",
    input: { kind: "textarea", placeholder: "Pool, shed, basement, etc." } },

  { type: "question", id: "h_q10", num: "10", script: "When was your roof last replaced?",
    note: "If never you fill with Original",
    input: { kind: "text", placeholder: "Year or “Original”" } },

  { type: "question", id: "h_q11", num: "11", script: "Is your home stick-built or manufactured?",
    note: "Property type: Stick Built / Manufactured / Condo",
    input: { kind: "select", options: ["Stick Built", "Manufactured", "Condo"] } },

  { type: "question", id: "h_q11a", num: "11A", indent: true, script: "If manufactured: Do you own the land the home is on?",
    note: "Manufactured + does NOT own land → DQ. Trailer/mobile-home park → DQ.", dqHint: true,
    conditional: a => a.h_q11 === "Manufactured",
    input: { kind: "select", options: ["Yes", "No", "N/A"] } },

  { type: "question", id: "h_q12", num: "12", script: "Do you have: Security System, Fire Extinguishers, Smoke Detectors, and Dead Bolts?",
    note: "Ask to qualify for additional discounts.",
    input: { kind: "checks", options: [
      { key: "security", label: "Security System" },
      { key: "extinguishers", label: "Fire Extinguishers" },
      { key: "smoke", label: "Smoke Detectors" },
      { key: "deadbolts", label: "Dead Bolts" }
    ] } },

  { type: "question", id: "h_q13", num: "13", script: "Do you have an attached or detached garage? Is it a 1-car or 2-car garage?",
    note: "If attached, check BOTH Has Garage + Has Garage Attached.",
    input: { kind: "compound", fields: [
      { key: "hasGarage", label: "Has Garage", kind: "check" },
      { key: "attached", label: "Attached", kind: "check" },
      { key: "stalls", label: "Stalls (#)", kind: "text", inputType: "number", placeholder: "e.g. 2" }
    ] } },

  { type: "question", id: "h_q14", num: "14", script: "How long have you been with your current insurance provider?",
    note: "Specify days / months / years.",
    input: { kind: "text", placeholder: "e.g. 3 years" } },

  { type: "question", id: "h_q15", num: "15", script: "When do you renew your policy? (Spring / Summer / Winter / Fall)",
    input: { kind: "select", options: ["Spring", "Summer", "Winter", "Fall"] } },

  { type: "question", id: "h_q16", num: "16", script: "Are you paying monthly, quarterly, semi-annually, or yearly?",
    note: "If unsure, packet says put monthly.",
    input: { kind: "select", options: ["Monthly", "Quarterly", "Semi-annually", "Yearly"] } },

  { type: "question", id: "h_q17", num: "17", script: "What is your current rate?",
    note: "If unsure, put 0.",
    input: { kind: "text", inputType: "number", placeholder: "$" } },

  { type: "question", id: "h_q18", num: "18", script: "What is the current market value of your home?",
    note: "If unsure, put 0.",
    input: { kind: "text", inputType: "number", placeholder: "$" } },

  { type: "script", text: "Perfect! That’s all we need to get started on your quote. I’ll quickly confirm your contact details." },

  { type: "question", id: "h_q19", num: "19", script: "I have your first name spelled [___] and last name spelled [___]. Is that correct?",
    note: "If name differs, ask for correct spelling.",
    input: { kind: "compound", fields: [
      { key: "first", label: "First Name", kind: "text" },
      { key: "last", label: "Last Name", kind: "text" }
    ] } },

  { type: "question", id: "h_q20", num: "20", script: "To ensure we give you the most accurate quote, what’s your DOB?",
    note: "Age outside 18-85 → DQ", dqHint: true,
    input: { kind: "text", inputType: "date" } },

  { type: "question", id: "h_q21", num: "21", script: "Is there a spouse or partner on the policy?",
    note: "If Yes, complete the spouse/partner details below.",
    input: { kind: "select", options: ["Yes", "No"] } },

  { type: "question", id: "h_q21a", num: "21A", indent: true, script: "Spouse/partner name and DOB (or age):",
    conditional: a => a.h_q21 === "Yes",
    input: { kind: "compound", fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "dob", label: "DOB or Age", kind: "text", placeholder: "MM/DD/YYYY or age" }
    ] } },

  { type: "script", text: "Our agent will contact you by phone in 1-3 business days to go over your quote and answer questions." },

  { type: "question", id: "h_q22", num: "22", script: "When is the best time to call: morning, afternoon, or evening?",
    input: { kind: "select", options: ["Morning", "Afternoon", "Evening"] } },

  { type: "question", id: "h_q23", num: "23", script: "What is your email address so we can get the quote out after the callback?",
    note: "If no email, leave box BLANK.",
    input: { kind: "text", inputType: "email", placeholder: "name@email.com" } },

  { type: "script", text: "Alright, thank you for your time. We’ll be in touch soon. Have a good day!" },

  { type: "section", title: "Additional Details", subtitle: "For CRM / lead entry — not read aloud" },
  { type: "contact" }
];

/* -------------------------------------------------------------------------
   AUTO CALL FORM SCHEMA
   ------------------------------------------------------------------------- */
const AUTO_SCHEMA = [
  { type: "script", text: "Hello, this is Martha calling on behalf of (___ Insurance) on a recorded line, how are you today? Great! (___ Insurance) is offering comparison quotes for drivers in your area." },

  { type: "question", id: "a_q1", num: "1", script: "Has anyone on your policy had any tickets or claims in the last 3 years?",
    note: "If YES, ask if it’s a moving violation, and if it’s a claim, ask if the claim was made to their policy — if YES we cannot continue.", dqHint: true,
    input: { kind: "select", options: ["Yes", "No"] } },

  { type: "question", id: "a_q1x", indent: true, script: "If YES: Explain the ticket/claim",
    conditional: a => a.a_q1 === "Yes",
    input: { kind: "compound", fields: [
      { key: "explanation", label: "Explanation", kind: "text", placeholder: "e.g. 1 ticket, speeding" },
      { key: "faultWho", label: "Who", kind: "select", options: ["Primary", "Spouse/Partner", "Other Driver"] }
    ] } },

  { type: "question", id: "a_q2", num: "2", script: "Great, and what company do you use for auto insurance?",
    note: "Other insurance option: Indie star LSC",
    input: { kind: "select", options: AUTO_INSURERS } },

  { type: "question", id: "a_q3", num: "3", script: "How long have you been with them?",
    note: "If unsure leave blank",
    input: { kind: "text", placeholder: "e.g. 7 years" } },

  { type: "question", id: "a_q4", num: "4", script: "Am I speaking with (Name on blooper)?",
    input: { kind: "text", placeholder: "Confirmed name" } },

  { type: "section", title: "Vehicle Information", subtitle: "Ask year, make, model, daily miles, and coverage for each vehicle" },
  { type: "vehicles" },

  { type: "question", id: "a_q8", num: "8", script: "Are there any other vehicles on your policy?",
    note: "If YES: repeat steps 5, 6, 7, 8 — use “Add Another Vehicle” above.",
    input: { kind: "select", options: ["Yes", "No"] } },

  { type: "question", id: "a_q9", num: "9", script: "Is your deductible 250, 500, or 1000?",
    note: "(Only ask on full coverage policy.)",
    input: { kind: "select", options: ["250", "500", "1000"] } },

  { type: "question", id: "a_q10", num: "10", script: "Are you paying your insurance monthly, quarterly, semi-annually or yearly?",
    input: { kind: "select", options: ["Monthly", "Quarterly", "Semi-annually", "Yearly"] } },

  { type: "question", id: "a_q11", num: "11", script: "And what is that current rate?",
    note: "(If unsure: put 0.)",
    input: { kind: "text", inputType: "number", placeholder: "$" } },

  { type: "question", id: "a_q12", num: "12", script: "Are you a homeowner or a renter?",
    note: "If CX bundles or shows interest in home/renter insurance, ask the follow-up questions below.",
    input: { kind: "select", options: ["Homeowner", "Renter"] } },

  { type: "question", id: "a_q12_1", num: "12.1", indent: true, script: "Renter’s current insurance",
    conditional: a => a.a_q12 === "Renter",
    input: { kind: "text", placeholder: "Current insurance company" } },

  { type: "question", id: "a_q12_2", num: "12.2", indent: true, script: "Homeowner’s current insurance",
    conditional: a => a.a_q12 === "Homeowner",
    input: { kind: "text", placeholder: "Current insurance company" } },

  { type: "question", id: "a_q12_3", num: "12.3", indent: true, script: "Year/decade of home",
    note: "(70’s, 80’s, 90’s)",
    conditional: a => a.a_q12 === "Homeowner",
    input: { kind: "text", placeholder: "e.g. 1994 or 90’s" } },

  { type: "question", id: "a_q12_4", num: "12.4", indent: true, script: "Square footage (if unsure, ask beds and baths)",
    conditional: a => a.a_q12 === "Homeowner",
    input: { kind: "text", placeholder: "Sqft or beds/baths" } },

  { type: "script", text: "Perfect! That’s all we need to get started on your quote. I’ll quickly confirm your contact details and get this over to you as soon as possible!" },

  { type: "question", id: "a_q13", num: "13", script: "I have your first name spelled (see blooper) and your last name spelled (see blooper), is that correct?",
    note: "Read from blooper if it matches; otherwise ask for spelling.",
    input: { kind: "compound", fields: [
      { key: "first", label: "First Name", kind: "text" },
      { key: "last", label: "Last Name", kind: "text" }
    ] } },

  { type: "question", id: "a_q14", num: "14", script: "Great, to ensure we give you the most accurate quote, what’s your DOB?",
    note: "If CX is 24 or under: confirm this is their own policy and NOT their parent’s.",
    input: { kind: "text", inputType: "date" } },

  { type: "question", id: "a_q15", num: "15", script: "Are there any other drivers on your policy?",
    note: "If YES: ask for names and DOB; if refused, ask age.",
    input: { kind: "select", options: ["Yes", "No"] } },

  { type: "drivers" },

  { type: "question", id: "a_q16", num: "16", script: "Are you still at this address?",
    note: "Read address on blooper if name matches from earlier.",
    input: { kind: "text", placeholder: "Confirmation / notes" } },

  { type: "script", text: "Okay, our agent will be contacting you by phone in 1-3 business days to go over your quote and answer any questions you may have." },

  { type: "question", id: "a_q17", num: "17", script: "When is the best time to call: morning, afternoon or evening?",
    input: { kind: "select", options: ["Morning", "Afternoon", "Evening"] } },

  { type: "question", id: "a_q18", num: "18", script: "Perfect! What is your email address so we can get this quote out to you after the callback?",
    note: "If no email, leave box blank.",
    input: { kind: "text", inputType: "email", placeholder: "name@email.com" } },

  { type: "script", text: "Alright, thank you for your time. We’ll be in touch soon. Have a good day!" },

  { type: "section", title: "Additional Details", subtitle: "For CRM / lead entry — not read aloud" },
  { type: "contact" }
];

/* -------------------------------------------------------------------------
   REBUTTALS  (popup reference, does not affect the working form)
   ------------------------------------------------------------------------- */
const REBUTTALS_NOTE = "Some may be used for Live Transfer/Financial; however, we are trained NOT to rebuttal for those campaigns.";

const REBUTTALS = [
  { objection: "You have the wrong number!", answers: [
    "I’m sorry. I’ll update this information. We’d like to offer you a quote to see if we can do any better."
  ]},
  { objection: "I’m busy!", answers: [
    "I’ll keep this as brief as possible!"
  ]},
  { objection: "My wife/husband handles it.", answers: [
    "I understand — these are basic questions to get the quote started."
  ]},
  { objection: "I’m not interested!", answers: [
    "I understand, but it’s just a comparison and there is no obligation.",
    "We are just offering comparison quotes, and a lot may have changed recently."
  ]},
  { objection: "We don’t want to switch!", answers: [
    "I understand. This is just information to show you we can possibly do better.",
    "We’re not asking you to change anything right now. We just want to let you know what’s available."
  ]},
  { objection: "I already have insurance!", answers: [
    "Great! That means we can get you a no-obligation comparison quote!",
    "Right, that’s why I’m calling. We just want to get you a comparison quote!"
  ]},
  { objection: "I used to be with your company!", answers: [
    "Right — a lot may have changed, and we’d like to show you what may have changed!"
  ]},
  { objection: "I don’t want what you’re selling!", answers: [
    "[Auto] I’m not selling anything. We are calling drivers in the area and offering no-obligation comparison quotes!",
    "[Home] I’m not selling anything. We are calling homeowners in the area and offering no-obligation comparison quotes!"
  ]},
  { objection: "Why do you need my DOB?", answers: [
    "My agent requires a DOB so they can give you the most fair and accurate quote, because it may affect your rate."
  ]},
  { objection: "Why do you need my address?", answers: [
    "We only ask because where you live affects your rate."
  ]},
  { objection: "You can’t beat my rates!", answers: [
    "Give us a chance to put something in front of you!"
  ]},
  { objection: "How did you get my information?", answers: [
    "We get our phone numbers from L2 data. They’re checked against state and federal “Do Not Call” lists prior to calling."
  ]},
  { objection: "I don’t want any phone calls!", answers: [
    "I understand — this is a one-time callback so my agent can go over the quote with you. What’s a good window in the next 1-3 business days: morning, afternoon or evening?"
  ]},
  { objection: "Why do you need my email?", answers: [
    "We just want to make sure you get a copy for your records — what’s a good email for you?"
  ]},
  { objection: "I’m not sure who I currently use for insurance!", answers: [
    "That’s okay. It’s not (company on blooper), is it?"
  ]}
];

/* -------------------------------------------------------------------------
   DISPOSITIONS  (popup reference, does not affect the working form)
   ------------------------------------------------------------------------- */
const DISPOSITIONS = [
  { code: "70Plus", name: "Too Old", desc: "When the person is over 85.", excluded: false },
  { code: "A", name: "Answering Machine", desc: "When you get an answering machine or when you hear a beep and then nothing.", excluded: false },
  { code: "B", name: "Busy", desc: "When the person is too busy to talk or they hang up before you explain the purpose of the call.", excluded: false },
  { code: "BSN", name: "Business", desc: "When you reach a business.", excluded: false },
  { code: "CallBK", name: "Call Back", desc: "Person requested a call back to get the rest of the information needed for a quality lead.", excluded: false },
  { code: "CH", name: "Choppy", desc: "Call was choppy.", excluded: false },
  { code: "CL", name: "Correct Lead", desc: "Call a lead back to get updated information, but you don’t want to pull the lead a second time.", excluded: true },
  { code: "DA", name: "Dead Air", desc: "There was never any sound on the call.", excluded: false },
  { code: "DC", name: "Disconnected Number", desc: "The number has been disconnected.", excluded: false },
  { code: "DNC", name: "Do Not Call", desc: "They state “put me on your DO NOT CALL LIST.”", excluded: false },
  { code: "DQ", name: "Disqualified", desc: "They are disqualified or missing information.", excluded: true },
  { code: "DQA", name: "Disqualified Auto", desc: "They are disqualified for auto quote: too many tickets/accidents or no vehicles.", excluded: false },
  { code: "DQH", name: "Disqualified Home", desc: "They are disqualified for a home quote: too many claims or renting.", excluded: false },
  { code: "InCall", name: "Didn’t disposition", desc: "Dialer disconnected before caller could disposition.", excluded: true },
  { code: "N", name: "No Answer", desc: "No answer when you call back.", excluded: true },
  { code: "NI", name: "Not Interested", desc: "Either you stated why you called and whom you are calling from and they hang up, or say not interested.", excluded: false },
  { code: "NoEng", name: "No English", desc: "They don’t speak English.", excluded: false },
  { code: "PBLM", name: "Number is Problem", desc: "Weird issues.", excluded: false },
  { code: "PU", name: "Call Picked Up", desc: "Call picked up but was not dispositioned.", excluded: true },
  { code: "Ring", name: "Ringing Number", desc: "Ringing sounds.", excluded: false },
  { code: "Robot", name: "Robotic Answer", desc: "Recorded message pretending to be a person.", excluded: false },
  { code: "Sale", name: "Sale", desc: "Have all information for a lead and agree for a call back.", excluded: false },
  { code: "WC", name: "With Company", desc: "Customer has the company that we are calling on behalf of.", excluded: false },
  { code: "WrngNM", name: "Wrong Number", desc: "The person doesn’t match what our records show.", excluded: false },
  { code: "Xfer", name: "Live Transfer", desc: "Live transferred to an insurance agent.", excluded: false }
];
