"""
PDF OCR processor for IR rejection reason extraction.
Run separately: python pdf_processor.py --folder /path/to/pdfs
"""
import re, os, json, sys, argparse
from typing import Optional, Dict

try:
    import pytesseract
    from PIL import Image
    import pdf2image
    OCR_OK = True
except ImportError:
    OCR_OK = False
    print("Install: pip install pytesseract pdf2image pillow")

REJECTION_CATEGORIES = {
    "Site Not Ready":            ["not ready","site not ready","incomplete","not complete","not started"],
    "Damage / Defect":           ["chipped","damaged","crack","cracked","defect","broken","spalling","honeycombing"],
    "Poor Workmanship":          ["workmanship","poor quality","not acceptable","unsatisfactory","not satisfactory"],
    "Non-Conformance to Drawing":["drawing","not as per","deviation","specification","not in accordance","not conforming"],
    "Missing Items":             ["missing","not provided","absent","incomplete"],
    "Cleanliness":               ["clean","debris","dirty","contamination"],
    "Insufficient Coverage":     ["coverage","insufficient","inadequate","not enough","thickness"],
    "Rework Required":           ["rework","rectify","rectification","to be rectified","prior to proceeding"],
    "Not Accessible":            ["not accessible","access","cannot inspect"],
}

COMMENT_PATTERNS = [
    r"structural\s*engineer[:\s\n]+(.*?)(?=mep\s*engineer|surveyor|project\s*manager|engineer\s*:|\Z)",
    r"engineer['\s]*s?\s*comment[s]?\s*[:\n]+(.*?)(?=status|approved|not\s*approved|\Z)",
    r"revise\s*[&]?\s*resubmit[.\s]*(.*?)(?=approved|not\s*approved|\Z)",
    r"inspected\s*at\s*site.*?(?:found|and)\s*(.*?)(?=\n\n|\Z)",
]

def extract_text_from_pdf(pdf_path: str) -> str:
    if not OCR_OK: return ""
    try:
        images = pdf2image.convert_from_path(pdf_path, dpi=250, first_page=1, last_page=2)
        return "\n".join(pytesseract.image_to_string(img, lang='eng') for img in images)
    except Exception as e:
        print(f"OCR error: {e}"); return ""

def extract_comment(full_text: str) -> Optional[str]:
    tl = full_text.lower()
    for pattern in COMMENT_PATTERNS:
        m = re.search(pattern, tl, re.DOTALL | re.IGNORECASE)
        if m:
            txt = m.group(1).strip()
            if len(txt) > 8: return txt[:600]
    return None

def categorize(comment: str) -> Dict:
    if not comment: return {"category":"Unclassified","keywords":[]}
    tl = comment.lower()
    scores = {}
    for cat, kws in REJECTION_CATEGORIES.items():
        found = [k for k in kws if k in tl]
        if found: scores[cat] = (len(found), found)
    if not scores: return {"category":"Other","keywords":[]}
    best = max(scores, key=lambda c: scores[c][0])
    return {"category": best, "keywords": scores[best][1]}

def process_folder(folder_path: str, output_file: str = "rejection_analysis.json"):
    results = []
    pdfs = [f for f in os.listdir(folder_path) if f.lower().endswith('.pdf')]
    print(f"Found {len(pdfs)} PDFs")
    for i, fname in enumerate(pdfs):
        doc_number = re.match(r'^([A-Z0-9-]+WIR-[A-Z]+-\d+)', fname)
        doc_num = doc_number.group(1) if doc_number else fname.replace('.pdf','')
        print(f"[{i+1}/{len(pdfs)}] Processing: {doc_num}")
        path = os.path.join(folder_path, fname)
        text = extract_text_from_pdf(path)
        comment = extract_comment(text)
        cat = categorize(comment)
        results.append({
            "doc_number": doc_num,
            "file": fname,
            "raw_comment": comment,
            "category": cat["category"],
            "keywords": cat["keywords"]
        })
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nDone. Results saved to {output_file}")
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--folder', required=True, help='Path to folder with PDFs')
    parser.add_argument('--output', default='rejection_analysis.json')
    args = parser.parse_args()
    process_folder(args.folder, args.output)