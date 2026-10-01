"""Render the verified Playo Supabase schema as clean SVG and PNG ER diagrams.

The renderer is deliberately self-contained: it writes SVG directly and uses
Inkscape only for the high-resolution PNG export.  This keeps the diagram
reproducible in environments where Graphviz is unavailable.
"""
from __future__ import annotations

import html
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets"


@dataclass(frozen=True)
class Table:
    schema: str
    name: str
    category: str
    rows: str
    columns: tuple[tuple[str, str, str], ...]

    @property
    def node(self) -> str:
        return f"{self.schema}_{self.name}".replace(".", "_")


TABLES = (
    Table("private", "ingestion_runs", "lineage", "1 row", (
        ("archive_hash", "text", "PK"), ("source_dataset", "text", ""),
        ("parser_version", "text", ""), ("quality", "jsonb", ""),
        ("loaded_at", "timestamptz", ""),
    )),
    Table("private", "raw_lineage", "lineage", "3,701 rows", (
        ("archive_hash", "text", "PK · FK"), ("source_file", "text", "PK"),
        ("row_index", "integer", "PK"), ("member_hash", "text", ""),
        ("record_hash", "text", ""), ("venue_id", "uuid", "FK"),
    )),
    Table("private", "import_chunks", "lineage", "10 rows", (
        ("archive_hash", "text", "PK"), ("part", "integer", "PK"),
        ("rows", "jsonb", ""),
    )),
    Table("private", "schema_migrations", "lineage", "5 rows", (
        ("version", "text", "PK"), ("applied_at", "timestamptz", ""),
    )),
    Table("private", "admin_members", "lineage", "1 row", (
        ("user_id", "uuid", "PK · FK"), ("granted_at", "timestamptz", ""),
    )),
    Table("auth", "users", "external", "Supabase Auth", (
        ("id", "uuid", "PK"),
    )),
    Table("public", "source_regions", "historical", "4 rows", (
        ("region", "text", "PK"), ("display_name", "text", ""),
    )),
    Table("public", "venues", "historical", "3,697 rows", (
        ("venue_id", "uuid", "PK"), ("source_key", "text", "UQ"),
        ("name", "text", ""), ("region", "text", "FK"),
        ("latitude", "float8", ""), ("longitude", "float8", ""),
        ("entity_group", "uuid", ""), ("source_type", "text", ""),
        ("is_synthetic", "boolean", ""), ("source_dataset", "text", ""),
        ("archive_hash", "text", "FK"), ("observed_at", "timestamptz", "nullable"),
    )),
    Table("public", "venue_ratings", "historical", "3,697 rows", (
        ("venue_id", "uuid", "PK · FK"),
        ("avg_rating", "float8", "nullable"), ("rating_count", "integer", ""),
    )),
    Table("public", "activity_labels", "historical", "89 rows", (
        ("label", "text", "PK"), ("taxonomy_status", "text", ""),
    )),
    Table("public", "venue_activities", "historical", "7,052 rows", (
        ("venue_id", "uuid", "PK · FK"), ("label", "text", "PK · FK"),
    )),
    Table("public", "quality_reports", "historical", "1 row", (
        ("archive_hash", "text", "PK"), ("parser_version", "text", ""),
        ("quality", "jsonb", ""), ("loaded_at", "timestamptz", ""),
    )),
    Table("public", "model_runs", "ml", "1 row", (
        ("run_id", "uuid", "PK"), ("created_at", "timestamptz", ""),
        ("feature_version", "text", ""), ("dataset_hash", "text", ""),
        ("training_hash", "text", ""), ("model_name", "text", ""),
        ("metrics", "jsonb", ""), ("split_summary", "jsonb", ""),
        ("sensitivity", "jsonb", ""), ("parameters", "jsonb", ""),
        ("versions", "jsonb", ""), ("explanation", "jsonb", "nullable"),
    )),
    Table("public", "predictions", "ml", "3,697 rows", (
        ("run_id", "uuid", "PK · FK"), ("venue_id", "uuid", "PK · FK"),
        ("predicted_rating", "float8", ""), ("split", "text", ""),
        ("feature_hash", "text", ""),
    )),
    Table("public", "submitted_venues", "community", "0 rows", (
        ("id", "uuid", "PK"), ("name", "text", ""),
        ("region", "text", "FK"), ("locality", "text", ""),
        ("address", "text", ""), ("description", "text", ""),
        ("latitude", "float8", "nullable"), ("longitude", "float8", "nullable"),
        ("activities", "text[]", ""), ("source_type", "text", ""),
        ("source_dataset", "text", ""), ("is_synthetic", "boolean", ""),
        ("verification_status", "text", ""), ("submitted_at", "timestamptz", ""),
        ("moderated_at", "timestamptz", "nullable"), ("moderation_note", "text", ""),
    )),
    Table("public", "venue_correction_reports", "community", "0 rows", (
        ("id", "uuid", "PK"), ("target_type", "text", ""),
        ("venue_id", "uuid", "FK · nullable"),
        ("submitted_venue_id", "uuid", "FK · nullable"),
        ("reason", "text", ""), ("details", "text", ""),
        ("status", "text", ""), ("submitted_at", "timestamptz", ""),
        ("moderated_at", "timestamptz", "nullable"), ("moderation_note", "text", ""),
    )),
    Table("public", "workspace_records", "workspace", "0 rows", (
        ("id", "uuid", "PK"), ("owner_id", "uuid", "FK"),
        ("venue_id", "uuid", "FK · nullable"), ("name", "text", ""),
        ("note", "text", ""), ("archived", "boolean", ""),
        ("created_at", "timestamptz", ""), ("updated_at", "timestamptz", ""),
    )),
    Table("public", "workspace_audit", "workspace", "0 rows", (
        ("id", "bigint", "PK"), ("owner_id", "uuid", ""),
        ("record_id", "uuid", ""), ("action", "text", ""),
        ("changed_at", "timestamptz", ""),
    )),
)


