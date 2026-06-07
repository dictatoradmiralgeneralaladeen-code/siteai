const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

import { useState, useEffect, useRef, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend,
         CartesianGrid, ResponsiveContainer } from "recharts"

// ── CONSTANTS ────────────────────────────────────────────
const STATUS_COLORS = {
  "A-Approved":"#059669","B-Approved with Comments":"#0284c7",
  "C-Revise & Resubmit":"#dc2626","D-Rejected":"#b91c1c",
  "Not Approved":"#b91c1c","Pending":"#ea580c","F-Reviewed":"#7c3aed",
  "Approved to proceed with comments as noted":"#059669","Terminated":"#9ca3af"
}
const CAT_COLORS = {
  "Substructure":"#d97706","Structure":"#0284c7","Finishing":"#059669","Others":"#6b7280"
}
const RISK_COLORS = {
  "No Risk":"#059669","Low Risk":"#0284c7","Moderate Risk":"#d97706",
  "High Risk":"#dc2626","Unknown":"#9ca3af"
}
const RISK_ORDER = {"High Risk":0,"Moderate Risk":1,"Low Risk":2,"No Risk":3,"Unknown":4,"":5}
const APPROVED = ["A-Approved","B-Approved with Comments","F-Reviewed",
                  "Approved to proceed with comments as noted"]
const REJECTED = ["D-Rejected","Not Approved","C-Revise & Resubmit"]
const PENDING  = ["Pending","Terminated"]
const REVISE_STATUSES = ["C-Revise & Resubmit"]
const DATE_COLS = ['Revision Date','Inspection Date','Date Modified']

const ALL_COLS = ['Document No','Title','Review Status','Revision','Discipline',
  'Revision Date','Inspection Date','Date Modified','Frond','Villa No','Villa Type',
  'Zone','Activity Category','Specific Activity',
  'Days for Approval','Days for Revision','Days on Hold','Predicted Days','Risk Status']
const DEFAULT_COLS = ['Document No','Title','Review Status','Revision',
  'Frond','Villa No','Villa Type','Zone','Activity Category','Specific Activity',
  'Revision Date','Inspection Date','Days for Approval','Days for Revision',
  'Days on Hold','Predicted Days','Risk Status']

const T = {
  page:{background:"#f0f4f8",minHeight:"100vh",fontFamily:"'Segoe UI',sans-serif"},
  card:{background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",border:"1px solid #e2e8f0"},
  section:{background:"#fff",borderRadius:12,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"},
  label:{fontSize:10,fontWeight:700,color:"#64748b",letterSpacing:1.5,textTransform:"uppercase"},
  inp:{padding:"8px 10px",background:"#f8fafc",border:"1px solid #d1d5db",borderRadius:7,color:"#1e293b",fontSize:12,outline:"none"},
}

// ── DATE FORMAT ───────────────────────────────────────────
function formatDate(v) {
  if (!v || v==='') return ''
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1].slice(2)}`
  return v
}

function formatWeekLabel(wk) {
  try {
    const d = new Date(wk + 'T00:00:00')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${d.getDate()} ${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`
  } catch { return wk }
}

// ── SMART SEARCH ─────────────────────────────────────────
function smartMatch(row, term) {
  if (!term.trim()) return true
  const norm = s => s.toLowerCase().replace(/[-\s_]+/g,' ').trim()
  const words = norm(term).split(/\s+/).filter(Boolean)
  const combo = norm(row["Document No"]||"") + " " + norm(row["Title"]||"")
  return words.every(w => combo.includes(w))
}

// ── MULTI SELECT ─────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, color="#0284c7", width=160 }) {
  const [open,setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(()=>{
    const h=e=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h)
  },[])
  const display = !selected.length?`All ${label}`:selected.length===1?selected[0]:`${selected.length} selected`
  const toggle = v=>onChange(selected.includes(v)?selected.filter(x=>x!==v):[...selected,v])
  return (
    <div ref={ref} style={{position:"relative",minWidth:width}}>
      <div onClick={()=>setOpen(!open)} style={{
        padding:"8px 12px",background:selected.length?"#eff6ff":"#f8fafc",
        border:`1.5px solid ${selected.length?color:"#d1d5db"}`,borderRadius:8,
        color:selected.length?color:"#6b7280",fontSize:12,cursor:"pointer",
        display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,
        whiteSpace:"nowrap",overflow:"hidden",maxWidth:width+40
      }}>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",fontWeight:selected.length?600:400}}>{display}</span>
        <span style={{flexShrink:0,fontSize:10,color:"#9ca3af"}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:3000,
          background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,
          minWidth:Math.max(width,180),maxHeight:260,overflowY:"auto",
          boxShadow:"0 8px 32px rgba(0,0,0,0.15)"}}>
          <div style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",
            display:"flex",gap:12,background:"#f8fafc",borderRadius:"10px 10px 0 0"}}>
            <span onClick={()=>onChange([...options])} style={{cursor:"pointer",color:"#0284c7",fontSize:11,fontWeight:700}}>ALL</span>
            <span onClick={()=>onChange([])} style={{cursor:"pointer",color:"#dc2626",fontSize:11,fontWeight:700}}>CLEAR</span>
          </div>
          {options.map(opt=>(
            <label key={opt} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",
              cursor:"pointer",fontSize:12,
              color:STATUS_COLORS[opt]||CAT_COLORS[opt]||RISK_COLORS[opt]||"#374151"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <input type="checkbox" checked={selected.includes(opt)} onChange={()=>toggle(opt)} style={{accentColor:color}}/>
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── DONUT CHART ──────────────────────────────────────────
function DonutChart({ items, size=150 }) {
  const total=items.reduce((s,d)=>s+d.value,0)
  if(!total) return null
  const cx=size/2,cy=size/2,r=size/2-8,ri=size/2-26
  let angle=-Math.PI/2
  const slices=items.filter(d=>d.value>0).map(d=>{
    const sw=(d.value/total)*2*Math.PI
    const x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle)
    const ix1=cx+ri*Math.cos(angle),iy1=cy+ri*Math.sin(angle)
    angle+=sw
    const x2=cx+r*Math.cos(angle),y2=cy+r*Math.sin(angle)
    const ix2=cx+ri*Math.cos(angle),iy2=cy+ri*Math.sin(angle)
    const la=sw>Math.PI?1:0
    return {...d,path:`M${ix1},${iy1}L${x1},${y1}A${r},${r},0,${la},1,${x2},${y2}L${ix2},${iy2}A${ri},${ri},0,${la},0,${ix1},${iy1}Z`,pct:((d.value/total)*100).toFixed(1)}
  })
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={ri} fill="#f8fafc"/>
      {slices.map((s,i)=>(
        <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={1.5}>
          <title>{s.label}: {s.value} ({s.pct}%)</title>
        </path>
      ))}
      <text x={cx} y={cy-5} textAnchor="middle" fill="#1e293b" fontSize={18} fontWeight={800}>{total}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fill="#9ca3af" fontSize={9}>TOTAL</text>
    </svg>
  )
}

// ── STATUS SUMMARY BOX ────────────────────────────────────
function StatusSummaryBox({ allData, statusFilter, title, color }) {
  const [hidden, setHidden] = useState(false)
  const rows = allData.filter(r => statusFilter.includes(r['Review Status']))
  const total = rows.length
  const byCat = rows.reduce((acc,r) => {
    const cat=r['Activity Category']||'Others', act=r['Specific Activity']||'Others'
    if(!acc[cat]) acc[cat]={total:0,acts:{}}
    acc[cat].total++; acc[cat].acts[act]=(acc[cat].acts[act]||0)+1
    return acc
  },{})
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:800,color,letterSpacing:1,textTransform:"uppercase"}}>{title}</div>
          <div style={{color,fontSize:36,fontWeight:900,lineHeight:1.1,marginTop:6}}>{total}</div>
        </div>
        <button onClick={()=>setHidden(!hidden)} style={{
          background:hidden?"#dbeafe":"#f9fafb",
          border:`1.5px solid ${hidden?"#93c5fd":"#e5e7eb"}`,
          borderRadius:20,padding:"6px 14px",cursor:"pointer",
          fontSize:12,color:hidden?"#0284c7":"#9ca3af",
          fontWeight:700,transition:"all 0.2s",marginTop:2,
          display:"flex",alignItems:"center",gap:5
        }}>
          {hidden?"Show":"Hide"} <span style={{fontSize:10}}>{hidden?"▼":"▲"}</span>
        </button>
      </div>
      {!hidden && (
        <div>
          {Object.entries(byCat).sort((a,b)=>b[1].total-a[1].total).map(([cat,info])=>(
            <div key={cat} style={{marginBottom:8,paddingBottom:6,borderBottom:"1px solid #f1f5f9"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{color:CAT_COLORS[cat]||"#374151",fontWeight:700,fontSize:12}}>{cat}</span>
                <span style={{color:CAT_COLORS[cat]||"#374151",fontWeight:800,fontSize:12,
                  background:`${CAT_COLORS[cat]}18`,padding:"1px 8px",borderRadius:10}}>{info.total}</span>
              </div>
              {Object.entries(info.acts).sort((a,b)=>b[1]-a[1]).map(([act,cnt])=>(
                <div key={act} style={{display:"flex",justifyContent:"space-between",padding:"2px 0 2px 10px"}}>
                  <span style={{color:"#6b7280",fontSize:10}}>{act}</span>
                  <span style={{color:"#374151",fontWeight:600,fontSize:10}}>{cnt}</span>
                </div>
              ))}
            </div>
          ))}
          {total===0&&<div style={{color:"#9ca3af",fontSize:12,textAlign:"center",padding:12}}>No records</div>}
        </div>
      )}
    </div>
  )
}

