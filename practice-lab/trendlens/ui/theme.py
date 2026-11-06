"""Estilos de la interfaz (observatorio oscuro). Tokens de color en :root; contraste AA en texto."""

import html

import streamlit as st

CSS = """
<style>
:root {
  --tl-page:#0B1420; --tl-surface:#121F2E; --tl-surface-2:#172739;
  --tl-ink:#E6EDF3; --tl-ink-2:#B4C0CC; --tl-muted:#8A97A6;
  --tl-accent:#3FB8C9; --tl-a:#3987e5; --tl-b:#d95926; --tl-diff:#9085e9;
  --tl-warn:#fab219; --tl-border:rgba(255,255,255,0.09);
}
.block-container { padding-top: 2.2rem; max-width: 1280px; }
h1, h2, h3 { letter-spacing: -0.01em; }
.tl-hero { padding: 4px 0 6px 0; }
.tl-hero .kicker { color: var(--tl-accent); font-size: .78rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.tl-hero h1 { font-size: 2.1rem; margin: .1rem 0 .2rem 0; color: var(--tl-ink); }
.tl-hero p { color: var(--tl-ink-2); margin: 0; font-size: 1rem; }
.tl-question { background: var(--tl-surface); border: 1px solid var(--tl-border); border-left: 3px solid var(--tl-accent);
  border-radius: 10px; padding: 12px 16px; margin: 10px 0 8px 0; color: var(--tl-ink); }
.tl-question .lbl { color: var(--tl-muted); font-size: .72rem; text-transform: uppercase; letter-spacing: .12em; font-weight: 700; }
.tl-steps { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 14px 0; align-items: center; }
.tl-step { padding: 3px 10px; border-radius: 999px; border: 1px solid var(--tl-border); font-size: .78rem; color: var(--tl-muted); }
.tl-step.done { color: var(--tl-ink); border-color: rgba(63,184,201,.55); background: rgba(63,184,201,.10); }
.tl-step.fail { color: #ffd0c2; border-color: rgba(208,59,59,.7); background: rgba(208,59,59,.14); }
.tl-arrow { color: var(--tl-muted); font-size: .75rem; }
.tl-banner { border-radius: 8px; padding: 8px 14px; font-weight: 650; letter-spacing: .03em; margin: 4px 0 12px 0; font-size: .9rem; }
.tl-banner.synthetic { color: #fde3a7; border: 1px solid rgba(250,178,25,.55);
  background: repeating-linear-gradient(45deg, rgba(250,178,25,.13) 0 12px, rgba(250,178,25,.05) 12px 24px); }
.tl-banner.real { color: #c9f1f6; border: 1px solid rgba(63,184,201,.5); background: rgba(63,184,201,.08); }
.tl-banner.user { color: #e2dcff; border: 1px solid rgba(144,133,233,.55); background: rgba(144,133,233,.10); }
.tl-card { background: var(--tl-surface); border: 1px solid var(--tl-border); border-radius: 12px; padding: 14px 16px; height: 100%; }
.tl-card h4 { margin: 0 0 6px 0; font-size: .95rem; color: var(--tl-ink); }
.tl-card .sub { color: var(--tl-muted); font-size: .8rem; }
.tl-kv { display: grid; grid-template-columns: max-content 1fr; gap: 3px 12px; font-size: .85rem; }
.tl-kv .k { color: var(--tl-muted); } .tl-kv .v { color: var(--tl-ink); overflow-wrap: anywhere; }
.tl-site { display: inline-flex; align-items: center; gap: 6px; font-weight: 650; color: var(--tl-ink); }
.tl-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.tl-dot.A { background: var(--tl-a); } .tl-dot.B { background: var(--tl-b); } .tl-dot.diff { background: var(--tl-diff); }
.tl-verdict { font-size: 1.35rem; font-weight: 700; color: var(--tl-ink); margin: 2px 0; }
.tl-pattern { background: var(--tl-surface-2); border: 1px solid var(--tl-border); border-radius: 12px; padding: 16px 18px; }
.tl-pattern .t { font-size: 1.2rem; font-weight: 700; color: var(--tl-ink); }
.tl-pattern .d { color: var(--tl-ink-2); margin-top: 4px; }
.tl-check { font-size: .88rem; color: var(--tl-ink); margin: 2px 0; }
.tl-check .ok { color: #0ca30c; font-weight: 700; } .tl-check .no { color: #ec835a; font-weight: 700; }
.tl-foot { color: var(--tl-muted); font-size: .78rem; margin-top: 24px; border-top: 1px solid var(--tl-border); padding-top: 10px; }
section[data-testid="stSidebar"] .tl-brand { font-weight: 800; font-size: 1.15rem; color: var(--tl-ink); }
section[data-testid="stSidebar"] .tl-brand span { color: var(--tl-accent); }
@media (max-width: 640px) {
  .tl-hero h1 { font-size: 1.6rem; }
  .block-container { padding-left: 1rem; padding-right: 1rem; }
}
</style>
"""


def inject_css() -> None:
    st.markdown(CSS, unsafe_allow_html=True)


def esc(x) -> str:
    return html.escape(str(x))


def banner(kind: str, source: str = "") -> None:
    """kind: 'synthetic' | 'csv_synthetic' | 'power' | 'csv'."""
    if kind in ("synthetic", "csv_synthetic"):
        origin = " · cargados desde CSV" if kind == "csv_synthetic" else ""
        st.markdown(f'<div class="tl-banner synthetic">⚠ DATOS SINTÉTICOS — SOLO DEMOSTRACIÓN{origin} · '
                    'no describen ningún lugar real ni son mediciones de NASA</div>', unsafe_allow_html=True)
    elif kind == "csv":
        src = f"fuente declarada: {esc(source)}" if source else "fuente aún no declarada"
        st.markdown(f'<div class="tl-banner user">● Datos cargados desde CSV · {src} · '
                    'procedencia no verificada por el laboratorio</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="tl-banner real">● Datos públicos reales de NASA POWER (MERRA-2) · '
                    'valores de punto de cuadrícula, no promedios regionales</div>', unsafe_allow_html=True)


def site_tag(slot: str, label: str) -> str:
    return f'<span class="tl-site"><span class="tl-dot {slot}"></span>{esc(slot)} · {esc(label)}</span>'


def kv(rows: list[tuple[str, str]]) -> str:
    inner = "".join(f'<div class="k">{esc(k)}</div><div class="v">{esc(v)}</div>' for k, v in rows)
    return f'<div class="tl-kv">{inner}</div>'
