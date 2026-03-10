"""
Recover Python source files from .pyc bytecodes.

Step 1: Copy .pyc files from __pycache__ to parent dirs (makes them importable)
Step 2: Import modules and use runtime introspection 
Step 3: For SQLAlchemy models, reconstruct from table metadata
Step 4: For everything else, dump dis bytecode for manual reconstruction
"""
import shutil
import os
import sys
import glob
import marshal
import dis
import struct
import types

BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recovered_source")

def find_missing_pyc(base_dir):
    missing = []
    for pycache in glob.glob(os.path.join(base_dir, "**", "__pycache__"), recursive=True):
        parent = os.path.dirname(pycache)
        for pyc_file in glob.glob(os.path.join(pycache, "*.cpython-313.pyc")):
            basename = os.path.basename(pyc_file)
            module_name = basename.replace(".cpython-313.pyc", "")
            py_file = os.path.join(parent, module_name + ".py")
            if not os.path.exists(py_file):
                missing.append((pyc_file, py_file, module_name))
    return missing

def read_pyc_code(pyc_path):
    with open(pyc_path, "rb") as f:
        f.read(16)  # skip header
        return marshal.loads(f.read())

def disassemble_code(code, indent=0):
    lines = []
    prefix = "    " * indent
    
    if code.co_consts:
        for i, const in enumerate(code.co_consts):
            if isinstance(const, str) and i == 0:
                lines.append(f'{prefix}# DOCSTRING: """{const}"""')
            elif isinstance(const, types.CodeType):
                lines.append(f'{prefix}# --- Nested code object: {const.co_qualname} ---')
                lines.extend(disassemble_code(const, indent + 1))
    
    lines.append(f"{prefix}# co_names: {code.co_names}")
    lines.append(f"{prefix}# co_varnames: {code.co_varnames}")
    
    import io
    buf = io.StringIO()
    dis.dis(code, file=buf)
    for line in buf.getvalue().split("\n"):
        lines.append(f"{prefix}{line}")
    
    return lines

def dump_bytecode(pyc_path, output_path):
    code = read_pyc_code(pyc_path)
    lines = [f"# Bytecode dump of: {os.path.basename(pyc_path)}"]
    lines.append(f"# co_filename: {code.co_filename}")
    lines.append(f"# co_names: {code.co_names}")
    lines.append(f"# co_consts (strings): {[c for c in code.co_consts if isinstance(c, str)]}")
    lines.append("")
    lines.extend(disassemble_code(code))
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

if __name__ == "__main__":
    missing = find_missing_pyc(os.path.join(BACKEND, "app"))
    print(f"Found {len(missing)} missing .py files")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    for pyc_path, py_path, module_name in missing:
        rel_path = os.path.relpath(py_path, BACKEND)
        out_path = os.path.join(OUTPUT_DIR, rel_path.replace(".py", ".dis.txt"))
        try:
            dump_bytecode(pyc_path, out_path)
            print(f"  OK: {rel_path}")
        except Exception as e:
            print(f"  FAIL: {rel_path}: {e}")
    
    print(f"\nBytecode dumps written to: {OUTPUT_DIR}")
    print("Use these to reconstruct source files.")
