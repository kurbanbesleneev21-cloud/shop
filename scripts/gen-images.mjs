// Generates on-brand SVG product illustrations used by the demo seed.
import { writeFileSync, mkdirSync } from "fs";
const out = new URL("../public/products/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const bodies = {
  black: { body: "#111111", body2: "#2a2a2a", accent: "#2563EB", screen: "#0b1a3a", edge: "#3a3a3a" },
  white: { body: "#f4f6fb", body2: "#ffffff", accent: "#2563EB", screen: "#0b1a3a", edge: "#d9deea" },
  blue: { body: "#1d4ed8", body2: "#2563EB", accent: "#93b4f5", screen: "#0b1a3a", edge: "#1e40af" },
};

const wrap = (inner, angle) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f9fe"/><stop offset="1" stop-color="#e9effc"/></linearGradient>
<linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563EB"/><stop offset=".55" stop-color="#1e3a8a"/><stop offset="1" stop-color="#111111"/></linearGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#111111" stop-opacity=".18"/><stop offset="1" stop-color="#111111" stop-opacity="0"/></radialGradient>
</defs>
<rect width="800" height="800" fill="url(#bg)"/>
<ellipse cx="400" cy="${angle === "side" ? 700 : 712}" rx="260" ry="26" fill="url(#sh)"/>
${inner}
</svg>`;

const D = {
  phone: (c, a) => a === "front" ? `
<rect x="270" y="110" width="260" height="560" rx="44" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="284" y="124" width="232" height="532" rx="34" fill="url(#scr)"/>
<rect x="365" y="140" width="70" height="20" rx="10" fill="#111111"/>
<circle cx="400" cy="330" r="64" fill="none" stroke="#ffffff" stroke-opacity=".25" stroke-width="2"/>
<text x="400" y="300" font-family="Arial" font-size="44" font-weight="700" fill="#fff" text-anchor="middle">12:30</text>
<rect x="310" y="560" width="50" height="50" rx="14" fill="#fff" fill-opacity=".18"/><rect x="375" y="560" width="50" height="50" rx="14" fill="#fff" fill-opacity=".18"/><rect x="440" y="560" width="50" height="50" rx="14" fill="#fff" fill-opacity=".18"/>
<rect x="284" y="124" width="232" height="532" rx="34" fill="url(#gloss)"/>`
    : a === "back" ? `
<rect x="270" y="110" width="260" height="560" rx="44" fill="${c.body2}" stroke="${c.edge}" stroke-width="4"/>
<rect x="295" y="135" width="130" height="150" rx="34" fill="${c.body}" stroke="${c.edge}" stroke-width="3"/>
<circle cx="335" cy="180" r="26" fill="#111111" stroke="${c.edge}" stroke-width="5"/><circle cx="335" cy="180" r="10" fill="#2563EB"/>
<circle cx="385" cy="240" r="26" fill="#111111" stroke="${c.edge}" stroke-width="5"/><circle cx="385" cy="240" r="10" fill="#2563EB"/>
<circle cx="335" cy="250" r="12" fill="#ffffff" fill-opacity=".8"/>
<circle cx="400" cy="450" r="28" fill="none" stroke="${c.accent}" stroke-width="5" opacity=".6"/>
<rect x="270" y="110" width="260" height="560" rx="44" fill="url(#gloss)"/>`
    : `
<rect x="372" y="110" width="56" height="560" rx="24" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="426" y="230" width="8" height="70" rx="4" fill="${c.edge}"/><rect x="426" y="320" width="8" height="40" rx="4" fill="${c.edge}"/>
<rect x="366" y="260" width="8" height="90" rx="4" fill="${c.accent}"/>`,

  laptop: (c, a) => a === "back" ? `
<rect x="170" y="170" width="460" height="320" rx="20" fill="${c.body2}" stroke="${c.edge}" stroke-width="4"/>
<circle cx="400" cy="330" r="34" fill="none" stroke="${c.accent}" stroke-width="6"/>
<path d="M120 500 h560 l-30 40 h-500z" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>`
    : a === "side" ? `
