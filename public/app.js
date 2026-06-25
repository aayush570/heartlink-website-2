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
  brandDescriptor: "Private Matchmaking",
  logo: "/Heartlink Logo.png",
  siteUrl: "",
  conciergeEmail: "concierge@heartlink.in",
  whatsappNumber: "+919326642337",
  pressEmail: "press@heartlink.in",
  careersEmail: "careers@heartlink.in",
  privacyEmail: "privacy@heartlink.in",
  partnershipsEmail: "partnerships@heartlink.in",
  locations: "Mumbai · India · Global",
  navigation: []
});
const pageContent = await loadJson(`/content/${pageKey}.json`);
const navigation = site.navigation || [];
const whatsappDigits = String(site.whatsappNumber || "").replace(/\D/g, "");
const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "/contact";
const siteOrigin = String(site.siteUrl || window.location.origin).replace(/\/$/, "");
const canonicalHref = `${siteOrigin}${path === "/" ? "/" : path}`;

document.documentElement.style.setProperty("--maroon", site.primaryColor || "#5F1724");
document.documentElement.style.setProperty("--gold", site.accentColor || "#B8954F");
document.documentElement.style.setProperty("--forest", site.secondaryAccentColor || "#5F1724");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeTitle(value = "") {
  return escapeHtml(value)
    .replaceAll("&lt;em&gt;", '<span class="accent">')
    .replaceAll("&lt;/em&gt;", "</span>")
    .replaceAll("&lt;br&gt;", "<br>")
    .replaceAll("&lt;br/&gt;", "<br>")
    .replaceAll("&lt;br /&gt;", "<br>");
}

function safeLines(value = "") {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function safeUrl(value = "", fallback = "#") {
  const url = String(value || "").trim();
  if (!url) return fallback;
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url;
  return fallback;
}

function linkAttrs(url = "") {
  return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener"' : "";
}

function absoluteUrl(url = "", fallback = "/") {
  const safe = safeUrl(url, fallback);
  return safe.startsWith("http") ? safe : `${siteOrigin}${safe.startsWith("/") ? "" : "/"}${safe}`;
}

function upsertHeadTag(selector, tagName, attributes = {}) {
  let tag = document.querySelector(selector);
  if (!tag) {
    tag = document.createElement(tagName);
    document.head.append(tag);
  }
  Object.entries(attributes).forEach(([name, value]) => {
    if (value !== undefined && value !== null) tag.setAttribute(name, value);
  });
  return tag;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value !== undefined) element.textContent = value;
}

function setSafeHtml(selector, value) {
  const element = document.querySelector(selector);
  if (element && value !== undefined) element.innerHTML = safeTitle(value);
}

function syncWhatsappLinks(root = document) {
  root.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    link.setAttribute("href", whatsappHref);
    if (whatsappDigits) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener");
    }
  });
}

function renderCta(cta = {}, options = {}) {
  const primaryLabel = cta.primaryLabel || cta.label || "Apply to Registry";
  const primaryUrl = safeUrl(cta.primaryUrl || cta.url || "/apply", "/apply");
  const showWhatsapp = cta.showWhatsapp !== false && (cta.showWhatsapp || options.defaultWhatsapp);
  const whatsappLabel = cta.whatsappLabel || "Quick WhatsApp Enquiry";
  const className = options.className || "hero-cta";
  return `
    <div class="${className}">
      <a class="button${options.light ? " button-light" : ""}" href="${escapeHtml(primaryUrl)}"${linkAttrs(primaryUrl)}>${escapeHtml(primaryLabel)}</a>
      ${showWhatsapp ? `<a class="button button-outline${options.light ? " button-light-outline" : ""}" data-whatsapp-link href="${whatsappHref}"${linkAttrs(whatsappHref)}>${escapeHtml(whatsappLabel)}</a>` : ""}
    </div>`;
}

function renderSectionHeading(section = {}, centered = false) {
  return `
    <div class="section-heading${centered ? " centered" : ""}" data-reveal>
      ${section.eyebrow ? `<span class="eyebrow">${escapeHtml(section.eyebrow)}</span>` : ""}
      ${section.title ? `<h2>${safeTitle(section.title)}</h2>` : ""}
      ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}
    </div>`;
}

function renderCards(cards = []) {
  return cards.map((card) => {
    const image = safeUrl(card.image || "", "");
    const cardUrl = safeUrl(card.link || card.url || "", "");
    const meta = [card.source, card.date].filter(Boolean).map(escapeHtml).join(" · ");
    const body = `
      <div class="card-copy">
        ${card.label ? `<span>${escapeHtml(card.label)}</span>` : ""}
        <h3>${escapeHtml(card.title)}</h3>
        ${card.description ? `<p>${escapeHtml(card.description)}</p>` : ""}
        ${meta ? `<small class="proof-meta">${meta}</small>` : ""}
        ${cardUrl ? `<b class="card-link">View proof</b>` : ""}
      </div>`;
    const attrs = image ? ` style="--card-image:url('${escapeHtml(image)}')"` : "";
    const classes = `press-card ${image ? "has-card-image" : ""}`;
    if (cardUrl) return `<a class="${classes}" data-reveal href="${escapeHtml(cardUrl)}"${linkAttrs(cardUrl)}${attrs}>${body}</a>`;
    return `<article class="${classes}" data-reveal${attrs}>${body}</article>`;
  }).join("");
}

function renderFormField(field = {}) {
  const name = field.name || field.id || "";
  const id = field.id || name;
  const type = field.type || "text";
  const required = field.required ? " required" : "";
  const label = `${field.label || name}${field.required ? " · Required" : ""}`;
  const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : "";
  const autocomplete = field.autocomplete ? ` autocomplete="${escapeHtml(field.autocomplete)}"` : "";
  const inputMode = field.inputMode ? ` inputmode="${escapeHtml(field.inputMode)}"` : "";
  const maxlength = field.maxlength ? ` maxlength="${escapeHtml(field.maxlength)}"` : "";
  const full = type === "textarea" || field.full ? " field-full" : "";
  const common = `id="${escapeHtml(id)}" name="${escapeHtml(name)}"${required}${placeholder}${autocomplete}${inputMode}${maxlength}`;

  if (type === "textarea") {
    return `<div class="field${full}"><label for="${escapeHtml(id)}">${escapeHtml(label)}</label><textarea ${common}></textarea></div>`;
  }
  if (type === "select") {
    const options = (field.options || []).map((option) => {
      const value = typeof option === "string" ? option : option.value;
      const optionLabel = typeof option === "string" ? option : option.label;
      return `<option value="${escapeHtml(value)}">${escapeHtml(optionLabel)}</option>`;
    }).join("");
    return `<div class="field${full}"><label for="${escapeHtml(id)}">${escapeHtml(label)}</label><select ${common}><option value="">${escapeHtml(field.placeholder || "Select")}</option>${options}</select></div>`;
  }
  return `<div class="field${full}"><label for="${escapeHtml(id)}">${escapeHtml(label)}</label><input ${common} type="${escapeHtml(type)}"></div>`;
}

