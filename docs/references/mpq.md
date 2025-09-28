# MoPaQ archive format on Wiki

Justin Olbrantz (Quantam) and Jean-Francois Roy (BahamutZERO) have written a more detailed description of MPQ format. It can be found on Devklog.com.

## General layout of a MPQ file

General layout of a MPQ file is the following:
Data before the MPQ archive itself

| Component | Required/Optional | Description |
|-----------|-------------------|-------------|
| Data before MPQ archive | Optional | MPQ Archive doesn't have to begin at the beginning of the file. Installation packages or patch executables usually contain the MPQ archive appended at the end of the installer, which is an EXE file. If the MPQ doesn't start at offset 0, it has to start at an offset aligned to 512 (0x200) bytes. |
| MPQ User Data | Optional | In StormLib, MPQ User Data is represented by TMPQUserData structure, described later. MPQ User Data are optional, and is commonly used in custom maps for Starcraft II. If MPQ User Data header is present, it contains an offset, from where the MPQ header should be searched. |
| MPQ Header | **Required** | MPQ Header is described by the TMPQHeader structure in StormLib. Size depends on version: v1=32 bytes, v2=44 bytes, v3≥44 bytes, v4=208 bytes. MPQ Header is the only mandatory part of a MPQ file. Empty MPQs with size of 44 bytes, containing only naked MPQ header have been observed. |
| Files stored in the archive | Optional | All files stored in the MPQ are usually saved at position following the MPQ header. This is not mandatory, however, the only known exception is savegames for Diablo I, where hash table and block table follow immediately after MPQ header. |
| Special files | Optional | Special files include (listfile), (attributes), (signature) and (user data). |
| HET Table | Optional | This table appears in MPQs since version 3 and it is a new version of the hash table. |
| BET Table | Optional | This table appears in MPQs since version 3 and it is a new version of the block table. |
| Hash Table | Optional | Hash table is base table for searching files inside MPQs. One entry in the hash table is described by the TMPQHash structure in StormLib. Beginning with MPQs version 3, hash table is optional and can be fully replaced by HET table. |
| Block Table | Optional | For every file in the MPQ, block table contains offset of the file in the MPQ, file size, compressed size and file flags. Entry in the block table is described by the TMPQBlock structure in StormLib. Beginning with Starcraft II, block table is required to follow hash table. Beginning with MPQ format 3, block table became optional and can fully be replaced by BET table. |
| Hi-Block Table | Optional | Beginning with MPQ format 2, MPQs can contain hi-block table. This table is an array of 16-bit integers, containing upper part of file offset within the MPQ. Hi-block table usually follows the block table, if present. |
| Strong digital signature | Optional | For MPQs used since World of Warcraft, MPQ signature is appended after end of the MPQ. |

## MPQ File Header and MPQ User Data

Great majority of file format begins with a header and MPQ format is no exception. MPQ header (or MPQ user data header) must begin at a file offset aligned to 512 (0x200). While searching for MPQ header, if a MPQ User Data header is found instead of MPQ Header, the algorithm must add the MPQ Header offset to the current file offset and continue searching. Header type is recognized by 32-bit ID:

