from pathlib import Path

# Apply the owner's explicit decision to the existing UI; no generated files are removed.
target = Path(__file__).resolve().parent.parent / 'frontend/src/pages/Trials.jsx'
text = target.read_text(encoding='utf-8')
accepted = '\u0110\u00e3 ti\u1ebfp nh\u1eadn'
reschedule = 'Ch\u1edd x\u1ebfp ca h\u1ecdc th\u1eed'
text = text.replace("'" + accepted + "','Ch", "'" + accepted + "','" + reschedule + "','Ch")
text = text.replace("ops&&t.status==='" + accepted + "'", "ops&&['" + accepted + "','" + reschedule + "'].includes(t.status)")
target.write_text(text, encoding='utf-8')
