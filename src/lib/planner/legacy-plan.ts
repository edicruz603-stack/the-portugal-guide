/**
 * Sintra day planner rules — the legacy rule tree from script.js, as a pure function.
 * Wording is unchanged from the live site except the mobility fix (see LESS_WALKING / STEP_FREE below).
 * tests/unit/planner.test.ts runs the live site's script.js side by side and checks the output is identical
 * for every combination except those deliberate differences.
 */
export interface PlanInput { days: string; interest: string; pace: string; mobility: string; transport: string; company: string }
export interface Plan { title: string; intro: string; dayOne: string[]; dayTwo: string[]; practical: string[] }

export const LESS_WALKING_TITLE_SUFFIX = " — less walking";
export const STEP_FREE_TITLE_SUFFIX = " — step-free access requested";
export const STEP_FREE_NOT_VERIFIED = "You asked for step-free access. This planner has not verified step-free routes, entrances or facilities at any venue, so none of the suggestions above should be read as step-free. Check each venue's own accessibility information before you go.";

export function buildPlan({ days, interest, pace, mobility, transport, company }: PlanInput): Plan {
  let title = "Your suggested Sintra plan";
  let intro = "";
  let dayOne: string[] = [];
  let dayTwo: string[] = [];
  let practical: string[] = [];

  if (days === "half") {
    title = "A thoughtful half-day in Sintra";
    if (interest === "food") {
      intro = "Keep this visit close to the historic centre. It is the best way to enjoy Sintra without spending your limited time crossing the hills.";
      dayOne = ["Arrive in the historic centre and explore the lanes around the National Palace.", "Pause for a travesseiro or queijada at a traditional pastry shop.", "If you have a pre-booked timed ticket and enough time, choose Quinta da Regaleira as your one major visit."];
    } else if (interest === "gardens") {
      intro = "Choose one garden experience rather than trying to fit several estates into a short visit.";
      dayOne = ["Choose Quinta da Regaleira for its garden paths, grottoes and architectural details.", "Alternatively, choose Vila Sassetti and the nearby historic-centre gardens for a lighter, mostly outdoor visit.", "Finish with a relaxed stop in the village."];
    } else {
      intro = "Half a day is best built around one main attraction and a little time in the village.";
      dayOne = ["Choose Pena Palace OR Quinta da Regaleira — not both.", "Keep your timed entry and transfer time as the fixed points of the visit.", "Use any remaining time for the historic centre and a short café stop."];
    }
    practical.push("Do not add a second major monument unless you have checked the exact entry time, transfer and return journey.");
  } else if (days === "two") {
    title = "Two days to experience Sintra properly";
    if (interest === "gardens") {
      intro = "Separate the central gardens from the western estate to avoid rushing between different parts of the mountain.";
      dayOne = ["Day 1 · Explore Quinta da Regaleira at an unhurried pace.", "Walk back towards the historic centre for the National Palace area, Vila Sassetti or Parque da Liberdade.", "Leave time for a viewpoint and a relaxed dinner."];
      dayTwo = ["Day 2 · Visit Monserrate Palace and its gardens.", "Add a nearby cultural stop only if transport and opening times make it practical.", "Keep the afternoon flexible for the weather and the garden paths."];
    } else if (interest === "food") {
      intro = "Give the historic centre room to breathe, then dedicate the second day to one major monument.";
      dayOne = ["Day 1 · Explore the historic centre and National Palace area.", "Taste a travesseiro and a queijada; choose a proper sit-down lunch rather than eating while rushing.", "Add a free garden or museum if it is open."];
      dayTwo = ["Day 2 · Choose one main visit: Pena, Regaleira or Monserrate.", "Build the rest of the day around that ticket and its location.", "Finish with a meal in the village or a quieter local discovery."];
    } else {
      intro = "The most balanced first visit is to separate the hilltop monuments from the historic centre and gardens.";
      dayOne = ["Day 1 · Visit Pena Palace and Park at your booked time.", "Consider the Moorish Castle as an optional second visit only if your energy, weather and ticket timings allow.", "Return to the village for dinner."];
      dayTwo = ["Day 2 · Explore Quinta da Regaleira and the historic centre.", "Choose Monserrate as an alternative if gardens and architecture interest you more than another hilltop visit.", "Leave space for a café, viewpoint or museum."];
    }
    practical.push("Do not treat the optional extra as guaranteed: check opening hours, ticket slots and transfers before committing.");
  } else {
    title = "A balanced one-day Sintra plan";
    if (interest === "gardens") {
      intro = "Prioritise one garden estate and a compact walk in the historic centre.";
      dayOne = ["Morning · Visit Quinta da Regaleira, allowing time for paths, grottoes and steps.", "Midday · Return towards the historic centre for lunch and a break.", "Afternoon · Choose Vila Sassetti, Parque da Liberdade or a viewpoint, depending on energy and conditions."];
    } else if (interest === "food") {
      intro = "Make the village and its food the centre of the day, with one cultural visit if time allows.";
      dayOne = ["Morning · Explore the historic centre and National Palace surroundings.", "Late morning · Try a traditional pastry and browse the local streets.", "Afternoon · Choose one indoor monument or museum that fits your available time and ticket slot.", "Finish with a relaxed Portuguese meal."];
    } else if (interest === "culture") {
      intro = "Choose one major monument, then add a smaller cultural stop nearby rather than crossing the mountain repeatedly.";
      dayOne = ["Morning · Visit the National Palace area and historic centre.", "Choose either Quinta da Regaleira or Pena Palace as your main booked visit.", "Afternoon · Add a museum or garden only if the transfer and opening hours fit comfortably."];
    } else if (interest === "family") {
      intro = "A family day works best with one headline attraction, food breaks and room for children to explore.";
      dayOne = ["Morning · Choose one major attraction with a suitable visit length and facilities.", "Midday · Take a proper lunch and rest break in the village.", "Afternoon · Choose a nearby garden, open space or short viewpoint stop rather than another demanding monument."];
    } else {
      intro = "For a first visit, choose one headline palace and one nearby experience. Sintra rewards a slower pace.";
      dayOne = ["Morning · Visit Pena Palace at your reserved time OR choose Quinta da Regaleira.", "Midday · Allow time for lunch and the transfer back towards the village.", "Afternoon · Explore the historic centre, a free garden or a viewpoint.", "If you choose Pena, consider the Moorish Castle only if the day is running comfortably and the tickets fit."];
    }
  }

  if (mobility !== "standard") {
    // Phase 1 fix: keep the chosen duration in the title and say which mobility need was selected.
    // "stepfree" is a request, not a verified route, so the result says so explicitly.
    title = title + (mobility === "stepfree" ? STEP_FREE_TITLE_SUFFIX : LESS_WALKING_TITLE_SUFFIX);
    dayOne = dayOne.slice(0, 3);
    dayTwo = dayTwo.slice(0, 2);
    practical.push("Sintra has steep slopes, cobbles, steps and uneven garden paths. Contact each venue before booking to confirm step-free routes, accessible facilities and the nearest authorised drop-off point. Do not assume a route is fully step-free.");
    if (mobility === "stepfree") practical.push(STEP_FREE_NOT_VERIFIED);
  }
  if (pace === "relaxed") practical.push("Keep the optional stops optional. Plan generous breaks and remove one visit rather than rushing.");
  if (pace === "active" && mobility === "standard" && days !== "half") practical.push("An active pace may allow an extra short stop, but only after confirming travel time and ticket slots.");
  if (company === "family") practical.push("With children, plan snack, toilet and rest breaks; avoid stacking two long visits without a pause.");
  if (company === "solo") practical.push("Travelling solo? Keep your return connection in mind and save your key ticket and transport links before leaving.");
  if (company === "couple") practical.push("As a couple, leave a little unplanned time for a viewpoint, a garden bench or a longer café stop.");
  if (company === "group") practical.push("For a group, agree the main timed entry in advance and allow extra time for everyone to regroup between stops.");
  if (transport === "car") practical.push("Driving? Private vehicles are not permitted on the access roads to Pena Palace and the Moorish Castle, and traffic in the historic centre is restricted. Use designated parking and continue by authorised transport or on foot.");
  else if (transport === "train") practical.push("By train? Check the current CP timetable and the local bus service for each monument on the day. Do not assume the same bus frequency throughout the year.");
  else practical.push("Already staying in Sintra? Start from your accommodation's area and check the day's transport notices before crossing the hills.");
  return { title, intro, dayOne, dayTwo, practical };
}

const renderList = (items: string[]) => items.length ? "<ul>" + items.map(item => "<li>" + item + "</li>").join("") + "</ul>" : "";

/** Same markup the live site produces. All strings are fixed editorial text from this module (no user input). */
export function renderPlanHtml(p: Plan): string {
  return "<p class='eyebrow'>Your personalised starting point</p><h3>" + p.title + "</h3><p>" + p.intro + "</p><h4>Suggested sequence</h4>" + renderList(p.dayOne) + (p.dayTwo.length ? "<h4>Second day</h4>" + renderList(p.dayTwo) : "") + "<h4>Practical notes</h4>" + renderList(p.practical) + "<p><a href='sintra-local-discoveries.html'>Explore local discoveries, food and viewpoints ↗</a></p><p class='small-note'>This is a planning recommendation, not a live availability checker. Confirm opening times, ticket slots, access restrictions and transport with official providers before travelling. Times and routes should be adjusted to your actual bookings.</p>";
}