<path d="M180 560 L620 560 L600 580 L200 580Z" fill="${c.body}" stroke="${c.edge}" stroke-width="3"/>
<path d="M200 556 L560 250 L572 262 L216 560Z" fill="${c.body2}" stroke="${c.edge}" stroke-width="3"/>
<rect x="250" y="562" width="30" height="8" rx="3" fill="${c.accent}"/>` : `
<rect x="170" y="150" width="460" height="330" rx="20" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="188" y="168" width="424" height="290" rx="8" fill="url(#scr)"/>
<rect x="210" y="200" width="160" height="16" rx="8" fill="#fff" fill-opacity=".5"/>
<rect x="210" y="230" width="240" height="10" rx="5" fill="#fff" fill-opacity=".25"/>
<rect x="210" y="300" width="120" height="120" rx="14" fill="#fff" fill-opacity=".14"/><rect x="345" y="300" width="120" height="120" rx="14" fill="#fff" fill-opacity=".14"/><rect x="480" y="300" width="110" height="120" rx="14" fill="#fff" fill-opacity=".14"/>
<path d="M110 490 h580 l-40 56 h-500z" fill="${c.body2}" stroke="${c.edge}" stroke-width="4"/>
<rect x="350" y="500" width="100" height="10" rx="5" fill="${c.edge}"/>
<rect x="188" y="168" width="424" height="290" rx="8" fill="url(#gloss)"/>`,

  monitor: (c, a) => a === "back" ? `
<rect x="140" y="140" width="520" height="330" rx="18" fill="${c.body2}" stroke="${c.edge}" stroke-width="4"/>
<rect x="340" y="250" width="120" height="120" rx="16" fill="${c.body}"/>
<rect x="380" y="470" width="40" height="150" fill="${c.body}"/><rect x="290" y="616" width="220" height="24" rx="12" fill="${c.body}"/>`
    : `
<rect x="130" y="130" width="540" height="350" rx="18" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="146" y="146" width="508" height="306" rx="6" fill="url(#scr)"/>
<path d="M146 400 Q300 300 420 360 T654 280 V452 H146Z" fill="#fff" fill-opacity=".08"/>
<rect x="380" y="480" width="40" height="140" fill="${c.body}"/><rect x="290" y="616" width="220" height="24" rx="12" fill="${c.body}"/>
<rect x="146" y="146" width="508" height="306" rx="6" fill="url(#gloss)"/>`,

  tv: (c, a) => a === "side" ? `
<rect x="388" y="150" width="24" height="420" rx="8" fill="${c.body}"/><path d="M330 640 L470 640 L420 570 L380 570Z" fill="${c.body}"/>` : `
<rect x="90" y="160" width="620" height="370" rx="10" fill="#111111" stroke="${c.edge}" stroke-width="4"/>
<rect x="102" y="172" width="596" height="346" rx="4" fill="url(#scr)"/>
<circle cx="560" cy="270" r="70" fill="#fff" fill-opacity=".1"/><circle cx="600" cy="300" r="40" fill="#fff" fill-opacity=".12"/>
<text x="140" y="470" font-family="Arial" font-weight="700" font-size="34" fill="#fff" fill-opacity=".9">4K HDR</text>
<path d="M300 640 L340 530 L360 530 L330 640Z M500 640 L460 530 L440 530 L470 640Z" fill="${c.body === "#f4f6fb" ? "#d9deea" : "#111111"}"/>
<rect x="102" y="172" width="596" height="346" rx="4" fill="url(#gloss)"/>`,

  tablet: (c, a) => a === "back" ? `
<rect x="210" y="120" width="380" height="540" rx="36" fill="${c.body2}" stroke="${c.edge}" stroke-width="4"/>
<rect x="240" y="150" width="70" height="70" rx="20" fill="${c.body}"/><circle cx="275" cy="185" r="18" fill="#111111"/><circle cx="275" cy="185" r="7" fill="#2563EB"/>` : `
<rect x="210" y="120" width="380" height="540" rx="36" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="228" y="138" width="344" height="504" rx="20" fill="url(#scr)"/>
<g fill="#fff" fill-opacity=".16">${[0,1,2,3].map(r=>[0,1,2].map(k=>`<rect x="${258+k*100}" y="${200+r*100}" width="70" height="70" rx="18"/>`).join("")).join("")}</g>
<rect x="228" y="138" width="344" height="504" rx="20" fill="url(#gloss)"/>`,

  headphones: (c, a) => a === "side" ? `
