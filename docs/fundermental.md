```c
void prepareCryptTable()
{ 
    unsigned long seed = 0x00100001, index1 = 0, index2 = 0, i;

    for(index1 = 0; index1 < 0x100; index1++)
    { 
        for(index2 = index1, i = 0; i < 5; i++, index2 += 0x100)
        { 
            unsigned long temp1, temp2;

            seed = (seed * 125 + 3) % 0x2AAAAB;
            temp1 = (seed & 0xFFFF) << 0x10;

            seed = (seed * 125 + 3) % 0x2AAAAB;
            temp2 = (seed & 0xFFFF);

            cryptTable[index2] = (temp1 | temp2); 
        } 
    } 
}
```

```c
void DecryptBlock(void *block, long length, unsigned long key)
{ 
    unsigned long seed = 0xEEEEEEEE, unsigned long ch;
    unsigned long *castBlock = (unsigned long *)block;

    // Round to longs
    length >>= 2;

    while(length-- > 0)
    { 
        seed += stormBuffer[0x400 + (key & 0xFF)];
        ch = *castBlock ^ (key + seed);

        key = ((~key << 0x15) + 0x11111111) | (key >> 0x0B);
        seed = ch + seed + (seed << 5) + 3;
        *castBlock++ = ch; 
    } 
}
```
