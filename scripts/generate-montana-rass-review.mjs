import fs from "node:fs";
import path from "node:path";

const certreadyRoot = process.env.CERTREADY_ROOT || "C:\\dev\\certready";
const aestusRoot = "C:\\dev\\Aestus Website";
const outDir = path.join(aestusRoot, "montana-rass-review");
const packetDir = process.env.MONTANA_PACKET_DIR || path.join(certreadyRoot, "docs", "submission", "montana", "pdf");

const tracks = [
  {
    slug: "mt-alcohol",
    label: "On-premises",
    audience: "Bars, restaurants, breweries, tasting rooms, and other locations where alcohol is served for consumption on site.",
    minMinutes: 120,
    examDraw: 40,
    pool: 64,
    reviewerEmail: "mt-reviewer@certready.org",
    demoEmail: "mt-demo@certready.org",
    pdf: "mt-alcohol-full-course-content.pdf",
  },
  {
    slug: "mt-alcohol-offsale",
    label: "Off-premises",
    audience: "Grocery stores, convenience stores, package stores, sealed-container retail, and delivery-related off-premises settings.",
    minMinutes: 60,
    examDraw: 25,
    pool: 40,
    reviewerEmail: "mt-offsale-reviewer@certready.org",
    demoEmail: "mt-offsale-demo@certready.org",
    pdf: "mt-alcohol-offsale-full-course-content.pdf",
  },
];

const submissionDocs = [
  ["cover-letter.pdf", "Cover Letter", "Plain-English program overview and contact information."],
  ["curriculum-outline.pdf", "Curriculum Outline", "Module-by-module training sequence."],
  ["content-map.pdf", "Content Map", "Universal and Montana-specific content map."],
  ["coverage-audit.pdf", "Coverage Audit", "Montana rule coverage and current known limitations."],
  ["mt-supplement.pdf", "Montana Supplement", "Montana-specific statute and rule support."],
  ["completion-reporting-workflow.pdf", "Completion Reporting Workflow", "How completions are reported to Montana CARD."],
  ["scoring-methodology.pdf", "Scoring Methodology", "Final-exam selection, passing score, and retake policy."],
  ["verified-citations.pdf", "Verified Citations", "Primary-source citation packet for the Montana course."],
];

function safeRmDir(target) {
  const resolved = path.resolve(target);
  const allowed = path.resolve(aestusRoot);
  if (!resolved.startsWith(allowed) || !resolved.endsWith("montana-rass-review")) {
    throw new Error(`Refusing to clear unexpected path: ${resolved}`);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeText(file, text) {
  fs.writeFileSync(file, String(text).replace(/[ \t]+$/gm, ""), "utf8");
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(certreadyRoot, rel), "utf8"));
}