function renderManagedForm(form, fields = []) {
  if (!form || !fields.length) return;
  const submissionType = form.dataset.submissionType;
  const status = form.querySelector(".form-status")?.outerHTML || '<p class="form-status" role="alert" aria-live="polite"></p>';
  const consent = pageContent.form?.consent || "";
  const button = pageContent.form?.button || "Submit";
  form.innerHTML = `
    ${fields.map(renderFormField).join("")}
    <label class="consent"><input type="checkbox" name="consent" value="yes" required><span>${escapeHtml(consent)}</span></label>
    <button class="button" type="submit">${escapeHtml(button)}</button>
    ${status}`;
  form.dataset.submissionType = submissionType;
}

function shouldShowCard(card = {}) {
  const joined = [card.title, card.description, card.label].join(" ").toLowerCase();
  return Boolean(card.title || card.description || card.image || card.link) &&
    !joined.includes("placeholder") &&
    !joined.includes("use this area") &&
    !joined.includes("can be added here");
}

function renderProofSection(selector, heading, cards) {
  const grid = document.querySelector(selector);
  if (!grid || !cards) return;
  const visibleCards = cards.filter(shouldShowCard);
  const section = grid.closest(".section");
  if (!visibleCards.length) {
    section?.remove();
    return;
  }
  const headingElement = section?.querySelector(".section-heading");
  if (headingElement && heading) headingElement.outerHTML = renderSectionHeading(heading);
  grid.innerHTML = renderCards(visibleCards);
}

function renderStories(stories = []) {
  return stories.filter((story) => ![story.quote, story.label].join(" ").toLowerCase().includes("placeholder")).map((story) => `
    <article class="story-card" data-reveal>
      ${story.label ? `<span>${escapeHtml(story.label)}</span>` : ""}
      <p>“${escapeHtml(story.quote)}”</p>
      ${story.source ? `<strong>${escapeHtml(story.source)}</strong>` : ""}
    </article>`).join("");
}

function updateMeta(seo = {}) {
  const title = seo.title || document.title;
  const descriptionText = seo.description || document.querySelector('meta[name="description"]')?.content || "";
  const ogImage = seo.ogImage || site.defaultOgImage || "/media/heartlink-heritage-invitation.png";
  const absoluteOgImage = absoluteUrl(ogImage, "/media/heartlink-heritage-invitation.png");
  upsertHeadTag('link[rel="canonical"]', "link", { rel: "canonical", href: canonicalHref });
  if (title) document.title = title;
  if (seo.title) document.title = seo.title;
  const description = document.querySelector('meta[name="description"]');
  if (description && descriptionText) description.content = descriptionText;
  const metaPairs = {
    "og:title": seo.ogTitle || title,
    "og:description": seo.ogDescription || descriptionText,
    "og:image": absoluteOgImage,
    "og:url": canonicalHref,
    "og:type": "website",
    "twitter:card": "summary_large_image",
    "twitter:title": seo.ogTitle || title,
    "twitter:description": seo.ogDescription || descriptionText,
    "twitter:image": absoluteOgImage
  };
  Object.entries(metaPairs).forEach(([property, content]) => {
    if (!content) return;
    let tag = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(property.startsWith("twitter") ? "name" : "property", property);
      document.head.append(tag);
    }
    tag.setAttribute("content", content);
  });
  upsertHeadTag('meta[name="theme-color"]', "meta", { name: "theme-color", content: site.themeColor || "#F8F4EC" });
  const structured = upsertHeadTag('script[type="application/ld+json"][data-structured-brand]', "script", {
    type: "application/ld+json",
    "data-structured-brand": "true"
  });
  structured.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "HeartLink",
    url: siteOrigin,
    logo: absoluteUrl(site.logo || "/Heartlink Logo.png", "/Heartlink Logo.png"),
    description: descriptionText,
    areaServed: ["India", "Global"],
    email: site.conciergeEmail,
    telephone: site.whatsappNumber,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Mumbai",
      addressCountry: "IN"
    },
    sameAs: []
  });
}

function renderHero(hero = {}, cta = {}) {
  if (!hero) return;
  setText(".page-hero .eyebrow", hero.eyebrow);
  setSafeHtml(".page-hero h1", hero.title);
  setText(".page-hero .hero-copy", hero.description);
  const inner = document.querySelector(".page-hero .hero-inner");
  if (inner && cta) {
    let target = inner.querySelector(".hero-cta");
    const html = renderCta(cta, { defaultWhatsapp: true });
    if (target) target.outerHTML = html;
    else inner.insertAdjacentHTML("beforeend", html);
    syncWhatsappLinks(inner);
  }
}