RELATIONSHIPS = (
    ("private_raw_lineage", "archive_hash", "private_ingestion_runs", "archive_hash", "N:1", "solid"),
    ("private_raw_lineage", "venue_id", "public_venues", "venue_id", "N:1", "solid"),
    ("public_venues", "archive_hash", "private_ingestion_runs", "archive_hash", "N:1", "solid"),
    ("public_venues", "region", "public_source_regions", "region", "N:1", "solid"),
    ("public_venue_ratings", "venue_id", "public_venues", "venue_id", "1:1", "solid"),
    ("public_venue_activities", "venue_id", "public_venues", "venue_id", "N:1", "solid"),
    ("public_venue_activities", "label", "public_activity_labels", "label", "N:1", "solid"),
    ("public_predictions", "run_id", "public_model_runs", "run_id", "N:1", "solid"),
    ("public_predictions", "venue_id", "public_venues", "venue_id", "N:1", "solid"),
    ("public_submitted_venues", "region", "public_source_regions", "region", "N:1", "solid"),
    ("public_venue_correction_reports", "venue_id", "public_venues", "venue_id", "N:1", "solid"),
    ("public_venue_correction_reports", "submitted_venue_id", "public_submitted_venues", "id", "N:1", "solid"),
    ("public_workspace_records", "owner_id", "auth_users", "id", "N:1", "solid"),
    ("public_workspace_records", "venue_id", "public_venues", "venue_id", "N:1", "solid"),
    ("private_admin_members", "user_id", "auth_users", "id", "1:1", "solid"),
    # These are intentional logical links with no database FK constraint.
    ("public_quality_reports", "archive_hash", "private_ingestion_runs", "archive_hash", "logical", "dashed"),
    ("private_import_chunks", "archive_hash", "private_ingestion_runs", "archive_hash", "logical", "dashed"),
    ("public_workspace_audit", "record_id", "public_workspace_records", "id", "logical", "dashed"),
)


PALETTE = {
    "historical": ("#0F766E", "#E6F5F3", "Historical & reference data"),
    "lineage": ("#475569", "#EEF2F6", "Private lineage & administration"),
    "ml": ("#2563EB", "#EAF1FF", "Machine learning"),
    "community": ("#C2410C", "#FFF0E8", "Moderated community data"),
    "workspace": ("#7C3AED", "#F3EDFF", "Workspace & audit"),
    "external": ("#334155", "#F8FAFC", "External Supabase schema"),
}


