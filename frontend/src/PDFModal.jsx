import { useState, useEffect } from 'react'

const FOLDER_ID = import.meta.env.VITE_DRIVE_FOLDER_ID || ''
const API_KEY   = import.meta.env.VITE_DRIVE_API_KEY || ''

// Persistent cache for this session
const cache = { files: null, loaded: false }

async function loadDriveFiles() {
  if (cache.loaded) return cache.files
  if (!FOLDER_ID || !API_KEY) { cache.loaded=true; cache.files={}; return {} }
  try {
    let files = {}, pageToken = ''
    do {
      const url = `https://www.googleapis.com/drive/v3/files?` +
        `q='${FOLDER_ID}'+in+parents+and+mimeType='application/pdf'` +
        `&fields=nextPageToken,files(id,name)&pageSize=1000&key=${API_KEY}` +
        (pageToken ? `&pageToken=${pageToken}` : '')
      const res = await fetch(url)
      const data = await res.json()
      ;(data.files || []).forEach(f => {
        const name = f.name.replace(/\.pdf$/i, '')
        files[name] = f.id
        // Also index by document number (first portion before description)
        const docMatch = name.match(/^(PJAC?-[A-Z0-9-]+WIR-[A-Z]+-\d+)/i)
        if (docMatch) files[docMatch[1]] = f.id
      })
      pageToken = data.nextPageToken || ''
    } while (pageToken)
    cache.files = files; cache.loaded = true
    return files
  } catch(e) {
    console.error('Drive error:', e)
    cache.files = {}; cache.loaded = true
    return {}
  }
}

function findFile(docNumber, files) {
  if (!docNumber || !files) return null
  // Exact match
  if (files[docNumber]) return files[docNumber]
  // File name starts with doc number
  const match = Object.keys(files).find(k =>
    k.startsWith(docNumber) || docNumber.startsWith(k)
  )
  return match ? files[match] : null
}

export default function PDFModal({ docNumber, onClose }) {
  const [fileId, setFileId]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [configured, setConfigured] = useState(true)

  useEffect(() => {
    if (!FOLDER_ID || !API_KEY) { setConfigured(false); setLoading(false); return }
    setLoading(true); setNotFound(false); setFileId(null)
    loadDriveFiles().then(files => {
      const id = findFile(docNumber, files)
      if (id) setFileId(id)
      else setNotFound(true)
      setLoading(false)
    })
  }, [docNumber])

  return (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.72)',zIndex:9998,
      display:'flex',alignItems:'center',justifyContent:'center',padding:20
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:'#fff',borderRadius:14,overflow:'hidden',
        width:'90vw',maxWidth:920,height:'90vh',
        display:'flex',flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.4)'
      }}>
        {/* Header */}
        <div style={{background:'#1e293b',padding:'14px 20px',
          display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{color:'#64748b',fontSize:9,letterSpacing:1.5,marginBottom:2}}>PDF VIEWER</div>
            <div style={{color:'#38bdf8',fontSize:11,fontFamily:'monospace',fontWeight:700,
              wordBreak:'break-all',maxWidth:600}}>
              {docNumber}
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            {fileId&&(
              <a href={`https://drive.google.com/file/d/${fileId}/view`}
                target="_blank" rel="noreferrer"
                style={{padding:'7px 14px',background:'#0284c7',color:'#fff',
                  borderRadius:7,textDecoration:'none',fontSize:12,fontWeight:600}}>
                Open in Drive ↗
              </a>
            )}
            <button onClick={onClose} style={{background:'#334155',border:'none',
              color:'#94a3b8',borderRadius:6,padding:'7px 12px',cursor:'pointer',fontSize:14}}>
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
          background:'#f1f5f9'}}>
          {!configured ? (
            <div style={{textAlign:'center',color:'#6b7280',padding:40}}>
              <div style={{fontSize:36,marginBottom:12}}>⚙️</div>
              <div style={{fontSize:15,fontWeight:700,color:'#374151',marginBottom:8}}>
                Google Drive Not Configured
              </div>
              <div style={{fontSize:12,maxWidth:320,lineHeight:1.6}}>
                Add VITE_DRIVE_FOLDER_ID and VITE_DRIVE_API_KEY to your .env file
              </div>
            </div>
          ) : loading ? (
            <div style={{textAlign:'center',color:'#6b7280'}}>
              <div style={{fontSize:32,marginBottom:12}}>🔍</div>
              <div style={{fontSize:13}}>Searching for document in Google Drive...</div>
            </div>
          ) : notFound ? (
            <div style={{textAlign:'center',color:'#6b7280',padding:40}}>
              <div style={{fontSize:40,marginBottom:12}}>📄</div>
              <div style={{fontSize:15,fontWeight:700,color:'#374151',marginBottom:6}}>
                PDF Not Found
              </div>
              <div style={{fontSize:11,fontFamily:'monospace',color:'#0284c7',
                marginTop:6,wordBreak:'break-all',maxWidth:400}}>
                {docNumber}
              </div>
              <div style={{fontSize:11,color:'#9ca3af',marginTop:12,lineHeight:1.6}}>
                Make sure the PDF is uploaded to your configured Google Drive folder.
                <br/>File name should start with the document number.
              </div>
            </div>
          ) : (
            <iframe src={`https://drive.google.com/file/d/${fileId}/preview`}
              style={{width:'100%',height:'100%',border:'none'}}
              allow="autoplay" title="IR PDF Viewer"/>
          )}
        </div>
      </div>
    </div>
  )
}