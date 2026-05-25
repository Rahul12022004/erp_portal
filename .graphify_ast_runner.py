import sys, json
from graphify.extract import collect_files, extract
from pathlib import Path

data = json.loads(Path(".graphify_detect.json").read_text(encoding="utf-16"))
code_files = []
for f in data.get("files", {}).get("code", []):
    p = Path(f)
    if p.is_dir():
        code_files.extend(collect_files(p))
    else:
        code_files.append(p)

print(f"Code files: {len(code_files)}")
result = extract(code_files)
Path(".graphify_ast.json").write_text(json.dumps(result, indent=2))
print(f"AST: {len(result['nodes'])} nodes, {len(result['edges'])} edges")
