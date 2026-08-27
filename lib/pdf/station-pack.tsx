/* eslint-disable jsx-a11y/alt-text -- `Image` here is @react-pdf's PDF
   primitive, not an HTML <img>; it has no `alt` prop to give. Alternative text
   in a PDF comes from the document's tag tree, which this renderer does not
   emit. */
import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Font,
  StyleSheet,
} from "@react-pdf/renderer";
import type { PrintPack, PrintPage } from "@/lib/print-pack";
import type { StepType, ClaimMode } from "@/lib/hunts";

/**
 * The station pack as a real PDF.
 *
 * This is the deliverable; the HTML route is a preview of it. Printing the
 * browser page works, but what comes out depends on the operator's margin
 * boxes, scale setting and "background graphics" checkbox — three ways for a
 * sheet to arrive at a print shop wrong. A generated PDF fixes the page box at
 * A4, embeds the faces, and prints the same everywhere.
 *
 * Laid out in millimetres via `mm()` rather than points, so the numbers match
 * the physical measurements the design was reasoned about in — an 85mm code,
 * a 14mm gutter — and match the HTML preview line for line.
 */

const MM = 2.834645669; // 1mm in PostScript points
const mm = (n: number) => n * MM;

// ---------------------------------------------------------------------------
// Faces.
//
// Registered from the repo rather than fetched: a document that reaches for
// Google Fonts at render time fails closed on a cold lambda with no egress,
// and silently substitutes Helvetica when it half-fails, which is worse.
// `outputFileTracingIncludes` in next.config keeps these in the bundle.
// ---------------------------------------------------------------------------
const FONT_DIR = path.join(process.cwd(), "lib", "pdf", "fonts");

