import * as XLSX from 'xlsx'

const DATE_COLS = ['Revision Date','Inspection Date','Date Modified']

function fmtDate(v) {
  if (!v || v === '') return ''
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : v
}

// ── WIR ANALYTICS EXCEL EXPORT ─────────────────────────
export function exportWIRToExcel(sortedRows, visibleCols, filters, search, uploadedAt) {
  const wb = XLSX.utils.book_new()
  const dateStr = new Date().toLocaleString()

  const filterInfo = []
  if (filters.frond?.length)    filterInfo.push(`Frond: ${filters.frond.join(', ')}`)
  if (filters.category?.length) filterInfo.push(`Category: ${filters.category.join(', ')}`)
  if (filters.activity?.length) filterInfo.push(`Activity: ${filters.activity.join(', ')}`)
  if (filters.status?.length)   filterInfo.push(`Status: ${filters.status.join(', ')}`)
  if (filters.risk?.length)     filterInfo.push(`Risk: ${filters.risk.join(', ')}`)
  if (filters.revDateFrom)      filterInfo.push(`Rev From: ${fmtDate(filters.revDateFrom)}`)
  if (filters.revDateTo)        filterInfo.push(`Rev To: ${fmtDate(filters.revDateTo)}`)
  if (search)                   filterInfo.push(`Search: "${search}"`)

  const infoRows = [
    ['WIR ANALYTICS REPORT — SHAPOORJI PALLONJI MIDDLE EAST LLC'],
    ['The Palm Jebel Ali — Frond M & N'],
    [`Generated: ${dateStr}   |   Data: ${uploadedAt}   |   Total IRs: ${sortedRows.length}`],
    filterInfo.length ? [`Filters Applied: ${filterInfo.join('  |  ')}`] : null,
    [],
    visibleCols
  ].filter(Boolean)

  const dataRows = sortedRows.map(row =>
    visibleCols.map(col =>
      DATE_COLS.includes(col) ? fmtDate(row[col] || '') : (row[col] || '')
    )
  )

  const ws = XLSX.utils.aoa_to_sheet([...infoRows, ...dataRows])

  ws['!cols'] = visibleCols.map(col => ({
    wch: col === 'Title' ? 75 : col === 'Document No' ? 42 :
         col === 'Review Status' ? 30 : col === 'Specific Activity' ? 32 : 18
  }))

  const rows = []
  infoRows.forEach((_, i) => rows.push({ hpt: i === 0 ? 32 : 20 }))
  dataRows.forEach(() => rows.push({ hpt: 45 }))
  ws['!rows'] = rows

  ws['!merges'] = [{
    s: { r: 0, c: 0 },
    e: { r: 0, c: Math.min(visibleCols.length - 1, 8) }
  }]

  ws['!pageSetup'] = { paperSize: 8, orientation: 'landscape', fitToWidth: 1, fitToPage: true }

  XLSX.utils.book_append_sheet(wb, ws, 'WIR Analytics')
  XLSX.writeFile(wb, `WIR_Report_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ── INSPECTION UPDATES EXCEL EXPORT ────────────────────
export function exportInspectionReport(updates, title = 'Inspection_Report') {
  const wb = XLSX.utils.book_new()

  // Find max number of photos across all updates
  const maxPhotos = updates.reduce((max, u) => {
    return Math.max(max, (u.inspection_photos || []).length)
  }, 0)

  const baseHeaders = [
    'Document No', 'IR Title', 'IR Status', 'Revision Date',
    'Update Date', 'Updated By', 'Ownership', 'Site Reason',
    'Comment Severity', 'Consultant Action', 'Update Text', 'Comments'
  ]

  // Dynamically add photo columns
  const photoHeaders = Array.from({ length: maxPhotos }, (_, i) => `Photo ${i + 1}`)
  const headers = [...baseHeaders, ...photoHeaders]

  const rows = updates.map(u => {
    const photos = (u.inspection_photos || []).map(p => p.photo_url)
    // Pad with empty strings to match maxPhotos
    while (photos.length < maxPhotos) photos.push('')
    return [
      u.doc_number || '',
      u.ir_title || '',
      u.ir_status || '',
      fmtDate(u.revision_date || ''),
      u.created_at ? new Date(u.created_at).toLocaleString('en-AE') : '',
      u.created_by || '',
      u.ownership || '',
      u.site_reason || '',
      u.comment_severity || '',
      u.consultant_action || '',
      u.update_text || '',
      u.comments || '',
      ...photos
    ]
  })

  const dataStartRow = 4 // 0-indexed: title(0), generated(1), blank(2), headers(3), data starts at 4

  const ws = XLSX.utils.aoa_to_sheet([
    ['INSPECTION UPDATES REPORT — SHAPOORJI PALLONJI MIDDLE EAST LLC'],
    [`Generated: ${new Date().toLocaleString()}   |   Total Updates: ${updates.length}`],
    [],
    headers,
    ...rows
  ])

  // Add hyperlinks for all photo columns dynamically
  rows.forEach((row, rowIdx) => {
    const sheetRowIdx = dataStartRow + rowIdx
    for (let photoCol = 0; photoCol < maxPhotos; photoCol++) {
      const colIdx = 12 + photoCol
      const url = row[colIdx]
      if (url && url.startsWith('http')) {
        const cellAddr = XLSX.utils.encode_cell({ r: sheetRowIdx, c: colIdx })
        ws[cellAddr] = {
          t: 's',
          v: `Photo ${photoCol + 1}`,
          l: { Target: url, Tooltip: `Click to open Photo ${photoCol + 1}` }
        }
      }
    }
  })

  // Column widths
  ws['!cols'] = [
    ...baseHeaders.map(h => ({
      wch: h === 'IR Title' ? 70 : h === 'Document No' ? 42 :
           h === 'Update Text' || h === 'Comments' ? 50 : 22
    })),
    ...photoHeaders.map(() => ({ wch: 12 }))
  ]

  ws['!rows'] = [
    { hpt: 28 }, { hpt: 18 }, { hpt: 8 },
    { hpt: 20 },
    ...rows.map(() => ({ hpt: 60 }))
  ]

  ws['!pageSetup'] = { paperSize: 8, orientation: 'landscape', fitToWidth: 1, fitToPage: true }

  XLSX.utils.book_append_sheet(wb, ws, 'Updates')
  XLSX.writeFile(wb, `${title}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
