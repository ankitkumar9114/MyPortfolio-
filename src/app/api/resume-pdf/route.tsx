import fs from "node:fs";
import path from "node:path";
import { Document, Font, Image, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { boldRuns, parseResume, type ResumeItem } from "@/data/resume";
import { getResumeDoc } from "@/lib/cmsServer";
import { fillYears } from "@/lib/experience";

// The resume as a downloadable PDF (the "Download PDF" button on /resume),
// from the same CMS content as the page (settings/resume). Real text in the
// site's fonts (embedded, only the characters used) plus one border image,
// so the file stays small (well under 2MB). A4, the hero border on every
// page, the two columns of the web design at A4 scale.

export const runtime = "nodejs";

const ASSETS = path.join(process.cwd(), "src/assets");
const font = (f: string) => path.join(ASSETS, "resume-fonts", f);
let registered = false;
function registerFonts() {
  if (registered) return;
  Font.register({ family: "Arvo", src: font("arvo-700.woff"), fontWeight: 700 });
  Font.register({ family: "Merriweather", src: font("merriweather-700.woff"), fontWeight: 700 });
  Font.register({
    family: "Manrope",
    fonts: [
      { src: font("manrope-400.woff"), fontWeight: 400 },
      { src: font("manrope-500.woff"), fontWeight: 500 },
      { src: font("manrope-700.woff"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]); // never hyphenate
  registered = true;
}

// web design px -> A4 pt (900px sheet -> 595pt page)
const k = 595 / 900;
const px = (v: number) => v * k;
const RED = "#960D1A", INK = "#2B1B1B", BODY = "#4A3A3A", MUTED = "#7A6464", GOLD = "#E2A913", CREAM = "#FFF8EE", DOT = "#C12A39";

const st = StyleSheet.create({
  page: { backgroundColor: CREAM, paddingTop: px(66), paddingBottom: px(76), paddingHorizontal: px(68), fontFamily: "Manrope", color: BODY },
  border: { position: "absolute", top: 0, left: 0, width: 595, height: 842 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: px(24), borderBottomWidth: px(2), borderBottomColor: "rgba(226,169,19,0.5)", marginBottom: px(32) },
  name: { fontFamily: "Arvo", fontWeight: 700, fontSize: px(34), color: INK },
  roleRow: { flexDirection: "row", alignItems: "center", marginTop: px(4) },
  role: { fontFamily: "Merriweather", fontWeight: 700, fontSize: px(18), color: RED },
  divider: { width: px(2), height: px(18), backgroundColor: GOLD, marginHorizontal: px(12), borderRadius: 1 },
  contact: { alignItems: "flex-end", paddingTop: px(8), fontSize: px(14), color: MUTED },
  body: { flexDirection: "row" },
  main: { flex: 1, marginRight: px(52) },
  side: { width: px(240) },
  section: { marginBottom: px(32) },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: px(10) },
  diamond: { width: px(7), height: px(7), backgroundColor: GOLD, transform: "rotate(45deg)", marginRight: px(11), marginLeft: px(1.5) },
  title: { fontFamily: "Arvo", fontWeight: 700, fontSize: px(20), color: RED },
  about: { fontSize: px(14), lineHeight: 1.6 },
  job: { marginBottom: px(24) },
  company: { fontFamily: "Merriweather", fontWeight: 700, fontSize: px(16), color: INK },
  meta: { fontWeight: 500, fontSize: px(13), color: MUTED, marginTop: px(2), marginBottom: px(8) },
  bullet: { flexDirection: "row", marginBottom: px(4) },
  dot: { width: px(5), height: px(5), borderRadius: px(2.5), backgroundColor: DOT, marginTop: px(8), marginRight: px(10) },
  bulletText: { flex: 1, fontSize: px(13.5), lineHeight: 1.55 },
  itemTitle: { fontFamily: "Merriweather", fontWeight: 700, fontSize: px(14), color: INK },
  itemText: { fontSize: px(13), lineHeight: 1.5 },
  link: { fontSize: px(13), lineHeight: 1.5, color: BODY, textDecoration: "underline" },
});

function Title({ children }: { children: string }) {
  return (
    <View style={st.titleRow} wrap={false}>
      <View style={st.diamond} />
      <Text style={st.title}>{children}</Text>
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={st.bullet} wrap={false}>
          <View style={st.dot} />
          <Text style={st.bulletText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function Item({ item, gap = 2, muted = false }: { item: ResumeItem; gap?: number; muted?: boolean }) {
  return (
    <View wrap={false}>
      <Text style={st.itemTitle}>{item.title}</Text>
      {item.text.trim() ? <Text style={[st.itemText, { color: muted ? MUTED : BODY, marginTop: px(gap) }]}>{item.text}</Text> : null}
      {item.link ? (
        <Link src={item.link.href} style={[st.link, { marginTop: px(gap) }]}>
          {item.link.text}
        </Link>
      ) : null}
    </View>
  );
}

function List({ items, gap, render }: { items: ResumeItem[]; gap: number; render: (it: ResumeItem) => React.ReactNode }) {
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={{ marginBottom: i === items.length - 1 ? 0 : px(gap) }}>
          {render(it)}
        </View>
      ))}
    </View>
  );
}

export async function GET() {
  registerFonts();
  const saved = parseResume(await getResumeDoc());
  const r = { ...saved, experience: fillYears(saved.experience), about: fillYears(saved.about) };
  const border = fs.readFileSync(path.join(ASSETS, "resume-pdf", "border-a4.png"));

  const doc = (
    <Document title={`${r.name} — Resume`} author={r.name} subject={r.role} creator="ankitux.co.in">
      <Page size="A4" style={st.page}>
        {/* the hero border, on every page */}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML <img>: no alt */}
        <Image fixed style={st.border} src={{ data: border, format: "png" }} />

        <View style={st.header}>
          <View>
            <Text style={st.name}>{r.name}</Text>
            <View style={st.roleRow}>
              <Text style={st.role}>{r.role}</Text>
              {r.experience.trim() ? (
                <>
                  <View style={st.divider} />
                  <Text style={st.role}>{r.experience}</Text>
                </>
              ) : null}
            </View>
          </View>
          <View style={st.contact}>
            <Text>
              Email:{" "}
              <Link src={`mailto:${r.email}`} style={{ color: MUTED, textDecoration: "underline" }}>
                {r.email}
              </Link>
            </Text>
            <Text style={{ marginTop: px(6) }}>
              Contact:{" "}
              <Link src={`tel:${r.phone.replace(/\s/g, "")}`} style={{ color: MUTED, textDecoration: "none" }}>
                {r.phone}
              </Link>
            </Text>
          </View>
        </View>

        <View style={st.body}>
          <View style={st.main}>
            {r.about.trim() ? (
              <View style={st.section}>
                <Title>About Me</Title>
                <Text style={st.about}>
                  {boldRuns(r.about).map(([t, b], i) => (
                    <Text key={i} style={b ? { fontWeight: 700 } : undefined}>
                      {t}
                    </Text>
                  ))}
                </Text>
              </View>
            ) : null}
            {r.jobs.length ? (
              <View>
                <Title>Work Experience</Title>
                <View style={{ marginTop: px(6) }}>
                  {r.jobs.map((j, i) => (
                    <View key={i} style={st.job}>
                      <View wrap={false}>
                        <Text style={st.company}>{j.company}</Text>
                        <Text style={st.meta}>{j.meta}</Text>
                      </View>
                      <Bullets items={j.points} />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          <View style={st.side}>
            {r.links.length ? (
              <View style={st.section}>
                <Title>Links</Title>
                <List items={r.links} gap={12} render={(it) => <Item item={it} />} />
              </View>
            ) : null}
            {r.education.length ? (
              <View style={st.section}>
                <Title>Education</Title>
                <List items={r.education} gap={12} render={(it) => <Item item={it} />} />
              </View>
            ) : null}
            {r.certificates.length ? (
              <View style={st.section}>
                <Title>Certificates</Title>
                <Bullets items={r.certificates} />
              </View>
            ) : null}
            {r.achievements.length ? (
              <View style={st.section}>
                <Title>Achievements</Title>
                <List items={r.achievements} gap={16} render={(it) => <Item item={it} gap={4} muted />} />
              </View>
            ) : null}
            {r.skills.length ? (
              <View style={st.section}>
                <Title>Skills</Title>
                <List items={r.skills} gap={16} render={(it) => <Item item={it} gap={4} />} />
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );

  const pdf = await renderToBuffer(doc);
  const file = `${r.name.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}-Resume.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file}"`,
      // like the page: refreshed from the CMS at most once a minute
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
    },
  });
}
