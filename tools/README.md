# Tools

Simple scripts for quickly manipulating data, scripts also have batch files for quick drag-n-drop operations.

## Scripts

**Pack**

Packs a folder into an archive, it's important to note that the filename of the archive gets hashed in the archive itself, so renaming it will cause the game to mark it as corrupted.

***Toggle***

Primarily for being used with savedata, de/encrypts savedata, calculates appropriate MD5 signature and de/recompresses data as necessary, as with archives, the resource will keep a hash of its filename, so renaming it will cause the game to mark it as corrupted.

***Unmip***

Converts a MIP texture to a PNG.

***Unpack***

Unpacks and decrypts all assets in an archive.