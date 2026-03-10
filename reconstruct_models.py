"""
Reconstruct SQLAlchemy model .py files from runtime introspection.

Strategy:
1. Copy .pyc files to importable locations (strip cpython tag)
2. Import all models via app.models
3. For each model class, introspect __table__, __mapper__ to reconstruct source
4. Write .py files
"""
import sys
import os
import shutil
import glob
import importlib
import textwrap

BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "app_recovered", "models")

sys.path.insert(0, BACKEND)


def get_sqlalchemy_type_repr(col):
    """Convert a SQLAlchemy column type to its source representation."""
    from sqlalchemy import String, Text, Boolean, Integer, Float, BigInteger, SmallInteger
    from sqlalchemy import DateTime, Date, Time, Interval, Numeric
    from sqlalchemy.dialects.postgresql import UUID, JSONB, INET, ARRAY

    col_type = col.type
    type_cls = type(col_type)
    type_name = type_cls.__name__

    if type_name == "UUID":
        if getattr(col_type, "as_uuid", False):
            return "UUID(as_uuid=True)"
        return "UUID"
    elif type_name == "String":
        length = getattr(col_type, "length", None)
        if length:
            return f"String({length})"
        return "String"
    elif type_name == "Text":
        return "Text"
    elif type_name == "Boolean":
        return "Boolean"
    elif type_name == "Integer":
        return "Integer"
    elif type_name == "BigInteger":
        return "BigInteger"
    elif type_name == "SmallInteger":
        return "SmallInteger"
    elif type_name == "Float":
        return "Float"
    elif type_name == "Numeric":
        precision = getattr(col_type, "precision", None)
        scale = getattr(col_type, "scale", None)
        if precision and scale:
            return f"Numeric({precision}, {scale})"
        return "Numeric"
    elif type_name == "JSONB":
        return "JSONB"
    elif type_name == "INET":
        return "INET"
    elif type_name == "ARRAY":
        item_type = get_sqlalchemy_type_repr_from_type(col_type.item_type)
        return f"ARRAY({item_type})"
    elif type_name in ("tz_datetime", "TZDateTime"):
        return "tz_datetime"
    elif type_name in ("PortableJSON", "portable_json", "JsonbDict"):
        return "JsonbDict"
    elif type_name in ("PortableINET", "portable_inet", "InetString"):
        return "InetString"
    else:
        return type_name


def get_sqlalchemy_type_repr_from_type(t):
    return type(t).__name__


def reconstruct_column(col):
    """Reconstruct a mapped_column() call from a Column object."""
    parts = []
    
    type_repr = get_sqlalchemy_type_repr(col)
    
    fk = None
    for fk_obj in col.foreign_keys:
        fk = str(fk_obj.target_fullname)
        ondelete = fk_obj.ondelete
        break
    
    if fk:
        if ondelete:
            parts.append(f'ForeignKey("{fk}", ondelete="{ondelete}")')
        else:
            parts.append(f'ForeignKey("{fk}")')

    parts.insert(0, type_repr)

    if col.primary_key:
        parts.append("primary_key=True")
    if col.unique and not col.primary_key:
        parts.append("unique=True")
    if not col.nullable and not col.primary_key:
        parts.append("nullable=False")
    if col.nullable and col.primary_key:
        parts.append("nullable=True")
    
    if col.server_default is not None:
        sd = str(col.server_default.arg) if hasattr(col.server_default, 'arg') else str(col.server_default)
        if sd.startswith("'") or sd.startswith('"'):
            parts.append(f"server_default={sd}")
        else:
            parts.append(f'server_default=text("{sd}")')
    
    if col.index and not col.primary_key and not col.unique:
        parts.append("index=True")

    return f"mapped_column({', '.join(parts)})"