def table_label(table: Table) -> str:
    head, body, _ = PALETTE[table.category]
    rows = [
        f'<TR><TD COLSPAN="3" BGCOLOR="{head}" ALIGN="LEFT" CELLPADDING="8">'
        f'<FONT COLOR="white" POINT-SIZE="12"><B>{html.escape(table.schema)}.{html.escape(table.name)}</B></FONT>'
        f'<BR/><FONT COLOR="white" POINT-SIZE="9">{html.escape(table.rows)} · RLS ON</FONT></TD></TR>'
    ]
    for index, (name, dtype, marker) in enumerate(table.columns):
        bg = body if index % 2 == 0 else "#FFFFFF"
        marker_text = html.escape(marker) if marker else ""
        rows.append(
            f'<TR><TD PORT="{html.escape(name)}" BGCOLOR="{bg}" ALIGN="LEFT" CELLPADDING="5">'
            f'<FONT POINT-SIZE="9"><B>{html.escape(name)}</B></FONT></TD>'
            f'<TD BGCOLOR="{bg}" ALIGN="LEFT" CELLPADDING="5"><FONT COLOR="#475569" POINT-SIZE="9">{html.escape(dtype)}</FONT></TD>'
            f'<TD BGCOLOR="{bg}" ALIGN="RIGHT" CELLPADDING="5"><FONT COLOR="{head}" POINT-SIZE="8"><B>{marker_text}</B></FONT></TD></TR>'
        )
    return '<TABLE BORDER="1" COLOR="#CBD5E1" CELLBORDER="0" CELLSPACING="0">' + "".join(rows) + "</TABLE>"


def build_dot() -> str:
    lines = [
        "digraph playo_supabase_er {",
        'graph [rankdir=LR, bgcolor="#FAFAF7", pad="0.35", nodesep="0.45", ranksep="1.05", '
        'splines=polyline, overlap=false, compound=true, newrank=true, fontname="Arial", '
        'label="Playo Venue Observatory — Supabase ER Diagram\\nLive schema verified 1 October 2026", '
        'labelloc=t, labeljust=l, fontsize=22, fontcolor="#17352F"];',
        'node [shape=plain, fontname="Arial"];',
        'edge [fontname="Arial", fontsize=8, color="#64748B", fontcolor="#475569", arrowsize=0.65, penwidth=1.1];',
    ]
    categories = ("lineage", "historical", "ml", "community", "workspace", "external")
    for category in categories:
        head, _, label = PALETTE[category]
        lines.extend([
            f"subgraph cluster_{category} {{",
            f'label="{label}"; color="{head}"; fontcolor="{head}"; fontname="Arial"; fontsize=12; penwidth=1.4; style="rounded"; margin=18;',
        ])
        for table in TABLES:
            if table.category == category:
                lines.append(f'{table.node} [label=<{table_label(table)}>];')
        lines.append("}")

    for source, source_col, target, target_col, cardinality, style in RELATIONSHIPS:
        color = "#64748B" if style == "solid" else "#94A3B8"
        arrowtail = "tee" if cardinality == "1:1" else "crow"
        label = cardinality
        lines.append(
            f'{source}:{source_col}:e -> {target}:{target_col}:w '
            f'[dir=both, arrowtail={arrowtail}, arrowhead=tee, style={style}, color="{color}", '
            f'label="{label}", tooltip="{source}.{source_col} → {target}.{target_col}"];'
        )
    lines.extend([
        'legend [shape=plain, label=<<TABLE BORDER="1" COLOR="#CBD5E1" CELLBORDER="0" CELLSPACING="0">'
        '<TR><TD BGCOLOR="#FFFFFF" ALIGN="LEFT" CELLPADDING="7"><FONT POINT-SIZE="9"><B>Legend</B>  PK = primary key · FK = foreign key · UQ = unique · solid = enforced FK · dashed = logical link</FONT></TD></TR>'
        '</TABLE>>];',
        "}",
    ])
    return "\n".join(lines) + "\n"


BOX_W = 650
HEADER_H = 84
ROW_H = 38

# A deliberate landscape layout.  The historical core sits in the middle;
# lineage feeds it from the left, while ML, community, and workspace tables
# branch to the right and below.
POSITIONS = {
    "private_ingestion_runs": (90, 300),
    "private_raw_lineage": (90, 820),
    "private_import_chunks": (90, 1325),
    "private_schema_migrations": (90, 1720),
    "private_admin_members": (90, 2085),
    "public_source_regions": (970, 250),
    "public_activity_labels": (970, 1050),
    "public_quality_reports": (970, 1580),
    "public_venues": (1870, 430),
    "public_venue_ratings": (2770, 245),
    "public_venue_activities": (2770, 1040),
    "public_model_runs": (1870, 1790),
    "public_predictions": (2770, 2020),
    "public_submitted_venues": (3670, 225),
    "public_venue_correction_reports": (3670, 1170),
    "public_workspace_records": (3670, 2140),
    "public_workspace_audit": (3670, 2790),
    "auth_users": (4610, 2300),
}


