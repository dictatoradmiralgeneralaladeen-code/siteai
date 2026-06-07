export default function WIRModule({ user, onBack }) {
  const options = [
    {
      title: "Raise WIR",
      subtitle: "Create a new Work Inspection Request",
      icon: "✍️",
      color: "#3b82f6"
    },
    {
      title: "WIR Log",
      subtitle: "View and track all raised WIRs",
      icon: "📂",
      color: "#8b5cf6"
    },
    {
      title: "Manage WIRs",
      subtitle: "Edit, update and follow up on WIRs",
      icon: "⚙️",
      color: "#f59e0b",
      disabled: true
    },
    {
      title: "Upload WIR",
      subtitle: "Upload signed WIR to system",
      icon: "⬆️",
      color: "#10b981",
      disabled: true
    }
  ]

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      fontFamily: "Segoe UI, sans-serif"
    }}>

      {/* Top Nav */}
      <div style={{
        background: "#1e293b",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #334155"
      }}>
        <div style={{
          fontSize: "20px",
          fontWeight: "800",
          color: "#f8fafc",
          letterSpacing: "3px"
        }}>
          SITE <span style={{ color: "#3b82f6" }}>AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: "600" }}>
              {user.username}
            </div>
            <div style={{ color: "#64748b", fontSize: "11px" }}>
              {user.role}
            </div>
          </div>
        </div>
      </div>

      {/* Project Banner */}
      <div style={{
        background: "#1e3a5f",
        padding: "12px 32px",
        display: "flex",
        alignItems: "center",
        gap: "16px"
      }}>
        <img
          src="/sp-logo.png"
          alt="SP"
          style={{
            height: "32px",
            background: "white",
            padding: "4px 8px",
            borderRadius: "6px",
            objectFit: "contain"
          }}
        />
        <div>
          <div style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: "700" }}>
            Shapoorji Pallonji Middle East LLC
          </div>
          <div style={{ color: "#38bdf8", fontSize: "11px" }}>
            The Palm Jebel Ali — Frond M & N
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "48px 32px" }}>

        <div
          onClick={onBack}
          style={{
            color: "#64748b",
            fontSize: "13px",
            cursor: "pointer",
            marginBottom: "24px",
            display: "inline-block"
          }}
        >
          ← Back to Main Menu
        </div>

        <div style={{
          color: "#94a3b8",
          fontSize: "13px",
          marginBottom: "8px",
          letterSpacing: "1px",
          textAlign: "center"
        }}>
          MODULE
        </div>
        <div style={{
          color: "#f8fafc",
          fontSize: "24px",
          fontWeight: "700",
          marginBottom: "8px",
          textAlign: "center"
        }}>
          Work Inspection Request
        </div>
        <div style={{
          color: "#64748b",
          fontSize: "13px",
          marginBottom: "40px",
          textAlign: "center"
        }}>
          Select an action below
        </div>

        {/* Option Cards */}
        <div style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          gap: "24px",
          flexWrap: "wrap"
        }}>
          {options.map((opt, i) => (
            <div
              key={i}
              style={{
                background: opt.disabled ? "#161f2e" : "#1e293b",
                borderRadius: "16px",
                padding: "32px",
                cursor: opt.disabled ? "not-allowed" : "pointer",
                border: "1px solid #334155",
                transition: "all 0.2s",
                width: "220px",
                flexShrink: 0,
                opacity: opt.disabled ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!opt.disabled) {
                  e.currentTarget.style.borderColor = opt.color
                  e.currentTarget.style.transform = "translateY(-4px)"
                }
              }}
              onMouseLeave={(e) => {
                if (!opt.disabled) {
                  e.currentTarget.style.borderColor = "#334155"
                  e.currentTarget.style.transform = "translateY(0)"
                }
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>
                {opt.icon}
              </div>
              <div style={{
                color: "#f8fafc",
                fontSize: "15px",
                fontWeight: "700",
                marginBottom: "8px"
              }}>
                {opt.title}
              </div>
              <div style={{
                color: "#64748b",
                fontSize: "12px",
                marginBottom: "20px"
              }}>
                {opt.subtitle}
              </div>
              <div style={{
                color: opt.disabled ? "#334155" : opt.color,
                fontSize: "12px",
                fontWeight: "600"
              }}>
                {opt.disabled ? "Coming Soon" : "Open →"}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}