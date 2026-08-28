# RAÍCES · V42 holistic pass

This pass fixes the local identity assets, Lyda Newman portrait, duplicate science close control, home tree presentation, mobile typography, and Did You Know image sizing.

## Important asset audit
The current source still references external historical/music/art images. Those binaries are not present in the supplied V40 package, so they cannot honestly be claimed as offline-ready yet. The site now avoids inventing a fake portrait when an archival image is unavailable, but the remaining real image binaries should be bundled before the QR/offline final release.

## Required offline asset pack
See ASSET_AUDIT.txt for the exact external references still used by the HTML.


## V43 work pass
- Added user-supplied local portraits: Lyda Newman, Mary Beatrice, Duke Ellington, Ray Charles, James Brown, DJ Kool Herc.
- Music cards now use local assets for those six where the supplied files correspond to the artist.
- Enlarged Did You Know card previews on mobile and kept tap-to-expand behavior; source scans remain unchanged.
- IMPORTANT: Did You Know source scans are still remote in this working pass. For truly offline QR operation, the five full-resolution document images must be supplied as local files.