function renderHeader() {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;
  const headerCta = site.headerCta || {};
  const primaryUrl = safeUrl(headerCta.primaryUrl || "/apply", "/apply");
  header.className = "site-header";
  header.innerHTML = `
    <div class="nav-shell">
      <a class="brand" href="/" aria-label="HeartLink home">
        <img class="brand-mark" src="${escapeHtml(site.logo || "/Heartlink Logo.png")}" alt="" aria-hidden="true">
        <span>${escapeHtml(site.brandName)}<small>${escapeHtml(site.brandDescriptor)}</small></span>
      </a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        ${navigation.map(({ href, label }) => {
          const safeHref = safeUrl(href, "/");
          return `<a href="${escapeHtml(safeHref)}" ${path === safeHref ? 'aria-current="page"' : ""}>${escapeHtml(label)}</a>`;
        }).join("")}
      </nav>
      <div class="nav-actions">
        <a class="button button-small button-outline desktop-contact" data-whatsapp-link href="${whatsappHref}">${escapeHtml(headerCta.whatsappLabel || "WhatsApp")}</a>
        <a class="button button-small desktop-apply" href="${escapeHtml(primaryUrl)}">${escapeHtml(headerCta.primaryLabel || "Apply to Registry")}</a>
      </div>
      <button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
    </div>
    <div class="mobile-menu" aria-hidden="true">
      <nav aria-label="Mobile navigation">
        ${navigation.map(({ href, label }, index) => `<a href="${escapeHtml(safeUrl(href, "/"))}"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(label)}</a>`).join("")}
        <div class="mobile-actions"><a class="button" href="${escapeHtml(primaryUrl)}">${escapeHtml(headerCta.mobilePrimaryLabel || headerCta.primaryLabel || "Apply to Registry")}</a><a class="button button-outline" data-whatsapp-link href="${whatsappHref}">${escapeHtml(headerCta.mobileWhatsappLabel || headerCta.whatsappLabel || "Quick WhatsApp Enquiry")}</a></div>
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
  syncWhatsappLinks(header);
}

function renderFooter() {
  const footer = document.querySelector("[data-site-footer]");
  if (!footer) return;
  const footerColumns = site.footerColumns || [
    { title: "Start Here", links: [{ label: "Apply to the registry", href: "/apply" }, { label: "Quick WhatsApp Enquiry", href: whatsappHref }, { label: site.conciergeEmail, href: `mailto:${site.conciergeEmail}` }] },
    { title: "Learn More", links: [{ label: "About Gopi Shah", href: "/about" }, { label: "Our process", href: "/membership#process" }, { label: "Trust & recognition", href: "/about#trust" }] },
    { title: "More", links: [{ label: "Services", href: "/membership" }, { label: "Partnerships", href: "/partnerships" }, { label: "Careers", href: "/careers" }, { label: "Privacy", href: "/privacy" }] }
  ];
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="footer-mark">
      <img class="footer-seal" src="${escapeHtml(site.logo || "/Heartlink Logo.png")}" alt="" aria-hidden="true">
      <p>${safeTitle(site.footerStatement || "Private matchmaking for\nselect Indian families.")}</p>
    </div>
    <div class="footer-links">
      ${footerColumns.map((column) => `
        <div>
          <span>${escapeHtml(column.title)}</span>
          ${(column.links || []).map((link) => {
            const href = link.href === "{{whatsapp}}" ? whatsappHref : safeUrl(link.href, "/");
            return `<a ${href === whatsappHref ? "data-whatsapp-link " : ""}href="${escapeHtml(href)}"${linkAttrs(href)}>${escapeHtml(link.label)}</a>`;
          }).join("")}
        </div>`).join("")}
    </div>
    <div class="footer-base"><span>© ${new Date().getFullYear()} ${escapeHtml(site.brandName)} ${escapeHtml(site.brandDescriptor)}</span><span>${escapeHtml(site.locations)}</span></div>
    ${site.footerLegal ? `<p class="footer-legal">${escapeHtml(site.footerLegal)}</p>` : ""}`;
  syncWhatsappLinks(footer);
}

