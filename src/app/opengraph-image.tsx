import { ImageResponse } from "next/og";

export const alt = "Oops, I Traveled Again! — a travel atlas and photo journal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social-share card, drawn from the brand palette (no external assets or fonts). */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 90px",
        background: "#f8f4eb",
        color: "#202c37",
        fontFamily: "Georgia, serif",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 22, display: "flex" }}>
        {["#fa6b4a", "#fffdf8", "#164f68", "#fffdf8"].map((color, index) => (
          <div key={index} style={{ flex: 1, background: color }} />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          letterSpacing: 8,
          color: "#b83a17",
          fontWeight: 700,
        }}
      >
        ✳ TRAVEL ATLAS & PHOTO JOURNAL
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 112,
          lineHeight: 1.02,
          fontWeight: 800,
          marginTop: 24,
          flexWrap: "wrap",
        }}
      >
        Oops, I&nbsp;<span style={{ color: "#b83a17" }}>Traveled</span>&nbsp;Again!
      </div>
      <div
        style={{ display: "flex", fontSize: 34, marginTop: 34, color: "#3f4e59", maxWidth: 880 }}
      >
        Collecting memories, wrong turns, and questionable travel decisions.
      </div>
      <div
        style={{
          position: "absolute",
          right: 70,
          bottom: 60,
          width: 230,
          height: 230,
          borderRadius: 999,
          background: "#2f7a99",
          border: "10px solid #164f68",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 110,
        }}
      >
        📍
      </div>
    </div>,
    size,
  );
}
