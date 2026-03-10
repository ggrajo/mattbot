import shutil
import os
import glob

ALEMBIC_VERSIONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "alembic", "versions")
pycache = os.path.join(ALEMBIC_VERSIONS, "__pycache__")

copied = 0
for pyc_file in glob.glob(os.path.join(pycache, "*.cpython-313.pyc")):
    basename = os.path.basename(pyc_file)
    module_name = basename.replace(".cpython-313.pyc", "")
    py_file = os.path.join(ALEMBIC_VERSIONS, module_name + ".py")
    if not os.path.exists(py_file):
        dst = os.path.join(ALEMBIC_VERSIONS, module_name + ".pyc")
        shutil.copy2(pyc_file, dst)
        print(f"  {module_name}.pyc")
        copied += 1

print(f"\nCopied {copied} alembic migration .pyc files")