function renderHome() {
  const hero = pageContent.hero || {};
  setText(".home-hero .eyebrow", hero.eyebrow);
  setSafeHtml(".home-hero h1", hero.title);
  setText(".home-hero .hero-copy", hero.description);
  const primary = document.querySelector(".hero-actions .button:not(.button-outline)");
  if (primary) {
    primary.textContent = hero.primaryButton || "Apply to the Registry";
    primary.href = safeUrl(hero.primaryUrl || "/apply", "/apply");
  }
  const secondary = document.querySelector(".hero-actions .text-link");
  if (secondary) {
    secondary.href = safeUrl(hero.secondaryUrl || "/membership#process", "/membership#process");
    secondary.innerHTML = `${escapeHtml(hero.secondaryButton || "See how it works")} <span>↗</span>`;
  }
  const whatsapp = document.querySelector(".hero-actions [data-whatsapp-link]");
  if (whatsapp) whatsapp.textContent = hero.whatsappButton || "Quick WhatsApp Enquiry";
  const assurances = document.querySelector(".hero-assurance");
  if (assurances && hero.assurances) assurances.innerHTML = hero.assurances.map((item) => `<span>${escapeHtml(item)}</span>`).join("");

  const principles = document.querySelector(".heritage-band");
  if (principles && pageContent.principles) {
    principles.innerHTML = pageContent.principles.map((item) => `<div><strong>${escapeHtml(item.number)}</strong><span>${escapeHtml(item.label)}</span></div>`).join("");
  }
  const metrics = document.querySelector("[data-home-metrics]");
  if (metrics && pageContent.proof) metrics.innerHTML = pageContent.proof.map((item) => `<article><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></article>`).join("");

  const legacy = pageContent.legacy || {};
  setText(".legacy-heading .eyebrow", legacy.eyebrow);
  setSafeHtml(".legacy-heading h2", legacy.title);
  setText(".legacy-copy .lead", legacy.lead);
  const legacyParagraphs = document.querySelectorAll(".legacy-copy p:not(.lead)");
  legacyParagraphs.forEach((element, index) => element.textContent = (legacy.paragraphs || [])[index] || "");
  const legacyLink = document.querySelector(".legacy-copy .text-link");
  if (legacyLink) {
    legacyLink.href = safeUrl(legacy.linkUrl || "/about", "/about");
    legacyLink.innerHTML = `${escapeHtml(legacy.linkText || "Meet our founders")} <span>↗</span>`;
  }

  const audience = pageContent.audience || {};
  const lensSection = document.querySelector(".dual-lens .section-narrow");
  if (lensSection && audience.title) {
    lensSection.querySelector(".section-heading")?.remove();
    lensSection.insertAdjacentHTML("afterbegin", renderSectionHeading(audience, true));
  }
  const lensGrid = document.querySelector(".lens-grid");
  if (lensGrid && audience.cards) {
    lensGrid.innerHTML = audience.cards.map((card, index) => `
      <article class="lens-card ${index === 0 ? "lens-family" : "lens-individual"}" data-reveal>
        <span class="card-index">${escapeHtml(card.label)}</span>
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.description)}</p>
        <ul>${(card.points || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
      </article>`).join("");
  }

  const registry = pageContent.registry || {};
  setText(".registry-grid .eyebrow", registry.eyebrow);
  setSafeHtml(".registry-grid h2", registry.title);
  setText(".registry-grid .lead", registry.lead || registry.description);
  const registryParagraphs = document.querySelectorAll(".registry-grid p:not(.lead)");
  registryParagraphs.forEach((element, index) => element.textContent = (registry.paragraphs || [])[index] || "");
  const registryActions = document.querySelector(".registry-grid .inline-actions");
  if (registryActions) {
    registryActions.innerHTML = `<a class="button" href="${escapeHtml(safeUrl(registry.primaryUrl || "/apply", "/apply"))}">${escapeHtml(registry.primaryLabel || "Apply to the Registry")}</a><a class="text-link" href="${escapeHtml(safeUrl(registry.secondaryUrl || "/membership", "/membership"))}">${escapeHtml(registry.secondaryLabel || "View service options")} <span>↗</span></a>`;
  }

  const privacy = pageContent.privacy || {};
  if (privacy.title) {
    const vault = document.querySelector(".vault-section .section-narrow");
    vault.querySelector(".vault-heading")?.remove();
    vault.insertAdjacentHTML("afterbegin", `<div class="vault-heading" data-reveal>${privacy.eyebrow ? `<span class="eyebrow">${escapeHtml(privacy.eyebrow)}</span>` : ""}<h2>${safeTitle(privacy.title)}</h2><p>${escapeHtml(privacy.description)}</p></div>`);
  }
  const vaultGrid = document.querySelector(".vault-grid");
  if (vaultGrid && privacy.cards) vaultGrid.innerHTML = privacy.cards.map((card) => `<article data-reveal><span>${escapeHtml(card.number || card.label)}</span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.description)}</p></article>`).join("");
  const seal = document.querySelector(".vault-seal span");
  if (seal && privacy.seal) seal.innerHTML = safeLines(privacy.seal);

  const process = pageContent.process || {};
  const processSection = document.querySelector(".process-section .section-narrow");
  if (processSection && process.title) {
    processSection.querySelector(".process-heading")?.remove();
    processSection.insertAdjacentHTML("afterbegin", renderSectionHeading(process, true).replace("section-heading", "section-heading process-heading"));
  }
  const thread = document.querySelector(".gold-thread");
  if (thread && process.steps) {
    thread.innerHTML = '<div class="thread-track" aria-hidden="true"><i></i></div>' + process.steps.map((step) => `<article class="thread-step" data-reveal><span>${escapeHtml(step.number)}</span><div><small>${escapeHtml(step.label)}</small><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.description)}</p></div></article>`).join("");
  }

  const proofAssets = document.querySelector("[data-home-proof-assets]");
  if (proofAssets && pageContent.proofAssets) renderProofSection("[data-home-proof-assets]", pageContent.proofHeading, pageContent.proofAssets);
  const stories = document.querySelector("[data-home-stories]");
  if (stories && pageContent.stories) {
    const storyMarkup = renderStories(pageContent.stories);
    if (storyMarkup) stories.innerHTML = storyMarkup;
    else stories.closest(".stories-section")?.remove();
  }
  const storyHeading = document.querySelector(".stories-section .section-heading");
  if (storyHeading && pageContent.storiesHeading) storyHeading.outerHTML = renderSectionHeading(pageContent.storiesHeading, true);

  const founder = pageContent.founder || {};
  const founderImg = document.querySelector(".founder-portrait img");
  if (founderImg && founder.image) {
    founderImg.src = safeUrl(founder.image, founderImg.src);
    founderImg.alt = founder.imageAlt || founderImg.alt;
  }
  setText(".founder-portrait span", founder.badge);
  setText(".founder-copy .eyebrow", founder.eyebrow);
  setText(".founder-copy blockquote", founder.quote);
  setText(".founder-copy p", founder.description);
  setText(".founder-copy .signature", founder.signature);
  const founderLink = document.querySelector(".founder-copy .text-link");
  if (founderLink) {
    founderLink.href = safeUrl(founder.linkUrl || "/about", "/about");
    founderLink.innerHTML = `${escapeHtml(founder.linkText || "Read about Gopi Shah")} <span>↗</span>`;
  }

  const finalCta = pageContent.finalCta || {};
  const frame = document.querySelector(".private-invitation .invitation-frame");
  if (frame && finalCta.title) {
    frame.innerHTML = `
      ${finalCta.eyebrow ? `<span class="eyebrow">${escapeHtml(finalCta.eyebrow)}</span>` : ""}
      <h2>${safeTitle(finalCta.title)}</h2>
      <p>${escapeHtml(finalCta.description)}</p>
      ${renderCta(finalCta, { className: "inline-actions centered-actions", light: true, defaultWhatsapp: true })}
      ${finalCta.note ? `<small>${escapeHtml(finalCta.note)}</small>` : ""}`;
  }
}

function renderAbout() {
  const curatorContainer = document.querySelector(".curator-grid");
  if (curatorContainer && pageContent.curators) {
    curatorContainer.innerHTML = pageContent.curators.map((curator) => {
      const image = safeUrl(curator.image || "", "");
      const style = image
        ? `background-image:linear-gradient(to top,rgba(8,5,10,.55),transparent),url('${escapeHtml(image)}')`
        : curator.theme === "deep"
          ? "background:radial-gradient(circle at 50% 25%,rgba(25,200,211,.28),transparent 20%),linear-gradient(160deg,#123241,#0d0a0f 70%)"
          : "";
      return `
        <article class="curator-card" data-reveal>
          <div class="curator-intro"><span class="eyebrow">${escapeHtml(curator.eyebrow)}</span><h2>${escapeHtml(curator.title)}</h2></div>
          <div class="portrait ${image ? "has-portrait-image" : ""}" style="${style}" role="img" aria-label="${escapeHtml(curator.imageAlt || curator.name)}">
            <div class="portrait-badge"><span>${escapeHtml(curator.role)}</span><strong>${escapeHtml(curator.name)}</strong></div>
          </div>
          <div class="curator-copy">
            <p class="lead">${escapeHtml(curator.lead)}</p>
            <details><summary>Read ${escapeHtml((curator.name || "Gopi").split(" ")[0])}'s story</summary><div>${(curator.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div></details>
            <div class="credentials">${(curator.credentials || []).map((item) => `<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></div>`).join("")}</div>
          </div>
        </article>`;
    }).join("");
  }
  const trustHeading = document.querySelector(".impact-stats-section .section-heading");
  if (trustHeading && pageContent.trustHeading) trustHeading.outerHTML = renderSectionHeading(pageContent.trustHeading);
  const trustStats = document.querySelector("[data-about-trust-stats]");
  if (trustStats && pageContent.trustStats) {
    trustStats.innerHTML = pageContent.trustStats.map((stat) => `<div><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></div>`).join("");
  }
  const trustFeatureArt = document.querySelector("[data-about-trust-feature-art]");
  if (trustFeatureArt && pageContent.trustFeature?.image) {
    trustFeatureArt.style.backgroundImage = `linear-gradient(rgba(44,5,46,.2),rgba(8,5,10,.45)),url("${safeUrl(pageContent.trustFeature.image)}")`;
    trustFeatureArt.setAttribute("role", "img");
    trustFeatureArt.setAttribute("aria-label", pageContent.trustFeature.imageAlt || "");
  }
  setText("[data-about-trust-feature-eyebrow]", pageContent.trustFeature?.eyebrow);
  setText("[data-about-trust-feature-title]", pageContent.trustFeature?.title);
  document.querySelectorAll("[data-about-trust-feature-paragraph]").forEach((element, index) => {
    element.textContent = pageContent.trustFeature?.paragraphs?.[index] || "";
  });
  renderProofSection("[data-about-proof-assets]", pageContent.proofHeading, pageContent.proofAssets);
  renderClosing(pageContent.closing);
}

