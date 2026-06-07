import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { exportInspectionReport } from './excelExport'

function fmtTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString('en-AE', {
      day:'2-digit', month:'short', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    })
  } catch { return ts }
}

const STATUS_C = {
  "A-Approved":"#059669","B-Approved with Comments":"#0284c7",
  "C-Revise & Resubmit":"#dc2626","Pending":"#ea580c"
}

export default function InspectionUpdate({ row, user, onClose }) {
  const [updates, setUpdates]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [photos, setPhotos]             = useState([])
  const [previews, setPreviews]         = useState([])
  const [ownership, setOwnership]       = useState('')
  const [siteReason, setSiteReason]     = useState('')
  const [severity, setSeverity]         = useState('')
  const [consultAction, setConsultAction] = useState('')
  const [updateText, setUpdateText]     = useState('')
  const [comments, setComments]         = useState('')

  useEffect(() => { loadUpdates() }, [row])

  async function loadUpdates() {
    setLoading(true)
    const { data } = await supabase
      .from('inspection_updates')
      .select('*, inspection_photos(id, photo_url, created_at)')
      .eq('doc_number', row['Document No'])
      .order('created_at', { ascending: false })
    setUpdates(data || [])
    setLoading(false)
  }

  function resetForm() {
    setOwnership(''); setSiteReason(''); setSeverity('')
    setConsultAction(''); setUpdateText(''); setComments('')
    setPhotos([]); setPreviews([])
  }

  function validate() {
    if (!ownership) return 'Select ownership'
    if (ownership === 'Site Engineer') {
      if (!siteReason) return 'Select site reason'
      if (siteReason === 'Site not ready' && !updateText.trim()) return 'Add inspection update'
      if (siteReason === 'Comments need to be rectified') {
        if (!severity) return 'Select comment severity'
        if (!comments.trim()) return 'Add comments'
      }
    }
    if (ownership === 'Consultant') {
      if (!consultAction) return 'Select consultant action'
      if (!comments.trim()) return 'Add comments'
    }
    return null
  }

  async function handleSave() {
    const err = validate(); if (err) { alert(err); return }
    setSaving(true)
    try {
      const { data: u, error } = await supabase
        .from('inspection_updates')
        .insert({
          doc_number: row['Document No'],
          ir_title: row['Title'],
          ir_status: row['Review Status'],
          revision_date: row['Revision Date'],
          ownership,
          site_reason: siteReason || null,
          comment_severity: severity || null,
          consultant_action: consultAction || null,
          update_text: updateText || null,
          comments: comments || null,
          created_by: user.username
        }).select().single()

      if (error) throw error

      // Upload photos
      for (const photo of photos) {
        const fname = `${u.id}/${Date.now()}_${photo.name.replace(/\s/g,'_')}`
        const { error: upErr } = await supabase.storage
          .from('inspection-photos').upload(fname, photo)
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('inspection-photos').getPublicUrl(fname)
          await supabase.from('inspection_photos').insert({ update_id: u.id, photo_url: publicUrl })
        }
      }
      resetForm(); await loadUpdates()
    } catch (e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  async function handleExportUpdates() {
    const allUpdates = await supabase
      .from('inspection_updates')
      .select('*, inspection_photos(id, photo_url)')
      .eq('doc_number', row['Document No'])
      .order('created_at', { ascending: false })
    exportInspectionReport(allUpdates.data || [], `Updates_${row['Document No']}`)
  }

  // Style helpers
  const btnSelect = (active, color='#0284c7', bgActive='#eff6ff') => ({
    flex:1, padding:"9px 8px",
    border: `2px solid ${active ? color : '#d1d5db'}`,
    borderRadius:8, background: active ? bgActive : '#fff',
    color: active ? color : '#6b7280',
    fontWeight: active ? 700 : 400, cursor:'pointer', fontSize:11
  })
  const textarea = {
    width:'100%', padding:'10px', border:'1px solid #d1d5db',
    borderRadius:8, fontSize:12, color:'#374151', resize:'vertical',
    minHeight:76, outline:'none', fontFamily:'inherit', boxSizing:'border-box'
  }

  return (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,
      display:'flex',alignItems:'flex-end',justifyContent:'flex-end'
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:'#fff',width:'100%',maxWidth:580,height:'100vh',
        overflowY:'auto',boxShadow:'-4px 0 32px rgba(0,0,0,0.2)',
        display:'flex',flexDirection:'column'
      }}>
        {/* Header */}
        <div style={{background:'#1e293b',padding:'16px 20px',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{flex:1,paddingRight:12}}>
              <div style={{color:'#64748b',fontSize:9,letterSpacing:1.5,marginBottom:4}}>
                INSPECTION UPDATE
              </div>
              <div style={{color:'#38bdf8',fontSize:10,fontFamily:'monospace',
                fontWeight:700,marginBottom:6,wordBreak:'break-all'}}>
                {row['Document No']}
              </div>
              <div style={{color:'#94a3b8',fontSize:11,lineHeight:1.5}}>
                {(row['Title']||'').substring(0,110)}{(row['Title']||'').length>110?'...':''}
              </div>
            </div>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <button onClick={handleExportUpdates}
                title="Export updates to Excel"
                style={{background:'#059669',border:'none',color:'#fff',
                  borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:11,fontWeight:600}}>
                📊 XLS
              </button>
              <button onClick={onClose}
                style={{background:'#334155',border:'none',color:'#94a3b8',
                  borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:16}}>
                ✕
              </button>
            </div>
          </div>
          {/* Info badges */}
          <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
            {[
              {l:'Status',v:row['Review Status'],c:STATUS_C[row['Review Status']]||'#6b7280'},
              {l:'Rev Date',v:row['Revision Date']},
              {l:'Frond',v:row['Frond']},{l:'Villa',v:row['Villa No']},{l:'Zone',v:row['Zone']},
            ].filter(x=>x.v).map(({l,v,c})=>(
              <div key={l} style={{background:'#334155',borderRadius:5,padding:'3px 8px',
                display:'flex',gap:5,alignItems:'center'}}>
                <span style={{color:'#64748b',fontSize:9}}>{l}</span>
                <span style={{color:c||'#f1f5f9',fontSize:10,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Update History */}
        <div style={{flex:1,overflowY:'auto',padding:'14px 20px',background:'#f8fafc'}}>
          <div style={{fontSize:10,fontWeight:800,color:'#374151',
            letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>
            History ({updates.length})
          </div>
          {loading ? (
            <div style={{textAlign:'center',padding:24,color:'#9ca3af'}}>Loading...</div>
          ) : updates.length===0 ? (
            <div style={{textAlign:'center',padding:32,color:'#9ca3af',fontSize:13}}>
              No updates yet. Add the first one below.
            </div>
          ) : updates.map(u=>(
            <div key={u.id} style={{
              background:'#fff',borderRadius:10,padding:14,marginBottom:10,
              borderLeft:`4px solid ${u.ownership==='Site Engineer'?'#d97706':'#0284c7'}`,
              border:'1px solid #e2e8f0',
              borderLeftWidth:4,borderLeftColor:u.ownership==='Site Engineer'?'#d97706':'#0284c7',
              borderLeftStyle:'solid'
            }}>
              <div style={{display:'flex',justifyContent:'space-between',
                alignItems:'flex-start',marginBottom:8}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  <span style={{
                    background:u.ownership==='Site Engineer'?'#fef3c7':'#dbeafe',
                    color:u.ownership==='Site Engineer'?'#92400e':'#1e40af',
                    borderRadius:12,padding:'2px 10px',fontSize:10,fontWeight:700
                  }}>{u.ownership}</span>
                  {u.site_reason&&<span style={{background:'#f1f5f9',borderRadius:12,
                    padding:'2px 8px',fontSize:10,color:'#374151'}}>{u.site_reason}</span>}
                  {u.comment_severity&&<span style={{
                    background:u.comment_severity==='Major'?'#fee2e2':'#fef3c7',
                    color:u.comment_severity==='Major'?'#dc2626':'#d97706',
                    borderRadius:12,padding:'2px 8px',fontSize:10,fontWeight:700
                  }}>{u.comment_severity} Comments</span>}
                  {u.consultant_action&&<span style={{background:'#dbeafe',
                    borderRadius:12,padding:'2px 8px',fontSize:10,color:'#1e40af',fontWeight:600
                  }}>{u.consultant_action}</span>}
                </div>
                <div style={{color:'#9ca3af',fontSize:9,textAlign:'right',flexShrink:0,marginLeft:8}}>
                  <div style={{fontWeight:600}}>{fmtTime(u.created_at)}</div>
                  <div>by {u.created_by}</div>
                </div>
              </div>
              {u.update_text&&<div style={{color:'#374151',fontSize:12,
                marginBottom:6,lineHeight:1.6}}>{u.update_text}</div>}
              {u.comments&&<div style={{color:'#6b7280',fontSize:11,fontStyle:'italic',
                borderTop:'1px solid #f1f5f9',paddingTop:6,marginTop:6,lineHeight:1.5}}>
                {u.comments}</div>}
              {u.inspection_photos?.length>0&&(
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
                  {u.inspection_photos.map(p=>(
                    <a key={p.id} href={p.photo_url} target="_blank" rel="noreferrer">
                      <img src={p.photo_url} alt="photo"
                        style={{width:72,height:72,objectFit:'cover',borderRadius:6,
                          border:'2px solid #e2e8f0',cursor:'pointer',transition:'transform 0.1s'}}
                        onMouseOver={e=>e.target.style.transform='scale(1.05)'}
                        onMouseOut={e=>e.target.style.transform='scale(1)'}/>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add New Update */}
        <div style={{background:'#fff',borderTop:'2px solid #e2e8f0',
          padding:'16px 20px',flexShrink:0}}>
          <div style={{fontSize:10,fontWeight:800,color:'#374151',
            letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>
            Add Update
          </div>

          {/* Ownership */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6}}>
              Assign Ownership *
            </div>
            <div style={{display:'flex',gap:8}}>
              {['Site Engineer','Consultant'].map(opt=>(
                <button key={opt} onClick={()=>{setOwnership(opt);setSiteReason('');
                  setSeverity('');setConsultAction('');setUpdateText('');setComments('')}}
                  style={btnSelect(ownership===opt)}>
                  {opt==='Site Engineer'?'🏗':'👷'} {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Site Engineer flow */}
          {ownership==='Site Engineer'&&(
            <>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6}}>Site Reason *</div>
                <div style={{display:'flex',gap:8}}>
                  {['Site not ready','Comments need to be rectified'].map(opt=>(
                    <button key={opt} onClick={()=>{setSiteReason(opt);setSeverity('');
                      setUpdateText('');setComments('')}}
                      style={btnSelect(siteReason===opt,'#d97706','#fff7ed')}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {siteReason==='Site not ready'&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6}}>
                    Inspection Update *
                  </div>
                  <textarea value={updateText} onChange={e=>setUpdateText(e.target.value)}
                    placeholder="Describe the site condition and reason site is not ready..."
                    style={textarea}/>
                </div>
              )}

              {siteReason==='Comments need to be rectified'&&(
                <>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6}}>
                      Comment Severity *
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      {['Major','Minor'].map(opt=>(
                        <button key={opt} onClick={()=>setSeverity(opt)}
                          style={btnSelect(severity===opt,
                            opt==='Major'?'#dc2626':'#d97706',
                            opt==='Major'?'#fef2f2':'#fff7ed')}>
                          {opt} Comments
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6}}>
                      Comments *
                    </div>
                    <textarea value={comments} onChange={e=>setComments(e.target.value)}
                      placeholder="Describe what needs to be rectified..."
                      style={textarea}/>
                  </div>
                </>
              )}
            </>
          )}

          {/* Consultant flow */}
          {ownership==='Consultant'&&(
            <>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6}}>
                  Consultant Action *
                </div>
                <div style={{display:'flex',gap:8}}>
                  {['Verbal Approval','Comments to the Consultant'].map(opt=>(
                    <button key={opt} onClick={()=>{setConsultAction(opt);setComments('')}}
                      style={btnSelect(consultAction===opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6}}>
                  Comments *
                </div>
                <textarea value={comments} onChange={e=>setComments(e.target.value)}
                  placeholder={consultAction==='Verbal Approval'
                    ?'Details of verbal approval received from consultant...'
                    :'Comments raised to the consultant...'}
                  style={textarea}/>
              </div>
            </>
          )}

          {/* Photos */}
          {ownership&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6}}>
                Photos <span style={{color:'#9ca3af',fontWeight:400}}>(Optional)</span>
              </div>
              <label style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
                border:'1.5px dashed #d1d5db',borderRadius:8,cursor:'pointer',
                background:'#f9fafb',color:'#6b7280',fontSize:12,transition:'border 0.15s'}}
                onMouseOver={e=>e.currentTarget.style.borderColor='#0284c7'}
                onMouseOut={e=>e.currentTarget.style.borderColor='#d1d5db'}>
                📷 Select Photos (multiple OK)
                <input type="file" accept="image/*" multiple
                  onChange={e=>{
                    const files=Array.from(e.target.files)
                    setPhotos(files)
                    setPreviews(files.map(f=>URL.createObjectURL(f)))
                  }}
                  style={{display:'none'}}/>
              </label>
              {previews.length>0&&(
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
                  {previews.map((p,i)=>(
                    <div key={i} style={{position:'relative'}}>
                      <img src={p} alt="preview"
                        style={{width:64,height:64,objectFit:'cover',borderRadius:6,
                          border:'1px solid #e2e8f0'}}/>
                      <button onClick={()=>{
                        const np=previews.filter((_,j)=>j!==i)
                        const nf=photos.filter((_,j)=>j!==i)
                        setPreviews(np); setPhotos(nf)
                      }} style={{position:'absolute',top:-6,right:-6,background:'#dc2626',
                        border:'none',borderRadius:'50%',width:18,height:18,
                        color:'white',cursor:'pointer',fontSize:10,
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {ownership&&(
            <button onClick={handleSave} disabled={saving} style={{
              width:'100%',padding:'13px',
              background:saving?'#9ca3af':'#0284c7',
              color:'white',border:'none',borderRadius:9,fontSize:13,
              fontWeight:700,cursor:saving?'default':'pointer',transition:'background 0.2s'
            }}>
              {saving?'💾 Saving...':'💾 Save Update'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}