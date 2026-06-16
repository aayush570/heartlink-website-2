const path = window.location.pathname.replace(/\/$/, "") || "/";
const pageKey = path === "/" ? "home" : path.replace(/^\//, "").replace(".html", "");

async function loadJson(url, fallback = {}) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Could not load ${url}`);
    return await response.json();
  } catch (error) {
    console.warn(error.message);
    return fallback;
  }
}

const site = await loadJson("/content/site.json", {
  brandName: "HEARTLINK",
  brandDescriptor: "Private Family Advisory",
  logo: "/Heartlink Logo.png",
  conciergeEmail: "concierge@heartlink.in",
  pressEmail: "press@heartlink.in",
  careersEmail: "careers@heartlink.in",
  privacyEmail: "privacy@heartlink.in",
  partnershipsEmail: "partnerships@heartlink.in",
  locations: "Mumbai · India · Global",
  navigation: []
});
const pageContent = await loadJson(`/content/${pageKey}.json`);
const navigation = site.navigation || [];

document.documentElement.style.setProperty("--maroon", site.primaryColor || "#5F1724");
document.documentElement.style.setProperty("--gold", site.accentColor || "#B8954F");
document.documentElement.style.setProperty("--forest", site.secondaryAccentColor || "#183F32");

const header = document.querySelector("[data-site-header]");
if (header) {
  header.className = "site-header";
  header.innerHTML = `
    <div class="nav-shell">
      <a class="brand" href="/" aria-label="HeartLink home">
        <i class="brand-seal" aria-hidden="true">HL</i>
        <span>${site.brandName}<small>${site.brandDescriptor}</small></span>
      </a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        ${navigation.map(({ href, label }) => `<a href="${href}" ${path === href ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
      <div class="nav-actions">
        <a class="button button-small button-outline desktop-contact" href="/contact">Contact</a>
        <a class="button button-small desktop-apply" href="/apply">Request Meeting</a>
      </div>
      <button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span>
      </button>
    </div>
    <div class="mobile-menu" aria-hidden="true">
      <nav aria-label="Mobile navigation">
        ${navigation.map(({ href, label }, index) => `<a href="${href}"><span>0${index + 1}</span>${label}</a>`).join("")}
        <div class="mobile-actions"><a class="button" href="/apply">Request a Private Meeting</a><a class="button button-outline" href="/contact">Contact HeartLink</a></div>
      </nav>
    </div>`;

  const toggle = header.querySelector(".menu-toggle");
  const menu = header.querySelector(".mobile-menu");
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    toggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
    menu.setAttribute("aria-hidden", String(open));
    document.body.classList.toggle("menu-open", !open);
  });
}