'MPQ\x1A' means there's MPQ header at that offset
'MPQ\x1B' means there's MPQ user data header at that offset
Both structures, written as C++ data types are here:
```cpp
// MPQ user data
struct TMPQUserData
{
    // The ID_MPQ_USERDATA ('MPQ\x1B') signature
    DWORD dwID;

    // Maximum size of the user data
    DWORD cbUserDataSize;

    // Offset of the MPQ header, relative to the begin of this header
    DWORD dwHeaderOffs;

    // Appears to be size of user data header (Starcraft II maps)
    DWORD cbUserDataHeader;
};
// MPQ file header
struct TMPQHeader
{
    // The ID_MPQ ('MPQ\x1A') signature
    DWORD dwID;                         

    // Size of the archive header
    DWORD dwHeaderSize;                   

    // Size of MPQ archive
    // This field is deprecated in the Burning Crusade MoPaQ format, and the size of the archive
    // is calculated as the size from the beginning of the archive to the end of the hash table,
    // block table, or extended block table (whichever is largest).
    DWORD dwArchiveSize;

    // 0 = Format 1 (up to The Burning Crusade)
    // 1 = Format 2 (The Burning Crusade and newer)
    // 2 = Format 3 (WoW - Cataclysm beta or newer)
    // 3 = Format 4 (WoW - Cataclysm beta or newer)
    USHORT wFormatVersion;

    // Power of two exponent specifying the number of 512-byte disk sectors in each logical sector
    // in the archive. The size of each logical sector in the archive is 512 * 2^wBlockSize.
    USHORT wBlockSize;

    // Offset to the beginning of the hash table, relative to the beginning of the archive.
    DWORD dwHashTablePos;
    
    // Offset to the beginning of the block table, relative to the beginning of the archive.
    DWORD dwBlockTablePos;
    
    // Number of entries in the hash table. Must be a power of two, and must be less than 2^16 for
    // the original MoPaQ format, or less than 2^20 for the Burning Crusade format.
    DWORD dwHashTableSize;
    
    // Number of entries in the block table
    DWORD dwBlockTableSize;

    //-- MPQ HEADER v 2 -------------------------------------------

    // Offset to the beginning of array of 16-bit high parts of file offsets.
    ULONGLONG HiBlockTablePos64;

    // High 16 bits of the hash table offset for large archives.
    USHORT wHashTablePosHi;

    // High 16 bits of the block table offset for large archives.
    USHORT wBlockTablePosHi;

    //-- MPQ HEADER v 3 -------------------------------------------

    // 64-bit version of the archive size
    ULONGLONG ArchiveSize64;

    // 64-bit position of the BET table
    ULONGLONG BetTablePos64;

    // 64-bit position of the HET table
    ULONGLONG HetTablePos64;

    //-- MPQ HEADER v 4 -------------------------------------------

    // Compressed size of the hash table
    ULONGLONG HashTableSize64;

    // Compressed size of the block table
    ULONGLONG BlockTableSize64;

    // Compressed size of the hi-block table
    ULONGLONG HiBlockTableSize64;

    // Compressed size of the HET block
    ULONGLONG HetTableSize64;

    // Compressed size of the BET block
    ULONGLONG BetTableSize64;

    // Size of raw data chunk to calculate MD5.
    // MD5 of each data chunk follows the raw file data.
    DWORD dwRawChunkSize;                                 

    // Array of MD5's
    unsigned char MD5_BlockTable[MD5_DIGEST_SIZE];      // MD5 of the block table before decryption
    unsigned char MD5_HashTable[MD5_DIGEST_SIZE];       // MD5 of the hash table before decryption
    unsigned char MD5_HiBlockTable[MD5_DIGEST_SIZE];    // MD5 of the hi-block table
    unsigned char MD5_BetTable[MD5_DIGEST_SIZE];        // MD5 of the BET table before decryption
    unsigned char MD5_HetTable[MD5_DIGEST_SIZE];        // MD5 of the HET table before decryption
    unsigned char MD5_MpqHeader[MD5_DIGEST_SIZE];       // MD5 of the MPQ header from signature to (including) MD5_HetTable

};
```

HET Table
Beginning with format version 3 (first time observed during beta testing of World of Warcraft - Cataclysm), MPQs can contain a HET table. The HET table is present if the HetTablePos64 member of MPQ header is set to nonzero. This table can fully replace hash table. Depending on MPQ size, the pair of HET&BET table can be more efficient than Hash&Block table. HET table can be encrypted and compressed.

The structure of the HET table, as stored in the MPQ, is the following:

```cpp
    // Common header, for both HET and BET tables
    DWORD dwSignature;                      // 'HET\x1A'
    DWORD dwVersion;                        // Version. Seems to be always 1
    DWORD dwDataSize;                       // Size of the contained table

    DWORD dwTableSize;                      // Size of the entire hash table, including the header (in bytes)
    DWORD dwMaxFileCount;                   // Maximum number of files in the MPQ
    DWORD dwHashTableSize;                  // Size of the hash table (in bytes)
    DWORD dwHashEntrySize;                  // Effective size of the hash entry (in bits)
    DWORD dwTotalIndexSize;                 // Total size of file index (in bits)
    DWORD dwIndexSizeExtra;                 // Extra bits in the file index
    DWORD dwIndexSize;                      // Effective size of the file index (in bits)
    DWORD dwBlockTableSize;                 // Size of the block index subtable (in bytes)
    
    // HET hash table. Each entry is 8 bits.
    BYTE  HetHashTable[dwHashTableSize];
    
    // Array of file indexes. Bit size of each entry is taken from dwTotalIndexSize.
    // Table size is taken from dwHashTableSize.
## BET Table

Beginning with format version 3, MPQs can have a BET table. The BET table is present if the BetTablePos64 member of MPQ header is set to nonzero. BET table is a successor of classic block table, and can fully replace it. It is also supposed to be more effective. The structure of BET table, as it is in the MPQ, is the following:

```cpp
struct TMPQBetTable
{
    // Common header, for both HET and BET tables
    DWORD dwSignature;                      // 'BET\x1A'
    DWORD dwVersion;                        // Version. Seems to be always 1
    DWORD dwDataSize;                       // Size of the contained table