<circle cx="400" cy="420" r="170" fill="${c.body}" stroke="${c.edge}" stroke-width="5"/>
<circle cx="400" cy="420" r="120" fill="${c.body2}"/><circle cx="400" cy="420" r="40" fill="${c.accent}" opacity=".7"/>
<path d="M300 280 Q400 120 500 280" fill="none" stroke="${c.body}" stroke-width="28" stroke-linecap="round"/>` : `
<path d="M210 430 Q210 160 400 160 Q590 160 590 430" fill="none" stroke="${c.body}" stroke-width="34" stroke-linecap="round"/>
<path d="M210 430 Q210 160 400 160 Q590 160 590 430" fill="none" stroke="${c.edge}" stroke-width="6" stroke-linecap="round" opacity=".6"/>
<rect x="150" y="380" width="130" height="220" rx="60" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="520" y="380" width="130" height="220" rx="60" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="250" y="410" width="40" height="160" rx="20" fill="${c.body2}"/><rect x="510" y="410" width="40" height="160" rx="20" fill="${c.body2}"/>
<circle cx="215" cy="560" r="8" fill="${c.accent}"/>`,

  earbuds: (c, a) => `
<rect x="250" y="360" width="300" height="230" rx="110" fill="${c.body2}" stroke="${c.edge}" stroke-width="4"/>
<path d="M250 450 h300" stroke="${c.edge}" stroke-width="3"/>
<circle cx="400" cy="520" r="8" fill="${c.accent}"/>
<g transform="translate(300 210) rotate(-15)"><ellipse cx="0" cy="0" rx="46" ry="54" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/><rect x="-14" y="30" width="28" height="110" rx="14" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/></g>
<g transform="translate(500 210) rotate(15)"><ellipse cx="0" cy="0" rx="46" ry="54" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/><rect x="-14" y="30" width="28" height="110" rx="14" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/></g>`,

  watch: (c, a) => `
<rect x="330" y="110" width="140" height="170" rx="40" fill="${c.body}"/><rect x="330" y="520" width="140" height="170" rx="40" fill="${c.body}"/>
<rect x="270" y="240" width="260" height="310" rx="70" fill="#111111" stroke="${c.edge}" stroke-width="8"/>
<rect x="292" y="262" width="216" height="266" rx="54" fill="url(#scr)"/>
${a === "front" ? `<text x="400" y="390" font-family="Arial" font-size="58" font-weight="700" fill="#fff" text-anchor="middle">10:09</text><path d="M330 450 a70 70 0 0 1 140 0" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".5"/>` : `<circle cx="400" cy="395" r="60" fill="none" stroke="#fff" stroke-width="12" stroke-dasharray="250 400" stroke-linecap="round"/>`}
<rect x="528" y="330" width="18" height="60" rx="8" fill="${c.edge}"/>`,

  console: (c, a) => a === "side" ? `
<rect x="250" y="250" width="300" height="300" rx="60" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<circle cx="330" cy="370" r="34" fill="${c.body2}"/><g fill="${c.accent}"><circle cx="470" cy="340" r="14"/><circle cx="500" cy="370" r="14"/><circle cx="470" cy="400" r="14"/><circle cx="440" cy="370" r="14"/></g>
<rect x="315" y="355" width="30" height="30" rx="4" fill="${c.edge}"/>` : `
<rect x="190" y="200" width="420" height="300" rx="24" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="190" y="200" width="60" height="300" rx="24" fill="${c.body2}"/><rect x="550" y="200" width="60" height="300" rx="24" fill="${c.body2}"/>
<rect x="270" y="260" width="260" height="10" rx="5" fill="${c.accent}"/>
<circle cx="560" cy="460" r="10" fill="${c.accent}"/>
<g transform="translate(260 560)"><rect x="0" y="0" width="280" height="120" rx="60" fill="${c.body2}" stroke="${c.edge}" stroke-width="4"/><circle cx="70" cy="60" r="22" fill="${c.edge}"/><g fill="${c.accent}"><circle cx="210" cy="40" r="10"/><circle cx="230" cy="60" r="10"/><circle cx="210" cy="80" r="10"/><circle cx="190" cy="60" r="10"/></g></g>`,

  gpu: (c, a) => `
