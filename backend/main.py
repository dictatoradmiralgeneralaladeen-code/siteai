from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd, numpy as np
import re, io, json, os
from datetime import datetime, timedelta
import httpx

try:
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import LabelEncoder
    ML_OK = True
except: ML_OK = False

app = FastAPI()
app.add_middleware(CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://siteai-two.vercel.app",  # ← your actual Vercel URL
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

PROJECTS = {"SHAPOORJI":{"DMS-149063-3-F-M&N":{
    "company_name":"Shapoorji Pallonji Middle East LLC",
    "project_name":"The Palm Jebel Ali Frond M & N"}}}
USERS = {"anas":{"password":"1234","role":"QC Engineer"}}

class ProjectCheckRequest(BaseModel):
    company_code: str
    project_code: str

class LoginRequest(BaseModel):
    company_code: str
    project_code: str
    username: str
    password: str

@app.get("/")
def root(): return {"message":"SITE AI Backend Running"}

@app.post("/check-project")
def check_project(data: ProjectCheckRequest):
    c,p = data.company_code.upper(), data.project_code.upper()
    if c in PROJECTS and p in PROJECTS[c]: return {"valid":True,**PROJECTS[c][p]}
    return {"valid":False}

@app.post("/login")
def login(data: LoginRequest):
    c,p = data.company_code.upper(), data.project_code.upper()
    if c not in PROJECTS or p not in PROJECTS[c]:
        return {"success":False,"message":"Invalid project"}
    user = USERS.get(data.username.lower())
    if not user or user["password"] != data.password:
        return {"success":False,"message":"Invalid username or password"}
    return {"success":True,"username":data.username,"role":user["role"],**PROJECTS[c][p]}

DATA_FILE = "wir_data.json"
APPROVED_ST = ["A-Approved","B-Approved with Comments","F-Reviewed",
               "Approved to proceed with comments as noted"]
REVISE_ST  = ["C-Revise & Resubmit"]
PENDING_ST = ["Pending"]

# ── VILLA TYPE LOOKUP ────────────────────────────────────
VILLA_TYPE_M = {
    1:"BV-C",2:"BV-E",3:"BV-F",4:"BV-A",5:"BV-E",6:"BV-C",7:"BV-A",8:"BV-F",
    9:"BV-C",10:"BV-E",11:"BV-F",12:"BV-A",13:"BV-E",14:"BV-C",15:"BV-A",16:"BV-F",
    17:"BV-C",18:"BV-E",19:"BV-F",20:"BV-A",21:"BV-E",22:"BV-C",23:"BV-A",24:"BV-F",
    25:"BV-C",26:"BV-E",27:"BV-F",28:"BV-A",29:"BV-E",30:"BV-C",31:"BV-A",32:"BV-F",
    33:"BV-C",34:"BV-E",35:"BV-F",36:"BV-A",37:"BV-E",38:"BV-C",39:"BV-A",40:"BV-F",
    41:"BV-C",42:"BV-E",43:"BV-F",44:"BV-A",45:"BV-E",46:"BV-C",47:"BV-A",48:"BV-F",
    49:"BV-C",50:"BV-E",51:"BV-F",52:"BV-A",53:"BV-E",54:"BV-G",55:"BV-A",56:"BV-H",
    57:"BV-G",58:"BV-E",59:"BV-H",60:"BV-A",61:"BV-E",62:"BV-G",63:"BV-A",64:"BV-H",
    65:"BV-G",66:"BV-D",67:"BV-H",68:"BV-B",69:"BV-D",70:"BV-G",71:"BV-B",72:"BV-H",
    73:"BV-G",74:"BV-D",75:"BV-H",76:"BV-B",77:"BV-D",78:"BV-G",79:"BV-B",80:"BV-H",
    81:"BV-G",82:"BV-D",83:"BV-H",84:"BV-B",85:"BV-D",86:"BV-G",87:"BV-B",88:"BV-H",
    89:"BV-G",90:"BV-D",91:"BV-H",92:"BV-B",93:"BV-D",94:"BV-G",95:"BV-B",96:"BV-H",
    97:"BV-G",98:"BV-D",99:"BV-H",100:"BV-B",101:"BV-D",102:"BV-G",103:"BV-B",104:"BV-H",
    105:"BV-G",106:"BV-D",107:"BV-H",108:"BV-B",109:"BV-D",110:"BV-G",111:"BV-B",112:"BV-H",
    113:"BV-G",114:"BV-D",115:"BV-H",116:"BV-B",
    117:"SV-E",118:"SV-A",119:"SV-F",120:"SV-B",121:"SV-G",122:"SV-C",123:"SV-H",124:"SV-D",
    125:"SV-A",126:"SV-E",127:"SV-B",128:"SV-F",129:"SV-C",130:"SV-G",131:"SV-D",132:"SV-H",
    133:"SV-E",134:"SV-A",135:"SV-F",136:"SV-B",137:"SV-G",138:"SV-C",139:"SV-H",140:"SV-D",
    141:"SV-A",142:"SV-E",143:"SV-B",144:"SV-F",145:"SV-C",146:"SV-G"
}
VILLA_TYPE_N = {
    1:"BV-C",2:"BV-E",3:"BV-F",4:"BV-A",5:"BV-E",6:"BV-C",7:"BV-A",8:"BV-F",
    9:"BV-C",10:"BV-E",11:"BV-F",12:"BV-A",13:"BV-E",14:"BV-C",15:"BV-A",16:"BV-F",
    17:"BV-C",18:"BV-E",19:"BV-F",20:"BV-A",21:"BV-E",22:"BV-C",23:"BV-A",24:"BV-F",
    25:"BV-C",26:"BV-E",27:"BV-F",28:"BV-A",29:"BV-E",30:"BV-C",31:"BV-A",32:"BV-F",
    33:"BV-C",34:"BV-E",35:"BV-F",36:"BV-A",37:"BV-E",38:"BV-C",39:"BV-A",40:"BV-F",
    41:"BV-C",42:"BV-E",43:"BV-F",44:"BV-A",45:"BV-G",46:"BV-C",47:"BV-H",48:"BV-F",
    49:"BV-E",50:"BV-G",51:"BV-A",52:"BV-H",53:"BV-G",54:"BV-E",55:"BV-H",56:"BV-A",
    57:"BV-D",58:"BV-G",59:"BV-B",60:"BV-H",61:"BV-G",62:"BV-D",63:"BV-H",64:"BV-B",
    65:"BV-D",66:"BV-G",67:"BV-B",68:"BV-H",69:"BV-H",70:"BV-D",71:"BV-H",72:"BV-B",
    73:"BV-D",74:"BV-H",75:"BV-B",76:"BV-H",77:"BV-G",78:"BV-D",79:"BV-H",80:"BV-B",
    81:"BV-D",82:"BV-G",83:"BV-B",84:"BV-H",85:"BV-G",86:"BV-D",87:"BV-H",88:"BV-B",
    89:"BV-D",90:"BV-G",91:"BV-B",92:"BV-H",93:"BV-G",94:"BV-D",95:"BV-H",96:"BV-B",
    97:"BV-D",98:"BV-G",99:"BV-B",100:"BV-H",
    101:"SV-E",102:"SV-A",103:"SV-F",104:"SV-B",105:"SV-G",106:"SV-C",107:"SV-H",108:"SV-D",
    109:"SV-A",110:"SV-E",111:"SV-B",112:"SV-F",113:"SV-C",114:"SV-G",115:"SV-D",116:"SV-H",
    117:"SV-E",118:"SV-A",119:"SV-F",120:"SV-B",121:"SV-G",122:"SV-C",123:"SV-H",124:"SV-D",
    125:"SV-A",126:"SV-E",127:"SV-B",128:"SV-F",129:"SV-C",130:"SV-G"
}

def get_villa_type(frond, villa_no):
    try:
        v = int(villa_no)
        if frond == 'Frond M': return VILLA_TYPE_M.get(v,'')
        if frond == 'Frond N': return VILLA_TYPE_N.get(v,'')
        return ''
    except: return ''

def get_frond(title, doc_no=''):
    t = str(title)
    # "Frond N - BVH - 95" or "Frond M - BVC - 12"
    m = re.search(r'[Ff]rond\s+(M|N)\s*[-–]\s*BV', t)
    if m: return 'Frond M' if m.group(1)=='M' else 'Frond N'
    if 'PJA-FRM' in t: return 'Frond M'
    if 'PJA-FRN' in t: return 'Frond N'
    d = str(doc_no)
    if 'FRM' in d: return 'Frond M'
    if 'FRN' in d: return 'Frond N'
    return 'Unknown'

def get_villa(title):
    t = str(title)
    for pat in [
        r'PJA-FR[MN]-V-(\d+)',
        r'\bV-(\d+)\b',
        r'[Ff]rond\s+[MN]\s*[-–]\s*BV[A-Z]+\s*[-–]\s*(\d+)',  # Frond N - BVH - 95
        r'[Vv]illa\s+[Nn]o\.?\s*(\d+)',
        r'[Vv]illa[-\s]+(\d+)\b',
        r'\bBV[A-Z]\s+(\d+)\b',
        r'\bBV[A-Z]-(\d+)\b',
    ]:
        m = re.search(pat, t)
        if m: return int(m.group(1))
    return None

def get_zone(frond, villa):
    if villa is None: return 'Unknown'
    try: v = int(villa)
    except: return 'Unknown'
    if frond == 'Frond M':
        if 1<=v<=28: return 'Zone-1'
        if 29<=v<=56: return 'Zone-2'
        if 57<=v<=86: return 'Zone-3'
        if 87<=v<=116: return 'Zone-4'
        if 117<=v<=132: return 'Zone-5A'
        if 133<=v<=146: return 'Zone-5B'
    elif frond == 'Frond N':
        if 1<=v<=24: return 'Zone-1'
        if 25<=v<=48: return 'Zone-2'
        if 49<=v<=74: return 'Zone-3'
        if 75<=v<=100: return 'Zone-4A'
        if 101<=v<=116: return 'Zone-5A'
        if 117<=v<=146: return 'Zone-5B'
    return 'Unknown'

def classify_activity(title):
    t = str(title).lower()
    insp = 'check' in t or 'inspection' in t
    if any(x in t for x in ['polyurea','polyurethane','polyuria']): return 'Finishing','Polyurea'
    subst = ['raft','raft side','garage','pergola','boundary wall','garbage','electrical','water tank','lift']
    surf  = ['surface preperation','surface preparation','surface prep']
    lay   = ['dry lay','drylay',' lay ']
    if 'fdt' in t and 'formation' in t: return 'Substructure','FDT-Formation Level'
    if 'fdt' in t and ('road base' in t or 'roadbase' in t): return 'Substructure','FDT-Roadbase'
    if 'fdt' in t and 'backfill' in t and 'around' in t: return 'Substructure','FDT-Around Water Tank'
    if 'fdt' in t: return 'Substructure','FDT-Formation Level'
    if 'formation' in t and any(x in t for x in ['water tank','watertank','lift','raft']): return 'Substructure','FDT-Formation Level'
    if ('antitermite' in t or 'anti-termite' in t or 'antisemite' in t or ('anti' in t and 'termite' in t)) and 'pcc' in t: return 'Substructure','Anti-Termite & PCC'
    if 'precast water tank' in t and 'installation' in t: return 'Substructure','Precast Water Tank Installation'
    if any(x in t for x in subst) and 'bitumen' in t: return 'Substructure','Bitumen Application for Substructure'
    if any(x in t for x in subst) and any(x in t for x in surf) and 'floating foundation' not in t: return 'Substructure','Surface Preparation for Substructure'
    if 'water tank' in t and 'membrane' in t: return 'Substructure','Water Tank Membrane'
    if 'lift' in t and 'membrane' in t: return 'Substructure','Lift Membrane'
    if 'floating foundation' in t and 'casting' in t: return 'Structure','Concrete'
    if 'water' in t and 'concret' in t: return 'Structure','Concrete'
    if 'precast boundary wall' in t or ('lego' in t and 'boundary' in t): return 'Structure','Precast Boundary Wall'
    if 'boundary' in t and 'wall' in t and ('panels' in t or 'installation' in t): return 'Structure','Boundary Wall Installation'
    if 'steel' in t and 'installation' in t: return 'Structure','Steel Structure Installation'
    if insp and 'formwork' in t: return 'Structure','Formwork'
    if insp and ('reinforcement' in t or 'rebar' in t): return 'Structure','Reinforcement'
    if insp and 'concrete' in t: return 'Structure','Concrete'
    if any(x in t for x in surf) and 'floating foundation' in t: return 'Finishing','Waterproofing'
    no_sub = ['raft','garage','pergola','boundary wall','garbage','electrical','water tank']
    if any(x in t for x in ['waterproofing application','waterproofing','water proofing','waterproof']) and not any(x in t for x in no_sub): return 'Finishing','Waterproofing'
    if 'plaster' in t: return 'Finishing','Plaster'
    if ('marble' in t or 'tile' in t) and 'installation' in t: return 'Finishing','Tile/Marble Installation'
    if ('marble' in t or 'tundra' in t) and any(x in t for x in lay): return 'Finishing','Tile/Marble Setting Out'
    if ('marble' in t or 'tile' in t) and ('setting out' in t or 'settingout' in t): return 'Finishing','Tile/Marble Setting Out'
    if 'stone' in t and ('setting out' in t or 'settingout' in t): return 'Finishing','Tile/Marble Setting Out'
    if insp and any(x in t for x in ['area','drawing','floor']) and ('setting out' in t or 'settingout' in t): return 'Finishing','Tile/Marble Setting Out'
    if ('block work' in t or 'blockwork' in t) and insp: return 'Finishing','Block Work'
    if 'block' in t and 'layout' in t: return 'Finishing','Block Work'
    if insp and 'fire sealant' in t: return 'Finishing','Fire Sealant'
    if 'leakage' in t: return 'Finishing','Leakage Test'
    if 'screed' in t: return 'Finishing','Screed'
    if 'stone flooring installation' in t: return 'Finishing','Stone Flooring Installation'
    if 'primer application' in t and any(x in t for x in ['wall','elevation','floor','room','highlited']): return 'Finishing','Primer Application'
    if 'vapour barrier' in t: return 'Finishing','Vapour Barrier'
    if 'grid works' in t or 'grid work' in t: return 'Finishing','Grid Works'
    if insp and 'ceiling' in t: return 'Finishing','Ceiling'
    if 'paint' in t and 'elevation' in t: return 'Finishing','Paint'
    if 'filler application' in t and insp: return 'Finishing','Filler Application'
    if insp and 'texture' in t: return 'Finishing','Texture'
    return 'Others','Others'

def count_sundays(d1, d2):
    count, cur = 0, d1+timedelta(days=1)
    while cur <= d2:
        if cur.weekday()==6: count+=1
        cur+=timedelta(days=1)
    return count

def calc_days(rev_str, mod_str):
    try:
        if not rev_str or not mod_str: return None
        d1=datetime.strptime(str(rev_str)[:10],'%Y-%m-%d')
        d2=datetime.strptime(str(mod_str)[:10],'%Y-%m-%d')
        if d2<d1: return 0
        return max(0,(d2-d1).days-1-count_sundays(d1,d2))
    except: return None

def calc_hold_days(rev_str):
    try:
        if not rev_str or str(rev_str) in ('','nan','NaT'): return None
        d1=datetime.strptime(str(rev_str)[:10],'%Y-%m-%d')
        d2=datetime.now().replace(hour=0,minute=0,second=0,microsecond=0)
        if d2<d1: return 0
        return max(0,(d2-d1).days-count_sundays(d1,d2))
    except: return None

def get_inspection_date(rev_str):
    try:
        if not rev_str or str(rev_str) in ('','nan','NaT'): return ''
        d=datetime.strptime(str(rev_str)[:10],'%Y-%m-%d')
        return (d+timedelta(days=2 if d.weekday()==5 else 1)).strftime('%Y-%m-%d')
    except: return ''

def day_columns(status, rev, mod):
    d=calc_days(rev,mod); ds=str(d) if d is not None else '-'
    h=calc_hold_days(rev); hs=str(h) if h is not None else '-'
    s=str(status)
    return (ds if s in APPROVED_ST else s,
            ds if s in REVISE_ST else s,
            hs if s in PENDING_ST else s)

def fix_revision(v):
    if pd.isna(v) or str(v).strip() in ['','nan','None']: return ''
    try: return str(int(float(str(v)))).zfill(2)
    except: return str(v)

def is_num(v):
    try: float(str(v)); return True
    except: return False

def winsorize(series):
    """IQR-based outlier capping — does not remove, only caps"""
    q1,q3 = series.quantile(0.25), series.quantile(0.75)
    iqr = q3-q1
    return series.clip(lower=max(0,q1-1.5*iqr), upper=q3+1.5*iqr)

def build_predictions(records):
    try:
        df = pd.DataFrame(records)
        appr = df[df['Days for Approval'].apply(is_num)].copy()
        appr['dv'] = appr['Days for Approval'].apply(float)
        # Outlier removal per activity
        cleaned_dv = []
        for act, grp in appr.groupby('Specific Activity'):
            if len(grp) >= 4:
                cleaned_dv.append(winsorize(grp['dv']))
            else:
                cleaned_dv.append(grp['dv'])
        if cleaned_dv:
            appr['dv'] = pd.concat(cleaned_dv).reindex(appr.index)

        act_grp = appr.groupby(['Activity Category','Specific Activity'])['dv'].agg(
            mean='mean',median='median',std='std',count='count').fillna(0).round(1).reset_index()
        activity_preds = {r['Specific Activity']:{
            'category':r['Activity Category'],'mean':float(r['mean']),
            'median':float(r['median']),'std':max(float(r['std']),1.0),'count':int(r['count'])
        } for _,r in act_grp.iterrows()}

        cat_grp = appr.groupby('Activity Category')['dv'].agg(
            mean='mean',median='median',std='std',count='count').fillna(0).round(1).reset_index()
        category_preds = {r['Activity Category']:{
            'mean':float(r['mean']),'median':float(r['median']),
            'std':max(float(r['std']),1.0),'count':int(r['count'])
        } for _,r in cat_grp.iterrows()}

        model,encoders = None,{}
        feat_cols=['Activity Category','Specific Activity','Frond','Zone','Villa Type']
        if ML_OK and len(appr)>=30:
            X_tr=[]
            for col in feat_cols:
                le=LabelEncoder()
                v=appr[col].fillna('Unknown').astype(str).values
                le.fit(v); encoders[col]=le
                X_tr.append(le.transform(v))
            X_tr=np.column_stack(X_tr); y_tr=appr['dv'].values
            model=GradientBoostingRegressor(n_estimators=150,max_depth=4,
                learning_rate=0.08,subsample=0.8,random_state=42)
            model.fit(X_tr,y_tr)

        pending=df[df['Days on Hold'].apply(is_num)].copy()
        ir_preds={}
        for _,row in pending.iterrows():
            doc=row['Document No']; act=row.get('Specific Activity','')
            cat=row.get('Activity Category',''); hold=float(row['Days on Hold'])
            pred=None
            if model and encoders:
                try:
                    x=[]
                    for col in feat_cols:
                        le=encoders[col]; v=str(row.get(col,'Unknown') or 'Unknown')
                        x.append(le.transform([v])[0] if v in le.classes_ else 0)
                    pred=float(model.predict([np.array(x)])[0])
                except: pass
            if pred is None:
                stats=activity_preds.get(act,category_preds.get(cat,{}))
                pred=stats.get('mean',None)
            if pred is None:
                ir_preds[doc]={'predicted':'-','risk':'Unknown','overdue':0}; continue
            stats=activity_preds.get(act,category_preds.get(cat,{}))
            std=stats.get('std',1.0); overdue=hold-pred
            risk='No Risk' if overdue<=0 else 'Low Risk' if overdue<=std else 'Moderate Risk' if overdue<=2*std else 'High Risk'
            ir_preds[doc]={'predicted':round(pred,1),'risk':risk,'overdue':round(overdue,1)}

        return activity_preds, category_preds, ir_preds
    except Exception as e:
        print(f"Prediction error: {e}"); return {},{},{}

def build_weekly_data(records):
    try:
        df=pd.DataFrame(records)
        appr=df[df['Days for Approval'].apply(is_num)].copy()
        if appr.empty: return []
        appr['dv']=appr['Days for Approval'].apply(float)
        # Winsorize per activity
        parts=[]
        for act,grp in appr.groupby('Specific Activity'):
            g=grp.copy()
            if len(g)>=4: g['dv']=winsorize(g['dv'])
            parts.append(g)
        if parts: appr=pd.concat(parts)
        appr['rd']=pd.to_datetime(appr['Revision Date'],errors='coerce')
        appr=appr.dropna(subset=['rd'])
        appr['week']=(appr['rd']-pd.to_timedelta(appr['rd'].dt.dayofweek,unit='d')).dt.strftime('%Y-%m-%d')
        w=appr.groupby(['week','Activity Category','Specific Activity'])['dv'].agg(
            avg_days='mean',count='count').round(1).reset_index()
        return w.to_dict(orient='records')
    except: return []

def build_weekly_revision_data(records):
    try:
        df=pd.DataFrame(records)
        df['rd']=pd.to_datetime(df['Revision Date'],errors='coerce')
        df=df.dropna(subset=['rd'])
        df['week']=(df['rd']-pd.to_timedelta(df['rd'].dt.dayofweek,unit='d')).dt.strftime('%Y-%m-%d')
        total_by_week=df.groupby('week').size().reset_index(name='total')
        rev=df[df['Review Status']=='C-Revise & Resubmit'].copy()
        if rev.empty: return []
        w=rev.groupby(['week','Activity Category','Specific Activity']).size().reset_index(name='count')
        w=w.merge(total_by_week,on='week',how='left')
        w['pct']=(w['count']/w['total']*100).round(1)
        return w.to_dict(orient='records')
    except: return []

def process_excel(file_bytes):
    raw=pd.read_excel(io.BytesIO(file_bytes),header=None)
    hrow=0
    for i,row in raw.iterrows():
        if 'Document No' in str(row.values): hrow=i; break
    df=pd.read_excel(io.BytesIO(file_bytes),skiprows=hrow,header=0)
    df=df[df['Document No'].notna()&(df['Document No']!='Document No')].copy()
    df=df[~df['Document No'].astype(str).str.startswith('SPM-PJA-WIR-INF')]
    df['Frond']=df.apply(lambda r:get_frond(r['Title'],r['Document No']),axis=1)
    df['Villa No']=df['Title'].apply(get_villa)
    df['Zone']=df.apply(lambda r:get_zone(r['Frond'],r['Villa No']),axis=1)
    df['Villa No']=df['Villa No'].apply(lambda x:str(int(x)) if pd.notna(x) and str(x) not in ['','None','nan'] else '')
    df['Villa Type']=df.apply(lambda r:get_villa_type(r['Frond'],r['Villa No']),axis=1)
    res=df['Title'].apply(lambda t:pd.Series(classify_activity(t)))
    df['Activity Category']=res[0]; df['Specific Activity']=res[1]
    for col in ['Revision Date','Date Modified']:
        if col in df.columns:
            df[col]=pd.to_datetime(df[col],errors='coerce').dt.strftime('%Y-%m-%d')
    if 'Revision' in df.columns: df['Revision']=df['Revision'].apply(fix_revision)
    days=df.apply(lambda r:pd.Series(day_columns(
        r.get('Review Status',''),r.get('Revision Date',''),r.get('Date Modified',''))),axis=1)
    df['Days for Approval']=days[0]; df['Days for Revision']=days[1]; df['Days on Hold']=days[2]
    df['Inspection Date']=df['Revision Date'].apply(get_inspection_date)
    df=df.drop(columns=[c for c in ['File','Lock','Size'] if c in df.columns],errors='ignore')
    df=df.fillna('').astype(str).replace({'nan':'','None':'','NaT':''})
    records=df.to_dict(orient='records')
    act_p,cat_p,ir_preds=build_predictions(records)
    weekly=build_weekly_data(records)
    weekly_rev=build_weekly_revision_data(records)
    for r in records:
        doc=r.get('Document No','')
        if doc in ir_preds:
            p=ir_preds[doc]; r['Predicted Days']=str(p['predicted']); r['Risk Status']=p['risk']
        else:
            r['Predicted Days']=''; r['Risk Status']=''
    return records,act_p,cat_p,weekly,weekly_rev

@app.post("/analytics/upload")
async def upload(file: UploadFile=File(...)):
    contents=await file.read()
    records,act_p,cat_p,weekly,weekly_rev=process_excel(contents)
    payload={"count":len(records),"data":records,"activity_predictions":act_p,
             "category_predictions":cat_p,"weekly_data":weekly,
             "weekly_revision_data":weekly_rev,
             "uploaded_at":datetime.now().strftime('%Y-%m-%d %H:%M')}
    with open(DATA_FILE,'w',encoding='utf-8') as f: json.dump(payload,f,ensure_ascii=False)
    return {"success":True,**payload}

@app.get("/analytics/data")
def get_data():
    if not os.path.exists(DATA_FILE):
        return {"success":False,"data":[],"count":0,"uploaded_at":"",
                "activity_predictions":{},"category_predictions":{},"weekly_data":[],"weekly_revision_data":[]}
    with open(DATA_FILE,'r',encoding='utf-8') as f: saved=json.load(f)
    return {"success":True,"count":saved.get("count",0),"data":saved.get("data",[]),
            "activity_predictions":saved.get("activity_predictions",{}),
            "category_predictions":saved.get("category_predictions",{}),
            "weekly_data":saved.get("weekly_data",[]),
            "weekly_revision_data":saved.get("weekly_revision_data",[]),
            "uploaded_at":saved.get("uploaded_at","")}



# ─── GOOGLE DRIVE INTEGRATION ──────────────────────────
@app.get("/drive/files")
async def get_drive_files():
    folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID","")
    api_key   = os.environ.get("GOOGLE_DRIVE_API_KEY","")
    if not folder_id or not api_key:
        return {"success":False,"message":"Drive not configured","mapping":{}}
    try:
        mapping, page_token = {}, ""
        async with httpx.AsyncClient(timeout=30) as client:
            while True:
                params = {
                    "q": f"'{folder_id}' in parents and mimeType='application/pdf'",
                    "fields": "nextPageToken,files(id,name)",
                    "pageSize": 1000,
                    "key": api_key
                }
                if page_token: params["pageToken"] = page_token
                res = await client.get("https://www.googleapis.com/drive/v3/files", params=params)
                data = res.json()
                for f in data.get("files",[]):
                    name = f["name"].replace(".pdf","").replace(".PDF","")
                    mapping[name] = f["id"]
                page_token = data.get("nextPageToken","")
                if not page_token: break
        return {"success":True,"count":len(mapping),"mapping":mapping}
    except Exception as e:
        return {"success":False,"message":str(e),"mapping":{}}

# ─── REJECTION REASON UPLOAD ───────────────────────────
class RejectionUpload(BaseModel):
    results: list

@app.post("/rejection/upload")
async def upload_rejection_reasons(data: RejectionUpload):
    """Store OCR-analyzed rejection reasons (run pdf_processor.py first, then POST results here)"""
    saved = 0
    for r in data.results:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        # Find the record and update it
        for rec in saved_data.get("data",[]):
            if rec.get("Document No") == r.get("doc_number"):
                rec["Rejection Category"] = r.get("category","")
                rec["Rejection Keywords"] = ", ".join(r.get("keywords",[]))
                saved += 1
                break
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(saved_data, f, ensure_ascii=False)
    return {"success":True,"updated":saved}