function renderClosing(closing = {}) {
  if (!closing) return;
  setText(".plum-surface .quote small", closing.eyebrow);
  setText(".plum-surface .quote p", closing.quote);
  const button = document.querySelector(".plum-surface .quote .button, .surface:last-of-type .quote .button");
  if (button) {
    button.textContent = closing.button || button.textContent;
    button.href = safeUrl(closing.url || "/apply", button.getAttribute("href") || "/apply");
  }
}

function renderMethodology() {
  const timeline = document.querySelector(".timeline");
  if (timeline && pageContent.steps) timeline.innerHTML = pageContent.steps.map((step) => `<article class="timeline-item" data-reveal><small>${escapeHtml(step.label)}</small><div class="timeline-number">${escapeHtml(step.number)}</div><h2>${escapeHtml(step.title)}</h2><p>${escapeHtml(step.description)}</p></article>`).join("");
  const after = document.querySelector("[data-after-submit]");
  if (after && pageContent.afterSubmit) {
    after.innerHTML = `${renderSectionHeading(pageContent.afterSubmit, true)}<div class="press-grid">${renderCards(pageContent.afterSubmit.cards || [])}</div>`;
  }
  const closing = document.querySelector(".plum-surface .section-narrow");
  if (closing && pageContent.closing) closing.innerHTML = `<div class="closing-stack" data-reveal><span class="eyebrow">${escapeHtml(pageContent.closing.eyebrow)}</span><h2>${escapeHtml(pageContent.closing.title)}</h2><p>${escapeHtml(pageContent.closing.description)}</p><a class="button" href="/apply">${escapeHtml(pageContent.closing.button)}</a></div>`;
}

function renderMembership() {
  const tierGrid = document.querySelector(".tier-grid");
  if (tierGrid && pageContent.tiers) {
    tierGrid.innerHTML = pageContent.tiers.map((tier) => `<article class="tier-card ${tier.black ? "black" : ""} ${tier.tone ? `tier-${escapeHtml(tier.tone)}` : ""}" data-reveal><span class="tier-index">${escapeHtml(tier.label)}</span><h2>${escapeHtml(tier.title)}</h2><p>${escapeHtml(tier.description)}</p><ul class="tier-features">${(tier.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul><a class="button" href="/apply?interest=${encodeURIComponent(tier.title)}">${escapeHtml(tier.button)}</a></article>`).join("");
  }
  setText(".protocol-note h2", pageContent.protocol?.title);
  const protocolCopy = document.querySelector(".protocol-note > div");
  if (protocolCopy && pageContent.protocol?.paragraphs) {
    protocolCopy.innerHTML = pageContent.protocol.paragraphs.map((paragraph, index) => {
      const safeParagraph = escapeHtml(paragraph);
      if (index === 1) return `<p>${safeParagraph.replace("50", '<span class="premium-limit-number">50</span>')}</p>`;
      return `<p>${safeParagraph}</p>`;
    }).join("");
  }
  const processHeading = document.querySelector(".process-section .process-heading");
  if (processHeading && pageContent.process) processHeading.outerHTML = renderSectionHeading(pageContent.process, true).replace("section-heading", "section-heading process-heading");
  const timeline = document.querySelector("[data-membership-process-timeline]");
  if (timeline && pageContent.steps) timeline.innerHTML = pageContent.steps.map((step) => `<article class="timeline-item" data-reveal><small>${escapeHtml(step.label)}</small><div class="timeline-number">${escapeHtml(step.number)}</div><h2>${escapeHtml(step.title)}</h2><p>${escapeHtml(step.description)}</p></article>`).join("");
  const afterSubmitHeading = document.querySelector("[data-membership-after-submit] .section-heading");
  if (afterSubmitHeading && pageContent.afterSubmit) afterSubmitHeading.outerHTML = renderSectionHeading(pageContent.afterSubmit, true);
  const afterSubmitCards = document.querySelector("[data-membership-after-submit-cards]");
  if (afterSubmitCards && pageContent.afterSubmit?.cards) afterSubmitCards.innerHTML = renderCards(pageContent.afterSubmit.cards);
  renderClosing(pageContent.closing);
}

function renderImpact() {
  const stats = document.querySelector(".impact-numbers");
  if (stats && pageContent.stats) stats.innerHTML = pageContent.stats.map((stat) => `<div><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></div>`).join("");
  const featureArt = document.querySelector(".feature-art");
  if (featureArt && pageContent.feature?.image) {
    featureArt.style.backgroundImage = `linear-gradient(rgba(44,5,46,.2),rgba(8,5,10,.45)),url("${safeUrl(pageContent.feature.image)}")`;
    featureArt.setAttribute("role", "img");
    featureArt.setAttribute("aria-label", pageContent.feature.imageAlt || "");
  }
  setText(".feature-copy .eyebrow", pageContent.feature?.eyebrow);
  setText(".feature-copy h2", pageContent.feature?.title);
  document.querySelectorAll(".feature-copy p").forEach((element, index) => element.textContent = pageContent.feature?.paragraphs?.[index] || "");
  const recognitionHeading = document.querySelector(".section-heading");
  if (recognitionHeading && pageContent.recognition) recognitionHeading.outerHTML = renderSectionHeading(pageContent.recognition);
  const pressGrid = document.querySelector(".press-grid");
  if (pressGrid && pageContent.recognition?.cards) pressGrid.innerHTML = renderCards(pageContent.recognition.cards);
  renderClosing(pageContent.closing);
  const pressButton = document.querySelector(".plum-surface .quote .button");
  if (pressButton) pressButton.href = `mailto:${site.pressEmail}`;
}