<rect x="110" y="270" width="580" height="250" rx="22" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
${a === "back" ? `<rect x="130" y="290" width="540" height="210" rx="12" fill="${c.body2}"/><path d="M150 330 h480 M150 380 h480 M150 430 h480" stroke="${c.edge}" stroke-width="6"/>` :
[260, 540].map(x => `<circle cx="${x}" cy="395" r="98" fill="#111111" stroke="${c.edge}" stroke-width="5"/><g fill="${c.body2}">${[0,60,120,180,240,300].map(r=>`<path transform="rotate(${r} ${x} 395)" d="M${x} 395 q30 -60 0 -88 q-12 40 0 88z"/>`).join("")}</g><circle cx="${x}" cy="395" r="24" fill="${c.accent}"/>`).join("")}
<rect x="150" y="520" width="300" height="26" fill="#c9a227" opacity="0"/><rect x="160" y="520" width="320" height="22" rx="3" fill="${c.edge}"/>
<rect x="110" y="300" width="20" height="190" fill="${c.accent}" opacity=".8"/>`,

  cpu: (c, a) => `
<rect x="220" y="220" width="360" height="360" rx="20" fill="#1e3a8a"/>
<g fill="#c7d2fe">${Array.from({length: 14}, (_, i) => `<rect x="${236 + i * 24}" y="200" width="10" height="24"/><rect x="${236 + i * 24}" y="576" width="10" height="24"/><rect x="200" y="${236 + i * 24}" width="24" height="10"/><rect x="576" y="${236 + i * 24}" width="24" height="10"/>`).join("")}</g>
<rect x="270" y="270" width="260" height="260" rx="14" fill="${c.body === "#111111" ? "#e5e7eb" : "#f4f6fb"}" stroke="#94a3b8" stroke-width="3"/>
<text x="400" y="395" font-family="Arial" font-weight="800" font-size="38" fill="#111111" text-anchor="middle">CPU</text>
<text x="400" y="440" font-family="Arial" font-size="20" fill="#2563EB" text-anchor="middle">${a === "front" ? "8 CORES" : "16 THREADS"}</text>`,

  ram: (c) => `
<rect x="120" y="300" width="560" height="170" rx="12" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<g fill="#111111">${Array.from({length: 8}, (_, i) => `<rect x="${150 + i * 64}" y="340" width="46" height="70" rx="4"/>`).join("")}</g>
<rect x="120" y="300" width="560" height="26" rx="10" fill="${c.accent}" opacity=".8"/>
<g fill="#c7a442">${Array.from({length: 40}, (_, i) => `<rect x="${134 + i * 13.5}" y="470" width="8" height="26" opacity=".85"/>`).join("")}</g>`,

  ssd: (c) => `
<rect x="140" y="320" width="520" height="140" rx="10" fill="#111111" stroke="${c.edge}" stroke-width="4"/>
<rect x="190" y="345" width="300" height="90" rx="6" fill="${c.body2}"/>
<text x="340" y="400" font-family="Arial" font-weight="800" font-size="34" fill="#2563EB" text-anchor="middle">NVMe</text>
<rect x="520" y="355" width="90" height="70" rx="6" fill="#2a2a2a"/>
<circle cx="170" cy="390" r="12" fill="none" stroke="#999" stroke-width="4"/>`,

  camera: (c, a) => `
<rect x="140" y="250" width="520" height="340" rx="44" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="190" y="200" width="160" height="70" rx="18" fill="${c.body}"/>
<circle cx="420" cy="420" r="130" fill="#111111" stroke="${c.edge}" stroke-width="10"/>
<circle cx="420" cy="420" r="90" fill="url(#scr)"/><circle cx="390" cy="390" r="22" fill="#fff" fill-opacity=".35"/>
<circle cx="600" cy="300" r="16" fill="${c.accent}"/>
${a === "back" ? `<rect x="180" y="300" width="300" height="220" rx="14" fill="url(#scr)"/>` : ""}`,

  desktop: (c, a) => `