    DWORD dwTableSize;                      // Size of the entire hash table, including the header (in bytes)
    DWORD dwFileCount;                      // Number of files in the BET table
    DWORD dwUnknown08;                      // Unknown, set to 0x10
    DWORD dwTableEntrySize;                 // Size of one table entry (in bits)
    DWORD dwBitIndex_FilePos;               // Bit index of the file position (within the entry record)
    DWORD dwBitIndex_FileSize;              // Bit index of the file size (within the entry record)
    DWORD dwBitIndex_CmpSize;               // Bit index of the compressed size (within the entry record)
    DWORD dwBitIndex_FlagIndex;             // Bit index of the flag index (within the entry record)
    DWORD dwBitIndex_Unknown;               // Bit index of the ??? (within the entry record)
    DWORD dwBitCount_FilePos;               // Bit size of file position (in the entry record)
    DWORD dwBitCount_FileSize;              // Bit size of file size (in the entry record)
    DWORD dwBitCount_CmpSize;               // Bit size of compressed file size (in the entry record)
    DWORD dwBitCount_FlagIndex;             // Bit size of flags index (in the entry record)
    DWORD dwBitCount_Unknown;               // Bit size of ??? (in the entry record)
    DWORD dwTotalBetHashSize;               // Total size of the BET hash
    DWORD dwBetHashSizeExtra;               // Extra bits in the BET hash
    DWORD dwBetHashSize;                    // Effective size of BET hash (in bits)
    DWORD dwBetHashArraySize;               // Size of BET hashes array, in bytes
    DWORD dwFlagCount;                      // Number of flags in the following array

    // Followed by array of file flags. Each entry is 32-bit size and its meaning is the same like
    DWORD dwFlagsArray[dwFlagCount];

    // File table. Size of each entry is taken from dwTableEntrySize.
    // Size of the table is (dwTableEntrySize * dwMaxFileCount), round up to 8.

    // Array of BET hashes. Table size is taken from dwMaxFileCount from HET table
};
```
## Looking for a file using HET & BET table
The algorithm of looking for a file in the HET table is the following:

From the full file name, calculate 64-bit hash value using Jenkins' algorithm v 2. Letters are lowercased, slashes are turned into backslashes.
Cut the file hash to number of bits specified by dwHashEntrySize and set the highest bit:
FileNameHash = (HashStringJenkins(szFileName) & AndMask64) | OrMask64;
Get values of HET hash (upper 8 valid bits) and BET hash (remaining bits of the hash value).
HetHash = (BYTE)(FileNameHash >> (dwHashBitSize - 8));
BetHash = FileNameHash & (AndMask64 >> 0x08);
Get the initial searching index as the hash value modulo size of the hash table
StartIndex = (DWORD)(FileNameHash % dwHashTableSize);
At current index, look for the HET hash value in the first table
If the equal HET value is found, get the BET index from the second table. The table of BET indexes is bit-based, and size of one entry doesn't have to be aligned to whole bytes.
Using the BET index, get the BET hash from the BET table.
If the values match, we found the file. If they don't, go back to step 5). Repeat until a HET hash of zero value is found, or until we reach the initial search index.
## Hash Table

Hash table is used for searching files by name. The file name is converted to two 32-bit hash values, which are then used for searching in the table. The size of the hash table must always be a power of two. Each entry in the hash table also contains file locale and offset into block table. Size of one entry of hash table is 16 bytes. The structure of hash table is the following:

```cpp
// Hash entry. All files in the archive are searched by their hashes.
struct TMPQHash
{
    // The hash of the full file name (part A)
    DWORD dwName1;

    // The hash of the full file name (part B)
    DWORD dwName2;

    // The language of the file. This is a Windows LANGID data type, and uses the same values.
    // 0 indicates the default language (American English), or that the file is language-neutral.
    USHORT lcLocale;

    // The platform the file is used for. 0 indicates the default platform.
    // No other values have been observed.
    USHORT wPlatform;