const footer = document.querySelector("[data-site-footer]");
if (footer) {
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="footer-mark">
      <i class="footer-seal" aria-hidden="true">HL</i>
      <p>${site.footerStatement}</p>
    </div>
    <div class="footer-links">
      <div><span>Start Here</span><a href="/apply">Request a private meeting</a><a href="/contact">Contact HeartLink</a><a href="mailto:${site.conciergeEmail}">${site.conciergeEmail}</a></div>
      <div><span>Learn More</span><a href="/about">About Gopi Shah</a><a href="/methodology">Our process</a><a href="/impact">Trust & recognition</a></div>
      <div><span>More</span><a href="/membership">Services</a><a href="/partnerships">Partnerships</a><a href="/careers">Careers</a><a href="/privacy.html">Privacy</a></div>
    </div>
    <div class="footer-base"><span>© ${new Date().getFullYear()} ${site.brandName} ${site.brandDescriptor}</span><span>${site.locations}</span></div>`;
}

function titleHtml(value = "") {
  return value.replace(/<em>/g, '<span class="accent">').replace(/<\/em>/g, "</span>");
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value !== undefined) element.textContent = value;
}

function setHtml(selector, value) {
  const element = document.querySelector(selector);
  if (element && value !== undefined) element.innerHTML = value;
}

function renderHero(hero) {
  if (!hero) return;
  setText(".page-hero .eyebrow", hero.eyebrow);
  setHtml(".page-hero h1", titleHtml(hero.title));
  setText(".page-hero .hero-copy", hero.description);
}

function renderCards(cards = []) {
  return cards.map((card) => `
    <article class="press-card ${card.image ? "has-card-image" : ""}" data-reveal ${card.image ? `style="--card-image:url('${card.image}')"` : ""}>
      <div class="card-copy"><span>${card.label}</span><h3>${card.title}</h3><p>${card.description}</p></div>
    </article>`).join("");
}

if (pageContent.seo) {
  document.title = pageContent.seo.title;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = pageContent.seo.description;
}
renderHero(pageContent.hero);

if (pageKey === "about" && pageContent.curators) {
  const curatorContainer = document.querySelector(".curator-grid");
  if (curatorContainer) curatorContainer.innerHTML = pageContent.curators.map((curator) => `
    <article class="curator-card" data-reveal>
      <div class="curator-intro">
        <span class="eyebrow">${curator.eyebrow}</span>
        <h2>${curator.title}</h2>
      </div>
      <div class="portrait ${curator.image ? "has-portrait-image" : ""}" data-reveal style="${curator.image ? `background-image:linear-gradient(to top,rgba(8,5,10,.55),transparent),url('${curator.image}')` : curator.theme === "cyan" ? "background:radial-gradient(circle at 50% 25%,rgba(25,200,211,.28),transparent 20%),linear-gradient(160deg,#123241,#0d0a0f 70%)" : ""}" role="img" aria-label="${curator.imageAlt}">
        <div class="portrait-badge"><span>${curator.role}</span><strong>${curator.name}</strong></div>
      </div>
      <div class="curator-copy">
        <p class="lead">${curator.lead}</p>
        <details><summary>Read ${curator.name.split(" ")[0]}’s story</summary><div>${curator.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</div></details>
        <div class="credentials">${curator.credentials.map((item) => `<div><strong>${item.title}</strong><span>${item.description}</span></div>`).join("")}</div>
      </div>
    </article>`).join("");
  setText(".plum-surface .quote small", pageContent.closing.eyebrow);
  setText(".plum-surface .quote p", pageContent.closing.quote);
  setText(".plum-surface .quote .button", pageContent.closing.button);
}

if (pageKey === "methodology" && pageContent.steps) {
  const timeline = document.querySelector(".timeline");
  if (timeline) timeline.innerHTML = pageContent.steps.map((step) => `<article class="timeline-item" data-reveal><small>${step.label}</small><div class="timeline-number">${step.number}</div><h2>${step.title}</h2><p>${step.description}</p></article>`).join("");
  const closing = document.querySelector(".plum-surface .section-narrow");
  if (closing) closing.innerHTML = `<div class="closing-stack" data-reveal><span class="eyebrow">${pageContent.closing.eyebrow}</span><h2>${pageContent.closing.title}</h2><p>${pageContent.closing.description}</p><a class="button" href="/apply">${pageContent.closing.button}</a></div>`;
}

if (pageKey === "membership" && pageContent.tiers) {
  const tierGrid = document.querySelector(".tier-grid");
  if (tierGrid) tierGrid.innerHTML = pageContent.tiers.map((tier) => `<article class="tier-card ${tier.black ? "black" : ""} ${tier.tone ? `tier-${tier.tone}` : ""}" data-reveal><span class="tier-index">${tier.label}</span><h2>${tier.title}</h2><p>${tier.description}</p><ul class="tier-features">${tier.features.map((feature) => `<li>${feature}</li>`).join("")}</ul><a class="button" href="/apply?interest=${encodeURIComponent(tier.title)}">${tier.button}</a></article>`).join("");
  setText(".protocol-note h2", pageContent.protocol.title);
  const protocolCopy = document.querySelector(".protocol-note > div");
  if (protocolCopy) protocolCopy.innerHTML = pageContent.protocol.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
  setText(".plum-surface .quote small", pageContent.closing.eyebrow);
  setText(".plum-surface .quote p", pageContent.closing.quote);
  setText(".plum-surface .quote .button", pageContent.closing.button);
}

if (pageKey === "impact" && pageContent.stats) {
  const stats = document.querySelector(".impact-numbers");
  if (stats) stats.innerHTML = pageContent.stats.map((stat) => `<div><strong>${stat.value}</strong><span>${stat.label}</span></div>`).join("");
  const featureArt = document.querySelector(".feature-art");
  if (featureArt && pageContent.feature.image) {
    featureArt.style.backgroundImage = `linear-gradient(rgba(44,5,46,.2),rgba(8,5,10,.45)),url("${pageContent.feature.image}")`;
    featureArt.setAttribute("role", "img");
    featureArt.setAttribute("aria-label", pageContent.feature.imageAlt);
  }
  setText(".feature-copy .eyebrow", pageContent.feature.eyebrow);
  setText(".feature-copy h2", pageContent.feature.title);
  const featureCopy = document.querySelector(".feature-copy");
  if (featureCopy) featureCopy.querySelectorAll("p").forEach((element, index) => element.textContent = pageContent.feature.paragraphs[index] || "");
  const recognitionHeading = document.querySelector(".section-heading");
  if (recognitionHeading) {
    recognitionHeading.querySelector(".eyebrow").textContent = pageContent.recognition.eyebrow;
    recognitionHeading.querySelector("h2").textContent = pageContent.recognition.title;
    recognitionHeading.querySelector("p").textContent = pageContent.recognition.description;
  }
  const pressGrid = document.querySelector(".press-grid");
  if (pressGrid) pressGrid.innerHTML = renderCards(pageContent.recognition.cards);
  setText(".plum-surface .quote small", pageContent.closing.eyebrow);
  setText(".plum-surface .quote p", pageContent.closing.quote);
  setText(".plum-surface .quote .button", pageContent.closing.button);
  const pressButton = document.querySelector(".plum-surface .quote .button");
  if (pressButton) pressButton.href = `mailto:${site.pressEmail}`;
}

if (pageKey === "careers" && pageContent.roles) {
  const headings = document.querySelectorAll(".section-heading");
  if (headings[0]) {
    headings[0].querySelector(".eyebrow").textContent = pageContent.rolesIntro.eyebrow;
    headings[0].querySelector("h2").textContent = pageContent.rolesIntro.title;
    headings[0].querySelector("p").textContent = pageContent.rolesIntro.description;
  }
  const roles = document.querySelector(".roles");
  if (roles) roles.innerHTML = pageContent.roles.map((role) => `<article class="role" data-reveal><h2>${role.title}</h2><p>${role.details}</p><a href="mailto:${site.careersEmail}?subject=${encodeURIComponent(role.title)}" aria-label="Apply for ${role.title}">↗</a></article>`).join("");
  if (headings[1]) {
    headings[1].querySelector(".eyebrow").textContent = pageContent.culture.eyebrow;
    headings[1].querySelector("h2").textContent = pageContent.culture.title;
    headings[1].querySelector("p").textContent = pageContent.culture.description;
  }
  const cultureGrid = document.querySelector(".plum-surface .press-grid");
  if (cultureGrid) cultureGrid.innerHTML = renderCards(pageContent.culture.cards);
  setText(".surface:last-of-type .quote small", pageContent.closing.eyebrow);
  setText(".surface:last-of-type .quote p", pageContent.closing.quote);
  setText(".surface:last-of-type .quote .button", pageContent.closing.button);
  const careersButton = document.querySelector(".surface:last-of-type .quote .button");
  if (careersButton) careersButton.href = `mailto:${site.careersEmail}?subject=Confidential%20Expression%20of%20Interest`;
}

if (pageKey === "contact" && pageContent.form) {
  setText(".form-card > .eyebrow", pageContent.form.eyebrow);
  setText(".form-card > p", pageContent.form.introduction);
  setText('.form-card button[type="submit"]', pageContent.form.button);
}

if (pageKey === "partnerships" && pageContent.models) {
  const heading = document.querySelector(".partnership-models .section-heading");
  if (heading) {
    setText(".partnership-models .eyebrow", pageContent.models.eyebrow);
    setText(".partnership-models h2", pageContent.models.title);
    setText(".partnership-models .section-heading p", pageContent.models.description);
  }
  const grid = document.querySelector(".partnership-models .press-grid");
  if (grid) grid.innerHTML = renderCards(pageContent.models.cards);
  setText(".form-card > .eyebrow", pageContent.form.eyebrow);
  setText(".form-card > p", pageContent.form.introduction);
  setText('.form-card button[type="submit"]', pageContent.form.button);
}

if (pageKey === "privacy" && pageContent.content) {
  setText(".editorial h2", pageContent.content.title);
  setText(".editorial .lead", pageContent.content.lead);
  const editorial = document.querySelector(".editorial");
  if (editorial) {
    editorial.querySelectorAll("p:not(.lead)").forEach((element) => element.remove());
    editorial.insertAdjacentHTML("beforeend", pageContent.content.paragraphs.map((paragraph, index) => `<p>${paragraph}${index === pageContent.content.paragraphs.length - 1 ? ` <a class="text-link" href="mailto:${site.privacyEmail}">${site.privacyEmail} <span>↗</span></a>` : ""}</p>`).join(""));
  }
}

const observed = document.querySelectorAll("[data-reveal]");
if ("IntersectionObserver" in window && observed.length) {
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  observed.forEach((element) => reveal.observe(element));
} else {
  observed.forEach((element) => element.classList.add("is-visible"));
}

const siteHeader = document.querySelector(".site-header");
const updateHeader = () => siteHeader?.classList.toggle("is-scrolled", window.scrollY > 24);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const threadContainers = document.querySelectorAll("[data-gold-thread], .timeline");
if (threadContainers.length) {
  const updateThreads = () => {
    threadContainers.forEach((thread) => {
      const bounds = thread.getBoundingClientRect();
      const viewportAnchor = window.innerHeight * .62;
      const progress = Math.max(0, Math.min(1, (viewportAnchor - bounds.top) / Math.max(bounds.height, 1)));
      thread.style.setProperty("--thread-progress", `${progress * 100}%`);
    });
  };
  updateThreads();
  window.addEventListener("scroll", updateThreads, { passive: true });
  window.addEventListener("resize", updateThreads);
}

const stepper = document.querySelector(".stepper-form");
if (stepper) {
  const steps = [...stepper.querySelectorAll(".inquiry-step")];
  const count = document.querySelector("[data-step-count]");
  const progress = document.querySelector("[data-step-progress]");
  let currentStep = 0;

  const showStep = (index) => {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => step.classList.toggle("is-active", stepIndex === currentStep));
    if (count) count.textContent = `${String(currentStep + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
    if (progress) progress.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    document.querySelector(".form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  stepper.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const fields = [...steps[currentStep].querySelectorAll("input, select, textarea")];
      const invalid = fields.find((field) => !field.checkValidity());
      if (invalid) return invalid.reportValidity();
      showStep(currentStep + 1);
    });
  });
  stepper.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => showStep(currentStep - 1)));
}