<rect x="270" y="130" width="260" height="540" rx="22" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="290" y="160" width="220" height="380" rx="12" fill="#111111" opacity=".55"/>
${[0,1,2].map(i => `<circle cx="400" cy="${230 + i * 120}" r="48" fill="none" stroke="${c.accent}" stroke-width="8"/>`).join("")}
<rect x="300" y="580" width="80" height="12" rx="6" fill="${c.edge}"/><circle cx="480" cy="586" r="10" fill="${c.accent}"/>`,

  keyboard: (c) => `
<rect x="100" y="320" width="600" height="220" rx="24" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<g fill="${c.body2}">${Array.from({length: 4}, (_, r) => Array.from({length: 12}, (_, k) => `<rect x="${125 + k * 46}" y="${345 + r * 46}" width="38" height="38" rx="8"/>`).join("")).join("")}</g>
<rect x="240" y="500" width="320" height="24" rx="8" fill="${c.accent}" opacity=".7"/>`,

  mouse: (c) => `
<path d="M400 190 C510 190 540 300 540 420 C540 560 480 630 400 630 C320 630 260 560 260 420 C260 300 290 190 400 190Z" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<path d="M400 190 V360" stroke="${c.edge}" stroke-width="4"/><rect x="388" y="250" width="24" height="60" rx="12" fill="${c.accent}"/>`,

  charger: (c) => `
<rect x="300" y="220" width="200" height="240" rx="40" fill="${c.body2}" stroke="${c.edge}" stroke-width="4"/>
<rect x="350" y="170" width="20" height="60" rx="6" fill="#999"/><rect x="430" y="170" width="20" height="60" rx="6" fill="#999"/>
<rect x="370" y="430" width="60" height="16" rx="8" fill="${c.accent}"/>
<path d="M400 460 C400 560 300 560 300 640" fill="none" stroke="${c.body}" stroke-width="16" stroke-linecap="round"/>
<text x="400" y="350" font-family="Arial" font-weight="800" font-size="40" fill="${c.accent}" text-anchor="middle">65W</text>`,

  vacuum: (c, a) => `
<circle cx="400" cy="420" r="230" fill="${c.body}" stroke="${c.edge}" stroke-width="6"/>
<circle cx="400" cy="420" r="170" fill="${c.body2}"/>
<circle cx="400" cy="300" r="40" fill="#111111"/><circle cx="400" cy="300" r="14" fill="${c.accent}"/>
<rect x="330" y="470" width="140" height="16" rx="8" fill="${c.accent}" opacity=".7"/>`,

  coffee: (c) => `
<rect x="240" y="150" width="320" height="480" rx="30" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<rect x="280" y="190" width="240" height="90" rx="16" fill="url(#scr)"/>
<rect x="300" y="330" width="200" height="40" rx="10" fill="${c.body2}"/>
<path d="M340 430 h120 v120 a20 20 0 0 1 -20 20 h-80 a20 20 0 0 1 -20 -20z" fill="#ffffff" stroke="${c.edge}" stroke-width="4"/>
<rect x="260" y="590" width="280" height="20" rx="8" fill="${c.edge}"/>`,

  speaker: (c) => `
<rect x="290" y="150" width="220" height="500" rx="100" fill="${c.body}" stroke="${c.edge}" stroke-width="4"/>
<circle cx="400" cy="300" r="60" fill="${c.body2}"/><circle cx="400" cy="480" r="80" fill="${c.body2}"/><circle cx="400" cy="480" r="30" fill="${c.accent}" opacity=".7"/>`,
};

const angles = ["front", "back", "side"];
let n = 0;
for (const [kind, fn] of Object.entries(D)) {
  for (const [cname, c] of Object.entries(bodies)) {
    for (const a of angles) {
      writeFileSync(`${out}${kind}-${cname}-${a}.svg`, wrap(fn(c, a), a));
      n++;
    }
  }
}
// category tiles & banners
const banner = (title, sub, kind, color = "black") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 700"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563EB"/><stop offset="1" stop-color="#111111"/></linearGradient></defs><rect width="1600" height="700" fill="url(#b)"/><circle cx="1250" cy="350" r="300" fill="#ffffff" fill-opacity=".06"/><circle cx="1350" cy="200" r="160" fill="#ffffff" fill-opacity=".05"/></svg>`;
writeFileSync(`${out}hero-bg.svg`, banner());
console.log("generated", n);
