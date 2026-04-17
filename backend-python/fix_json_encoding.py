import json
import os

key_file = 'dev-v2-ab30b-firebase-adminsdk-fbsvc-d07ac23de6.json'

# Try reading with different encodings
encodings = ['utf-8-sig', 'utf-16', 'utf-16-le', 'utf-16-be', 'utf-8']
content = None

for enc in encodings:
    try:
        with open(key_file, 'r', encoding=enc) as f:
            content = json.load(f)
            print(f"[INFO] Successfully decoded with {enc}")
            break
    except Exception:
        continue

if content:
    # Rewrite as clean UTF-8
    with open(key_file, 'w', encoding='utf-8') as f:
        json.dump(content, f, indent=2)
    print(f"[SUCCESS] Rewrote {key_file} as clean UTF-8")
else:
    print(f"[ERROR] Could not decode {key_file} with any standard encoding")
