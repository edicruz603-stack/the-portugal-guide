const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    menuButton.textContent = isOpen ? "×" : "☰";
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
      menuButton.textContent = "☰";
    });
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();


const buildButton = document.querySelector("#sc-build");
if (buildButton) {
  buildButton.addEventListener("click", () => {
    const value = (id) => document.querySelector(id)?.value || "";
    const days = value("#sc-days");
    const interest = value("#sc-interest");
    const pace = value("#sc-pace");
    const mobility = value("#sc-mobility");
    const transport = value("#sc-transport");
    const company = value("#sc-company");
    let title = "Your suggested Sintra plan";
    let stops = [];
    let reason = "";
    if (days === "half") {
      if (interest === "food") stops = ["Start in the historic centre and see the National Palace exterior and village lanes.", "Pause for a travesseiro or queijada at a traditional pastry shop.", "Choose one nearby visit only: Quinta da Regaleira if you have a suitable timed ticket."];
      else if (interest === "gardens") stops = ["Choose Quinta da Regaleira for a garden-focused visit, allowing time for paths, grottoes and steps.", "If time and transport allow, add a slow walk through the historic centre."];
      else stops = ["Choose one main monument only: Pena Palace OR Quinta da Regaleira.", "Allow time for the transfer, entrance procedures and a relaxed stop in the historic centre."];
      reason = "Half a day is not enough for several hilltop monuments. One well-chosen visit is better than a rushed checklist.";
    } else if (days === "two") {
      if (interest === "gardens") stops = ["Day 1: Quinta da Regaleira and a relaxed historic-centre visit.", "Day 2: Monserrate Palace and gardens; add another stop only if transport and energy allow."];
      else if (interest === "food") stops = ["Day 1: Historic centre, National Palace area, pastry tasting and a long Portuguese lunch.", "Day 2: Choose one major monument — Pena, Regaleira or Monserrate — and leave time to explore slowly."];
      else stops = ["Day 1: Pena Palace and Park, with the Moorish Castle as an optional second visit only if your tickets, timing and energy make it realistic.", "Day 2: Quinta da Regaleira and the historic centre; choose Monserrate as an alternative or an additional visit if you have time."];
      reason = "Two days allow you to separate the hilltop area from the historic centre and western gardens, reducing pressure on transfers.";
    } else {
      if (interest === "gardens") stops = ["Prioritise Quinta da Regaleira for its gardens and landscape.", "Alternative: Monserrate if you prefer a more garden-and-architecture-focused visit and can arrange the transfer."];
      else if (interest === "food") stops = ["Explore the historic centre and its traditional pastry shops.", "Choose one indoor monument or museum only if your time and ticket slot allow."];
      else stops = ["Choose Pena Palace OR Quinta da Regaleira as your one main visit.", "Use remaining time for the historic centre rather than attempting a second distant monument."];
      reason = "A one-day visit can be shortened by queues and transport. Keep the plan to one major timed attraction.";
    }
    if (mobility !== "standard") {
      title = "Your lower-walking Sintra plan";
      stops = stops.slice(0, 2).map((s) => s.replace("Choose", "Consider choosing").replace("Prioritise", "Consider prioritising"));
      reason += " Because you prefer less walking or step-free access, contact each monument before booking to confirm slopes, steps, accessible routes, toilets and transport drop-off points. Sintra's historic terrain can be demanding.";
    }
    if (pace === "relaxed") reason += " Your relaxed pace means leaving generous breaks and not adding an optional third stop.";
    if (pace === "active" && mobility === "standard" && days !== "half") reason += " You can consider an extra stop, but only after confirming transfer times and ticket slots.";
    if (company === "family") reason += " With children, build in snack, toilet and rest breaks; avoid long uphill walks immediately after a full monument visit.";
    if (transport === "car") reason += " Important: private vehicles are not permitted on the access roads to Pena Palace and the Moorish Castle, and historic-centre traffic is restricted. Use designated parking and continue by authorised transport or on foot.";
    else if (transport === "train") reason += " From Lisbon, check the CP Sintra line timetable before departure. From Sintra station, check the current bus service and stop for each monument.";
    else reason += " If you are staying locally, start with the nearest area and check the day's transport notices before crossing the hills.";
    const result = document.querySelector("#sc-result");
    result.hidden = false;
    result.innerHTML = "<h3>" + title + "</h3><ul>" + stops.map(s => "<li>" + s + "</li>").join("") + "</ul><p>" + reason + "</p><p class='small-note'>This is a planning recommendation, not a live availability check. Confirm opening times, ticket slots, access restrictions and transport with the official providers before travel.</p>";
    result.scrollIntoView({behavior:"smooth",block:"nearest"});
  });
}