function renderCareers() {
  const rolesShell = document.querySelector(".roles-section .section-narrow");
  if (rolesShell && pageContent.rolesIntro && !rolesShell.querySelector(".section-heading")) {
    rolesShell.insertAdjacentHTML("afterbegin", renderSectionHeading(pageContent.rolesIntro, false));
  } else if (rolesShell?.querySelector(".section-heading") && pageContent.rolesIntro) {
    rolesShell.querySelector(".section-heading").outerHTML = renderSectionHeading(pageContent.rolesIntro, false);
  }
  const roles = document.querySelector(".roles");
  if (roles && pageContent.roles) roles.innerHTML = pageContent.roles.map((role) => `<article class="role" data-reveal><h2>${escapeHtml(role.title)}</h2><p>${escapeHtml(role.details)}</p><a href="mailto:${escapeHtml(site.careersEmail)}?subject=${encodeURIComponent(role.title)}" aria-label="Apply for ${escapeHtml(role.title)}"><span>Apply</span><b aria-hidden="true">↗</b></a></article>`).join("");
  const cultureHeading = document.querySelector(".plum-surface .section-heading");
  if (cultureHeading && pageContent.culture) cultureHeading.outerHTML = renderSectionHeading(pageContent.culture);
  const cultureGrid = document.querySelector(".plum-surface .press-grid");
  if (cultureGrid && pageContent.culture?.cards) cultureGrid.innerHTML = renderCards(pageContent.culture.cards);
  renderClosing(pageContent.closing);
  const careersButton = document.querySelector(".surface:last-of-type .quote .button");
  if (careersButton) careersButton.href = `mailto:${site.careersEmail}?subject=Confidential%20Expression%20of%20Interest`;
}

function renderContact() {
  setText(".form-card > .eyebrow", pageContent.form?.eyebrow);
  setText(".form-card > h2", pageContent.form?.title);
  setText(".form-card > p", pageContent.form?.introduction);
  const form = document.querySelector('form[data-submission-type="contact"]');
  if (form && pageContent.form?.fields) renderManagedForm(form, pageContent.form.fields);
  const methods = document.querySelector("[data-contact-methods]");
  if (methods && pageContent.whatsappSection) {
    methods.innerHTML = `
      ${renderSectionHeading(pageContent.whatsappSection)}
      <div class="contact-options">
        <a class="contact-option" data-whatsapp-link href="${whatsappHref}"${linkAttrs(whatsappHref)}><span>WhatsApp</span><strong>${escapeHtml(pageContent.whatsappSection.whatsappLabel || site.whatsappNumber)}</strong></a>
        <a class="contact-option" href="tel:${whatsappDigits}"><span>Call</span><strong>${escapeHtml(pageContent.whatsappSection.callLabel || site.whatsappNumber)}</strong></a>
      </div>`;
    syncWhatsappLinks(methods);
  }
}

function renderPartnerships() {
  const models = document.querySelector(".partnership-models .section-heading");
  if (models && pageContent.models) models.outerHTML = renderSectionHeading(pageContent.models);
  const grid = document.querySelector(".partnership-models .press-grid");
  if (grid && pageContent.models?.cards) grid.innerHTML = renderCards(pageContent.models.cards);
  setText(".form-card > .eyebrow", pageContent.form?.eyebrow);
  setText(".form-card > h2", pageContent.form?.title);
  setText(".form-card > p", pageContent.form?.introduction);
  const form = document.querySelector('form[data-submission-type="partnership"]');
  if (form && pageContent.form?.fields) renderManagedForm(form, pageContent.form.fields);
}

function renderPrivacy() {
  setText(".editorial h2", pageContent.content?.title);
  setText(".editorial .lead", pageContent.content?.lead);
  const editorial = document.querySelector(".editorial");
  if (editorial && pageContent.content?.paragraphs) {
    editorial.querySelectorAll("p:not(.lead)").forEach((element) => element.remove());
    editorial.insertAdjacentHTML("beforeend", pageContent.content.paragraphs.map((paragraph, index) => `<p>${escapeHtml(paragraph)}${index === pageContent.content.paragraphs.length - 1 ? ` <a class="text-link" href="mailto:${escapeHtml(site.privacyEmail)}">${escapeHtml(site.privacyEmail)} <span>↗</span></a>` : ""}</p>`).join(""));
  }
}

function applicationInput(name, label, options = {}) {
  const type = options.type || "text";
  const required = options.required === false ? "" : " required";
  const placeholder = options.placeholder ? ` placeholder="${escapeHtml(options.placeholder)}"` : "";
  const autocomplete = options.autocomplete ? ` autocomplete="${escapeHtml(options.autocomplete)}"` : "";
  const maxlength = options.maxlength ? ` maxlength="${escapeHtml(options.maxlength)}"` : "";
  const full = options.full ? " field-full" : "";
  if (type === "textarea") {
    return `<div class="field${full}"><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><textarea id="${escapeHtml(name)}" name="${escapeHtml(name)}"${required}${placeholder}${maxlength}></textarea></div>`;
  }
  if (type === "select") {
    return `<div class="field${full}"><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><select id="${escapeHtml(name)}" name="${escapeHtml(name)}"${required}><option value="">${escapeHtml(options.placeholder || "Please select")}</option>${(options.options || []).map((option) => `<option>${escapeHtml(option)}</option>`).join("")}</select></div>`;
  }
  return `<div class="field${full}"><label for="${escapeHtml(name)}">${escapeHtml(label)}</label><input id="${escapeHtml(name)}" name="${escapeHtml(name)}" type="${escapeHtml(type)}"${required}${placeholder}${autocomplete}></div>`;
}