def reconstruct_relationship(rel):
    """Reconstruct a relationship() call."""
    parts = [f'"{rel.mapper.class_.__name__}"']
    
    if rel.back_populates:
        parts.append(f'back_populates="{rel.back_populates}"')
    if rel.cascade:
        from sqlalchemy.orm.util import CascadeOptions
        default_cascade = CascadeOptions.from_string("save-update, merge")
        if rel.cascade != default_cascade:
            raw = repr(rel.cascade)
            cascade_str = raw.replace("CascadeOptions('", "").replace("')", "")
            if cascade_str:
                parts.append(f'cascade="{cascade_str}"')
    if not rel.uselist:
        parts.append("uselist=False")
    if rel.lazy and rel.lazy != "select":
        parts.append(f'lazy="{rel.lazy}"')
    
    return f"relationship({', '.join(parts)})"


def get_needed_imports(model_cls):
    """Figure out what imports are needed for a model."""
    imports = set()
    imports.add(("app.database", "Base"))
    
    table = model_cls.__table__
    
    for col in table.columns:
        type_name = type(col.type).__name__
        if type_name in ("String", "Text", "Boolean", "Integer", "Float",
                         "BigInteger", "SmallInteger", "DateTime", "Date",
                         "Numeric", "Interval"):
            imports.add(("sqlalchemy", type_name))
        elif type_name in ("UUID",):
            imports.add(("sqlalchemy.dialects.postgresql", "UUID"))
        elif type_name in ("JSONB",):
            imports.add(("sqlalchemy.dialects.postgresql", "JSONB"))
        elif type_name in ("INET",):
            imports.add(("sqlalchemy.dialects.postgresql", "INET"))
        elif type_name in ("ARRAY",):
            imports.add(("sqlalchemy.dialects.postgresql", "ARRAY"))
        elif type_name in ("tz_datetime", "TZDateTime"):
            imports.add(("app.models._types", "tz_datetime"))
        elif type_name in ("PortableJSON", "portable_json", "JsonbDict"):
            imports.add(("app.models._types", "JsonbDict"))
        elif type_name in ("PortableINET", "portable_inet", "InetString"):
            imports.add(("app.models._types", "InetString"))
        
        if col.foreign_keys:
            imports.add(("sqlalchemy", "ForeignKey"))
        if col.server_default is not None:
            imports.add(("sqlalchemy", "text"))
    
    imports.add(("sqlalchemy.orm", "Mapped"))
    imports.add(("sqlalchemy.orm", "mapped_column"))
    
    mapper = model_cls.__mapper__
    if mapper.relationships:
        imports.add(("sqlalchemy.orm", "relationship"))
    
    table_args = getattr(model_cls, "__table_args__", None)
    if table_args:
        args = table_args if isinstance(table_args, tuple) else (table_args,)
        for arg in args:
            cls_name = type(arg).__name__
            if cls_name in ("CheckConstraint", "UniqueConstraint", "Index"):
                imports.add(("sqlalchemy", cls_name))
    
    if any(col.type.__class__.__name__ in ("UUID",) and getattr(col.type, "as_uuid", False) 
           for col in table.columns):
        imports.add(("uuid",))
    has_datetime_cols = any(type(col.type).__name__ in ("DateTime", "tz_datetime", "TZDateTime")
                           for col in table.columns)
    if has_datetime_cols:
        imports.add(("datetime", "datetime"))
    if any("now()" in str(getattr(col.server_default, 'arg', '')) 
           for col in table.columns if col.server_default is not None):
        imports.add(("datetime", "UTC"))
    
    return imports


