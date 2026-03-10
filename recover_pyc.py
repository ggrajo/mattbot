"""
Recover .py source files from __pycache__ .pyc files.

Strategy: Copy .pyc files from __pycache__ to parent dir (stripping cpython tag),
which allows Python to import them. Then use runtime introspection to reconstruct
SQLAlchemy model source code.
"""
import shutil
import os
import sys
import glob

BACKEND = os.path.join(os.path.dirname(__file__), "backend")

def find_missing_pyc(base_dir):
    """Find .pyc files in __pycache__ whose .py source is missing."""
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

def copy_pyc_as_importable(missing_files):
    """Copy .pyc files to parent dir as .pyc (importable without source)."""
    copied = []
    for pyc_src, py_path, module_name in missing_files:
        parent = os.path.dirname(py_path)
        dst = os.path.join(parent, module_name + ".pyc")
        shutil.copy2(pyc_src, dst)
        copied.append(dst)
    return copied

def cleanup_copied(copied_files):
    for f in copied_files:
        if os.path.exists(f):
            os.remove(f)

if __name__ == "__main__":
    missing = find_missing_pyc(os.path.join(BACKEND, "app"))
    print(f"Found {len(missing)} missing .py files with .pyc available:")
    for pyc, py, name in missing:
        rel_py = os.path.relpath(py, BACKEND)
        print(f"  {rel_py}")
    
    print(f"\nCopying .pyc files as importable...")
    copied = copy_pyc_as_importable(missing)
    print(f"Copied {len(copied)} files")
    
    # Test import
    sys.path.insert(0, BACKEND)
    try:
        from app.models.agent import Agent
        print(f"\nSUCCESS: Agent imported, tablename={Agent.__tablename__}")
    except Exception as e:
        print(f"\nFailed to import Agent: {e}")
    finally:
        cleanup_copied(copied)
        print("Cleaned up copied .pyc files")