function renderApplicationForm() {
  const form = document.querySelector(".stepper-form");
  const steps = pageContent.form?.steps;
  if (!form || !steps?.length) return;
  const contact = steps[0] || {};
  const candidate = steps[1] || {};
  const family = steps[2] || {};
  const service = steps[3] || {};
  const cFields = contact.fields || {};
  const pFields = candidate.fields || {};
  const pPlaceholders = candidate.placeholders || {};
  const fFields = family.fields || {};
  const fPlaceholders = family.placeholders || {};
  const ageOptions = ["24-26", "27-29", "30-34", "35-39", "40-49", "50+"];
  const relationshipOptions = contact.relationshipOptions || ["Parent", "Sibling", "Other family member"];

  form.innerHTML = `
    <fieldset class="inquiry-step is-active" data-step="1">
      <legend><span>${escapeHtml(contact.number || "01")}</span><small>${escapeHtml(contact.small || "Contact details")}</small>${escapeHtml(contact.title || "Who should we speak with?")}</legend>
      <p class="step-intro">${escapeHtml(contact.intro || "")}</p>
      <div class="choice-row">
        ${(contact.choices || []).map((choice, index) => `<label class="choice"><input type="radio" name="applyingFor" value="${escapeHtml(choice.value)}" required${index === 0 ? " checked" : ""}><span><strong>${escapeHtml(choice.label)}</strong>${escapeHtml(choice.description)}</span></label>`).join("")}
      </div>
      <div class="field-row">
        ${applicationInput("contactName", cFields.contactName || "Your full name", { autocomplete: "name" })}
        <div class="field" style="display: none;"><label for="relationship">${escapeHtml(contact.relationshipLabel || "Relationship to the individual")}</label><select id="relationship" name="relationship"><option value="Self">Self</option><option value="">Please select</option>${relationshipOptions.map((option) => `<option>${escapeHtml(option)}</option>`).join("")}</select></div>
      </div>
      <div class="field-row">
        ${applicationInput("email", cFields.email || "Private email", { type: "email", autocomplete: "email" })}
        ${applicationInput("phone", cFields.phone || "Mobile / WhatsApp", { type: "tel", placeholder: "+91", autocomplete: "tel" })}
      </div>
      <div class="step-actions"><button class="button" type="button" data-next>Continue <span>→</span></button></div>
    </fieldset>

    <fieldset class="inquiry-step" data-step="2">
      <legend><span>${escapeHtml(candidate.number || "02")}</span><small>${escapeHtml(candidate.small || "The individual")}</small>${escapeHtml(candidate.title || "Tell us about the person.")}</legend>
      <p class="step-intro">${escapeHtml(candidate.intro || "")}</p>
      <div class="field-row">
        ${applicationInput("applicantName", pFields.applicantName || "Full name", { autocomplete: "name" })}
        ${applicationInput("age", pFields.age || "Age bracket", { type: "select", options: ageOptions })}
      </div>
      ${applicationInput("address", pFields.address || "Current locality, city and country", { full: true, placeholder: pPlaceholders.address || "Mumbai, India", autocomplete: "address-level2" })}
      <div class="field-row">
        ${applicationInput("designation", pFields.designation || "Profession / designation", { autocomplete: "organization-title" })}
        ${applicationInput("company", pFields.company || "Company / organisation", { autocomplete: "organization" })}
      </div>
      <div class="field-row">
        ${applicationInput("school", pFields.school || "Education - school")}
        ${applicationInput("undergraduate", pFields.undergraduate || "Education - undergraduate")}
      </div>
      <div class="field-row">
        ${applicationInput("postgraduate", pFields.postgraduate || "Education - postgraduate", { required: false })}
        ${applicationInput("linkedinProfile", pFields.linkedinProfile || "LinkedIn profile or Not active", { placeholder: pPlaceholders.linkedinProfile || "LinkedIn URL or Not active" })}
      </div>
      ${applicationInput("instagramProfile", pFields.instagramProfile || "Instagram profile or Not active", { full: true, placeholder: pPlaceholders.instagramProfile || "Instagram URL or Not active" })}
      ${applicationInput("introduction", pFields.introduction || "Tell us briefly about them", { type: "textarea", full: true, required: false, maxlength: 1200, placeholder: pPlaceholders.introduction || "" })}
      <div class="step-actions"><button class="text-button" type="button" data-back>← Previous</button><button class="button" type="button" data-next>Continue <span>→</span></button></div>
    </fieldset>

    <fieldset class="inquiry-step" data-step="3">
      <legend><span>${escapeHtml(family.number || "03")}</span><small>${escapeHtml(family.small || "Family details")}</small>${escapeHtml(family.title || "Tell us about the family.")}</legend>
      <p class="step-intro">${escapeHtml(family.intro || "")}</p>
      <div class="field-row">
        ${applicationInput("fatherName", fFields.fatherName || "Father / guardian name", { required: false })}
        ${applicationInput("fatherProfession", fFields.fatherProfession || "Father / guardian profession")}
      </div>
      <div class="field-row">
        ${applicationInput("fatherCompany", fFields.fatherCompany || "Father / guardian company or enterprise")}
        ${applicationInput("motherName", fFields.motherName || "Mother / guardian name", { required: false })}
      </div>
      <div class="field-row">
        ${applicationInput("motherProfession", fFields.motherProfession || "Mother / guardian profession")}
        ${applicationInput("motherCompany", fFields.motherCompany || "Mother / guardian company or enterprise")}
      </div>
      ${applicationInput("familyResidence", fFields.familyResidence || "Family residence locality", { full: true, placeholder: fPlaceholders.familyResidence || "" })}
      ${applicationInput("familyValues", fFields.familyValues || "What matters most to your family?", { type: "textarea", full: true, required: false, maxlength: 900, placeholder: fPlaceholders.familyValues || "" })}
      <div class="step-actions"><button class="text-button" type="button" data-back>← Previous</button><button class="button" type="button" data-next>Continue <span>→</span></button></div>
    </fieldset>

    <fieldset class="inquiry-step" data-step="4">
      <legend><span>${escapeHtml(service.number || "04")}</span><small>${escapeHtml(service.small || "Service interest")}</small>${escapeHtml(service.title || "How can HeartLink help?")}</legend>
      <p class="step-intro">${escapeHtml(service.intro || "")}</p>
      <div class="choice-grid service-choices">
        ${(service.choices || []).map((choice) => `<label class="choice"><input type="radio" name="membershipInterest" value="${escapeHtml(choice.value)}"><span><strong>${escapeHtml(choice.label)}</strong>${escapeHtml(choice.description)}</span></label>`).join("")}
      </div>
      <div class="verification-note next-step-note"><img class="logo-seal verification-logo" src="/Heartlink%20Logo.png" alt="" aria-hidden="true"><span><strong data-apply-next-steps-title>${escapeHtml(pageContent.form?.nextSteps?.title || "What happens after you apply?")}</strong><ol data-apply-next-steps-list>${(pageContent.form?.nextSteps?.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></span></div>
      <div class="verification-note"><img class="logo-seal verification-logo" src="/Heartlink%20Logo.png" alt="" aria-hidden="true"><span><strong data-apply-verification-title>${escapeHtml(pageContent.form?.verificationTitle || "Private review")}</strong> <span data-apply-verification-copy>${escapeHtml(pageContent.form?.verificationNote || "")}</span></span></div>
      ${pageContent.form?.disclaimer ? `<p class="form-disclaimer">${escapeHtml(pageContent.form.disclaimer)}</p>` : ""}
      <label class="consent"><input type="checkbox" name="consent" value="yes" required><span>${escapeHtml(pageContent.form?.consent || "")}</span></label>
      <div class="step-actions"><button class="text-button" type="button" data-back>← Previous</button><button class="button" type="submit">${escapeHtml(pageContent.form?.button || "Submit Private Application")} <span>→</span></button></div>
      <p class="form-status" role="alert" aria-live="polite"></p>
    </fieldset>`;
}

