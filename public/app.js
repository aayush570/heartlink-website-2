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
  locations: "Mumbai · India · Global",
  navigation: []
});
const pageContent = await loadJson(`/content/${pageKey}.json`);
const navigation = site.navigation || [];

document.documentElement.style.setProperty("--plum", site.primaryColor || "#2C052E");
document.documentElement.style.setProperty("--pink", site.accentColor || "#E235F7");
document.documentElement.style.setProperty("--cyan", site.secondaryAccentColor || "#19C8D3");

const header = document.querySelector("[data-site-header]");
if (header) {
  header.className = "site-header";
  header.innerHTML = `
    <div class="nav-shell">
      <a class="brand" href="/" aria-label="HeartLink home">
        <img src="${site.logo}" alt="" width="54" height="44">
        <span>${site.brandName}<small>${site.brandDescriptor}</small></span>
      </a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        ${navigation.map(({ href, label }) => `<a href="${href}" ${path === href ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
      <a class="button button-small desktop-apply" href="/apply">Request an Invitation</a>
      <button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span>
      </button>
    </div>
    <div class="mobile-menu" aria-hidden="true">
      <nav aria-label="Mobile navigation">
        ${navigation.map(({ href, label }, index) => `<a href="${href}"><span>0${index + 1}</span>${label}</a>`).join("")}
        <a class="button" href="/apply">Request an Invitation</a>
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
      <img src="${site.logo}" alt="" width="76" height="62">
      <p>${site.footerStatement}</p>
    </div>
    <div class="footer-links">
      <div><span>Private Desk</span><a href="/apply">Begin a confidential dialogue</a><a href="mailto:${site.conciergeEmail}">${site.conciergeEmail}</a></div>
      <div><span>Explore</span><a href="/about">The Curators</a><a href="/methodology">Our Methodology</a><a href="/impact">Institutional Trust</a></div>
      <div><span>Protocol</span><a href="/membership">Curation Channels</a><a href="/careers">Join the Firm</a><a href="/privacy.html">Privacy</a></div>
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
    <article class="press-card" data-reveal>
      ${card.image ? `<img class="card-image" src="${card.image}" alt="">` : ""}
      <span>${card.label}</span><h3>${card.title}</h3><p>${card.description}</p>
    </article>`).join("");
}

if (pageContent.seo) {
  document.title = pageContent.seo.title;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = pageContent.seo.description;
}
renderHero(pageContent.hero);

if (pageKey === "home" && pageContent.hero) {
  setText(".home-hero .button:not(.button-outline)", pageContent.hero.primaryButton);
  setText(".home-hero .button-outline", pageContent.hero.secondaryButton);
  setText(".hero-note", pageContent.hero.note);
  setText(".privacy-orbit", pageContent.hero.privacyNote);
  (pageContent.hero.profileImages || []).slice(0, 5).forEach((image, index) => {
    const art = document.querySelectorAll(".profile-art")[index];
    if (art && image) art.style.backgroundImage = `url("${image}")`;
  });

  setText(".registry-statement .eyebrow", pageContent.registry.eyebrow);
  setText(".registry-number", pageContent.registry.number);
  setText(".registry-copy h2", pageContent.registry.title);
  setText(".registry-copy p", pageContent.registry.description);
  setText(".registry-copy .text-link", `${pageContent.registry.linkText} ↗`);
  setText(".section-heading .eyebrow", pageContent.advantage.eyebrow);
  setText(".section-heading h2", pageContent.advantage.title);
  setText(".section-heading p", pageContent.advantage.description);
  const advantageGrid = document.querySelector(".advantage-grid");
  if (advantageGrid) {
    advantageGrid.innerHTML = `
      <div class="grid-head">What truly matters</div><div class="grid-head">Dating apps</div><div class="grid-head">DIY search</div><div class="grid-head heartlink-col">HeartLink</div>
      ${pageContent.advantage.rows.map((row) => {
        const cell = (value, className = "") => {
          const [title, detail] = value.split("|");
          return `<div class="${className}"><strong>${title}</strong><p>${detail || ""}</p></div>`;
        };
        return `<div><strong>${row.subject}</strong><p>${row.explanation}</p></div>${cell(row.apps)}${cell(row.diy)}${cell(row.heartlink, "heartlink-col")}`;
      }).join("")}`;
  }
  setText(".plum-surface .quote small", pageContent.philosophy.eyebrow);
  setText(".plum-surface .quote p", pageContent.philosophy.quote);
  const dimensionHeading = document.querySelectorAll(".section-heading")[1];
  if (dimensionHeading) {
    dimensionHeading.querySelector(".eyebrow").textContent = pageContent.dimensions.eyebrow;
    dimensionHeading.querySelector("h2").textContent = pageContent.dimensions.title;
    dimensionHeading.querySelector("p").textContent = pageContent.dimensions.description;
  }
  const dimensionGrid = document.querySelector(".surface:last-of-type .press-grid");
  if (dimensionGrid) dimensionGrid.innerHTML = renderCards(pageContent.dimensions.cards);
}

if (pageKey === "about" && pageContent.curators) {
  const curatorContainer = document.querySelector(".section-narrow");
  if (curatorContainer) curatorContainer.innerHTML = pageContent.curators.map((curator) => `
    <article class="curator">
      <div class="portrait ${curator.image ? "has-portrait-image" : ""}" data-reveal style="${curator.image ? `background-image:linear-gradient(to top,rgba(8,5,10,.55),transparent),url('${curator.image}')` : curator.theme === "cyan" ? "background:radial-gradient(circle at 50% 25%,rgba(25,200,211,.28),transparent 20%),linear-gradient(160deg,#123241,#0d0a0f 70%)" : ""}" role="img" aria-label="${curator.imageAlt}">
        <div class="portrait-badge"><span>${curator.role}</span><strong>${curator.name}</strong></div>
      </div>
      <div class="editorial" data-reveal>
        <span class="eyebrow">${curator.eyebrow}</span><h2>${curator.title}</h2><p class="lead">${curator.lead}</p>
        ${curator.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
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
  if (closing) closing.innerHTML = `<div class="section-heading" data-reveal><span class="eyebrow">${pageContent.closing.eyebrow}</span><div><h2>${pageContent.closing.title}</h2><p>${pageContent.closing.description}</p></div></div><a class="button" href="/apply">${pageContent.closing.button}</a>`;
}

if (pageKey === "membership" && pageContent.tiers) {
  const tierGrid = document.querySelector(".tier-grid");
  if (tierGrid) tierGrid.innerHTML = pageContent.tiers.map((tier) => `<article class="tier-card ${tier.black ? "black" : ""}" data-reveal><span class="tier-index">${tier.label}</span><h2>${tier.title}</h2><p>${tier.description}</p><ul class="tier-features">${tier.features.map((feature) => `<li>${feature}</li>`).join("")}</ul><a class="button" href="/apply">${tier.button}</a></article>`).join("");
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

if (pageKey === "apply" && pageContent.intro) {
  setText(".application-intro .eyebrow", pageContent.intro.eyebrow);
  setHtml(".application-intro h1", titleHtml(pageContent.intro.title));
  setText(".application-intro > div > p", pageContent.intro.description);
  const protocol = document.querySelector(".protocol-list");
  if (protocol) protocol.innerHTML = pageContent.intro.protocol.map((item) => `<div><strong>${item.number}</strong><span>${item.label}</span></div>`).join("");
  setText(".form-panel > .eyebrow", pageContent.form.eyebrow);
  setText(".form-panel > p", pageContent.form.introduction);
  const verification = document.querySelector(".verification-note");
  if (verification) verification.innerHTML = `<strong>Entry protocol:</strong> ${pageContent.form.verificationNote}`;
  setText(".consent span", pageContent.form.consent);
  setText('#private-application button[type="submit"]', pageContent.form.button);
  const accordion = document.querySelector(".accordion");
  if (accordion) accordion.innerHTML = pageContent.faqs.map((faq) => `<div class="accordion-item" data-accordion><button type="button" aria-expanded="false"><span>${faq.question}</span><span>+</span></button><div class="accordion-content"><p>${faq.answer}</p></div></div>`).join("");
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

document.querySelectorAll("[data-accordion]").forEach((item) => {
  const trigger = item.querySelector("button");
  trigger.addEventListener("click", () => {
    const open = item.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(open));
  });
});

const application = document.querySelector("#private-application");
if (application) {
  const status = document.querySelector("#form-status");
  application.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = application.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(application));
    data.consent = Boolean(data.consent);
    submit.disabled = true;
    submit.textContent = "Securing your introduction…";
    status.textContent = "";

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      application.innerHTML = `
        <div class="form-success" role="status">
          <span class="eyebrow">Introduction secured</span>
          <h2>Thank you, ${data.name.split(" ")[0]}.</h2>
          <p>${result.message} Your confidential reference is <strong>${result.reference}</strong>. A member of the private desk will review your introduction before any direct dialogue begins.</p>
          <a class="text-link" href="/">Return to The Vanguard <span>↗</span></a>
        </div>`;
    } catch (error) {
      status.textContent = error.message;
      submit.disabled = false;
      submit.textContent = "Submit Private Introduction";
    }
  });
}
