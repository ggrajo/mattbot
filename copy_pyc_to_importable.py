"""
Copy .pyc files from __pycache__ to their parent directories,
stripping the cpython-313 tag, making them importable without source.

Run this once to create importable .pyc files, then commit them to git.
"""
import shutil
import os
import glob

BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

def main():
    copied = 0
    for pycache in glob.glob(os.path.join(BACKEND, "app", "**", "__pycache__"), recursive=True):
        parent = os.path.dirname(pycache)
        for pyc_file in glob.glob(os.path.join(pycache, "*.cpython-313.pyc")):
            basename = os.path.basename(pyc_file)
            module_name = basename.replace(".cpython-313.pyc", "")
            py_file = os.path.join(parent, module_name + ".py")
            
            if not os.path.exists(py_file):
                dst = os.path.join(parent, module_name + ".pyc")
                shutil.copy2(pyc_file, dst)
                rel = os.path.relpath(dst, BACKEND)
                print(f"  {rel}")
                copied += 1
    
    print(f"\nCopied {copied} .pyc files as importable modules")

if __name__ == "__main__":
    main()
