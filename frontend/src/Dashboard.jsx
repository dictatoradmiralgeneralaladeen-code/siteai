import { useState } from "react"
import WIRModule from "./WIRModule"
import WIRAnalytics from "./WIRAnalytics"

export default function Dashboard({ user, onLogout }) {
  const [activeModule, setActiveModule] = useState(null)

  const modules = [
    {
      title: "Work Inspection Request",
      subtitle: "Raise, manage and track WIRs",
      icon: "📋",
      color: "#3b82f6"
    },
    {
      title: "Material Inspection Request",
      subtitle: "Raise and track MIRs for materials on site",
      icon: "🏗️",
      color: "#f59e0b"
    },
    {
      title: "Material Testing & Reports",
      subtitle: "Cube, FDT, Steel, Block and more",
      icon: "🧪",
      color: "#10b981"
    },
    {
      title: "WIR Analytics",
      subtitle: "Upload Aconex data — filter, classify, analyze",
      icon: "📊",
      color: "#6366f1"
    }
  ]

  if (activeModule === "wir") {
    return <WIRModule user={user} onBack={() => setActiveModule(null)} />
  }
  if (activeModule === "analytics") {
  return <WIRAnalytics user={user} onBack={() => setActiveModule(null)} />
  }

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
          <button
            onClick={onLogout}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#94a3b8",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
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

      {/* Main Content */}
      <div style={{ padding: "48px 32px" }}>
        <div style={{
          color: "#94a3b8",
          fontSize: "13px",
          marginBottom: "8px",
          letterSpacing: "1px",
          textAlign: "center"
        }}>
          MAIN MENU
        </div>
        <div style={{
          color: "#f8fafc",
          fontSize: "24px",
          fontWeight: "700",
          marginBottom: "32px",
          textAlign: "center"
        }}>
          Select Module
        </div>

        {/* Module Cards */}
        <div style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          gap: "24px",
          flexWrap: "wrap"
        }}>
          {modules.map((mod, i) => (
            <div
              key={i}
              onClick={() => {
                if (i === 0) setActiveModule("wir")
                if (i === 3) setActiveModule("analytics")
              }}
              style={{
                background: "#1e293b",
                borderRadius: "16px",
                padding: "32px",
                cursor: "pointer",
                border: "1px solid #334155",
                transition: "all 0.2s",
                width: "260px",
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = mod.color
                e.currentTarget.style.transform = "translateY(-4px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#334155"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>
                {mod.icon}
              </div>
              <div style={{
                color: "#f8fafc",
                fontSize: "17px",
                fontWeight: "700",
                marginBottom: "8px"
              }}>
                {mod.title}
              </div>
              <div style={{
                color: "#64748b",
                fontSize: "13px",
                marginBottom: "24px"
              }}>
                {mod.subtitle}
              </div>
              <div style={{
                color: mod.color,
                fontSize: "13px",
                fontWeight: "600"
              }}>
                Open Module →
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}