function fixMojibake(text) {
  return String(text ?? "")
    .replace(/Ã¢â‚¬â€|Ã¢â‚¬â€œ|â€”|â€“/g, "-")
    .replace(/â€”|â€“/g, "-")
    .replace(/Ã¢â‚¬Å“|Ã¢â‚¬Â|â€œ|â€/g, '"')
    .replace(/Ã¢â‚¬Ëœ|Ã¢â‚¬â„¢|â€˜|â€™/g, "'")
    .replace(/Ã¢â€°Â¥|â‰¥/g, "at least")
    .replace(/Ã¢â€°Â¤|â‰¤/g, "at most")
    .replace(/Ã¢â€°Ë†|â‰ˆ/g, "about")
    .replace(/Ãƒâ€”|Ã—/g, "x")
    .replace(/Ã‚Â§/g, "Section ")
    .replace(/Ã‚Â¡/g, "")
    .replace(/Ã‚Â¿/g, "")
    .replace(/Â¿/g, "")
    .replace(/Â¡/g, "")
    .replace(/Ã‚/g, "")
    .replace(/\uFFFD/g, "")
    .replace(/â€¢/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function value(input, lang = "en") {
  if (input == null) return "";
  if (typeof input === "object" && !Array.isArray(input)) return fixMojibake(input[lang] ?? input.en ?? input.text ?? "");
  return fixMojibake(input);
}

function esc(input) {
  return fixMojibake(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mdInline(input) {
  return esc(input).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function moduleHref(slug, id) {
  return `courses/${slug}/${id}.html`;
}

function rootPrefix(depth) {
  return depth === 0 ? "" : "../".repeat(depth);
}

function page({ title, body, depth = 0, pageClass = "" }) {
  const root = rootPrefix(depth);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="${root}style.css">
</head>
<body class="${esc(pageClass)}">
  <header class="site-header">
    <a class="brand" href="${root}index.html" aria-label="CertReady Montana reviewer home">
      <span class="brand-mark">CR</span>
      <span><strong>CertReady</strong><small>Montana CARD reviewer mirror</small></span>
    </a>
    <nav aria-label="Reviewer navigation">
      <a href="${root}index.html#review-course">Course Preview</a>
      <a href="${root}index.html#accounts">Reviewer Accounts</a>
      <a href="${root}index.html#documents">Documents</a>
    </nav>
  </header>
  ${body}
  <footer class="site-footer">
    <strong>CertReady</strong> alternate reviewer mirror hosted on Aestus Consulting. Live LMS remains certready.org.
  </footer>
</body>
</html>`;
}

function stat(label, valueText) {
  return `<div class="stat"><span>${esc(label)}</span><strong>${esc(valueText)}</strong></div>`;
}

function getModules(track) {
  const dir = path.join(certreadyRoot, "courses", track.slug, "modules");
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => readJson(`courses/${track.slug}/modules/${file}`));
}

function getOverview(config, moduleId) {
  return (config.module_overviews || []).find((item) => item.moduleId === moduleId);
}

function optionList(question) {
  const raw = question.options?.en ?? question.options ?? [];
  return raw.map((opt, index) => {
    if (typeof opt === "object") return { id: String(opt.id ?? String.fromCharCode(97 + index)), text: value(opt.text) };
    return { id: String.fromCharCode(97 + index), text: value(opt) };
  });
}

function correctAnswerText(question, options) {
  const raw = question.answer ?? question.correctAnswer;
  if (typeof raw === "number") return options[raw]?.text ?? String(raw);
  const rawText = value(raw).toLowerCase();
  return options.find((opt) => opt.id.toLowerCase() === rawText || opt.text.toLowerCase() === rawText)?.text ?? value(raw);
}

function chunkImage(chunk) {
  const ref = chunk.infographic || chunk.image;
  if (!ref) return null;
  const name = path.basename(ref);
  const source = path.join(certreadyRoot, "app", "public", "infographics", name);
  if (!fs.existsSync(source)) return null;
  return name;
}

function renderTextBlocks(text) {
  const clean = value(text);
  if (!clean) return "";
  const listParts = clean.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  if (listParts.length > 3) {
    return `<ul>${listParts.map((part) => `<li>${mdInline(part)}</li>`).join("")}</ul>`;
  }
  return clean.split(/(?<=\.)\s+(?=[A-Z0-9])/).reduce((html, sentence, index, arr) => {
    if (arr.length <= 2) return `${html}${index === 0 ? `<p>${mdInline(clean)}</p>` : ""}`;
    return `${html}${index % 3 === 0 ? "<p>" : " "}${mdInline(sentence)}${index % 3 === 2 || index === arr.length - 1 ? "</p>" : ""}`;
  }, "");
}

function renderChunk(chunk) {
  const type = value(chunk.type || "text");
  const image = chunkImage(chunk);
  const imageHtml = image ? `<figure class="infographic"><img src="../../img/${esc(image)}" alt="${esc(chunk.infographicNote || image)}"><figcaption>${esc(chunk.infographicNote || "Course infographic")}</figcaption></figure>` : "";

  if (type === "list") {
    const items = (chunk.items || []).map((item) => `<li>${mdInline(value(item))}</li>`).join("");
    return `<article class="lesson-card lesson-list"><div class="card-kicker">Learning List</div>${chunk.title ? `<h4>${esc(value(chunk.title))}</h4>` : ""}<ul>${items}</ul>${imageHtml}</article>`;
  }

  if (type === "callout") {
    return `<article class="lesson-card callout ${esc(chunk.style || "info")}"><div class="card-kicker">${chunk.style === "law" ? "Law" : "Note"}</div>${renderTextBlocks(chunk.content)}${imageHtml}</article>`;
  }

  if (type === "scenario") {
    return `<article class="lesson-card scenario"><div class="card-kicker">Scenario Practice</div>${chunk.title ? `<h4>${esc(value(chunk.title))}</h4>` : ""}${renderTextBlocks(chunk.content || chunk.prompt)}${imageHtml}</article>`;
  }

  if (type === "multiple_choice" || type === "true_false") {
    return renderQuestion(chunk, "Practice Question");
  }

  if (type === "short_answer") {
    const keywords = Array.isArray(chunk.acceptedKeywords || chunk.keywords) ? (chunk.acceptedKeywords || chunk.keywords).slice(0, 8).join(", ") : "";
    return `<article class="lesson-card question"><div class="card-kicker">Short Answer Practice</div><p class="question-stem">${mdInline(value(chunk.question || chunk.prompt || chunk.content))}</p>${keywords ? `<p class="answer-note"><strong>Review keywords:</strong> ${esc(keywords)}</p>` : ""}</article>`;
  }

  return `<article class="lesson-card"><div class="card-kicker">Lesson</div>${renderTextBlocks(chunk.content || chunk.text || chunk.body || chunk.prompt)}${imageHtml}</article>`;
}

function renderQuestion(question, label = "Question") {
  const options = optionList(question);
  const correct = correctAnswerText(question, options);
  const answerId = options.find((opt) => opt.text === correct)?.id;
  return `<article class="lesson-card question">
    <div class="card-kicker">${esc(label)}${question.id ? ` ${esc(question.id)}` : ""}</div>
    <p class="question-stem">${mdInline(value(question.question || question.prompt))}</p>
    <ol class="options">
      ${options.map((opt) => `<li class="${opt.id === answerId ? "correct" : ""}"><span>${esc(opt.id)}.</span> ${esc(opt.text)}${opt.id === answerId ? " <strong>Correct</strong>" : ""}</li>`).join("")}
    </ol>
    ${question.explanation ? `<p class="answer-note">${mdInline(value(question.explanation))}</p>` : ""}
  </article>`;
}

function renderMediaPanel(track, mod, overview) {
  if (!overview?.hasVideo && !overview?.hasPodcast) return "";
  const id = mod.moduleId;
  const mediaRoot = `../../media/overviews/${track.slug}`;
  return `<section class="overview-panel">
    <div class="overview-head">
      <div class="media-icon">▶</div>
      <div>
        <h3>Module Overview</h3>
        <p>Same learner-facing video and podcast support as the CertReady course preview.</p>
      </div>
    </div>
    <div class="media-grid">
      ${overview.hasVideo ? `<div class="media-card"><h4>Video Review</h4><p>${esc(overview.videoTitle || "Module overview video")}</p><video controls preload="metadata" poster="${mediaRoot}/module-${id}-poster.jpg"><source src="${mediaRoot}/module-${id}-video.mp4" type="video/mp4"></video></div>` : ""}
      ${overview.hasPodcast ? `<div class="media-card"><h4>Podcast Overview</h4><p>${esc(overview.podcastTitle || "Module overview podcast")}</p><audio controls preload="metadata"><source src="${mediaRoot}/module-${id}-podcast.m4a" type="audio/mp4"></audio></div>` : ""}
    </div>
    <p class="fine">The media reinforces the lesson. The full module content below is the required training material.</p>
  </section>`;
}

function renderSidebar(track, modules, activeId = "exam") {
  const total = modules.reduce((sum, mod) => sum + Number(mod.estimatedMinutes || 0), 0);
  return `<aside class="course-sidebar">
    <div class="sidebar-title">
      <strong>${esc(track.label)} Track</strong>
      <span>${modules.length} modules · ${total} min</span>
    </div>
    <nav class="module-list" aria-label="${esc(track.label)} modules">
      ${modules.map((mod) => `<a class="${mod.moduleId === activeId ? "active" : ""}" href="${mod.moduleId}.html"><span>${esc(mod.moduleId)}</span><strong>${esc(value(mod.title))}</strong><small>${esc(mod.estimatedMinutes)} min</small></a>`).join("")}
      <a class="${activeId === "exam" ? "active" : ""}" href="exam.html"><span>✓</span><strong>Final Exam Preview</strong><small>Interim practice</small></a>
    </nav>
  </aside>`;
}

function buildModulePage(track, config, modules, mod, index) {
  const overview = getOverview(config, mod.moduleId);
  const prev = modules[index - 1];
  const next = modules[index + 1];
  const sections = (mod.sections || []).map((section, sectionIndex) => `<section class="lesson-section">
    <button class="section-title" type="button"><span>Section ${sectionIndex + 1}</span>${esc(value(section.title) || "Lesson Section")}</button>
    <div class="section-body">${(section.chunks || []).map(renderChunk).join("")}</div>
  </section>`).join("");
  const quizQuestions = mod.quiz?.questions || [];
  const quiz = quizQuestions.length ? `<section class="quiz-section">
    <div class="quiz-head">
      <span>Module Quiz</span>
      <h2>${esc(value(mod.quiz.title) || `Module ${mod.moduleId} Quiz`)}</h2>
      <p>Reviewer view shows the questions and correct answers immediately so you can evaluate the assessment content without submitting attempts.</p>
    </div>
    ${quizQuestions.map((q) => renderQuestion(q, "Quiz Question")).join("")}
  </section>` : "";

  const body = `<main class="course-layout">
    ${renderSidebar(track, modules, mod.moduleId)}
    <article class="course-main">
      <div class="course-subnav"><a href="../../index.html">← Montana reviewer home</a><span>${esc(track.label)} learner preview</span></div>
      <section class="module-hero">
        <div class="module-meta"><span>Module ${esc(mod.moduleId)}</span><span>${esc(mod.estimatedMinutes)} minutes</span><span>${esc(value(mod.type || "mixed"))}</span></div>
        <h1>${esc(value(mod.title))}</h1>
        <p>${esc(value(mod.subtitle) || track.audience)}</p>
      </section>
      <section class="learn-card">
        <h2>What you'll learn</h2>
        <ul>${(mod.learningOutcomes || []).map((outcome) => `<li><strong>${esc(outcome.id || "Outcome")}:</strong> ${esc(value(outcome.description))}</li>`).join("")}</ul>
      </section>
      ${renderMediaPanel(track, mod, overview)}
      ${sections}
      ${quiz}
      <nav class="prev-next">
        ${prev ? `<a href="${prev.moduleId}.html"><span>Previous</span><strong>${esc(value(prev.title))}</strong></a>` : `<a href="../../index.html"><span>Back</span><strong>Reviewer home</strong></a>`}
        ${next ? `<a href="${next.moduleId}.html"><span>Next</span><strong>${esc(value(next.title))}</strong></a>` : `<a href="exam.html"><span>Next</span><strong>Final Exam Preview</strong></a>`}
      </nav>
    </article>
  </main>
  <script src="../../site.js"></script>`;
  writeText(path.join(outDir, "courses", track.slug, `${mod.moduleId}.html`), page({ title: `${track.label} Module ${mod.moduleId}: ${value(mod.title)}`, body, depth: 2, pageClass: "course-page" }));
}

function buildExamPage(track, modules) {
  const exam = readJson(`courses/${track.slug}/exams/final-exam.json`);
  const body = `<main class="course-layout">
    ${renderSidebar(track, modules, "exam")}
    <article class="course-main">
      <div class="course-subnav"><a href="../../index.html">← Montana reviewer home</a><span>${esc(track.label)} final exam preview</span></div>
      <section class="module-hero exam-hero">
        <div class="module-meta"><span>Interim practice preview</span><span>${esc(track.examDraw)} of ${esc(track.pool)} internal pool</span><span>State-supplied final pending</span></div>
        <h1>${esc(value(exam.title))}</h1>
        <p>${esc(value(exam.instructions))}</p>
      </section>
      <section class="learn-card">
        <h2>Reviewer note</h2>
        <p>This static preview shows CertReady's interim practice pool and answer key so Montana CARD can evaluate coverage while the official state-supplied exam package is pending. It is not the final Montana exam. The live LMS applies the 80% passing score and ARM 42.13.907 retake rule.</p>
      </section>
      <section class="quiz-section exam-pool">
        ${(exam.questionPool || []).map((q) => renderQuestion(q, "Pool Question")).join("")}
      </section>
    </article>
  </main>`;
  writeText(path.join(outDir, "courses", track.slug, "exam.html"), page({ title: `${track.label} Final Exam Preview`, body, depth: 2, pageClass: "course-page" }));
}

function buildTrackHome(track, config, modules) {
  return `<section class="track-card" id="${esc(track.slug)}">
    <div class="track-head">
      <span>${esc(track.label)} Track</span>
      <h3>${esc(config.course_title)}</h3>
      <p>${esc(track.audience)}</p>
    </div>
    <div class="track-stats">
      ${stat("Content time", `${config.total_est_minutes || track.minMinutes} min`)}
      ${stat("Minimum", `${track.minMinutes} min`)}
      ${stat("Practice preview", "Interim only")}
      ${stat("Modules", `${modules.length}`)}
    </div>
    <div class="track-actions">
      <a class="primary" href="${moduleHref(track.slug, modules[0].moduleId)}">Click Through Course</a>
      <a href="courses/${track.slug}/exam.html">Open Interim Exam Preview</a>
    </div>
    <div class="module-stack">
      ${modules.map((mod) => `<a href="${moduleHref(track.slug, mod.moduleId)}"><span>${esc(mod.moduleId)}</span><strong>${esc(value(mod.title))}</strong><small>${esc(mod.estimatedMinutes)} min · ${esc((mod.quiz?.questions || []).length)} quiz questions</small></a>`).join("")}
    </div>
  </section>`;
}

function buildIndex(trackData) {
  const body = `<main>
    <section class="review-hero">
      <div class="hero-copy">
        <span class="review-badge">Montana CARD Program Review</span>
        <h1>CertReady: Montana Responsible Alcohol Sales and Service</h1>
        <p>This alternate host mirrors the learner-style review pages because certready.org appears blocked on your machine. It is designed for clicking through the course, not just reading PDFs.</p>
        <div class="hero-actions">
          <a href="#review-course">Review the Course</a>
          <a href="#accounts">Login Options</a>
          <a href="#documents">PDF Documents</a>
        </div>
      </div>
      <div class="hero-panel">
        <strong>What this mirror includes</strong>
        <ul>
          <li>Branded CertReady-style reviewer home</li>
          <li>Clickable learner preview pages for all 14 modules</li>
          <li>Videos and podcasts disabled pending regeneration and QA</li>
          <li>Infographics, scenarios, quiz questions, and answer keys</li>
          <li>Interim exam previews, clearly marked pending the state exam</li>
          <li>Core PDFs regenerated from the corrected source</li>
        </ul>
      </div>
    </section>

    <section class="notice">
      <strong>Important:</strong> This Aestus-hosted page is an alternate static mirror for review access only. The live CertReady LMS remains the authoritative system for authentication, timers, progress gates, completion records, certificates, and reporting.
    </section>

    <section id="review-course" class="review-section">
      <div class="section-copy">
        <span>Course Preview</span>
        <h2>Click through like a learner</h2>
        <p>Open either track and move module to module with the same basic flow as the CertReady learner preview: course sidebar, lesson sections, embedded infographics, scenarios, quizzes, and interim exam preview.</p>
      </div>
      <div class="track-grid">${trackData.map(({ track, config, modules }) => buildTrackHome(track, config, modules)).join("")}</div>
    </section>

    <section id="accounts" class="review-section account-section">
      <div class="section-copy">
        <span>Live LMS Accounts</span>
        <h2>Optional CertReady login paths</h2>
        <p>If certready.org is whitelisted or opens from another machine, these accounts show the actual authenticated LMS. Reviewer accounts bypass the module time floor. Demo student accounts show the real timer/progress behavior.</p>
      </div>
      <div class="account-grid">
        ${tracks.map((track) => `<div class="account-card">
          <h3>${esc(track.label)} reviewer</h3>
          <p>Bypasses time gates for regulatory review.</p>
          <dl><dt>Email</dt><dd>${esc(track.reviewerEmail)}</dd><dt>Password</dt><dd>testing</dd></dl>
        </div>
        <div class="account-card timed">
          <h3>${esc(track.label)} timed demo</h3>
          <p>Shows normal learner gating and timer behavior.</p>
          <dl><dt>Email</dt><dd>${esc(track.demoEmail)}</dd><dt>Password</dt><dd>testing</dd></dl>
        </div>`).join("")}
      </div>
      <p class="fine">Login URL, if accessible from your network: https://www.certready.org/login</p>
    </section>

    <section id="documents" class="review-section">
      <div class="section-copy">
        <span>Core Documents</span>
        <h2>PDFs if you prefer a written packet</h2>
        <p>These are the core documents only. The course preview above is the better way to inspect the learner experience.</p>
      </div>
      <div class="doc-list">
        ${submissionDocs.map(([file, title, desc]) => `<a href="pdf/${esc(file)}"><strong>${esc(title)}</strong><span>${esc(desc)}</span></a>`).join("")}
      </div>
    </section>
  </main>`;
  writeText(path.join(outDir, "index.html"), page({ title: "CertReady Montana RASS Reviewer Mirror", body }));
}

function copyIfExists(source, dest) {
  if (!fs.existsSync(source)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(source, dest);
  return true;
}

function copyAssets() {
  ensureDir(path.join(outDir, "pdf"));
  for (const [file] of submissionDocs) {
    const copied = copyIfExists(path.join(packetDir, file), path.join(outDir, "pdf", file));
    if (!copied) console.warn(`Missing PDF: ${file}`);
  }

  ensureDir(path.join(outDir, "img"));
  const infographicDir = path.join(certreadyRoot, "app", "public", "infographics");
  for (const file of fs.readdirSync(infographicDir).filter((name) => /^MT-ALCOHOL.*\.png$/i.test(name))) {
    copyIfExists(path.join(infographicDir, file), path.join(outDir, "img", file));
  }

  for (const track of tracks) {
    const config = readJson(`courses/${track.slug}/course-config.json`);
    const enabledMedia = config.module_overviews || [];
    const sourceDir = path.join(certreadyRoot, "app", "public", "media", "overviews", track.slug);
    const destDir = path.join(outDir, "media", "overviews", track.slug);
    if (!fs.existsSync(sourceDir)) continue;
    for (const overview of enabledMedia) {
      const id = overview.moduleId;
      if (overview.hasVideo) {
        ensureDir(destDir);
        copyIfExists(path.join(sourceDir, `module-${id}-poster.jpg`), path.join(destDir, `module-${id}-poster.jpg`));
        copyIfExists(path.join(sourceDir, `module-${id}-video.mp4`), path.join(destDir, `module-${id}-video.mp4`));
      }
      if (overview.hasPodcast) {
        ensureDir(destDir);
        copyIfExists(path.join(sourceDir, `module-${id}-podcast.m4a`), path.join(destDir, `module-${id}-podcast.m4a`));
      }
    }
  }
}

function writeStyle() {
  writeText(path.join(outDir, "style.css"), `:root{--navy:#1e3a5f;--navy-dark:#10233f;--teal:#00b894;--slate:#64748b;--off:#f5f6fa;--line:#d9e2ec;--ink:#14233b;--green:#0f8a5f;--amber:#d97706}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:var(--ink);background:var(--off);line-height:1.55;overflow-x:hidden}a{color:#006fb8;text-decoration:none;font-weight:750;overflow-wrap:anywhere}a:hover{text-decoration:underline}.site-header{position:sticky;top:0;z-index:10;height:74px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 28px}.brand{display:flex;align-items:center;gap:12px;color:var(--navy);text-decoration:none}.brand-mark{width:40px;height:40px;border-radius:10px;background:var(--navy);color:#fff;display:grid;place-items:center;font-weight:900;flex:0 0 40px}.brand small{display:block;color:var(--slate);font-size:12px;font-weight:700}.site-header nav{display:flex;gap:18px;flex-wrap:wrap}.site-header nav a{font-size:14px;color:var(--navy)}main{max-width:1180px;margin:0 auto}.review-hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:36px;align-items:center;padding:54px 28px 36px;background:linear-gradient(135deg,var(--navy-dark),var(--navy));color:#fff;max-width:none}.hero-copy{max-width:820px;margin-left:auto}.review-badge,.section-copy span,.module-meta span,.card-kicker,.track-head span{display:inline-flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:.08em;font-size:12px;font-weight:900;color:#9ee8d7}.review-hero h1{font-size:46px;line-height:1.06;margin:16px 0 18px;letter-spacing:0}.review-hero p{font-size:18px;color:#dce8f2;max-width:780px}.hero-actions,.track-actions,.prev-next{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.hero-actions a,.track-actions a,.prev-next a{border:1px solid rgba(255,255,255,.35);padding:11px 14px;border-radius:8px;color:#fff;background:rgba(255,255,255,.08)}.hero-actions a:first-child,.track-actions .primary{background:var(--teal);border-color:var(--teal);color:#06291f}.hero-panel{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:24px;margin-right:auto}.hero-panel strong{font-size:18px}.hero-panel li{margin:9px 0;color:#e5edf5}.notice{margin:24px 28px;padding:18px 20px;background:#fff7ed;border:1px solid #fed7aa;border-left:5px solid var(--amber);border-radius:8px}.review-section{padding:36px 28px}.section-copy{max-width:820px;margin-bottom:22px}.section-copy span{color:var(--teal)}h2{color:var(--navy);font-size:30px;line-height:1.15;margin:6px 0 8px}h3{color:var(--navy);margin:0 0 8px}.section-copy p{color:var(--slate);margin:0}.track-grid{display:grid;grid-template-columns:1fr;gap:24px}.track-card{background:#fff;border:1px solid var(--line);border-radius:8px;padding:24px;box-shadow:0 1px 2px rgba(16,35,63,.06)}.track-head p{color:var(--slate);max-width:820px}.track-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}.stat{background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:13px}.stat span{display:block;color:var(--slate);font-size:12px;font-weight:800;text-transform:uppercase}.stat strong{display:block;color:var(--navy);font-size:20px}.module-stack{display:grid;gap:8px;margin-top:18px}.module-stack a{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:12px 14px;background:#fbfdff;color:var(--ink)}.module-stack a:hover{border-color:var(--teal);text-decoration:none}.module-stack span,.module-list span{width:34px;height:34px;border-radius:9px;background:var(--navy);color:#fff;display:grid;place-items:center;font-weight:900}.module-stack small{color:var(--slate);font-weight:700}.account-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.account-card{background:#fff;border:1px solid var(--line);border-left:5px solid var(--teal);border-radius:8px;padding:18px}.account-card.timed{border-left-color:var(--navy)}.account-card p{color:var(--slate);font-size:14px}.account-card dt{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--slate);font-weight:900}.account-card dd{margin:3px 0 11px;font-family:Consolas,Menlo,monospace;color:#007f6d;font-weight:900;overflow-wrap:anywhere}.doc-list{display:grid;gap:10px}.doc-list a{display:block;background:#fff;border:1px solid var(--line);border-radius:8px;padding:15px 18px}.doc-list strong{display:block;color:var(--navy)}.doc-list span{display:block;color:var(--slate);font-weight:500}.site-footer{padding:24px 28px;border-top:1px solid var(--line);color:var(--slate);background:#fff}.course-layout{max-width:1280px;display:flex;gap:28px;padding:28px}.course-sidebar{width:292px;flex:0 0 292px}.sidebar-title{background:var(--navy-dark);color:#fff;border-radius:12px 12px 0 0;padding:18px}.sidebar-title span{display:block;color:rgba(255,255,255,.55);font-size:12px}.module-list{background:var(--navy-dark);padding:8px 10px 14px;border-radius:0 0 12px 12px;display:grid;gap:4px;position:sticky;top:92px}.module-list a{display:grid;grid-template-columns:38px minmax(0,1fr);grid-template-rows:auto auto;gap:1px 10px;align-items:center;color:rgba(255,255,255,.65);padding:10px;border-radius:10px;text-decoration:none}.module-list a.active{background:rgba(0,184,148,.18);color:#fff}.module-list a:hover{background:rgba(255,255,255,.08);color:#fff}.module-list span{grid-row:1/3;background:rgba(255,255,255,.12);width:32px;height:32px}.module-list a.active span{background:var(--teal)}.module-list strong{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.module-list small{font-size:11px;color:rgba(255,255,255,.42)}.course-main{min-width:0;flex:1}.course-subnav{height:48px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.course-subnav span{color:var(--slate);font-size:13px;font-weight:800}.module-hero,.learn-card,.overview-panel,.quiz-section{background:#fff;border:1px solid var(--line);border-radius:10px;padding:24px;margin-bottom:18px;min-width:0;overflow-wrap:anywhere}.module-meta{display:flex;gap:8px;flex-wrap:wrap}.module-meta span{color:var(--navy);background:#e8f7f3;border:1px solid #b6efe0;border-radius:999px;padding:6px 9px;letter-spacing:.04em}.module-hero h1{font-size:38px;line-height:1.1;color:var(--navy);margin:14px 0 10px}.module-hero p{color:var(--slate);font-size:17px}.learn-card ul{padding-left:20px}.learn-card li{margin:8px 0}.overview-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}.media-icon{width:38px;height:38px;border-radius:10px;background:var(--teal);color:#06291f;display:grid;place-items:center;font-weight:900;flex:0 0 38px}.overview-head h3{margin:0}.overview-head p,.fine{margin:0;color:var(--slate);font-size:13px}.media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.media-card{border:1px solid var(--line);border-radius:8px;padding:14px;background:#f8fafc;min-width:0}.media-card h4{margin:0 0 4px;color:var(--navy)}.media-card p{margin:0 0 10px;color:var(--slate);font-size:13px}.media-card video{display:block;width:100%;aspect-ratio:16/9;background:#000;border-radius:7px}.media-card audio{width:100%}.lesson-section{margin-bottom:14px;min-width:0}.section-title{width:100%;border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:10px;padding:16px 18px;font-size:19px;font-weight:900;text-align:left;cursor:pointer;overflow-wrap:anywhere}.section-title span{display:block;color:var(--teal);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.section-body{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin-top:10px;min-width:0}.lesson-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:18px 20px;box-shadow:0 1px 2px rgba(16,35,63,.04);min-width:0;overflow-wrap:anywhere}.lesson-card.callout{border-left:5px solid var(--teal);background:#f8fffd}.lesson-card.callout.law{border-left-color:var(--navy);background:#f8fbff}.lesson-card.scenario{border-left:5px solid #8b5cf6;background:#fbf9ff}.card-kicker{color:var(--teal);margin-bottom:8px}.lesson-card p{margin:8px 0;max-width:100%}.lesson-card ul{padding-left:20px}.lesson-card li{margin:7px 0}.infographic{margin:16px 0 0;border:1px solid var(--line);border-radius:8px;background:#f8fafc;padding:12px;min-width:0}.infographic img{display:block;max-width:100%;height:auto;margin:0 auto;border-radius:6px}.infographic figcaption{margin-top:8px;color:var(--slate);font-size:12px;overflow-wrap:anywhere}.quiz-head span{color:var(--teal);text-transform:uppercase;font-size:12px;font-weight:900;letter-spacing:.08em}.quiz-head p{color:var(--slate)}.question-stem{font-size:16px;color:var(--navy);font-weight:750}.options{list-style:none;padding:0;margin:12px 0;display:grid;gap:7px}.options li{border:1px solid var(--line);border-radius:8px;background:#f8fafc;padding:9px 11px;overflow-wrap:anywhere}.options li span{font-weight:900;color:var(--navy);margin-right:6px}.options li.correct{background:#e8f7ef;border-color:#8dddbf;border-left:5px solid var(--green)}.options li.correct strong{color:var(--green);float:right}.answer-note{background:#f0f9f5;border-left:4px solid var(--green);padding:10px 12px;border-radius:6px;color:#0d6844}.prev-next{justify-content:space-between}.prev-next a{background:#fff;border-color:var(--line);color:var(--navy);min-width:min(300px,100%)}.prev-next span{display:block;color:var(--slate);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.prev-next strong{display:block}.collapsed+.section-body{display:none}@media(max-width:900px){.site-header{position:static;height:auto;align-items:flex-start;flex-direction:column;padding:16px 18px}.review-hero{grid-template-columns:1fr;padding:36px 20px}.review-hero h1{font-size:34px}.hero-copy{margin-left:0}.track-stats,.account-grid,.media-grid{grid-template-columns:1fr}.module-stack a{grid-template-columns:42px minmax(0,1fr)}.module-stack small{grid-column:2}.course-layout{display:block;padding:18px}.course-sidebar{width:auto;flex:none;margin-bottom:16px}.module-list{position:static}.course-subnav{height:auto;align-items:flex-start;flex-direction:column;padding:12px}.module-hero h1{font-size:30px}.site-header nav{gap:10px}.review-section{padding:28px 20px}}`);
}

function writeScript() {
  writeText(path.join(outDir, "site.js"), `document.querySelectorAll(".section-title").forEach((button)=>{button.addEventListener("click",()=>button.classList.toggle("collapsed"));});`);
}

function redirectPage(title, target, depth = 0) {
  const root = rootPrefix(depth);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=${esc(target)}">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="${root}style.css">
</head>
<body>
  <main class="review-section">
    <div class="notice"><strong>Updated reviewer mirror:</strong> <a href="${esc(target)}">Open the learner-style preview.</a></div>
  </main>
</body>
</html>`;
}

function writeCompatibilityRedirects(trackData) {
  writeText(path.join(outDir, "on-premises.html"), redirectPage("On-Premises Preview", "courses/mt-alcohol/01.html"));
  writeText(path.join(outDir, "off-premises.html"), redirectPage("Off-Premises Preview", "courses/mt-alcohol-offsale/01.html"));
  writeText(path.join(outDir, "exam-on-premises.html"), redirectPage("On-Premises Exam Preview", "courses/mt-alcohol/exam.html"));
  writeText(path.join(outDir, "exam-off-premises.html"), redirectPage("Off-Premises Exam Preview", "courses/mt-alcohol-offsale/exam.html"));
  ensureDir(path.join(outDir, "modules"));
  for (const { track, modules } of trackData) {
    for (const mod of modules) {
      writeText(
        path.join(outDir, "modules", `${track.slug}-${mod.moduleId}.html`),
        redirectPage(`${track.label} Module ${mod.moduleId}`, `../courses/${track.slug}/${mod.moduleId}.html`, 1)
      );
    }
  }
}

function main() {
  safeRmDir(outDir);
  ensureDir(path.join(outDir, "courses"));
  copyAssets();
  writeStyle();
  writeScript();

  const trackData = tracks.map((track) => {
    const config = readJson(`courses/${track.slug}/course-config.json`);
    const modules = getModules(track);
    ensureDir(path.join(outDir, "courses", track.slug));
    modules.forEach((mod, index) => buildModulePage(track, config, modules, mod, index));
    buildExamPage(track, modules);
    return { track, config, modules };
  });

  buildIndex(trackData);
  writeCompatibilityRedirects(trackData);
  console.log(`Generated Montana RASS reviewer mirror at ${outDir}`);
}

main();