def format_imports(imports):
    """Format import statements grouped by module."""
    lines = []
    
    stdlib = []
    sa = []
    sa_pg = []
    sa_orm = []
    app_imports = []
    
    for imp in sorted(imports, key=lambda x: (x[0] if len(x) > 1 else x[0], x[-1] if len(x) > 1 else "")):
        if len(imp) == 1:
            stdlib.append(f"import {imp[0]}")
        elif imp[0] in ("uuid", "datetime", "typing", "enum"):
            if imp[0] == imp[1] and imp[0] == "uuid":
                stdlib.append(f"import {imp[0]}")
            else:
                stdlib.append(f"from {imp[0]} import {imp[1]}")
        elif imp[0] == "sqlalchemy":
            sa.append(imp[1])
        elif imp[0] == "sqlalchemy.dialects.postgresql":
            sa_pg.append(imp[1])
        elif imp[0] == "sqlalchemy.orm":
            sa_orm.append(imp[1])
        elif imp[0].startswith("app."):
            app_imports.append(f"from {imp[0]} import {imp[1]}")
    
    if stdlib:
        lines.extend(sorted(set(stdlib)))
    if stdlib and (sa or sa_pg or sa_orm):
        lines.append("")
    if sa:
        lines.append(f"from sqlalchemy import {', '.join(sorted(set(sa)))}")
    if sa_pg:
        lines.append(f"from sqlalchemy.dialects.postgresql import {', '.join(sorted(set(sa_pg)))}")
    if sa_orm:
        lines.append(f"from sqlalchemy.orm import {', '.join(sorted(set(sa_orm)))}")
    if (sa or sa_pg or sa_orm) and app_imports:
        lines.append("")
    if app_imports:
        lines.extend(sorted(set(app_imports)))
    
    return "\n".join(lines)


def reconstruct_model(model_cls):
    """Reconstruct a complete model .py file."""
    table = model_cls.__table__
    mapper = model_cls.__mapper__
    
    imports = get_needed_imports(model_cls)
    
    doc = getattr(model_cls, "__doc__", None)
    
    lines = []
    if doc:
        lines.append(f'"""{doc}"""')
    
    lines.append(format_imports(imports))
    lines.append("")
    lines.append("")
    lines.append(f"class {model_cls.__name__}(Base):")
    lines.append(f'    __tablename__ = "{table.name}"')
    lines.append("")
    
    for col in table.columns:
        col_repr = reconstruct_column(col)
        python_type = "str"
        type_name = type(col.type).__name__
        if type_name in ("Boolean",):
            python_type = "bool"
        elif type_name in ("Integer", "BigInteger", "SmallInteger"):
            python_type = "int"
        elif type_name in ("Float", "Numeric"):
            python_type = "float"
        elif type_name in ("UUID",) and getattr(col.type, "as_uuid", False):
            python_type = "uuid.UUID"
        elif type_name in ("DateTime", "tz_datetime", "TZDateTime"):
            python_type = "datetime"
        elif type_name in ("JSONB", "PortableJSON", "portable_json", "JsonbDict"):
            python_type = "dict"
        
        if col.nullable and not col.primary_key:
            python_type = f"{python_type} | None"
        
        lines.append(f"    {col.name}: Mapped[{python_type}] = {col_repr}")
    
    if mapper.relationships:
        lines.append("")
        for rel_name, rel in mapper.relationships.items():
            rel_repr = reconstruct_relationship(rel)
            target_name = rel.mapper.class_.__name__
            if rel.uselist:
                type_hint = f'Mapped[list["{target_name}"]]'
            else:
                type_hint = f'Mapped["{target_name} | None"]'
            lines.append(f"    {rel_name}: {type_hint} = {rel_repr}")
    
    table_args = getattr(model_cls, "__table_args__", None)
    if table_args and table_args != ({},) and table_args != {}:
        lines.append("")
        from sqlalchemy import CheckConstraint as CC, UniqueConstraint as UC, Index as IX
        
        args_parts = []
        opts_dict = {}
        
        items = table_args if isinstance(table_args, tuple) else (table_args,)
        for arg in items:
            if isinstance(arg, dict):
                opts_dict = arg
            elif isinstance(arg, CC.__class__) or type(arg).__name__ == "CheckConstraint":
                expr_text = str(arg.sqltext) if hasattr(arg, 'sqltext') else str(arg)
                name = arg.name if hasattr(arg, 'name') else None
                if name:
                    args_parts.append(f'CheckConstraint("{expr_text}", name="{name}")')
                else:
                    args_parts.append(f'CheckConstraint("{expr_text}")')
            elif type(arg).__name__ == "UniqueConstraint":
                cols = [c.name for c in arg.columns]
                name = arg.name if hasattr(arg, 'name') else None
                col_str = ", ".join(f'"{c}"' for c in cols)
                if name:
                    args_parts.append(f'UniqueConstraint({col_str}, name="{name}")')
                else:
                    args_parts.append(f'UniqueConstraint({col_str})')
            elif type(arg).__name__ == "Index":
                cols = [c.name for c in arg.columns]
                name = arg.name
                col_str = ", ".join(f'"{c}"' for c in cols)
                kw = []
                if arg.unique:
                    kw.append("unique=True")
                if name:
                    args_parts.append(f'Index("{name}", {col_str}{"".join(", " + k for k in kw)})')
                else:
                    args_parts.append(f'Index({col_str}{"".join(", " + k for k in kw)})')
            else:
                args_parts.append(repr(arg))
        
        if opts_dict:
            args_parts.append(repr(opts_dict))
        
        if args_parts:
            ta_str = ", ".join(args_parts)
            lines.append(f"    __table_args__ = ({ta_str},)")
    
    lines.append("")
    return "\n".join(lines)