function renderApply() {
  const intro = pageContent.intro || {};
  setText(".application-intro .eyebrow", intro.eyebrow);
  setSafeHtml(".application-intro h1", intro.title);
  setText(".application-intro > div > p", intro.description);
  setText(".application-intro .text-link", intro.returnLinkLabel);
  const returnLink = document.querySelector(".application-intro .text-link");
  if (returnLink) returnLink.innerHTML = `${escapeHtml(intro.returnLinkLabel || "Return home")} <span>↗</span>`;

  const assuranceTitle = document.querySelector("[data-apply-assurance-title]");
  if (assuranceTitle) assuranceTitle.innerHTML = safeTitle(intro.assuranceTitle || "Strictly confidential.");
  setSafeHtml("[data-apply-assurance-copy]", intro.assuranceDescription || "Your information is reviewed only by the HeartLink team and never shown in a public directory.");

  const stepHeader = pageContent.form?.stepHeader || {};
  setText(".step-header .eyebrow", pageContent.form?.eyebrow);
  setText("[data-apply-form-introduction]", pageContent.form?.introduction);
  setText("[data-apply-step-duration]", stepHeader.durationLabel);
  setText("[data-apply-step-review-label]", stepHeader.reviewLabel);

  const protocol = document.querySelector("[data-apply-protocol]");
  if (protocol && intro.protocol) {
    protocol.innerHTML = intro.protocol.map((item) => `<span><strong>${escapeHtml(item.number)}</strong>${escapeHtml(item.label)}</span>`).join("");
  }

  const nextStep = pageContent.form?.nextSteps || {};
  setText("[data-apply-next-steps-title]", nextStep.title);
  const nextStepsList = document.querySelector("[data-apply-next-steps-list]");
  if (nextStepsList && nextStep.items) {
    nextStepsList.innerHTML = nextStep.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  setText("[data-apply-verification-title]", pageContent.form?.verificationTitle);
  setText("[data-apply-verification-copy]", pageContent.form?.verificationNote);
  setText(".stepper-form .consent span", pageContent.form?.consent);
  const submitButton = document.querySelector('.stepper-form button[type="submit"]');
  if (submitButton) submitButton.innerHTML = `${escapeHtml(pageContent.form?.button || "Submit Private Application")} <span>→</span>`;
  renderApplicationForm();

  const faqSection = document.querySelector("[data-apply-faqs]");
  if (faqSection && pageContent.faqs?.length) {
    faqSection.innerHTML = pageContent.faqs.map((faq) => `
      <div class="accordion-item" data-accordion>
        <button type="button" aria-expanded="false">
          <span>${escapeHtml(faq.question)}</span>
          <span aria-hidden="true">+</span>
        </button>
        <div class="accordion-content">
          <p>${escapeHtml(faq.answer)}</p>
        </div>
      </div>`).join("");
  } else {
    faqSection?.closest(".section")?.remove();
  }
}

renderHeader();
renderFooter();
updateMeta(pageContent.seo);
renderHero(pageContent.hero, pageContent.cta);
syncWhatsappLinks();

if (pageKey === "home") renderHome();
if (pageKey === "about") renderAbout();
if (pageKey === "methodology") renderMethodology();
if (pageKey === "membership") renderMembership();
if (pageKey === "impact") renderImpact();
if (pageKey === "careers") renderCareers();
if (pageKey === "apply") renderApply();
if (pageKey === "contact") renderContact();
if (pageKey === "partnerships") renderPartnerships();
if (pageKey === "privacy") renderPrivacy();

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

  const applyingForInputs = stepper.querySelectorAll('input[name="applyingFor"]');
  const relationshipInput = stepper.querySelector('#relationship');
  if (applyingForInputs.length && relationshipInput) {
    const relationshipField = relationshipInput.closest('.field');
    const updateRelationship = () => {
      const isSelf = stepper.querySelector('input[name="applyingFor"]:checked')?.value === 'self';
      if (isSelf) {
        relationshipField.style.display = 'none';
        relationshipInput.required = false;
        relationshipInput.value = 'Self';
      } else {
        relationshipField.style.display = 'block';
        relationshipInput.required = true;
        if (relationshipInput.value === 'Self') relationshipInput.value = '';
      }
    };
    applyingForInputs.forEach(i => i.addEventListener('change', updateRelationship));
    updateRelationship();
  }

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
  if (!form.querySelector('input[name="website"]')) {
    form.insertAdjacentHTML("afterbegin", '<div class="hp-field" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>');
  }
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
    data.submittedFrom = path;
    submit.disabled = true;
    submit.textContent = site.transactional?.sendingLabel || "Sending privately...";
    status.textContent = "";

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "We could not receive this enquiry. Please try again.");
      const firstName = String(data.applicantName || data.name || "there").trim().split(/\s+/)[0];
      form.innerHTML = `
        <div class="form-success" role="status">
          <span class="eyebrow">${escapeHtml(site.transactional?.successEyebrow || "Received privately")}</span>
          <h2>${escapeHtml(site.transactional?.successTitle || "Thank you")}, <span data-first-name></span>.</h2>
          <p>${escapeHtml(result.message)} Your reference is <strong>${escapeHtml(result.reference)}</strong>. ${escapeHtml(site.transactional?.successSuffix || "The HeartLink team will review it privately before making contact.")}</p>
          <a class="text-link" href="/">${escapeHtml(site.transactional?.returnLabel || "Return to HeartLink")} <span>↗</span></a>
        </div>`;
      form.querySelector("[data-first-name]").textContent = firstName;
    } catch (error) {
      status.textContent = error.message || site.transactional?.defaultError || "We could not receive this enquiry. Please try again or contact HeartLink directly.";
      submit.disabled = false;
      submit.textContent = originalLabel;
    }
  });
});