def _height(table: Table) -> int:
    return HEADER_H + ROW_H * len(table.columns)


def _field_y(table: Table, field: str) -> float:
    index = next(i for i, column in enumerate(table.columns) if column[0] == field)
    return POSITIONS[table.node][1] + HEADER_H + index * ROW_H + ROW_H / 2


def _svg_table(table: Table) -> str:
    x, y = POSITIONS[table.node]
    head, body, _ = PALETTE[table.category]
    height = _height(table)
    parts = [
        f'<g id="{table.node}">',
        f'<rect x="{x}" y="{y}" width="{BOX_W}" height="{height}" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>',
        f'<path d="M {x + 16} {y} H {x + BOX_W - 16} Q {x + BOX_W} {y} {x + BOX_W} {y + 16} V {y + HEADER_H} H {x} V {y + 16} Q {x} {y} {x + 16} {y} Z" fill="{head}"/>',
        f'<text x="{x + 24}" y="{y + 35}" class="table-title">{html.escape(table.schema)}.{html.escape(table.name)}</text>',
        f'<text x="{x + 24}" y="{y + 64}" class="table-meta">{html.escape(table.rows)}  •  RLS ON</text>',
    ]
    for index, (name, dtype, marker) in enumerate(table.columns):
        row_y = y + HEADER_H + index * ROW_H
        if index % 2 == 0:
            parts.append(f'<rect x="{x + 1}" y="{row_y}" width="{BOX_W - 2}" height="{ROW_H}" fill="{body}"/>')
        parts.extend([
            f'<text x="{x + 22}" y="{row_y + 25}" class="field-name">{html.escape(name)}</text>',
            f'<text x="{x + 382}" y="{row_y + 25}" class="field-type">{html.escape(dtype)}</text>',
        ])
        if marker:
            parts.append(f'<text x="{x + BOX_W - 22}" y="{row_y + 25}" text-anchor="end" class="field-key" fill="{head}">{html.escape(marker)}</text>')
        if index < len(table.columns) - 1:
            parts.append(f'<line x1="{x + 1}" y1="{row_y + ROW_H}" x2="{x + BOX_W - 1}" y2="{row_y + ROW_H}" stroke="#E2E8F0" stroke-width="1"/>')
    parts.append('</g>')
    return "\n".join(parts)


def _route_relationship(index: int, relationship: tuple[str, str, str, str, str, str], table_map: dict[str, Table]) -> str:
    source, source_col, target, target_col, cardinality, style = relationship
    st, tt = table_map[source], table_map[target]
    sx, sy = POSITIONS[source]
    tx, ty = POSITIONS[target]
    sw, tw = BOX_W, BOX_W
    source_y = _field_y(st, source_col)
    target_y = _field_y(tt, target_col)

    # Connect from the closest horizontal sides. Same-column links use a
    # dedicated outer corridor, keeping the table interiors unobstructed.
    if sx + sw <= tx:
        x1, x2 = sx + sw, tx
        mid = (x1 + x2) / 2 + ((index % 5) - 2) * 18
        path = f"M {x1} {source_y} H {mid} V {target_y} H {x2}"
        label_x, label_y = mid + 8, (source_y + target_y) / 2 - 8
    elif tx + tw <= sx:
        x1, x2 = sx, tx + tw
        mid = (x1 + x2) / 2 + ((index % 5) - 2) * 18
        path = f"M {x1} {source_y} H {mid} V {target_y} H {x2}"
        label_x, label_y = mid + 8, (source_y + target_y) / 2 - 8
    else:
        x1 = sx + sw
        x2 = tx + tw
        corridor = max(x1, x2) + 80 + (index % 4) * 28
        path = f"M {x1} {source_y} H {corridor} V {target_y} H {x2}"
        label_x, label_y = corridor + 8, (source_y + target_y) / 2 - 8

    dash = ' stroke-dasharray="14 10"' if style == "dashed" else ""
    color = "#94A3B8" if style == "dashed" else "#52667A"
    marker = "url(#arrow-logical)" if style == "dashed" else "url(#arrow-fk)"
    label = "logical" if cardinality == "logical" else cardinality
    return (
        f'<g class="relationship"><path d="{path}" fill="none" stroke="{color}" stroke-width="3"{dash} marker-end="{marker}"/>'
        f'<rect x="{label_x - 5}" y="{label_y - 18}" width="64" height="25" rx="7" fill="#FAFAF7" opacity="0.94"/>'
        f'<text x="{label_x}" y="{label_y}" class="relation-label">{html.escape(label)}</text></g>'
    )


