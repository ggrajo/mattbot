"""Generate .dis.txt files from alembic migration .pyc files."""
import dis
import marshal
import os
import sys
import io

versions_dir = os.path.join("backend", "alembic", "versions")
output_dir = os.path.join("recovered_source", "alembic", "versions")
os.makedirs(output_dir, exist_ok=True)

for fname in sorted(os.listdir(versions_dir)):
    if not fname.endswith(".pyc"):
        continue
    pyc_path = os.path.join(versions_dir, fname)
    out_name = fname.replace(".pyc", ".dis.txt")
    out_path = os.path.join(output_dir, out_name)

    try:
        with open(pyc_path, "rb") as f:
            f.read(16)
            code = marshal.load(f)
        buf = io.StringIO()
        buf.write(f"# Bytecode dump of: {fname}\n")
        buf.write(f"# co_filename: {code.co_filename}\n")
        buf.write(f"# co_names: {code.co_names}\n")
        consts_strs = [c for c in code.co_consts if isinstance(c, str)]
        buf.write(f"# co_consts (strings): {consts_strs}\n\n")

        for const in code.co_consts:
            if hasattr(const, "co_name"):
                buf.write(f"# --- Nested code object: {const.co_qualname} ---\n")
                buf.write(f"    # co_names: {const.co_names}\n")
                buf.write(f"    # co_varnames: {const.co_varnames}\n")
                consts_strs2 = [c for c in const.co_consts if isinstance(c, str)]
                if consts_strs2:
                    buf.write(f"    # co_consts (strings): {consts_strs2}\n")
                old_stdout = sys.stdout
                sys.stdout = buf
                dis.dis(const)
                sys.stdout = old_stdout
                buf.write("\n")

        buf.write("# --- Module-level bytecode ---\n")
        old_stdout = sys.stdout
        sys.stdout = buf
        dis.dis(code)
        sys.stdout = old_stdout

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(buf.getvalue())
        print(f"OK: {fname} -> {out_name}")
    except Exception as e:
        print(f"FAIL: {fname}: {e}")
