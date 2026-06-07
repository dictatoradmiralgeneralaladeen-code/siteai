import os
import shutil

SOURCE_FOLDER = r"C:\Users\Anas\Downloads\Revisedtill8thJune2026"
OUTPUT_FOLDER = SOURCE_FOLDER + "_renamed"

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

for fname in os.listdir(SOURCE_FOLDER):
    if not fname.lower().endswith(".pdf"):
        continue

    src = os.path.join(SOURCE_FOLDER, fname)

    # Keep first 75 characters INCLUDING everything from the beginning
    new_name = fname[:75]

    # Ensure extension remains .pdf
    if not new_name.lower().endswith(".pdf"):
        new_name = os.path.splitext(new_name)[0] + ".pdf"

    dst = os.path.join(OUTPUT_FOLDER, new_name)

    counter = 1
    while os.path.exists(dst):
        base, ext = os.path.splitext(new_name)
        dst = os.path.join(OUTPUT_FOLDER, f"{base}_{counter}{ext}")
        counter += 1

    shutil.copy2(src, dst)

print("Done!")
print("Output folder:", OUTPUT_FOLDER)