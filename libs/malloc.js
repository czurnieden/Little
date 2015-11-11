/*
   Implement checks for TypedArray.BYTES_PER_ELEMENT ?

   Check endianess?

   function isLittleEndian() {
     var buf = new ArrayBuffer(4);
     var Ui32 = new Uint32Array(buf);
     var Ui8 = new Uint8Array(b);
     Ui32[0] = 0xdeadbeef;
     if(Ui8[0] == 0xef){
       return true;
     }
     return false;
   }

*/
/*
    typedarray.copyWithin(target, start[, end = this.length]) in ES6 (FF only?)
    typedarray.fill(value[, start = 0[, end = this.length]]) in ES6 (FF only?)
*/

"use strict";
/*
   Memory management.
   A more or less verbatim port of K&R "The C Programming Language" (2nd ed.)
   Chapter 8.7
*/
// one MibiByte for legibility
var MB = 1024 * 1024 | 0;
// This wordsize might not be the on you are looking for.
var WORD_SIZE = 4;
var SIZE = 256 * MB / WORD_SIZE; // 32 MibiBytes for 4 bytes word size
// adjust size to represent usable memory
// Idea shamelessly stolen from Coffee-script
var STACK_SIZE = 2 * MB / WORD_SIZE;
var HEAP_SIZE = SIZE - STACK_SIZE;
var buf = new ArrayBuffer(HEAP_SIZE);
/*
var I8 = new Int8Array(buf);
var U8 = new Uint8Array(buf);
var I16 = new Int16Array(buf);
var U16 = new Uint16Array(buf);
var I32 = new Int32Array(buf);
var U32 = new Uint32Array(buf);
*/
var alloc = (function(stdlib, env, heap) {
    "use asm";
    var NALLOC,
        freep,
        base;
    // size of a list-element holding size and pointer to memory
    var sizeofheader = 8; // 2 * sizeof U32[0] -> 8 bytes. Normaly
    var heapsize = stdlib.HEAP_SIZE;

    // TODO: check if heapsize > sizeofheader or throw error (how?)

    var U32 = new Uint32Array(heap);

    // startpoint, first and still empty listelement
    U32[0] = sizeofheader;
    U32[1] = heapsize;

    // Set to true if realloc changed pointer
    // Usefull only if realloc returns an array instead of the startpoint
    var pointerchanged = false;

    // start of the payload--the first two chunks are for the first list-element
    base = 2;
    freep = 0;

    function malloc(nbytes) {
        var nunits,
            p,
            prevp;
        p = 0;
        prevp = 0;
        // round number of bytes up to a multiple of 8
        nunits = ((nbytes + sizeofheader - 1) / sizeofheader | 0) + 1 >>>  0;
        // we have no list, build one
        // This curious construct comes from times when memory was very sparse
        // and very expensive. It is even curiouser that it still works.
        if ((prevp = freep) === 0) {
            U32[base] = prevp = freep = base;
            U32[base + 1] = 0;
        }
        // Quite awkward construct but if K&R think it's ok...
        // ... who am I to disagree?
        // Climb through the list to find a fitting chunk of memory
        for (p = U32[prevp];; prevp = p, p = U32[p]) {
            // it needs to be larger than or equal to the wish of
            // the caller. Obviously.
            if (U32[p + 1] >= nunits) {
                // fits exactly
                if (U32[p + 1] === nunits) {
                    U32[prevp] = U32[p];
                } else {
                    // "Allocate tail end", said K&R, meaning
                    // subtract the amount of memory wished for and
                    U32[p + 1] -= nunits >>> 0;
                    // point p to the end of it, hence "tail end" and
                    p = p + U32[p + 1] * 2;
                    // set actual size
                    U32[p + 1] = nunits;
                }
                freep = prevp;
                // or use TypedArray.subarray(start,end)
                // It returns just a new view, not a copy.
                // Advantage: Bounds-checking
                // Disadvantage: bound to a single view, bounds-checking, don't
                //               know how to free it later.
                return p + 1 * 2 << 2;
            }
            // End of the free-list, need more memory!
            if (p === freep) {
                if ((p = morecore(nunits)) === 0) {
                    // absolute lack of memory because sbrk() says so
                    // throw error here or elsewhere?
                    // no, elsewhere (by caller) is better
                    return 0;
                }
            }
        }
        return 0;
    }


    // Mimimum amount of memory morecore() delivers
    NALLOC = 1024;
    // In a C/Posix malloc implementation sbrk is the function the OS offers
    // to get memory. This sbrk is just a placeholder for now, but see comment
    // inside
    // Actually, neither sbrk() nor morecore() make much sense here
    function sbrk(nb) {
        var aptr;
        var nw = nb / 4 | 0;
        if (U32[0] + nw > heapsize) {
            /*
                - get a larger buffer (twice? limit it?)
                - make a UInt32 array
                - copy the old UInt32 to the new one (or use set()?)
                - make the rest of the typed arrays point to the new buffer
                  (use TA.set(buf)?)
                - sacrifice old buffer to GC (how?)
                - if ArrayBuffer.transfer() makes it to the standard all
                  above is obsolete.
                  Chance to see it happen in the near future? Low.

                If this function is inside an ASMjs block we would need to call
                an external function. This is probably not possible.
            */
            return 0;
        }
        aptr = U32[0];
        U32[0] += nw;
        return aptr;
    }

    function morecore(nu) {
        // we need a minimum.
        // Well, actually, we don't, but who cares
        // the memory is already allocated, we just
        // pretend here (but not in sbrk!)
        if (nu < NALLOC) {
            nu = NALLOC;
        }
        // Get a chunk of memory from the OS. Normaly.
        // But we use JavaSCript here, we have to do
        // it ourselfes.
        var cp = sbrk(nu * sizeofheader | 0);
        if (cp == 0) {
            return 0;
        }
        // set the size we got
        U32[cp + 1] = nu;
        // Let free() do all of the managing
        free(cp + 1 * 2 << 2);
        return freep;
    }

    function free(ap) {
        var bp,
            p;
        // bp points to the block header
        // This is said to work better then 1<<1. Don't know if it is true
        bp = (ap >> 2) - 1 * 2;
        // Another one of these awkward constructs like the one above.
        // This time a wee bit more legible.
        // Scan the list
        for (p = freep; !(bp > p && bp < U32[p]); p = U32[p]) {
            if (p >= U32[p] && (bp > p || bp < U32[p])) {
                // start or end
                break;
            }
        }
        // Join adjacent free blocks
        // join to upper block if there is a free one
        if ((bp + U32[bp + 1] * 2 === U32[p])) {
            // add size of adjacent block
            U32[bp + 1] += U32[U32[p] + 1] >>> 0;
            // point to the block the adjacent block had pointed
            U32[bp] = U32[U32[p]];
        } else {
            U32[bp] = U32[p];
        }
        // join to lower block if there is a free one
        if (p + (U32[p + 1] * 2 === bp)) {
            // add current size to block below
            U32[p + 1] += U32[bp + 1];
            // set the lower block's pointer to the current block's pointer
            U32[p] = U32[bp];
        } else {
            U32[p] = bp;
        }
        freep = p;
    }

    function realloc(ap, newlen) {
        var bp,
            p,
            oldsize;
        if (ap == 0) {
            return malloc(newlen);
        }
        if (newlen == 0) {
            free(ap);
            return 0;
        }
        pointerchanged = false;
        // block header
        bp = (ap >> 2) - 1 * 2;
        oldsize = U32[bp + 1];
        if (oldsize == newlen) {
            return ap;
        }
        // This makes realloc rather expensive. For now.
        if (oldsize < newlen) {
            var np = malloc(newlen);
            pointerchanged = true;
            if (np == 0) {
                return 0;
            }
            if (memcpyU32(np, ap, newlen) < 0) {
                return 0;
            }
            free(ap);
            return np;
        } else {
            // a memory leak.
            return ap;
        }
    }

    function memcpyU32(dst, src, len) {
        if (len < 0) {
            return -1;
        }
        for (var i = src; i < len; i++) {
            U32[dst + i] = U32[src + i];
        }
        return len;
    }

    function cfree(sp, len) {
        var l = (len + 8 - 1) / 8 + 1 >>> 0;
        for (var i = sp; i < sp + l; i++) {
            U32[i] = 0;
        }
        free(sp);
    }

    function calloc(len) {
        var sp = malloc(len);
        var l = (len + 8 - 1) / 8 + 1 >>> 0;
        // there is a TypedArray.prototype.fill()
        // planned for ECMAScript 6
        for (var i = sp; i < sp + l; i++) {
            U32[i] = 0;
        }
        return sp;
    }

    return {
        malloc: malloc,
        calloc: calloc,
        free: free,
        cfree: cfree,
        realloc: realloc,
        pointerchanged: pointerchanged,
        /*I8: I8,
        U8: U8,
        I16: I16,
        U16: U16,
        I32: I32,*/
        U32: U32
    };
})(
    /* stdlib */
    {
        "HEAP_SIZE":HEAP_SIZE,
       "Uint32Array": Uint32Array
    },
    /* env    */
    {},
    /* heap   */
    buf
);



