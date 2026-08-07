const APK_URL = "/downloads/bicommunity.apk";

const STEPS = [
  {
    title: "Download the APK",
    body: "Tap the button above. Your phone will download bicommunity.apk to the Downloads folder.",
  },
  {
    title: "Allow install from this source (first time only)",
    body: "Android will ask permission since the app isn't from Play Store. Tap Settings → allow this source → go back.",
  },
  {
    title: "Open the downloaded file",
    body: "Open your notifications or Downloads folder, tap bicommunity.apk.",
  },
  {
    title: "Install & open",
    body: "Tap Install, wait a few seconds, then Open. Log in with your BiCommunity account — same login as the website.",
  },
];

export default function Download() {
  return (
    <div className="hero-wrap">
      <div className="eyebrow">BiCommunity · Android App</div>
      <h1>Get BiCommunity on your phone.</h1>
      <p className="subtle" style={{ fontSize: 15.5, margin: "14px 0 26px" }}>
        Same communities, feed, chat and verification — now as a native Android app.
      </p>

      <a
        href={APK_URL}
        download
        className="btn btn-primary"
        style={{
          padding: "12px 26px",
          fontSize: 14.5,
          display: "inline-block",
          textDecoration: "none",
          color: "#fff",
        }}
      >
        Download for Android
      </a>

      <p className="subtle" style={{ fontSize: 13, marginTop: 10 }}>
        Direct APK · not on Play Store yet · Android 7.0+
      </p>

      <div style={{ marginTop: 40, maxWidth: 520 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>How to install</h3>
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            style={{
              display: "flex",
              gap: 14,
              marginBottom: 18,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--accent, #3B5BDB)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{step.title}</div>
              <div className="subtle" style={{ fontSize: 13.5, marginTop: 2 }}>
                {step.body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