document.querySelectorAll("[data-accordion]").forEach((item) => {
  const trigger = item.querySelector("button");
  trigger.addEventListener("click", () => {
    const open = item.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(open));
  });
});

const requestedInterest = new URLSearchParams(window.location.search).get("interest");
if (requestedInterest) {
  document.querySelectorAll('input[name="membershipInterest"]').forEach((input) => {
    input.checked = input.value === requestedInterest;
  });
}

document.querySelectorAll("form[data-submission-type]").forEach((form) => {
  const status = form.querySelector(".form-status");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const originalLabel = submit.textContent;
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (data[key]) data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
      else data[key] = value;
    }
    data.consent = Boolean(data.consent);
    data.type = form.dataset.submissionType;
    submit.disabled = true;
    submit.textContent = "Sending securely…";
    status.textContent = "";

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      const firstName = String(data.applicantName || data.name || "there").trim().split(/\s+/)[0];
      form.innerHTML = `
        <div class="form-success" role="status">
          <span class="eyebrow">Received securely</span>
          <h2>Thank you, <span data-first-name></span>.</h2>
          <p>${result.message} Your reference is <strong>${result.reference}</strong>. The HeartLink team will review it privately before making contact.</p>
          <a class="text-link" href="/">Return to HeartLink <span>↗</span></a>
        </div>`;
      form.querySelector("[data-first-name]").textContent = firstName;
    } catch (error) {
      status.textContent = error.message;
      submit.disabled = false;
      submit.textContent = originalLabel;
    }
  });
});
