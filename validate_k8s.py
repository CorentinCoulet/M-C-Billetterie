import yaml

with open(r'f:\projets persos\billetterie\k8s\production.yaml', 'r') as f:
    docs = list(yaml.safe_load_all(f))

for i, doc in enumerate(docs):
    if doc and doc.get('kind') == 'NetworkPolicy':
        print(f'NetworkPolicy #{i}: {doc.get("metadata", {}).get("name", "unnamed")}')
        spec = doc.get('spec', {})
        if 'podSelector' not in spec:
            print(f'  ERROR: Missing podSelector in NetworkPolicy #{i}')
            print(f'  Spec contents: {list(spec.keys())}')
        else:
            print(f'  OK: podSelector found')
            
print(f'Total documents: {len(docs)}')
print(f'NetworkPolicy count: {sum(1 for doc in docs if doc and doc.get("kind") == "NetworkPolicy")}')