def main():
    # First copy .pyc files to importable locations
    pycache_dirs = glob.glob(os.path.join(BACKEND, "app", "**", "__pycache__"), recursive=True)
    copied = []
    for pycache in pycache_dirs:
        parent = os.path.dirname(pycache)
        for pyc_file in glob.glob(os.path.join(pycache, "*.cpython-313.pyc")):
            basename = os.path.basename(pyc_file)
            module_name = basename.replace(".cpython-313.pyc", "")
            py_file = os.path.join(parent, module_name + ".py")
            if not os.path.exists(py_file):
                dst = os.path.join(parent, module_name + ".pyc")
                if not os.path.exists(dst):
                    shutil.copy2(pyc_file, dst)
                    copied.append(dst)
    
    print(f"Copied {len(copied)} .pyc files as importable")
    
    try:
        from app.database import Base
        import app.models  # trigger all model imports
        
        models = {}
        for cls in Base.__subclasses__():
            if hasattr(cls, "__tablename__"):
                models[cls.__name__] = cls
        
        # Also check for models registered via mapper
        from sqlalchemy import inspect as sa_inspect
        for mapper in Base.registry.mappers:
            cls = mapper.class_
            if hasattr(cls, "__tablename__") and cls.__name__ not in models:
                models[cls.__name__] = cls
        
        print(f"\nFound {len(models)} SQLAlchemy models:")
        for name in sorted(models.keys()):
            print(f"  {name}")
        
        os.makedirs(OUTPUT, exist_ok=True)
        
        success = 0
        failed = 0
        for name, cls in sorted(models.items()):
            try:
                source = reconstruct_model(cls)
                module_name = cls.__tablename__
                # Find the actual module file name from the class
                mod = sys.modules.get(cls.__module__)
                if mod and hasattr(mod, "__file__") and mod.__file__:
                    filename = os.path.basename(mod.__file__).replace(".pyc", ".py")
                else:
                    filename = cls.__tablename__ + ".py"
                
                filepath = os.path.join(OUTPUT, filename)
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(source)
                print(f"  OK: {filename} ({name})")
                success += 1
            except Exception as e:
                print(f"  FAIL: {name}: {e}")
                failed += 1
        
        print(f"\nReconstructed {success} models, {failed} failed")
    
    finally:
        # Cleanup copied .pyc files
        for f in copied:
            if os.path.exists(f):
                os.remove(f)
        print(f"Cleaned up {len(copied)} temporary .pyc files")


if __name__ == "__main__":
    main()
