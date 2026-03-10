"""Fix two known issues in reconstructed model files:
1. 'import datetime' should be 'from datetime import datetime'
2. Missing InetString/JsonbDict imports from _types
"""
import os

MODELS_DIR = os.path.join("backend", "app", "models")
fixed = 0

for f in sorted(os.listdir(MODELS_DIR)):
    if not f.endswith(".py") or f in ("__init__.py", "_types.py"):
        continue
    path = os.path.join(MODELS_DIR, f)
    text = open(path, encoding="utf-8").read()
    orig = text

    # Fix 1: import datetime -> from datetime import datetime
    text = text.replace("import datetime\n", "from datetime import datetime\n")

    # Fix 2: add missing _types imports
    needs = []
    if "InetString" in text and "from app.models._types" not in text:
        needs.append("InetString")
    if "JsonbDict" in text and "from app.models._types" not in text:
        needs.append("JsonbDict")
    if "tz_datetime" in text and "from app.models._types" not in text:
        needs.append("tz_datetime")
    if needs:
        line = f"from app.models._types import {', '.join(needs)}"
        text = text.replace(
            "from app.database import Base",
            f"from app.database import Base\n{line}",
        )

    if text != orig:
        open(path, "w", encoding="utf-8").write(text)
        print(f"  Fixed: {f}")
        fixed += 1

print(f"\nFixed {fixed} files")