def build_svg() -> str:
    table_map = {table.node: table for table in TABLES}
    width, height = 5400, 3500
    relationships = "\n".join(
        _route_relationship(index, relationship, table_map)
        for index, relationship in enumerate(RELATIONSHIPS)
    )
    tables = "\n".join(_svg_table(table) for table in TABLES)

    legend_items = [
        (PALETTE["historical"][0], "Historical data"),
        (PALETTE["lineage"][0], "Private lineage"),
        (PALETTE["ml"][0], "Machine learning"),
        (PALETTE["community"][0], "Community submissions"),
        (PALETTE["workspace"][0], "Workspace"),
        (PALETTE["external"][0], "Supabase Auth"),
    ]
    legend = []
    lx = 100
    for color, label in legend_items:
        legend.append(f'<rect x="{lx}" y="165" width="24" height="24" rx="6" fill="{color}"/>')
        legend.append(f'<text x="{lx + 36}" y="184" class="legend-text">{label}</text>')
        lx += 330

    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <defs>
    <marker id="arrow-fk" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 10 5 L 0 10 Z" fill="#52667A"/>
    </marker>
    <marker id="arrow-logical" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 10 5 L 0 10 Z" fill="#94A3B8"/>
    </marker>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F8FAFC"/><stop offset="1" stop-color="#F5F3EE"/>
    </linearGradient>
    <style>
      text {{ font-family: Arial, Helvetica, sans-serif; }}
      .title {{ font-size: 44px; font-weight: 700; fill: #102A43; }}
      .subtitle {{ font-size: 20px; fill: #52667A; }}
      .table-title {{ font-size: 23px; font-weight: 700; fill: #FFFFFF; }}
      .table-meta {{ font-size: 16px; fill: #FFFFFF; opacity: 0.88; }}
      .field-name {{ font-size: 17px; font-weight: 700; fill: #1E293B; }}
      .field-type {{ font-size: 16px; fill: #52667A; }}
      .field-key {{ font-size: 14px; font-weight: 700; }}
      .relation-label {{ font-size: 14px; font-weight: 700; fill: #52667A; }}
      .legend-text {{ font-size: 17px; fill: #334155; }}
      .note {{ font-size: 16px; fill: #52667A; }}
    </style>
  </defs>
  <rect width="{width}" height="{height}" fill="url(#background)"/>
  <text x="100" y="78" class="title">Playo Venue Observatory — Supabase ER Diagram</text>
  <text x="100" y="119" class="subtitle">Live schema verified 1 October 2026  •  18 tables across public, private and auth schemas</text>
  {''.join(legend)}
  <line x1="100" y1="215" x2="5300" y2="215" stroke="#CBD5E1" stroke-width="2"/>
  {relationships}
  {tables}
  <g transform="translate(3680 3320)">
    <rect width="1620" height="105" rx="14" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
    <text x="24" y="37" class="note"><tspan font-weight="700">Notation:</tspan> PK = primary key  •  FK = enforced foreign key  •  UQ = unique</text>
    <text x="24" y="73" class="note">Solid line = enforced FK  •  Dashed line = logical link  •  Arrows point to referenced records</text>
  </g>
</svg>
'''


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    dot_path = OUT / "playo-supabase-er-diagram.dot"
    svg_path = OUT / "playo-supabase-er-diagram.svg"
    png_path = OUT / "playo-supabase-er-diagram.png"
    dot_path.write_text(build_dot(), encoding="utf-8")
    svg_path.write_text(build_svg(), encoding="utf-8")
    inkscape = shutil.which("inkscape")
    if not inkscape:
        raise RuntimeError("Inkscape is required to export the PNG")
    subprocess.run([
        inkscape, str(svg_path), "--export-type=png", f"--export-filename={png_path}",
        "--export-width=5400", "--export-background=#FAFAF7",
    ], check=True)
    print(png_path)
    print(svg_path)


if __name__ == "__main__":
    main()