    // If the hash table entry is valid, this is the index into the block table of the file.
    // Otherwise, one of the following two values:
    //  - FFFFFFFFh: Hash table entry is empty, and has always been empty.
    //               Terminates searches for a given file.
    //  - FFFFFFFEh: Hash table entry is empty, but was valid at some point (a deleted file).
    //               Does not terminate searches for a given file.
    DWORD dwBlockIndex;
};
```
When more language versions of the same file exist in the archive, its hash entries follow and they differ only by value of lcLocale. Language versions are shown in this table:

| Value | Language version | Value | Language version |
|-------|------------------|-------|------------------|
| 0 | Neutral/English (American) | 0x404 | Chinese (Taiwan) |
| 0x405 | Czech | 0x407 | German |
| 0x409 | English | 0x40a | Spanish |
| 0x40c | French | 0x410 | Italian |
| 0x411 | Japanese | 0x412 | Korean |
| 0x415 | Polish | 0x416 | Portuguese |
| 0x419 | Russian | 0x809 | English (UK) |
The hash table is encrypted, so it is not possible to recognize in the archive. Number of entries in this table is stored in the MPQ archive header. More informations about hash theory are described in the fundamentals chapter.

In World of Warcraft, the hash table was observed to be compressed in one of partial MPQs used by the trial version of the game. Compressed size of hash table is calculated as:

CompressedHashTableSize = (pMpqHeader->dwBlockTablePos - pMpqHeader->dwHashTablePos)
## Block Table

Block table contains informations about file sizes and way of their storage within the archive. It also contains the position of file content in the archive. Size of block table entry is (like hash table entry). The block table is also encrypted. The entry in the block table has the following structure:

```cpp
// File description block contains informations about the file
struct TMPQBlock
{
    // Offset of the beginning of the file data, relative to the beginning of the archive.
    DWORD dwFilePos;

    // Compressed file size
    DWORD dwCSize;

    // Size of uncompressed file
    DWORD dwFSize;

    // Flags for the file. See the table below for more informations
    DWORD dwFlags;
};
```
Meanings of the dwFlags value:

| Flag name | Value | Meaning |
|-----------|-------|---------|
| MPQ_FILE_IMPLODE | 0x00000100 | File is compressed using PKWARE Data compression library |
| MPQ_FILE_COMPRESS | 0x00000200 | File is compressed using combination of compression methods |
| MPQ_FILE_ENCRYPTED | 0x00010000 | The file is encrypted |
| MPQ_FILE_FIX_KEY | 0x00020000 | The decryption key for the file is altered according to the position of the file in the archive |
| MPQ_FILE_PATCH_FILE | 0x00100000 | The file contains incremental patch for an existing file in base MPQ |
| MPQ_FILE_SINGLE_UNIT | 0x01000000 | Instead of being divided to 0x1000-bytes blocks, the file is stored as single unit |
| MPQ_FILE_DELETE_MARKER | 0x02000000 | File is a deletion marker, indicating that the file no longer exists. This is used to allow patch archives to delete files present in lower-priority archives in the search chain. The file usually has length of 0 or 1 byte and its name is a hash |
| MPQ_FILE_SECTOR_CRC | 0x04000000 | File has checksums for each sector (explained in the File Data section). Ignored if file is not compressed or imploded. |
| MPQ_FILE_EXISTS | 0x80000000 | Set if file exists, reset when the file was deleted |
In World of Warcraft, the block table was observed to be compressed in one of partial MPQs used by the trial version of the game. Compressed size of block table is calculated as:

CompressedBlockTableSize = (pMpqHeader->dwArchiveSize - pMpqHeader->dwBlockTablePos)
Searching file using Hash & Block tables
The algorithm of looking for a file in the Hash table is the following:

From the full file name, calculate three hash values, using Blizzard's proprietary algorithm:
DWORD dwIndex = HashString(szFileName, MPQ_HASH_TABLE_INDEX);
DWORD dwName1 = HashString(szFileName, MPQ_HASH_NAME_A);
DWORD dwName2 = HashString(szFileName, MPQ_HASH_NAME_B);
Calculate the initial searching index as mask from hash table size and the first hash value:
pStartHash = pHashTable + (dwIndex & (dwHashTableSize - 1));
At current index, check if pHash->dwName1 and pHash->dwName2 match with second and third hash value. If they don't match, go to the next hash value, until a hash entry with dwBlockIndex of value 0xFFFFFFFF is found.
If they match, we found the hash entry. Take the dwBlockIndex from hash entry, that is index to the block table.
Hi-block Table
Since World of Warcraft - The Burning Crusade, Blizzard extended the MPQ format to support archives larger than 4GB. The hi-block table holds the higher 16-bits of the file position in the MPQ. Hi-block table is plain array of 16-bit values. This table is not encrypted.

Storage of files in the archive
Every file, stored in the archive, is split to blocks. Size of one uncompressed block can be found in the MPQ header, usually 4 KB. If a file is compressed, the blocks are stored as compressed with the variable length. In this case, a table of block offsets (relative to the begin of the file in the MPQ is stored at the begin of the file data. Number of these entries is 1 greater that number of blockc in the file. The last one is used for getting last block size. One entry has 4 bytes (32bit value). Every block is compressed and encrypted separately, if the respective bits are set in file flags. Most the files are encrypted, except for e.g. videos (SMK file types). More information about compression and encryption can be found in the chapter Fundamentals.
