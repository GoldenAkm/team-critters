import s3fs
# Paste this at the top of your own notebooks
import s3fs
import io
import zipfile

fs = s3fs.S3FileSystem(profile="hack-team")   # uses the key you saved in Step 1
BUCKET   = "ocean-hackathon-2026"
DATA_DIR = f"{BUCKET}/data/critter"          # your team's raw data (read-only)
TEAM_DIR = f"{BUCKET}/teams/team-critter"    # your team's workspace (save results here)

fs = s3fs.S3FileSystem(profile="hack-team")   # uses the key you saved in Step 1
BUCKET   = "ocean-hackathon-2026"
DATA_DIR = f"{BUCKET}/data/critter"          # your team's raw data (read-only)
TEAM_DIR = f"{BUCKET}/teams/team-critter"    # your team's workspace (save results here)

zips = [p for p in fs.ls(DATA_DIR) if p.endswith(".zip")]
print("Zip files:", [z.split("/")[-1] for z in zips])

z = zipfile.ZipFile(fs.open(zips[0]))     # opens remotely - only reads what it needs
images = [n for n in z.namelist() if n.lower().endswith((".jpg", ".jpeg", ".png", ".tif", ".tiff"))]
print(len(images), "images in", zips[0].split("/")[-1])
images[:10]


# Show one image
from PIL import Image
import matplotlib.pyplot as plt

img = Image.open(io.BytesIO(z.read(images[0])))
print(images[0], img.size)
plt.imshow(img); plt.axis("off"); plt.show()