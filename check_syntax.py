import os, sys

dirs_to_check = [
    os.path.join("backend", "app_recovered", "models"),
    os.path.join("backend", "app_recovered", "schemas"),
    os.path.join("backend", "app_recovered", "api", "v1"),
    os.path.join("backend", "app_recovered", "services"),
    os.path.join("backend", "app_recovered", "workers"),
    os.path.join("backend", "app_recovered", "core"),
    os.path.join("backend", "alembic_recovered"),
]

for d in dirs_to_check:
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        if not f.endswith(".py"):
            continue
        path = os.path.join(d, f)
        try:
            compile(open(path, encoding="utf-8").read(), path, "exec")
            print(f"  OK: {path}")
        except SyntaxError as e:
            print(f"  SYNTAX ERROR: {path}: {e.msg} (line {e.lineno})")
