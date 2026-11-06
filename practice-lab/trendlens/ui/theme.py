"""Estilos de la interfaz. Modo Operate (Impeccable): la herramienta desaparece detrás de la tarea.

Reglas (ver DESIGN.md): una familia tipográfica, 4 tamaños, 2 pesos; color solo con función
(acento = acción/selección; A/B = identidad de series; ámbar = datos sintéticos); sin tarjetas
decorativas, sin franjas, sin etiquetas sobre los títulos.
"""

import html

import streamlit as st

CSS = """
<style>
:root {
  --tl-bg:#0E151E; --tl-panel:#131C26; --tl-line:rgba(230,237,243,0.09);
  --tl-ink:#E3E9EF; --tl-ink-2:#AEB9C4; --tl-muted:#8794A1;
  --tl-accent:#57A9B5; --tl-a:#3987e5; --tl-b:#d95926; --tl-diff:#9085e9;
  --tl-synth:#E2B04A;
  --tl-s1:0.25rem; --tl-s2:0.5rem; --tl-s3:0.75rem; --tl-s4:1rem; --tl-s6:1.5rem; --tl-s8:2rem;
}
::selection { background: rgba(87,169,181,0.35); color: var(--tl-ink); }
input, textarea { caret-color: var(--tl-accent); }
:focus-visible { outline: 2px solid var(--tl-accent) !important; outline-offset: 2px; }
.block-container { padding-top: 3.2rem; padding-bottom: 4rem; max-width: 1120px; }
h1, h2, h3 { letter-spacing: -0.02em; font-weight: 600 !important; }
/* Secciones: por debajo del título de pantalla, con más aire arriba que abajo */
[data-testid="stMainBlockContainer"] h3 { font-size: 1.1rem !important; padding: var(--tl-s6) 0 var(--tl-s1) 0 !important; }
/* Medida de lectura: 65–75 caracteres en la prosa (las tablas y gráficos usan todo el ancho) */
[data-testid="stMainBlockContainer"] [data-testid="stMarkdownContainer"] p,
[data-testid="stMainBlockContainer"] [data-testid="stMarkdownContainer"] li,
[data-testid="stMainBlockContainer"] [data-testid="stCaptionContainer"] { max-width: 75ch; }
[data-testid="stDataFrame"], [data-testid="stMetricValue"], .tl-num { font-variant-numeric: tabular-nums; }

/* Título de pantalla + línea de contexto */
.tl-title { font-size: 1.6rem; font-weight: 600; color: var(--tl-ink); margin: 0 0 var(--tl-s1) 0; letter-spacing: -0.02em; }
.tl-context { color: var(--tl-muted); font-size: .9rem; margin: 0 0 var(--tl-s3) 0; }
.tl-lead { color: var(--tl-ink-2); font-size: 1rem; max-width: 70ch; margin: 0 0 var(--tl-s4) 0; line-height: 1.55; }

/* Estado de los datos: una línea, sin decoración */
.tl-banner { display: inline-block; font-size: .82rem; padding: .3rem .65rem; border-radius: 6px;
  border: 1px solid var(--tl-line); color: var(--tl-ink-2); margin: 0 0 var(--tl-s6) 0; }
.tl-banner b { font-weight: 600; color: var(--tl-ink); }
.tl-banner.synthetic { color: var(--tl-synth); border-color: rgba(226,176,74,0.45); background: rgba(226,176,74,0.06); }
.tl-banner.synthetic b { color: var(--tl-synth); }

/* Respuesta principal de cada pantalla */
.tl-verdict { font-size: 1.3rem; font-weight: 600; color: var(--tl-ink); margin: var(--tl-s2) 0 var(--tl-s1) 0; }
.tl-facts { color: var(--tl-ink-2); font-size: .92rem; margin: 0 0 var(--tl-s4) 0; font-variant-numeric: tabular-nums; }
.tl-pattern { font-size: 1.15rem; font-weight: 600; color: var(--tl-ink); margin: 0 0 var(--tl-s1) 0; max-width: 70ch; }
.tl-sub { color: var(--tl-ink-2); margin: 0 0 var(--tl-s4) 0; max-width: 70ch; }
.tl-site { display: inline-flex; align-items: center; gap: .45rem; color: var(--tl-ink); font-weight: 600; }
.tl-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex: none; }
.tl-dot.A { background: var(--tl-a); } .tl-dot.B { background: var(--tl-b); } .tl-dot.diff { background: var(--tl-diff); }
.tl-kv { display: grid; grid-template-columns: max-content 1fr; gap: 2px 14px; font-size: .86rem; margin-top: var(--tl-s2); }
.tl-kv .k { color: var(--tl-muted); } .tl-kv .v { color: var(--tl-ink); overflow-wrap: anywhere; }
section[data-testid="stSidebar"] .tl-brand { font-weight: 600; font-size: 1.05rem; color: var(--tl-ink); }
@media (max-width: 640px) {
  .block-container { padding-left: 1rem; padding-right: 1rem; padding-top: 2.6rem; }
  .tl-title { font-size: 1.35rem; }
}
</style>
"""


def inject_css() -> None:
    st.markdown(CSS, unsafe_allow_html=True)


def esc(x) -> str:
    return html.escape(str(x))


def banner(kind: str, source: str = "") -> None:
    """Estado de los datos en una sola línea. kind: 'synthetic' | 'csv_synthetic' | 'power' | 'csv'."""
    if kind in ("synthetic", "csv_synthetic"):
        origin = " (cargados desde CSV)" if kind == "csv_synthetic" else ""
        html_ = (f'<div class="tl-banner synthetic"><b>DATOS SINTÉTICOS — SOLO DEMOSTRACIÓN</b>{origin} · '
                 'no describen ningún lugar real ni son mediciones de NASA</div>')
    elif kind == "csv":
        src = f"fuente declarada: {esc(source)}" if source else "fuente aún no declarada"
        html_ = (f'<div class="tl-banner user"><b>Datos cargados desde CSV</b> · {src} · '
                 'procedencia no verificada por el laboratorio</div>')
    else:
        html_ = ('<div class="tl-banner real"><b>Datos reales de NASA POWER</b> (MERRA-2) · '
                 'valores de punto de cuadrícula, no promedios regionales</div>')
    st.markdown(html_, unsafe_allow_html=True)


def site_tag(slot: str, label: str) -> str:
    return f'<span class="tl-site"><span class="tl-dot {slot}"></span>{esc(slot)} · {esc(label)}</span>'


def kv(rows: list[tuple[str, str]]) -> str:
    inner = "".join(f'<div class="k">{esc(k)}</div><div class="v">{esc(v)}</div>' for k, v in rows)
    return f'<div class="tl-kv">{inner}</div>'