// ── SECTION WRAPPER ───────────────────────────────────────
function CollapsibleSection({ title, emoji, color="#0284c7", collapsed, onToggle, children, right }) {
  return (
    <div style={{...T.section,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        cursor:"pointer",marginBottom:collapsed?0:14}} onClick={onToggle}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:15}}>{emoji}</span>
          <span style={{...T.label,color,fontSize:11}}>{title}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {right&&<div onClick={e=>e.stopPropagation()}>{right}</div>}
          <span style={{color:"#9ca3af",fontSize:11,fontWeight:600}}>
            {collapsed?"▼ Show":"▲ Hide"}
          </span>
        </div>
      </div>
      {!collapsed&&children}
    </div>
  )
}

// ── PREDICTION SUMMARY ───────────────────────────────────
function PredictionSummary({ actPreds, catPreds }) {
  const cats=['Substructure','Structure','Finishing']
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
      {cats.map(cat=>{
        const s=catPreds[cat]; if(!s) return null
        const acts=Object.entries(actPreds).filter(([,v])=>v.category===cat).sort((a,b)=>b[1].count-a[1].count)
        return (
          <div key={cat} style={{background:"#f8fafc",borderRadius:10,padding:14,borderTop:`3px solid ${CAT_COLORS[cat]}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{color:CAT_COLORS[cat],fontSize:12,fontWeight:800}}>{cat}</div>
                <div style={{color:"#9ca3af",fontSize:10}}>avg approval</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:CAT_COLORS[cat],fontSize:26,fontWeight:900,lineHeight:1}}>
                  {s.mean}<span style={{fontSize:11,color:"#9ca3af"}}>d</span>
                </div>
                <div style={{color:"#9ca3af",fontSize:9}}>n={s.count}</div>
              </div>
            </div>
            <div style={{borderTop:"1px solid #e2e8f0",paddingTop:8}}>
              {acts.map(([act,stats])=>(
                <div key={act} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"3px 0",borderBottom:"1px solid #f9fafb"}}>
                  <span style={{color:"#374151",fontSize:10,flex:1,paddingRight:6}}>{act}</span>
                  <span style={{color:CAT_COLORS[cat],fontWeight:700,fontSize:11,flexShrink:0}}>{stats.mean}d</span>
                  <span style={{color:"#9ca3af",fontSize:9,marginLeft:4,flexShrink:0}}>n={stats.count}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── REPORT ───────────────────────────────────────────────
function generateReport(sortedFiltered, filters, search, uploadedAt, actPreds, catPreds) {
  const MAX=2000, rows=sortedFiltered.slice(0,MAX), total=sortedFiltered.length
  const nonPend=sortedFiltered.filter(r=>!PENDING.includes(r["Review Status"]))
  const approved=nonPend.filter(r=>APPROVED.includes(r["Review Status"])).length
  const rejected=nonPend.filter(r=>REJECTED.includes(r["Review Status"])).length
  const bApp=sortedFiltered.filter(r=>r["Review Status"]==="B-Approved with Comments").length
  const revise=sortedFiltered.filter(r=>r["Review Status"]==="C-Revise & Resubmit").length
  const pending=sortedFiltered.filter(r=>PENDING.includes(r["Review Status"])).length
  const rejPct=nonPend.length?((rejected/nonPend.length)*100).toFixed(1):"0.0"
  const sb={}
  sortedFiltered.forEach(r=>{const s=r["Review Status"]||"Unknown";sb[s]=(sb[s]||0)+1})
  const pt=Object.values(sb).reduce((a,b)=>a+b,0)
  let pa=-Math.PI/2; const pR=80,pcx=90,pcy=90
  const ppaths=Object.entries(sb).filter(([,v])=>v>0).map(([s,v])=>{
    const sw=(v/pt)*2*Math.PI
    const x1=pcx+pR*Math.cos(pa),y1=pcy+pR*Math.sin(pa);pa+=sw
    const x2=pcx+pR*Math.cos(pa),y2=pcy+pR*Math.sin(pa)
    return `<path d="M${pcx},${pcy}L${x1.toFixed(1)},${y1.toFixed(1)}A${pR},${pR},0,${sw>Math.PI?1:0},1,${x2.toFixed(1)},${y2.toFixed(1)}Z" fill="${STATUS_COLORS[s]||'#6b7280'}" stroke="white" stroke-width="1.5"/>`
  }).join('')
  const af=[]
  if(filters.frond?.length) af.push(`Frond: ${filters.frond.join(', ')}`)
  if(filters.zone?.length) af.push(`Zone: ${filters.zone.join(', ')}`)
  if(filters.villa?.length) af.push(`Villa: ${filters.villa.join(', ')}`)
  if(filters.villaType?.length) af.push(`Villa Type: ${filters.villaType.join(', ')}`)
  if(filters.category?.length) af.push(`Category: ${filters.category.join(', ')}`)
  if(filters.activity?.length) af.push(`Activity: ${filters.activity.join(', ')}`)
  if(filters.status?.length) af.push(`Status: ${filters.status.join(', ')}`)
  if(filters.risk?.length) af.push(`Risk: ${filters.risk.join(', ')}`)
  if(filters.revDateFrom) af.push(`Rev From: ${formatDate(filters.revDateFrom)}`)
  if(filters.revDateTo) af.push(`Rev To: ${formatDate(filters.revDateTo)}`)
  if(search) af.push(`Search: "${search}"`)
  const revFrom=filters.revDateFrom?formatDate(filters.revDateFrom):"All"
  const revTo=filters.revDateTo?formatDate(filters.revDateTo):"All"
  let dayRange=""
  if(filters.revDateFrom&&filters.revDateTo){
    const diff=Math.ceil((new Date(filters.revDateTo)-new Date(filters.revDateFrom))/864e5)
    dayRange=`(Last ${diff} days)`
  }
  const filteredActs=[...new Set(sortedFiltered.map(r=>r["Specific Activity"]).filter(Boolean))]
  const predRows=Object.entries(actPreds).filter(([a])=>filteredActs.includes(a)).sort((a,b)=>b[1].count-a[1].count)

  const html=`<!DOCTYPE html><html><head><title>WIR Report — SITE AI</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;padding:24px;color:#1e293b;font-size:12px;background:#f8fafc}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 20px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:14px;border-bottom:3px solid #0284c7}
.co{font-size:16px;font-weight:800}.proj{font-size:11px;color:#0284c7;margin-top:3px}.meta{font-size:10px;color:#9ca3af;margin-top:3px}
.sai{font-size:26px;font-weight:900;text-align:right;color:#1e293b}.sai span{color:#0284c7}
.sai-sub{font-size:9px;color:#9ca3af;letter-spacing:2px;text-align:right}
.cards{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
.card{border-left:4px solid currentColor;padding:10px 14px;border-radius:8px;min-width:88px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.06)}
.card .n{font-size:22px;font-weight:900}.card .l{font-size:10px;color:#6b7280;margin-top:2px}
.fbox{background:#fff;border-radius:8px;padding:10px 14px;margin:10px 0;border:1px solid #e2e8f0}
.fbox h3{font-size:10px;font-weight:800;color:#6b7280;margin-bottom:5px;text-transform:uppercase;letter-spacing:1px}
.drng{background:#eff6ff;border-radius:8px;padding:8px 14px;margin:8px 0;font-size:11px;color:#1e40af;font-weight:700;border:1px solid #bfdbfe}
.sec{margin-top:14px;background:#fff;border-radius:10px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,0.06)}
.sec h2{font-size:11px;font-weight:800;color:#0f172a;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #f1f5f9;text-transform:uppercase;letter-spacing:1px}
.pw{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.li{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:11px}
.dot{width:10px;height:10px;border-radius:2px;flex-shrink:0}
table{width:100%;border-collapse:collapse;font-size:10px}
th{background:#1e293b;color:white;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;white-space:nowrap}
td{padding:5px 7px;border-bottom:1px solid #f1f5f9;vertical-align:top}
tr:nth-child(even) td{background:#f8fafc}
.note{background:#fef3c7;border-radius:6px;padding:8px 14px;font-size:10px;color:#92400e;margin:8px 0;border:1px solid #fcd34d}
.pred-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.pred-card{border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;min-width:130px;background:#f8fafc}
@media print{body{padding:14px}tr{page-break-inside:avoid}.sec{page-break-inside:avoid}}
</style></head><body>
<div class="hdr">
  <div>
    <div class="co">Shapoorji Pallonji Middle East LLC</div>
    <div class="proj">The Palm Jebel Ali — Frond M &amp; N</div>
    <div class="meta">Generated: ${new Date().toLocaleString()} | Data: ${uploadedAt}</div>
  </div>
  <div><div class="sai">SITE <span>AI</span></div><div class="sai-sub">CONSTRUCTION INTELLIGENCE</div></div>
</div>
${af.length?`<div class="fbox"><h3>Filters Applied</h3>${af.map(f=>`<div style="margin:2px 0;color:#374151">• ${f}</div>`).join('')}</div>`:''}
<div class="drng">📅 REVISION DATE: ${revFrom} → ${revTo} ${dayRange}</div>
<div class="cards">
  <div class="card" style="color:#1e293b"><div class="n">${total}</div><div class="l">Total IRs</div></div>
  <div class="card" style="color:#059669"><div class="n">${approved}</div><div class="l">A-Approved</div></div>
  <div class="card" style="color:#0284c7"><div class="n">${bApp}</div><div class="l">B-Approved</div></div>
  <div class="card" style="color:#dc2626"><div class="n">${revise}</div><div class="l">C-Revise &amp; Resubmit</div></div>
  <div class="card" style="color:#ea580c"><div class="n">${pending}</div><div class="l">Pending</div></div>
  <div class="card" style="color:#dc2626;border:2px solid #fca5a5"><div class="n">${rejPct}%</div><div class="l">Rejection Rate</div></div>
</div>
<div class="sec"><h2>Status Breakdown</h2>
  <div class="pw">
    <svg width="180" height="180" viewBox="0 0 180 180">${ppaths}</svg>
    <div>${Object.entries(sb).sort((a,b)=>b[1]-a[1]).map(([s,v])=>`
      <div class="li">
        <div class="dot" style="background:${STATUS_COLORS[s]||'#6b7280'}"></div>
        <span style="color:#374151">${s}</span>
        <strong style="color:${STATUS_COLORS[s]||'#1e293b'}">${v}</strong>
        <span style="color:#9ca3af">(${((v/pt)*100).toFixed(1)}%)</span>
      </div>`).join('')}
    </div>
  </div>
</div>
${predRows.length?`
<div class="sec"><h2>AI Predicted Approval Days (Filtered Activities)</h2>
  <div class="pred-grid">
    ${predRows.map(([act,s])=>`
      <div class="pred-card">
        <div style="font-size:9px;color:#6b7280">${s.category}</div>
        <div style="font-weight:700;font-size:10px;color:#1e293b">${act}</div>
        <div style="font-size:20px;font-weight:900;color:#0284c7">${s.mean}d</div>
        <div style="font-size:9px;color:#9ca3af">median ${s.median}d · n=${s.count}</div>
      </div>`).join('')}
  </div>
</div>`:''}
${rows.length<total?`<div class="note">⚠ Report shows first ${MAX} of ${total} IRs.</div>`:''}
<div class="sec"><h2>IR Details (${rows.length}${rows.length<total?` of ${total}`:''} rows — sorted order)</h2>
  <table>
    <tr><th>#</th><th>Document No</th><th>Title</th><th>Status</th><th>Rev</th>
    <th>Frond</th><th>Villa</th><th>Type</th><th>Zone</th><th>Category</th><th>Activity</th>
    <th>Rev Date</th><th>Insp Date</th><th>Days Apprd</th><th>Days Rev</th><th>Days Hold</th><th>Pred</th><th>Risk</th></tr>
    ${rows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td style="font-family:monospace;font-size:9px;color:#1e40af;word-break:break-all;max-width:120px">${r["Document No"]||''}</td>
      <td style="max-width:200px;word-wrap:break-word">${r["Title"]||''}</td>
      <td style="color:${STATUS_COLORS[r["Review Status"]]||'#1e293b'};font-weight:700;white-space:nowrap;font-size:9px">${r["Review Status"]||''}</td>
      <td>${r["Revision"]||''}</td><td>${r["Frond"]||''}</td><td>${r["Villa No"]||''}</td>
      <td>${r["Villa Type"]||''}</td><td>${r["Zone"]||''}</td>
      <td style="color:${CAT_COLORS[r["Activity Category"]]||'#1e293b'};font-weight:700">${r["Activity Category"]||''}</td>
      <td style="font-size:9px">${r["Specific Activity"]||''}</td>
      <td style="white-space:nowrap">${formatDate(r["Revision Date"])||''}</td>
      <td style="white-space:nowrap">${formatDate(r["Inspection Date"])||''}</td>
      <td style="text-align:center">${r["Days for Approval"]||''}</td>
      <td style="text-align:center">${r["Days for Revision"]||''}</td>
      <td style="text-align:center">${r["Days on Hold"]||''}</td>
      <td style="text-align:center;font-weight:700;color:#0284c7">${r["Predicted Days"]||''}</td>
      <td style="font-weight:700;color:${RISK_COLORS[r["Risk Status"]]||'#6b7280'};white-space:nowrap;font-size:9px">${r["Risk Status"]||''}</td>
    </tr>`).join('')}
  </table>
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`
  const w=window.open('','_blank')
  if(!w){alert('Allow popups to generate reports');return}
  w.document.write(html);w.document.close()
}

// ── MAIN COMPONENT ───────────────────────────────────────
const ROWS_PER_PAGE=100

export default function WIRAnalytics({ user, onBack }) {
  const [data,setData]           = useState([])
  const [actPreds,setActPreds]   = useState({})
  const [catPreds,setCatPreds]   = useState({})
  const [loading,setLoading]     = useState(false)
  const [uploading,setUploading] = useState(false)
  const [uploadedAt,setUpAt]     = useState("")
  const [page,setPage]           = useState(1)
  const [search,setSearch]       = useState("")
  const [visibleCols,setVisCols] = useState(DEFAULT_COLS)
  const [sortCol,setSortCol]     = useState("")
  const [sortDir,setSortDir]     = useState("asc")
  const [rejLineCats,setRejLineCats] = useState([])
  const [rejLineActs,setRejLineActs] = useState([])
  const [collapsed,setCollapsed] = useState({overview:false,rejection:false,predictions:false,filters:false})
  const [inspectionRow, setInspectionRow] = useState(null)
  const [pdfDocNum, setPdfDocNum]         = useState(null)
  const [showRptMenu, setShowRptMenu]     = useState(false)
  const [filters,setFilters]     = useState({
    frond:[],zone:[],villa:[],villaType:[],category:[],activity:[],
    status:[],revision:[],risk:[],
    revDateFrom:"",revDateTo:"",modDateFrom:"",modDateTo:"",
    approvalMin:"",approvalMax:"",revisionMin:"",revisionMax:"",holdMin:"",holdMax:""
  })
  const tableRef = useRef(null)

  useEffect(()=>{
    setLoading(true)
    fetch(`${API}/analytics/data`)
      .then(r=>r.json())
      .then(j=>{
        if(j.success){
          setData(j.data); setUpAt(j.uploaded_at)
          setActPreds(j.activity_predictions||{})
          setCatPreds(j.category_predictions||{})
        }
      }).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  async function handleUpload(e){
    const file=e.target.files[0]; if(!file) return
    setUploading(true)
    const form=new FormData(); form.append("file",file)
    try{
      const res = await fetch(`${API}/analytics/upload`, {method:"POST", body:form})
      const j=await res.json()
      if(j.success){
        setData(j.data); setUpAt(j.uploaded_at); setPage(1)
        setActPreds(j.activity_predictions||{})
        setCatPreds(j.category_predictions||{})
      }
    }catch{}
    setUploading(false); e.target.value=""
  }

  // Weekly rejection line — computed client-side
  const weeklyRejLine = useMemo(()=>{
    const rejStats=["C-Revise & Resubmit","D-Rejected","Not Approved"]
    const threeMonthsAgo=new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth()-3)
    const filtData=data.filter(r=>{
      if(!rejStats.includes(r['Review Status'])) return false
      if(rejLineCats.length&&!rejLineCats.includes(r['Activity Category'])) return false
      if(rejLineActs.length&&!rejLineActs.includes(r['Specific Activity'])) return false
      return true
    })
    const byWeek={}
    filtData.forEach(r=>{
      const rd=r['Revision Date']; if(!rd||rd==='') return
      try{
        const d=new Date(rd+'T00:00:00')
        if(isNaN(d.getTime())||d<threeMonthsAgo) return
        const day=d.getDay(), mon=new Date(d)
        mon.setDate(d.getDate()-(day===0?6:day-1))
        const wk=mon.toISOString().slice(0,10)
        byWeek[wk]=(byWeek[wk]||0)+1
      }catch{}
    })
    return Object.entries(byWeek).sort(([a],[b])=>a.localeCompare(b))
      .map(([wk,cnt])=>({week:wk, count:cnt})) // keep full YYYY-MM-DD
  },[data,rejLineCats,rejLineActs])

  const toggle=key=>setCollapsed(c=>({...c,[key]:!c[key]}))
  const unique=key=>[...new Set(data.map(r=>r[key]).filter(Boolean))].sort()
  const villaOpts=[...new Set(data.map(r=>r["Villa No"]).filter(Boolean))].sort((a,b)=>parseInt(a)-parseInt(b))

  function numInRange(val,min,max){
    if(!min&&!max) return true
    const n=parseFloat(val); if(isNaN(n)) return false
    if(min&&n<parseFloat(min)) return false
    if(max&&n>parseFloat(max)) return false
    return true
  }

  const filtered=data.filter(r=>{
    if(filters.frond.length&&!filters.frond.includes(r["Frond"])) return false
    if(filters.zone.length&&!filters.zone.includes(r["Zone"])) return false
    if(filters.villa.length&&!filters.villa.includes(r["Villa No"])) return false
    if(filters.villaType.length&&!filters.villaType.includes(r["Villa Type"])) return false
    if(filters.category.length&&!filters.category.includes(r["Activity Category"])) return false
    if(filters.activity.length&&!filters.activity.includes(r["Specific Activity"])) return false
    if(filters.status.length&&!filters.status.includes(r["Review Status"])) return false
    if(filters.revision.length&&!filters.revision.includes(r["Revision"])) return false
    if(filters.risk.length&&!filters.risk.includes(r["Risk Status"])) return false
    if(filters.revDateFrom&&r["Revision Date"]<filters.revDateFrom) return false
    if(filters.revDateTo&&r["Revision Date"]>filters.revDateTo) return false
    if(filters.modDateFrom&&r["Date Modified"]<filters.modDateFrom) return false
    if(filters.modDateTo&&r["Date Modified"]>filters.modDateTo) return false
    if(!numInRange(r["Days for Approval"],filters.approvalMin,filters.approvalMax)) return false
    if(!numInRange(r["Days for Revision"],filters.revisionMin,filters.revisionMax)) return false
    if(!numInRange(r["Days on Hold"],filters.holdMin,filters.holdMax)) return false
    if(!smartMatch(r,search)) return false
    return true
  })

  const sorted=useMemo(()=>[...filtered].sort((a,b)=>{
    if(!sortCol) return 0
    if(sortCol==="Risk Status"){
      const va=RISK_ORDER[a["Risk Status"]]??99, vb=RISK_ORDER[b["Risk Status"]]??99
      return sortDir==="asc"?va-vb:vb-va
    }
    const va=a[sortCol]||"", vb=b[sortCol]||""
    // Date columns: sort as YYYY-MM-DD strings (alphabetical = chronological)
    if(DATE_COLS.includes(sortCol)){
      return sortDir==="asc"?va.localeCompare(vb):vb.localeCompare(va)
    }
    const na=parseFloat(va),nb=parseFloat(vb)
    if(!isNaN(na)&&!isNaN(nb)) return sortDir==="asc"?na-nb:nb-na
    return sortDir==="asc"?va.localeCompare(vb):vb.localeCompare(va)
  }),[filtered,sortCol,sortDir])

  useEffect(()=>setPage(1),[filters,search,sortCol,sortDir])

  const totalPages=Math.max(1,Math.ceil(sorted.length/ROWS_PER_PAGE))
  const pageRows=sorted.slice((page-1)*ROWS_PER_PAGE,page*ROWS_PER_PAGE)

  const nonPend=filtered.filter(r=>!PENDING.includes(r["Review Status"]))
  const appCnt=nonPend.filter(r=>APPROVED.includes(r["Review Status"])).length
  const rejCnt=nonPend.filter(r=>REJECTED.includes(r["Review Status"])).length
  const bApp=filtered.filter(r=>r["Review Status"]==="B-Approved with Comments").length
  const revise=filtered.filter(r=>r["Review Status"]==="C-Revise & Resubmit").length
  const pendCnt=filtered.filter(r=>PENDING.includes(r["Review Status"])).length
  const rejPct=nonPend.length?((rejCnt/nonPend.length)*100).toFixed(1):"0.0"

  const urgentPending=data.filter(r=>r['Review Status']==='Pending'&&parseFloat(r['Days on Hold'])>4)

  const filteredPieItems=Object.entries(
    filtered.reduce((a,r)=>{const s=r["Review Status"]||"Unknown";a[s]=(a[s]||0)+1;return a},{})
  ).map(([s,v])=>({label:s,value:v,color:STATUS_COLORS[s]||"#6b7280"})).sort((a,b)=>b.value-a.value)

  const allPieItems=Object.entries(
    data.reduce((a,r)=>{const s=r["Review Status"]||"Unknown";a[s]=(a[s]||0)+1;return a},{})
  ).map(([s,v])=>({label:s,value:v,color:STATUS_COLORS[s]||"#6b7280"})).sort((a,b)=>b.value-a.value)

  function handleViewDetails(){
    setFilters(f=>({...f,status:["Pending"]}))
    setSortCol("Days on Hold"); setSortDir("desc")
    setTimeout(()=>tableRef.current?.scrollIntoView({behavior:'smooth'}),150)
  }

  const clrAll=()=>setFilters({frond:[],zone:[],villa:[],villaType:[],category:[],activity:[],
    status:[],revision:[],risk:[],revDateFrom:"",revDateTo:"",modDateFrom:"",modDateTo:"",
    approvalMin:"",approvalMax:"",revisionMin:"",revisionMax:"",holdMin:"",holdMax:""})
  const active=Object.entries(filters).filter(([,v])=>Array.isArray(v)?v.length:v!=="").length+(search?1:0)

  function handleSort(col){
    if(sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc")
    else{ setSortCol(col); setSortDir("asc") }
  }

  const allChartCats=[...new Set(data.map(d=>d['Activity Category']).filter(Boolean))].sort()
  const allChartActs=[...new Set(data.map(d=>d['Specific Activity']).filter(Boolean))].sort()

  const si={...T.inp}
  const ni={...T.inp,width:58}

  // Days on Hold color
  function holdColor(row) {
    const hold=parseFloat(row["Days on Hold"])
    if(isNaN(hold)) return "#374151"
    if(hold<=2) return "#059669"
    const pred=parseFloat(row["Predicted Days"])
    if(!isNaN(pred)&&hold<pred) return "#d97706"
    return "#dc2626"
  }

  function PageNav(){
    if(totalPages<=1) return null
    const pages=[],s=Math.max(1,page-2),e=Math.min(totalPages,s+4)
    for(let i=s;i<=e;i++) pages.push(i)
    const btn=(l,fn,dis)=>(
      <button onClick={fn} disabled={dis} style={{...si,cursor:dis?"default":"pointer",
        opacity:dis?0.35:1,minWidth:30,textAlign:"center",background:"#fff",
        boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>{l}</button>
    )
    return (
      <div style={{display:"flex",gap:6,alignItems:"center",padding:"10px 0",justifyContent:"center",flexWrap:"wrap"}}>
        {btn("«",()=>setPage(1),page===1)}
        {btn("‹",()=>setPage(p=>Math.max(1,p-1)),page===1)}
        {pages.map(p=>(
          <button key={p} onClick={()=>setPage(p)} style={{...si,cursor:"pointer",minWidth:30,
            background:p===page?"#0284c7":"#fff",color:p===page?"white":"#374151",
            fontWeight:p===page?700:400}}>
            {p}
          </button>
        ))}
        {btn("›",()=>setPage(p=>Math.min(totalPages,p+1)),page===totalPages)}
        {btn("»",()=>setPage(totalPages),page===totalPages)}
        <span style={{color:"#6b7280",fontSize:11,marginLeft:4}}>
          Page {page}/{totalPages} · {sorted.length} IRs
        </span>
      </div>
    )
  }

  return (
    <div style={T.page}>
      {/* Nav */}
      <div style={{background:"#1e293b",padding:"14px 24px",display:"flex",
        justifyContent:"space-between",alignItems:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
        <div style={{fontSize:22,fontWeight:900,letterSpacing:4}}>
          <span style={{color:"#f8fafc"}}>SITE </span>
          <span style={{color:"#38bdf8"}}>AI</span>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{color:"#f1f5f9",fontSize:13,fontWeight:600}}>{user.username}</div>
          <div style={{color:"#64748b",fontSize:10}}>{user.role}</div>
        </div>
      </div>

      {/* Banner */}
      <div style={{background:"#1e40af",padding:"10px 24px",display:"flex",
        alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <img src="/sp-logo.png" alt="SP" style={{height:28,background:"white",
            padding:"3px 7px",borderRadius:5,objectFit:"contain"}}/>
          <div>
            <div style={{color:"#fff",fontSize:12,fontWeight:700}}>Shapoorji Pallonji Middle East LLC</div>
            <div style={{color:"#bfdbfe",fontSize:11}}>The Palm Jebel Ali — Frond M & N</div>
          </div>
        </div>
        {uploadedAt&&<div style={{color:"#93c5fd",fontSize:10}}>↑ {uploadedAt}</div>}
      </div>

      <div style={{padding:18}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div>
            <div onClick={onBack} style={{color:"#0284c7",fontSize:12,cursor:"pointer",marginBottom:4,fontWeight:600}}>← Back to Menu</div>
            <div style={{color:"#1e293b",fontSize:20,fontWeight:800}}>WIR Analytics</div>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {data.length>0&&(



              <div style={{position:"relative"}}>
                <button onClick={()=>setShowRptMenu(!showRptMenu)}
                  style={{padding:"9px 18px",background:"#7c3aed",color:"white",border:"none",
                    borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer",
                    boxShadow:"0 4px 12px rgba(124,58,237,0.3)"}}>
                  📄 Report ▾ ({sorted.length})
                </button>
                {showRptMenu&&(
                  <div style={{position:"absolute",top:"calc(100% + 4px)",right:0,zIndex:200,
                    background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,
                    boxShadow:"0 8px 24px rgba(0,0,0,0.12)",minWidth:200,overflow:"hidden"}}>
                    {[
                      {icon:"📄",label:"PDF Report (Print)",fn:()=>generateReport(sorted,filters,search,uploadedAt,actPreds,catPreds)},
                      {icon:"📊",label:"Excel A3 Landscape",fn:()=>exportWIRToExcel(sorted,visibleCols,filters,search,uploadedAt)},
                    ].map(({icon,label,fn})=>(
                      <div key={label} onClick={()=>{fn();setShowRptMenu(false)}}
                        style={{padding:"12px 16px",cursor:"pointer",fontSize:12,color:"#374151",
                          display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #f1f5f9"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                        onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                        <span style={{fontSize:16}}>{icon}</span>{label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <label style={{padding:"9px 18px",background:uploading?"#1e40af":"#0284c7",
              color:"white",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer",
              boxShadow:"0 4px 12px rgba(2,132,199,0.3)"}}>
              {uploading?"⟳ Processing...":"⬆ Upload Excel"}
              <input type="file" accept=".xlsx,.xls" onChange={handleUpload} style={{display:"none"}} disabled={uploading}/>
            </label>
          </div>
        </div>
    
        {/* ⚠️ Urgent Banner */}
        {urgentPending.length>0&&(
          <div style={{background:"linear-gradient(135deg,#fef2f2,#fff5f5)",
            border:"2px solid #fca5a5",borderLeft:"6px solid #dc2626",
            borderRadius:12,padding:"16px 20px",marginBottom:14,
            display:"flex",justifyContent:"space-between",alignItems:"center",
            flexWrap:"wrap",gap:12,boxShadow:"0 4px 16px rgba(220,38,38,0.12)"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:26}}>🚨</span>
              <div>
                <div style={{color:"#dc2626",fontSize:16,fontWeight:900}}>
                  {urgentPending.length} IRs Pending for more than 4 days! May Require Action!!!
                </div>
                <div style={{color:"#b91c1c",fontSize:12,marginTop:2}}>
                  These inspection requests have been on hold and may be at risk of delay
                </div>
              </div>
            </div>
            <button onClick={handleViewDetails} style={{
              padding:"10px 20px",background:"#dc2626",color:"white",border:"none",
              borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer",
              boxShadow:"0 4px 12px rgba(220,38,38,0.3)",flexShrink:0}}>
              View Details ↓
            </button>
          </div>
        )}

        {/* SECTION: Overview — 3 column layout */}
        <CollapsibleSection title="PROJECT OVERVIEW & STATUS SUMMARY" emoji="📊"
          color="#0284c7" collapsed={collapsed.overview} onToggle={()=>toggle('overview')}>
          <div style={{display:"grid",gridTemplateColumns:"270px 1fr 1fr",gap:14,alignItems:"start"}}>

            {/* LEFT: All IRs Pie */}
            <div style={{background:"#f8fafc",borderRadius:10,padding:16,border:"1px solid #e2e8f0"}}>
              <div style={{fontSize:15,fontWeight:800,color:"#0f172a",marginBottom:14,letterSpacing:0.3}}>
                ALL IRs — PROJECT OVERVIEW
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                <DonutChart items={allPieItems} size={155}/>
                <div style={{width:"100%"}}>
                  {allPieItems.map((d,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                      <div style={{width:10,height:10,borderRadius:2,background:d.color,flexShrink:0}}/>
                      <span style={{color:"#374151",fontSize:10,flex:1}}>{d.label}</span>
                      <span style={{color:d.color,fontWeight:700,fontSize:11}}>{d.value}</span>
                      <span style={{color:"#9ca3af",fontSize:9}}>
                        ({((d.value/data.length)*100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MIDDLE: C-Revise */}
            <div style={{background:"#fff5f5",borderRadius:10,padding:16,
              borderTop:"3px solid #dc2626",border:"1px solid #fecaca"}}>
              <StatusSummaryBox allData={data} statusFilter={REVISE_STATUSES}
                title="C-REVISE & RESUBMIT IRs" color="#dc2626"/>
            </div>

            {/* RIGHT: Pending */}
            <div style={{background:"#fff7ed",borderRadius:10,padding:16,
              borderTop:"3px solid #ea580c",border:"1px solid #fed7aa"}}>
              <StatusSummaryBox allData={data} statusFilter={PENDING}
                title="PENDING IRs" color="#ea580c"/>
            </div>
          </div>
        </CollapsibleSection>

        {/* SECTION: Weekly Rejection Trend */}
        <CollapsibleSection title="WEEKLY REJECTION TREND — Last 3 Months" emoji="📉"
          color="#dc2626" collapsed={collapsed.rejection} onToggle={()=>toggle('rejection')}
          right={
            <div style={{display:"flex",gap:8}}>
              <MultiSelect label="Category" options={allChartCats} selected={rejLineCats}
                onChange={setRejLineCats} color="#d97706" width={130}/>
              <MultiSelect label="Activity" options={allChartActs} selected={rejLineActs}
                onChange={setRejLineActs} color="#dc2626" width={150}/>
            </div>
          }>
          {weeklyRejLine.length>0?(
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyRejLine} margin={{top:5,right:20,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="week"
                  tickFormatter={formatWeekLabel}
                  tick={{fill:"#9ca3af",fontSize:9}}
                  axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                <YAxis tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false}
                  label={{value:"IRs Rejected",angle:-90,fill:"#9ca3af",fontSize:10,position:"insideLeft"}}/>
                <Tooltip
                  labelFormatter={v=>formatWeekLabel(v)}
                  contentStyle={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,fontSize:11}}
                  labelStyle={{color:"#6b7280",fontWeight:600}}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="count" name="Rejected/Revised IRs"
                  stroke="#dc2626" strokeWidth={2.5} dot={{r:3,fill:"#dc2626"}} activeDot={{r:5}}/>
              </LineChart>
            </ResponsiveContainer>
          ):(
            <div style={{textAlign:"center",padding:40,color:"#9ca3af",fontSize:13}}>
              No rejection data for last 3 months with selected filters
            </div>
          )}
        </CollapsibleSection>

        {/* SECTION: AI Predictions */}
        {Object.keys(catPreds).length>0&&(
          <CollapsibleSection title="AI PREDICTED APPROVAL DAYS (per activity)" emoji="🤖"
            color="#7c3aed" collapsed={collapsed.predictions} onToggle={()=>toggle('predictions')}>
            <PredictionSummary actPreds={actPreds} catPreds={catPreds}/>
          </CollapsibleSection>
        )}

        {/* Summary Cards */}
        {data.length>0&&(
          <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            {[
              {label:"Filtered IRs",val:filtered.length,color:"#1e293b"},
              {label:"A-Approved",val:appCnt,color:"#059669"},
              {label:"B-Approved",val:bApp,color:"#0284c7"},
              {label:"C-Revise & Resubmit",val:revise,color:"#dc2626"},
              {label:"Pending",val:pendCnt,color:"#ea580c"},
              {label:"Rejection %",val:`${rejPct}%`,color:"#dc2626",big:true},
            ].map(({label,val,color,big})=>(
              <div key={label} style={{...T.card,padding:"12px 16px",borderLeft:`3px solid ${color}`,
                ...(big?{border:`2px solid ${color}`,boxShadow:`0 0 0 3px ${color}18`}:{})}}>
                <div style={{color,fontSize:big?24:20,fontWeight:900,lineHeight:1}}>{val}</div>
                <div style={{color:"#6b7280",fontSize:10,marginTop:3,lineHeight:1.4}}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{marginBottom:12,position:"relative"}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",
            color:"#9ca3af",fontSize:14,pointerEvents:"none"}}>🔍</span>
          <input type="text"
            placeholder="Search by Document Number (partial, no hyphens needed) or Title..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{width:"100%",padding:"11px 16px 11px 42px",background:"#fff",
              border:`1.5px solid ${search?"#0284c7":"#d1d5db"}`,borderRadius:10,
              color:"#1e293b",fontSize:13,outline:"none",boxSizing:"border-box",
              boxShadow:search?"0 0 0 3px #0284c715":""}}/>
        </div>

        {/* SECTION: Filters + Filtered Pie */}
        <CollapsibleSection title="FILTERS" emoji="⚙️"
          color="#374151" collapsed={collapsed.filters} onToggle={()=>toggle('filters')}
          right={active>0&&(
            <button onClick={e=>{e.stopPropagation();clrAll();setSearch("")}} style={{
              background:"#fff5f5",border:"1px solid #fca5a5",color:"#dc2626",
              borderRadius:6,padding:"4px 12px",fontSize:11,cursor:"pointer",fontWeight:700}}>
              ✕ Clear ({active})
            </button>
          )}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"start"}}>
            <div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                <MultiSelect label="Frond" options={unique("Frond")} selected={filters.frond}
                  onChange={v=>setFilters(f=>({...f,frond:v}))} color="#0284c7"/>
                <MultiSelect label="Zone" options={unique("Zone")} selected={filters.zone}
                  onChange={v=>setFilters(f=>({...f,zone:v}))} color="#7c3aed"/>
                <MultiSelect label="Villa No" options={villaOpts} selected={filters.villa}
                  onChange={v=>setFilters(f=>({...f,villa:v}))} color="#d97706" width={110}/>
                <MultiSelect label="Villa Type" options={unique("Villa Type")} selected={filters.villaType}
                  onChange={v=>setFilters(f=>({...f,villaType:v}))} color="#0891b2" width={120}/>
                <MultiSelect label="Category"
                  options={["Substructure","Structure","Finishing","Others"]}
                  selected={filters.category} color="#d97706"
                  onChange={v=>setFilters(f=>({...f,category:v,activity:[]}))}/>
                <MultiSelect label="Activity"
                  options={filters.category.length
                    ?[...new Set(data.filter(r=>filters.category.includes(r["Activity Category"]))
                      .map(r=>r["Specific Activity"]))].sort()
                    :unique("Specific Activity")}
                  selected={filters.activity}
                  onChange={v=>setFilters(f=>({...f,activity:v}))} color="#059669" width={180}/>
                <MultiSelect label="Status" options={unique("Review Status")} selected={filters.status}
                  onChange={v=>setFilters(f=>({...f,status:v}))} color="#0284c7" width={180}/>
                <MultiSelect label="Risk"
                  options={["High Risk","Moderate Risk","Low Risk","No Risk"]}
                  selected={filters.risk}
                  onChange={v=>setFilters(f=>({...f,risk:v}))} color="#dc2626"/>
                <MultiSelect label="Revision" options={unique("Revision")} selected={filters.revision}
                  onChange={v=>setFilters(f=>({...f,revision:v}))} width={110}/>
              </div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:10}}>
                {[{label:"REVISION DATE",fk:"revDateFrom",tk:"revDateTo"},
                  {label:"MODIFIED DATE",fk:"modDateFrom",tk:"modDateTo"}].map(({label,fk,tk})=>(
                  <div key={label}>
                    <div style={{...T.label,marginBottom:5}}>{label}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <input type="date" style={si} value={filters[fk]}
                        onChange={e=>setFilters(f=>({...f,[fk]:e.target.value}))}/>
                      <span style={{color:"#d1d5db"}}>—</span>
                      <input type="date" style={si} value={filters[tk]}
                        onChange={e=>setFilters(f=>({...f,[tk]:e.target.value}))}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                {[{label:"DAYS FOR APPROVAL",mk:"approvalMin",xk:"approvalMax"},
                  {label:"DAYS FOR REVISION",mk:"revisionMin",xk:"revisionMax"},
                  {label:"DAYS ON HOLD",mk:"holdMin",xk:"holdMax"}].map(({label,mk,xk})=>(
                  <div key={label}>
                    <div style={{...T.label,marginBottom:5}}>{label}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <input type="number" placeholder="Min" style={ni}
                        value={filters[mk]} onChange={e=>setFilters(f=>({...f,[mk]:e.target.value}))}/>
                      <span style={{color:"#d1d5db",fontSize:11}}>—</span>
                      <input type="number" placeholder="Max" style={ni}
                        value={filters[xk]} onChange={e=>setFilters(f=>({...f,[xk]:e.target.value}))}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filtered Pie */}
            {filteredPieItems.length>0&&(
              <div style={{background:"#f8fafc",borderRadius:10,padding:14,
                border:"1px solid #e2e8f0",minWidth:230,alignSelf:"start"}}>
                <div style={{...T.label,marginBottom:10}}>FILTERED RESULTS</div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <DonutChart items={filteredPieItems} size={110}/>
                  <div>
                    {filteredPieItems.slice(0,6).map((d,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                        <div style={{width:8,height:8,borderRadius:1,background:d.color,flexShrink:0}}/>
                        <span style={{color:"#374151",fontSize:9,flex:1}}>{d.label}</span>
                        <span style={{color:d.color,fontWeight:700,fontSize:10}}>{d.value}</span>
                        <span style={{color:"#9ca3af",fontSize:9}}>
                          ({((d.value/filtered.length)*100).toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Column selector + report near table */}
        {data.length>0&&(
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
            <MultiSelect label="Visible Columns" options={ALL_COLS}
              selected={visibleCols} onChange={setVisCols} color="#6b7280" width={180}/>
            <button onClick={()=>generateReport(sorted,filters,search,uploadedAt,actPreds,catPreds)}
              style={{padding:"8px 16px",background:"#7c3aed",color:"white",border:"none",
                borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>
              📄 Generate Report ({sorted.length})
            </button>
          </div>
        )}

        {/* TABLE */}
        <div ref={tableRef}>
          {loading?(
            <div style={{...T.section,textAlign:"center",padding:60,color:"#6b7280"}}>Loading data...</div>
          ):data.length>0?(
            <>
              <PageNav/>
              <div style={{overflowX:"auto",borderRadius:12,
                boxShadow:"0 4px 16px rgba(0,0,0,0.08)",border:"1px solid #e2e8f0"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr style={{background:"#1e293b"}}>
                      <th style={{padding:"10px 10px",color:"#64748b",textAlign:"left",
                        borderBottom:"1px solid #334155",whiteSpace:"nowrap",fontSize:10}}>#</th>
                      <th style={{padding:"10px 8px",color:"#64748b",textAlign:"center",
                        borderBottom:"1px solid #334155",whiteSpace:"nowrap",fontSize:10,
                        width:72,minWidth:72}}>Actions</th>
                      {visibleCols.map(col=>(
                        <th key={col} onClick={()=>handleSort(col)}
                          style={{padding:"10px 10px",color:"#94a3b8",textAlign:"left",
                            borderBottom:"1px solid #334155",whiteSpace:"nowrap",fontSize:10,
                            fontWeight:700,cursor:"pointer",userSelect:"none",
                            background:sortCol===col?"#162032":"transparent"}}>
                          {col}
                          <span style={{color:sortCol===col?"#38bdf8":"#475569",marginLeft:4,fontSize:9}}>
                            {sortCol===col?(sortDir==="asc"?"▲":"▼"):"⇅"}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>



                  <tbody>
                    {pageRows.map((row,i)=>{
                      const risk=row["Risk Status"]||""
                      const rowBg=risk==="High Risk"?"#fff5f5":risk==="Moderate Risk"?"#fffbeb":i%2===0?"#fff":"#f9fafb"
                      return (
                        <tr key={i} style={{background:rowBg}}
                          onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                          onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                          <td style={{padding:"8px 10px",borderBottom:"1px solid #f1f5f9",
                            color:"#9ca3af",fontSize:10,whiteSpace:"nowrap"}}>
                            {(page-1)*ROWS_PER_PAGE+i+1}
                          </td>
                          <td style={{padding:"6px 8px",borderBottom:"1px solid #f1f5f9",
                            textAlign:"center",whiteSpace:"nowrap"}}>
                            <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                              <button onClick={()=>setPdfDocNum(row["Document No"])}
                                title="View PDF" style={{background:"#fee2e2",border:"none",
                                  borderRadius:5,width:26,height:26,cursor:"pointer",fontSize:13}}>
                                📄
                              </button>
                              <button onClick={()=>setInspectionRow(row)}
                                title="Inspection Update" style={{background:"#dbeafe",border:"none",
                                  borderRadius:5,width:26,height:26,cursor:"pointer",fontSize:13}}>
                                📝
                              </button>
                            </div>
                          </td>
                          {visibleCols.map(col=>{
                            const v=String(row[col]||"")
                            let color="#374151",fw=400,ff="inherit"
                            let display=v

                            if(DATE_COLS.includes(col)) display=formatDate(v)
                            if(col==="Review Status"){color=STATUS_COLORS[v]||"#374151";fw=600}
                            if(col==="Activity Category"){color=CAT_COLORS[v]||"#374151";fw=600}
                            if(col==="Risk Status"){color=RISK_COLORS[v]||"#374151";fw=700}
                            if(col==="Predicted Days"){color="#0284c7";fw=700}
                            if(col==="Document No"){color="#1e40af";ff="monospace"}
                            if(col==="Days on Hold"){
                              const hc=holdColor(row)
                              color=hc; fw=700
                            }

                            return (
                              <td key={col} style={{
                                padding:"8px 10px",borderBottom:"1px solid #f1f5f9",
                                color,fontWeight:fw,fontFamily:ff,
                                whiteSpace:col==="Title"||col==="Document No"?"normal":"nowrap",
                                minWidth:col==="Title"?300:col==="Document No"?120:undefined,
                                maxWidth:col==="Title"?420:col==="Document No"?160:undefined,
                                wordBreak:col==="Document No"||col==="Title"?"break-word":"normal",
                                fontSize:col==="Document No"?10:11,lineHeight:1.4
                              }}>
                                {display}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <PageNav/>
            </>
          ):(
            <div style={{...T.section,padding:80,textAlign:"center"}}>
              <div style={{fontSize:48,marginBottom:14}}>📊</div>
              <div style={{color:"#1e293b",fontSize:18,fontWeight:800,marginBottom:8}}>No Data Loaded</div>
              <div style={{color:"#6b7280"}}>Upload your Aconex Excel export to begin</div>
            </div>
          )}
        </div>
      </div>
      {inspectionRow&&<InspectionUpdate row={inspectionRow} user={user} onClose={()=>setInspectionRow(null)}/>}
      {pdfDocNum&&<PDFModal docNumber={pdfDocNum} onClose={()=>setPdfDocNum(null)}/>}
    </div>
  )
}


import { exportWIRToExcel } from './excelExport'
import InspectionUpdate from './InspectionUpdate'
import PDFModal from './PDFModal'