let registered = false;
function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Display",
    fonts: [
      { src: path.join(FONT_DIR, "AlegreyaSansSC-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "AlegreyaSansSC-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Body",
    fonts: [
      { src: path.join(FONT_DIR, "Inter-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "Inter-SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  // Off by default this renderer hyphenates far more eagerly than a browser,
  // and a riddle broken across "ulti-mate" reads as a printing fault.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

// ---------------------------------------------------------------------------
// Ink. The same reasoning as the HTML sheet: cream paper, navy ink, navy spent
// only on the header band, and a deeper bronze wherever gold has to be read as
// text (#E18D01 on cream measures 2.23:1).
// ---------------------------------------------------------------------------
const PAPER = "#f4ecdc";
const INK = "#10182c";
const INK_DIM = "#5c6480";
const RULE = "#cbbfa6";
const GOLD = "#e18d01";
const GOLD_TEXT = "#8a5406";
const BAND = "#0b0f1c";
const BAND_INK = "#f1e7d3";

const TYPE_NOTE: Record<StepType, string> = {
  qr_scan: "Adventurers scan the code above to check in here.",
  riddle: "Adventurers solve this in the app — nothing to do at the stand.",
  cipher: "Adventurers solve this in the app — nothing to do at the stand.",
  crossword: "Adventurers solve this in the app — nothing to do at the stand.",
  trivia_gate: "Adventurers answer this in the app.",
  photo_proof: "Adventurers upload a photo in the app.",
  geo_checkpoint: "Checks in automatically once an adventurer is close enough.",
  unlock_code: "Adventurers type a code into the app.",
};

const CLAIM_NOTE: Record<ClaimMode, string> = {
  live_code:
    "Staffed stand. Keep the station screen open — adventurers read the rolling four-digit code from it, or show a pass for you to scan.",
  sealed_tag: "Tap the NFC tag. Each tap signs itself, so nothing to staff.",
  open_tag:
    "Open tag. Anyone can scan it, so the check-in is confirmed by location instead.",
};

const s = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    color: INK,
    fontFamily: "Body",
    flexDirection: "column",
  },
  band: {
    height: mm(30),
    backgroundColor: BAND,
    color: BAND_INK,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: mm(14),
  },
  goldRule: { height: mm(1.4), backgroundColor: GOLD },
  body: {
    flexGrow: 1,
    paddingHorizontal: mm(14),
    paddingTop: mm(12),
    paddingBottom: mm(8),
    flexDirection: "column",
  },
  plate: { backgroundColor: "#ffffff", padding: mm(1.2) },
  foot: {
    borderTopWidth: mm(1.4),
    borderTopColor: GOLD,
    borderTopStyle: "solid",
    paddingHorizontal: mm(14),
    paddingTop: mm(7),
    paddingBottom: mm(9),
  },
  eyebrow: {
    fontFamily: "Display",
    fontSize: mm(3),
    letterSpacing: mm(0.35),
    color: GOLD_TEXT,
  },
});

function Header({ pack }: { pack: PrintPack }) {
  const host = pack.origin.replace(/^https?:\/\//, "");
  return (
    <>
      <View style={s.band} fixed>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {pack.logo && (
            <Image src={pack.logo} style={{ height: mm(13), width: mm(13) }} />
          )}
          <View style={{ marginLeft: mm(3.5) }}>
            <Text
              style={{
                fontFamily: "Display",
                fontSize: mm(5),
                letterSpacing: mm(0.55),
              }}
            >
              MYTHICAL MECCA
            </Text>
            <Text style={{ fontSize: mm(2.7), opacity: 0.7 }}>{host}</Text>
          </View>
        </View>

        <View style={{ flexGrow: 1, paddingHorizontal: mm(6) }}>
          <Text
            style={{
              fontFamily: "Display",
              fontSize: mm(4),
              color: GOLD,
              textAlign: "right",
            }}
          >
            {pack.title}
          </Text>
          <Text
            style={{ fontSize: mm(2.9), opacity: 0.7, textAlign: "right" }}
          >
            {pack.eventTitle}
          </Text>
        </View>

        {/* The way back in, at the top where someone who has lost their place
            looks first. White plate so the quiet zone survives the navy. */}
        <View style={{ alignItems: "center" }}>
          <View style={s.plate}>
            <Image
              src={pack.questQr}
              style={{ height: mm(18), width: mm(18) }}
            />
          </View>
          <Text style={{ fontSize: mm(2.5), opacity: 0.8, marginTop: mm(1) }}>
            Open the quest
          </Text>
        </View>
      </View>
      <View style={s.goldRule} fixed />
    </>
  );
}

function Heading({ page }: { page: PrintPage }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <View
        style={{
          height: mm(16),
          width: mm(16),
          borderRadius: mm(8),
          backgroundColor: GOLD,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{ fontFamily: "Display", fontSize: mm(8), color: "#10182c" }}
        >
          {page.index}
        </Text>
      </View>

      <View style={{ flexGrow: 1, paddingHorizontal: mm(5) }}>
        <Text style={{ fontFamily: "Display", fontSize: mm(9) }}>
          {page.title}
        </Text>
        {page.locationHint && (
          <Text
            style={{ fontSize: mm(3.8), color: INK_DIM, marginTop: mm(1) }}
          >
            {page.locationHint}
          </Text>
        )}
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{ fontFamily: "Display", fontSize: mm(6), color: GOLD_TEXT }}
        >
          +{page.points}
        </Text>
        <Text
          style={{ fontSize: mm(2.6), color: INK_DIM, letterSpacing: mm(0.3) }}
        >
          POINTS
        </Text>
      </View>
    </View>
  );
}

/** The one thing that stops a queue forming at the wrong stand. */
function Prerequisite({ title }: { title: string }) {
  return (
    <View
      style={{
        marginTop: mm(7),
        borderWidth: mm(0.4),
        borderColor: GOLD,
        borderStyle: "dashed",
        borderRadius: mm(2.5),
        paddingVertical: mm(4),
        paddingHorizontal: mm(5),
      }}
    >
      <Text style={{ fontSize: mm(3.8) }}>
        <Text style={{ fontFamily: "Body", fontWeight: 600 }}>
          Have you done “{title}” yet?
        </Text>{" "}
        This one only opens once that is cleared.
      </Text>
    </View>
  );
}

function HeroCode({ page }: { page: PrintPage }) {
  return (
    <View
      style={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 85mm answers the 10:1 scan-distance rule across a counter (~850mm). */}
      <View style={{ backgroundColor: "#ffffff", padding: mm(4) }}>
        <Image src={page.tagQr!} style={{ height: mm(85), width: mm(85) }} />
      </View>
      <Text
        style={{
          fontFamily: "Display",
          fontSize: mm(6),
          color: GOLD_TEXT,
          letterSpacing: mm(0.7),
          marginTop: mm(6),
        }}
      >
        SCAN TO CHECK IN
      </Text>
      <Text
        style={{
          fontSize: mm(3),
          color: INK_DIM,
          textAlign: "center",
          marginTop: mm(2),
        }}
      >
        {CLAIM_NOTE[page.claimMode]}
      </Text>
    </View>
  );
}

function Notes({ page }: { page: PrintPage }) {
  // The page box is fixed, so a long briefing steps down a size rather than
  // running past the foot of the sheet.
  const size =
    page.prompt.length > 600 ? 3.6 : page.prompt.length > 320 ? 4.4 : 5.4;
  return (
    <View style={{ flexGrow: 1, justifyContent: "center" }}>
      <View
        style={{
          borderWidth: mm(0.4),
          borderColor: RULE,
          borderStyle: "solid",
          borderRadius: mm(3),
          padding: mm(10),
        }}
      >
        <Text style={s.eyebrow}>THE OBJECTIVE</Text>
        {page.prompt ? (
          <Text
            style={{ fontSize: mm(size), marginTop: mm(5), lineHeight: 1.5 }}
          >
            {page.prompt}
          </Text>
        ) : (
          <Text
            style={{ fontSize: mm(4.4), color: INK_DIM, marginTop: mm(5) }}
          >
            No briefing text set for this objective.
          </Text>
        )}
      </View>
      <Text
        style={{
          fontSize: mm(3.2),
          color: INK_DIM,
          textAlign: "center",
          marginTop: mm(6),
        }}
      >
        {TYPE_NOTE[page.type]}
      </Text>
    </View>
  );
}

function Vendor({ partner }: { partner: NonNullable<PrintPage["partner"]> }) {
  return (
    <View style={s.foot}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {partner.logoSrc && (
          <View
            style={{
              height: mm(24),
              width: mm(24),
              backgroundColor: "#ffffff",
              borderRadius: mm(2),
              padding: mm(1),
            }}
          >
            <Image
              src={partner.logoSrc}
              style={{ height: "100%", width: "100%", objectFit: "contain" }}
            />
          </View>
        )}

        <View style={{ flexGrow: 1, paddingHorizontal: mm(6) }}>
          <Text style={s.eyebrow}>YOU ARE AT</Text>
          <Text style={{ fontFamily: "Display", fontSize: mm(6.5) }}>
            {partner.name}
          </Text>
          {partner.tagline && (
            <Text style={{ fontSize: mm(3.4), color: INK_DIM }}>
              {partner.tagline}
            </Text>
          )}
          {partner.socials.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginTop: mm(3),
              }}
            >
              {/* Platform names rather than icons: the renderer has no icon
                  font, and "Instagram @thing" is unambiguous on paper anyway. */}
              {partner.socials.map((soc) => (
                <Text
                  key={soc.label + soc.handle}
                  style={{
                    fontSize: mm(3.2),
                    marginRight: mm(5),
                    marginBottom: mm(1.5),
                  }}
                >
                  <Text style={{ color: GOLD_TEXT }}>{soc.label}</Text>{" "}
                  {soc.handle}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={{ alignItems: "center" }}>
          <View style={{ backgroundColor: "#ffffff", padding: mm(1.5) }}>
            <Image
              src={partner.pageQr}
              style={{ height: mm(24), width: mm(24) }}
            />
          </View>
          <Text
            style={{ fontSize: mm(2.6), color: INK_DIM, marginTop: mm(1.5) }}
          >
            Their stall page
          </Text>
        </View>
      </View>
    </View>
  );
}

function House({ description }: { description: string }) {
  return (
    <View style={s.foot}>
      <Text style={s.eyebrow}>A MYTHICAL MECCA TRAIL</Text>
      <Text style={{ fontSize: mm(3.6), marginTop: mm(1.5) }}>
        {description ||
          "Collect every stand on the trail, climb the standings, and claim the hoard."}
      </Text>
    </View>
  );
}

export function StationPackDocument({
  pack,
  pages,
}: {
  pack: PrintPack;
  pages: PrintPage[];
}) {
  registerFonts();
  return (
    <Document
      title={`${pack.title} — station pack`}
      author="Mythical Mecca"
      subject={pack.eventTitle}
    >
      {pages.map((page) => (
        <Page key={page.id} size="A4" style={s.page}>
          <Header pack={pack} />
          <View style={s.body}>
            <Heading page={page} />
            {page.prerequisiteTitle && (
              <Prerequisite title={page.prerequisiteTitle} />
            )}
            {page.tagQr ? <HeroCode page={page} /> : <Notes page={page} />}
          </View>
          {page.partner ? (
            <Vendor partner={page.partner} />
          ) : (
            <House description={pack.description} />
          )}
        </Page>
      ))}
    </Document>
  );
}
