"""Comprehensive fixer for all reconstructed model files."""
import os
import re

MODELS_DIR = os.path.join("backend", "app", "models")

SA_TYPES = {
    "Boolean", "BigInteger", "CheckConstraint", "Date", "DateTime",
    "Float", "ForeignKey", "Index", "Integer", "Interval",
    "LargeBinary", "Numeric", "SmallInteger", "String", "Text",
    "Time", "UniqueConstraint", "text",
}
SA_PG_TYPES = {"UUID", "JSONB", "INET", "ARRAY"}
SA_ORM_TYPES = {"Mapped", "mapped_column", "relationship"}
TYPES_TYPES = {"InetString", "JsonbDict", "tz_datetime"}

fixed_count = 0

for f in sorted(os.listdir(MODELS_DIR)):
    if not f.endswith(".py") or f in ("__init__.py", "_types.py"):
        continue

    path = os.path.join(MODELS_DIR, f)
    text = open(path, encoding="utf-8").read()
    orig = text

    # Detect all names used in the file body (class body)
    all_names = set(re.findall(r'\b([A-Za-z_]\w*)\b', text))

    # Fix datetime import
    if "Mapped[datetime" in text and "from datetime import datetime" not in text:
        if "from datetime import UTC" in text:
            text = text.replace("from datetime import UTC", "from datetime import UTC, datetime")
        else:
            text = "from datetime import datetime\n" + text

    # Fix sqlalchemy imports - ensure all used types are imported
    sa_match = re.search(r"from sqlalchemy import (.+)", text)
    if sa_match:
        current_sa = {x.strip() for x in sa_match.group(1).split(",")}
        needed_sa = (all_names & SA_TYPES) - current_sa
        if needed_sa:
            new_imports = sorted(current_sa | needed_sa)
            old_line = sa_match.group(0)
            new_line = "from sqlalchemy import " + ", ".join(new_imports)
            text = text.replace(old_line, new_line, 1)

    # Fix _types imports
    types_needed = all_names & TYPES_TYPES
    if types_needed and "from app.models._types import" not in text:
        import_line = f"from app.models._types import {', '.join(sorted(types_needed))}"
        text = text.replace(
            "from app.database import Base",
            f"from app.database import Base\n{import_line}",
        )

    # Fix column 'text' shadowing sqlalchemy text()
    has_text_col = bool(re.search(r"^\s+text:\s+Mapped", text, re.MULTILINE))
    if has_text_col and "server_default=text(" in text:
        if "import sqlalchemy as sa" not in text:
            text = text.replace(
                "from sqlalchemy import",
                "import sqlalchemy as sa\nfrom sqlalchemy import",
                1,
            )
        sa_match2 = re.search(r"from sqlalchemy import (.+)", text)
        if sa_match2 and ", text" in sa_match2.group(0):
            text = text.replace(sa_match2.group(0), sa_match2.group(0).replace(", text", ""), 1)
        text = text.replace("server_default=text(", "server_default=sa.text(")

    if text != orig:
        open(path, "w", encoding="utf-8").write(text)
        print(f"  Fixed: {f}")
        fixed_count += 1

print(f"\nFixed {fixed_count} files")
