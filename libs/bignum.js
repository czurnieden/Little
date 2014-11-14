"use strict";

/*
    Errors found by an unbridled eslint are mostly intentionally (e.g.: "=="
    instead of "===") but should be checked carefully nevertheless.

    The command

  eslint --rule "no-unused-vars:0, no-console:0, quotes:0, new-cap:0, no-empty:0, no-spaced-func:0, no-cond-assign:0, no-constant-condition:0, no-underscore-dangle:0, eqeqeq:0, camelcase:0, no-extend-native:0, yoda:0, eol-last:0, global-strict:0"  bignum.js

    will result in the following output (linenumbers may change)

  205:21  error  'DataView' is not defined                  no-undef
  251:19  error  'console' is not defined                   no-undef
  252:12  error  'console' is not defined                   no-undef
  254:19  error  'alert' is not defined                     no-undef
  201:11  error  MP_L1_SIZE was used before it was defined  no-use-before-define

    The reasons for occuring and/or the reasons for ignoring:

  205:21 typed arrays are not in ECMAScript 5.1 but implemented everywhere
  251:19 we check if something is defined, so it is possible it wasn't defined
  252:12 in the first place
  254:19    -"-
  201:11 basically the same as above

*/

/*
    Formatted with

    js-beautify -b "expand"  -w 80 -s 4 -k --end_with_newline bignum.js
*/

/*
          ######  ####### #     #    #    ######  #######   ###
          #     # #       #  #  #   # #   #     # #         ###
          #     # #       #  #  #  #   #  #     # #         ###
          ######  #####   #  #  # #     # ######  #####      #
          #     # #       #  #  # ####### #   #   #
          #     # #       #  #  # #     # #    #  #         ###
          ######  #######  ## ##  #     # #     # #######   ###

This code is completely untested, might kill you cat, mother-in-law, landlord,
investment-banker (you once were in need of an investment-banker?) and worst of
all: it may not even compile!

*/

// Needs  ECMAScript 5.1 compliant engine to work
// Please be aware that I didn't wrote "Needs  ECMAScript >5.1 compliant engine
// to work" although it should be upwards comnpatible to "Harmony" at least

/*
  This code contains some ports of Libtommath (public domain) and some ports of
  older SunPro code (License below)
*/
/*
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunPro, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 */
/*
   The snippets with code from SunPro are annotated as such. Replace if
   the above license is a problem.
   It seems as if no SunPro code gets used up until this comment has been written.
*/

/*
  TODO: Quite a lot.

  - should be modern but also kept legible and easy to follow, e.g. putting the
    whole thing in a module for easier use might be a nice idea.
  - some things are superfluous
  - in urgent need of correct error-checking with try/catch and error throw-ing
  - some of the inner loops can make use of multiple cores/processors
    but the thread-like Worker() is quite restricted, so it may or may not of
    any use here
  - Make use of a general namespace for all of the global variables
    (Bignum or something which will make sense after adding of a Bigfloat )
  - ECMA 5 offers typed arrays, check if Uint32Arrays do the job better
    (needs a byteorder check); see also Float64Array for the FFT.
    http://jsperf.com/array-vs-uint32array says it is faster but not much
    http://jsperf.com/array-vs-uint32array/7 says it is slower
    http://jsperf.com/float64array/2         much slower

    Interresting benchmark:
    http://jsperf.com/greatest-common-divisor-uint32array/3
    The Browserscope inlined beneath shows Chrome 31.0.1600 with basically
    all the same results. Could it be that Chrome optimizes every function
    into the same "assembler" code? Could it be a good idea to check the
    computated results? ;-)

  - there are some tricks in ASM.js which needs to be done here
    especially "x>>>0" to make it unsigned and "x|0" to make it an integer (x
    may be an explicite number e.g.: "123>>>0" or "0|0" respectively)
    but the whole thing is quite complicated to do by hand. I don't think
    I'll do the whole asm.js thingie by hand, the memory managment is too
    complicated. Says an old C-programmer ;-)

  - some things are really stupid. Feel free to post them at thedailywtf.com,
    the folks there will take care of the "make fun of it and ridicule" part but
    do a CC to me to give me a chance to correct it if it is a real bug.
    And only if it is a real bug, simple idiocy does not count ;-)
*/


// Flagnames taken from libtommath

// Preallocated length of bitarray. Probably unnecessary, may be removed in the
// future. Or not if and when typed arrays gets used instead of normal ones.
// The latter is unlikely until no function like realloc or similar allow for
// dynamic growth of the buffer
var MP_PREC = 5;
// Flag for positive value
var MP_ZPOS = 1;
// Flag for negative value
var MP_NEG = -1;

// Comparing
// less than
var MP_LT = -1;
// equal
var MP_EQ = 0;
// greater than
var MP_GT = 1;

// Errors
var MP_OKAY = 0;
// Input wrong
var MP_DOMAIN = -2;
var MP_VAL = -3;
// Output out of range (mostly too large)
var MP_RANGE = MP_VAL;
// Function not supported (you may come back later)
var MP_NOTSUP = -4;
var MP_NOSYS = MP_NOTSUP;
// Value too large for something to be specified elsewhere
var MP_OVERFLOW = -5;
// Value too small for something to be specified elsewhere
var MP_UNDERFLOW = -6;
// total loss of significance
var MP_TLOSS = -7;
// partial loss of significance
var MP_PLOSS = -8;
// Pole error (singularity)
var MP_SING = -9;




// A bit of Bool
var MP_YES = true;
var MP_NO = false;

// Cut-offs for fast multiplication (YMMV. Please send a note if it varies)

var KARATSUBA_MUL_CUTOFF = 125;
var KARATSUBA_SQR_CUTOFF = 200;

var TOOM_COOK_MUL_CUTOFF = 475;
var TOOM_COOK_SQR_CUTOFF = 600;

// although not tested yet, but seemed reasonable
var FFT_MUL_CUTOFF = 4096;
// do one karatsuba mul. if limit is reached
// 2^23 is below limit and still 8,388,608 limbs large which is > 10^(10^14)
var FFT_UPPER_LIMIT = 1 << 23; // only if NTT is not implemented
var FFT_SQR_CUTOFF = 2048;

/*
var NTT_MUL_CUTOFF;
var NTT_SQR_CUTOFF;

var TOOM_COOK_4_MUL_CO;
var TOOM_COOK_4_SQR_CO;

var TOOM_COOK_5_MUL_CO;
var TOOM_COOK_5_SQR_CO;
*/

// Cut-offs for fast division (YMMV. Please send a note if it varies)

/*
var BURN_ZIEG_NUMERATOR;
var BURN_ZIEG_DENOMINATOR;
var BURN_ZIEG_RELATION;
// when to do the normal division
var BURN_ZIEG_CUTOFF;
*/
// for N<=2*D size of numerator, size of denominator otherwise
// Reason: Barrett-division works only with multiplication faster than
// O(n^2) in theory, in praxi it needs the O(n^1.465) of Toom-Cook 3-way, 2-way
// does not seem fast enough
var BARRETT_NUMERATOR   = 3800;
var BARRETT_DENOMINATOR = 1900;
var BARRETT_RELATION    = .5;
// when to do some rounds of Newton-Raphson to refine mu (the reciprocal) for
// Barrett-division
var BARRETT_NEWTON_CUTOFF = 100;

// Division by multiplication with reciprocal (simple Newton-Raphson)
// These are the ranges where the steps of FFT multiplication can influence
// some specific cutoffs values. Truncated FFT is planned but not yet
// implemented
var NEWTON_NUMERATOR = 8000;
var NEWTON_DENOMINATOR = 4000;
// reasonabel general cutoff if the k of N=k*D is not too large
var NEWTON_CUTOFF = 77000; // >2 mio bits

// Bits per digit. See below for details
var MP_DIGIT_BIT = 26;
// Digit mask (e.g.: 0x3fffffff for 30 bit long digits)
var MP_MASK = ((1 << MP_DIGIT_BIT) - 1);
// Too large a digit by one. (radix)
var MP_DIGIT_MAX = (1 << MP_DIGIT_BIT);


// half digits needed for FFT multiplication
var MP_HALF_DIGIT_BIT = (MP_DIGIT_BIT >> 1);
var MP_HALF_DIGIT = (1 << MP_HALF_DIGIT_BIT);
var MP_HALF_DIGIT_MASK = (MP_HALF_DIGIT - 1);

/* Used in FFT code */
/*
  The size of the L1-cache in bytes. The number here is that of the data cache
  part of an AMD Duron. The Linux kernel gives a lot of information e.g.:
    grep . /sys/devices/system/cpu/cpu0/cache/index

  There is also lscpu(1) wich is easier to use.
  On Windows:
    http://msdn.microsoft.com/en-us/library/ms683194.aspx
    http://www.cpuid.com/softwares/cpu-z.htm
  Lack of access to a Mac leaves that part blank. The new MacOS is based on BSD,
  so 'dmesg' might work or
    cat /var/run/dmesg.boot | grep CPU

  if in doubt leave the value as it is but give 32 kib (32768) at least a try.

 */

if (typeof MP_L1_SIZE === 'undefined') {
    var MP_L1_SIZE = 65536;
}
// Memory for some of the bit-juggling below
var double_int = new DataView(new ArrayBuffer(8));

// modular multiplicative inverse of 3 (three) for exactDiv3
var MOD_MUL_INV_THREE;
var MOD_MUL_INV_THREE_HALF;

/*
  checking for endianess (little endian only for now)

  The method (shamelessly stolen from emscripten) is a bit more complicated than
  I want it but things like

    var byteorder;
    var test = 0xaabbccdd;
    if((test&0xff) == 0xdd) byteorder = "1234";
    else if((test&0xff) == 0xaa) byteorder = "4321";
    else if((test&0xff) == 0xbb){
      print(  "Please send a note to czurnieden@gmx.de and tell me"
            + " which browser/javascript parser you installed on"
            + " which machine (PDP-11, old VAX in comp.mode, emulator etc.) and"
            + " how... no, wait: WHY did you do that? (as if I do not know the"
            + "answer)");
      byteorder = "3412";
    }
    // Yes, there exist bytorders that are even more exotic than
    // the PDP-11 byteorder. Please send a note to the author.
    else return undefined;
    return byteorder

  are a bit dubious ("test" needs to act like an unsigned 32 bit integer. Does
  it? Always?), so I've chosen the long and tedious but correct way.

  Throws a FatalError which you may or may not want to catch.

  It seems as if the endianess of typed arrays gets fixed in the next ECMAScript
  standard to big-endian. But only them.
*/
var __bigint_check_endianess = (function() {
    try {
        var buffer = new ArrayBuffer(8);
        var strerror =
            'Bigint was written for a little-endian system only, sorry.';
        var MP_ENDIANESS_TEST_32 = new Int32Array(buffer);
        var MP_ENDIANESS_TEST_8 = new Uint8Array(buffer);
        MP_ENDIANESS_TEST_32[0] = 0xff;
        if (MP_ENDIANESS_TEST_8[3] === 0xff &&
            MP_ENDIANESS_TEST_8[0] === 0) {
            throw {
                name: 'FatalError',
                message: strerror
            };
        }
    } catch (e) {
        if (typeof console.log === 'function') {
            console.log(e.message);
        }
        if (typeof alert === 'function') {
            //alert(e.message);
        }
        throw {
            name: 'FatalError',
            message: strerror
        };
    }
})();

/******************************************************************************
 *
 *  Some helpers to make it stand-alone
 *
 ******************************************************************************/

/*
 * generalized, extendable "typeof" function
 */
function xtypeof(obj) {
    // try it the traditional way
    var tmp = typeof obj;
    if (tmp !== "object") {
        return tmp;
    } else {
        // try the toString prototype
        var toString = Object.prototype.toString;
        tmp = toString.call(obj);
        // it is one of the build-ins
        if (tmp !== "[object Object]") {
            return tmp.slice(8, -1).toLowerCase();
        } else {
            // Put your own objects here
            // they must exist at this point
            //var list = {
            // "bigint": Bigint ,
            // "complex": Complex
            //};
            //for (var p in list) {
            //if (obj instanceof list[p]) {
            //return p;
            //}
            //}
            return "object";
        }
    }
}

// Computes iteration steps for e.g. Newton-Raphson
// "stepsize" is the length of the steps and a multiplicator.
// For example stepsize=2 for quadratic convergences (Newton), stepsize=3
// for cubic ones (Housholder), etc.
// Yep, just like the similarily named Python function
function computeGiantsteps(start, end, stepsize) {
    var ret = [ end ],
        i = 1;
    if (arguments.length != 3) {
        return MP_VAL;
    }
    while (true) {
        if (ret[ ret.length - 1 ] <= start * stepsize) {
            break;
        }
        ret[ i++ ] = Math.floor(ret[ret.length - 1] / stepsize) + 2;
    }
    return ret.reverse();
}

/*
 * All functions implemented by prototyping to avoid name-clashes
 * E.g.: there is a Number.isNaN but no Number.prototype.isNaN
 * but mainly to support a common codebase, such that it will not matter if the
 * variable A in A.isNaN() is a Bigint, a Number, a Bigfloat, or anything else.
 */

// uses the global object which auto-converts numbers!
Number.prototype.isNaN = function() {
    return isNaN(this);
};
// Does not use the new Number.isFinite for reasons layed down
// in blog post TODO: look-up URL of aforementioned blog post
Number.prototype.isFinite = function() {
    if (isNaN(this) || this === Infinity || this === -Infinity) {
        return false;
    }
    return true;
};
// Danger: will return inexact results for numbers > 2^53!
Number.prototype.isEven = function() {
    if (Math.abs(this) > 0x1fffffffffffff) {
        return MP_RANGE;
    }
    return (this % 2 == 0);
};
// Danger: will return inexact results for numbers > 2^53!
Number.prototype.isOdd = function() {
    if (Math.abs(this) > 0x1fffffffffffff) {
        return MP_RANGE;
    }
    return (this % 2 == 1);
};
//TODO: check for exceptions (NaN, Inf)
Number.prototype.sign = function() {
    return (this < 0) ? MP_NEG : MP_ZPOS;
};

/*
 *  Most of the following functions assume 32-bit little-endian integers.
 */

Number.prototype.nextPow2 = function() {
    var n = this;
    // checks & balances
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
    return n;
};

Number.prototype.lowBit = function() {
    if (this == 0) {
        return 0;
    }
    var ret = 0 >>> 0,
        x = this >>> 0;
    while ((x & 1) == 0) {
        x >>>= 1;
        ret++;
    }
    return ret;
};

// http://graphics.stanford.edu/~seander/bithacks.html
Number.prototype.highBit = function() {
    if (this == 0) {
        return 0;
    }
    var bits = [0x2, 0xC, 0xF0, 0xFF00, 0xFFFF0000];
    var Shift = [1, 2, 4, 8, 16];
    var ret = 0 >>> 0,
        x = this >>> 0;
    for (var i = bits.length - 1; i >= 0; i--) {
        if (x & bits[i]) {
            x >>>= Shift[i];
            ret |= Shift[i];
        }
    }
    return ret;
};

// this is a function with a limit of 32
Number.prototype.isPow2 = function(b) {
    var x = 0 >>> 0;
    /* fast return if no power of two */
    if ((b == 0) || (b & (b - 1))) {
        return 0;
    }
    for (; x < 32; x++) {
        if (b == (1 << x)) {
            return true;
        }
    }
    return false;
};
// Despite common opinion, this function is not generally applicable, the
// name should give a hint!
// Danger: does not check if input is really all ASCII
String.prototype.asciireverse = function() {
    return this.split('').reverse().join('');
};

// written for isOk() but not (yet?) used
Number.prototype.isSubnormal = function() {
    var high = 0 >>> 0;
    double_int.setFloat64(0, this);
    high = double_int.getUint32(4);
    if (high < 0x00100000) {
        return true;
    }
    return false;
};

// contains code from SunPro, see license at the start of this file
Number.prototype.ieee_754_isNaN = function() {
    var high, low, nan;
    double_int.setFloat64(0, this);
    high = double_int.getInt32(0);
    low = double_int.getInt32(4);
    high &= 0x7fffffff;
    high |= (low | (-low)) >>> 31;
    high = 0x7ff00000 - high;
    nan = (high >>> 31) | 0;
    return (nan) ? true : false;
};

// subnormals are ok?
Number.prototype.isOk = function() {
    return (!this.isNaN() && this.isFinite()) ? MP_YES : MP_NO;
};

Number.prototype.isInt = function() {
    if (!this.isOk()) {
        return MP_NO;
    }
    /* ECMA 6 (Draft). Impl. by Firefox ( >= 32 ) only
    if(Number.isSafeInteger){
      return ( Number.isSafeInteger(this) )?MP_YES:MP_NO;
    }
    else{*/
    if (this > -9007199254740992 && this < 9007199254740992 && Math.floor(
            this) == this) {
        return MP_YES;
    }
    /* } */
    return MP_NO;
};


// Checks if the number fits into one big-digit
Number.prototype.issmallenough = function() {
    if (!this.isInt() || (Math.abs(this) >= MP_DIGIT_MAX)) {
        return false;
    }
    return true;
};

// number of bits set (Hamming weight)
// http://graphics.stanford.edu/~seander/bithacks.html
Number.prototype.setBits = function() {
    if (this == 0) {
        return 0;
    }
    var x = this >>> 0;
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
};

// calculate multiplicative modular inverse (for exactDiv3)
Number.prototype.modInv = function(m) {
    var t1, t2, x, y, q, a, b;
    a = this;
    if (m < 0) {
        m = -m;
    }
    if (a < 0) {
        a = m - (-a % m);
    }
    t1 = 0;
    x = 1;
    y = a % m;
    b = m;
    while (y != 0) {
        q = Math.floor(b / y);
        t2 = x;
        x = t1 - q * x;
        t1 = t2;
        t2 = y;
        y = b - q * y;
        b = t2;
    }
    if (b > 1) {
        return Number.NaN;
    }
    if (t1 < 0) {
        t1 += m;
    }
    return t1;
};

/*
  Prototype of Bigint.
  Parameters: a small integer (<  MP_DIGIT_MAX).
  Return: none.
*/
function Bigint(n) {
        // memory for digits, preallocated to hold at least five digits
        this.dp = new Array(MP_PREC);
        // Set all to zero (keep it simpel)
        for (var i = this.dp.length - 1; i >= 0; i--) {
            this.dp[i] = 0 >>> 0;
        }
        // number of digits actually used
        this.used = 1;
        // Allocated length of digit-array. Probably unnecessary, may be removed in
        // the future. On the other side, it is possible--depending on the javascript
        // interpreter--to offer the GC something to collect by tinkering with the
        // Array.length property.
        // I'll probably remove it and use this.dp.length instead.
        this.alloc = MP_PREC;
        // sign of bigint.
        this.sign = MP_ZPOS;

        // Allow for a small number to be set directly
        if (xtypeof(n) === 'number' && Math.abs(n) < MP_DIGIT_MAX) {
            this.dp[0] = Math.abs(n);
            this.sign = (n < 0) ? MP_NEG : MP_ZPOS;
        }
    }
    // Ones and zeros are always useful especially in binary arithmetic but
    // it is probably easier to do the "new Bigint(0)" directly
Bigint.ZERO = new Bigint(0);
Bigint.ONE = new Bigint(1);

/*
  We don't need an extra init() function since new Bigint() already does that,
  but we need something to clean up; the size of the Array holding the digits
  can get quite large and even a lot of small ones can sum up.

  We cannot free the memory directly, we are only able to give the GC a change
  to do it for us.

  This functions empties the Bigint only, to sacrifice it completely the
  variable must be set to 'null', too.
  Example:

  tmp = new Bigint(0);
  // do some stuff with tmp
  // tmp got large but we'll do a lot of stuff after it in the same
  // scope and need to get rid of tmp
  tmp.clear();
  tmp = null;

*/
Bigint.prototype.free = function() {
    this.dp = null;
    this.used = null;
    this.alloc = null;
    this.sign = null;
};
/*
   Offer memory to GC but keep the rest for later use.
*/
Bigint.prototype.clear = function() {
    this.dp = [0 >>> 0];
    this.used = 1;
    this.alloc = 1;
    this.sign = MP_ZPOS;
};
/*
   Add "n" numbers of zeros to the MSB side aka preallocate more memory.
   Probably faster then the engines heuristics for growing an Array.
   Does *not* set this.used!
*/
Bigint.prototype.grow = function(n){
  //checks & balances
 var t = [];
 while(n--){t[n] = 0 >>> 0;}
 this.dp = this.dp.concat(t);
 return (this.dp.length);
};

// avoid mess
Bigint.prototype.clamp = function() {
    while (this.used > 1 && (this.dp[this.used - 1] == 0 || isNaN(this.dp[
            this.used - 1]))) {
        this.used--;
    }
    // this may keep the whole array allocated, at least for some time.
    this.dp.length = this.used;
    this.alloc = this.used;
};

// print all four bytes even if zero (little endian). toString(16) does not
// do that
Number.prototype.toHex32 = function(uppercase) {
    var t = this;
    var lower = "0123456789abcdef";
    var upper = "0123456789ABCDEF";
    var rcase = uppercase || false;
    var ret = "";

    rcase = (rcase) ? upper : lower;
    if (t == 0) {
        return "0";
    }
    for (var i = 0; i < 8; i++) {
        ret = rcase.charAt((t & 0xF)) + ret;
        t >>>= 4;
    }
    return ret;
};
/*
// rudimentary bigdecimal for speeding up a_bigint.toString()
var BIGDECIMAL_BASE = 10000000;
var BIGDECIMAL_LOG10_BASE = 7;
function Bigdecimal() {
    this.digits = [];
    this.sign = 1;
    this.used = 0;
    if (arguments.length != 0) {
        var n = arguments[0];
        if (n.isInt()){
            if (n < BIGDECIMAL_BASE) {
                this.digits[0] = n;
                this.sign = n.sign();
                this.used = 1;
            } else if(n < BIGDECIMAL_BASE * BIGDECIMAL_BASE) {
                this.digits[0] = n % BIGDECIMAL_BASE;
                this.digits[1] = Math.floor(n/BIGDECIMAL_BASE);
                this.used = 2;
            } else {
                this.digits[0] = n % BIGDECIMAL_BASE;
                this.digits[1] = Math.floor(n/BIGDECIMAL_BASE);
                this.digits[2] = Math.floor(this.digits[1]/BIGDECIMAL_BASE)>>>0;
                this.digits[1] = (this.digits[1] % BIGDECIMAL_BASE)>>>0 ;
                this.used = 3;
            }
        }
    } else {
        this.digits[0] = 0;
    }
}
Bigdecimal.prototype.clamp = function() {
    while(this.used > 1 && (this.digits[this.used-1] == 0 || isNaN(this.digits[this.used-1])) )
        this.used--;
    this.digits.length = this.used;
};
Bigdecimal.prototype.dup = function() {
    var copy = new Bigdecimal(0);
    if (this.used == 0) return copy;
    copy.digits = new Array(this.used);
    copy.sign = this.sign;
    copy.used = this.used;
    for (var i = 0; i < this.used; i++)
        copy.digits[i] = this.digits[i];
    return copy;
};

Bigdecimal.prototype.isZero = function() {
    if (this.used == 0 && this.sign == 1) return true;
    return false;
};
Bigdecimal.prototype.isOne = function() {
    if (this.used == 1 && this.sign == 1 && this.digits[0] == 1) return true;
    return false;
};
Bigdecimal.ZERO = new Bigdecimal(0);
Bigdecimal.ONE = new Bigdecimal(1);

Bigdecimal.prototype.abs = function() {
    var r = this.dup();
    r.sign = 1;
    return r;
};

Bigdecimal.prototype.neg = function() {
    var r = this.dup();
    if (this.used == 0) return r;
    if (this.used == 1 && this.digits[0] == 0) return r;
    r.sign = this.sign * -1;
    return r;
};

Bigdecimal.prototype.cmp_mag = function(bdec) {
    if (this.used > bdec.used) return MP_GT;
    if (this.used < bdec.used) return MP_LT;

    for (var i = this.used - 1; i >= 0; i--) {
        if (this.digits[i] > bdec.digits[i]) return MP_GT;
        if (this.digits[i] < bdec.digits[i]) return MP_LT;
    }
    return MP_EQ;
};

Bigdecimal.prototype.cmp = function(bdec) {
    if (this.sign > bdec.sign) return MP_GT;
    if (this.sign < bdec.sign) return MP_LT;
    if (this.sign < 0)
        return bdec.cmp_mag(this);
    return this.cmp_mag(bdec);
};

Bigdecimal.prototype.toString = function() {
    var len = this.used - 1;
    var str = "";
    if (this.isZero()) return "0";
    for (var i = len; i >= 0; i--) {
        var temp = this.digits[i].toString();

        var tlen = temp.length;
        while (tlen++ < BIGDECIMAL_LOG10_BASE && i != len) {
            temp = "0" + temp;
        }
        str += temp;
    }
    str = (this.sign < 1) ? "-" + str : str;
    return str;
};

Bigdecimal.prototype.lowlevel_add = function(bdec) {
    var t = this.digits;
    var tlen = this.used;

    var b = bdec.digits;
    var blen = bdec.used;
    var tblen = tlen + blen;

    var temp, carry = 0, i;
    var ret;
    if (tlen < blen) return bdec.add(this);
    ret = new Bigdecimal(0);
    ret.digits = [];
    while(tblen--)ret.digits[tblen] = 0;
    for (i = 0; i < blen; i++) {
        temp = carry;
        temp += t[i] + b[i];
        carry = Math.floor(temp / BIGDECIMAL_BASE);
        ret.digits[i] = temp % BIGDECIMAL_BASE;
    }
    if (tlen - blen != 0) {
        for (i = blen; i < tlen; i++) {
            temp = carry;
            temp += t[i];
            carry = Math.floor(temp / BIGDECIMAL_BASE);
            ret.digits[i] = temp % BIGDECIMAL_BASE;
        }
    }

    if (carry) ret.digits[i] = carry;
    ret.used = ret.digits.length;
    ret.clamp();
    return ret;
};

Bigdecimal.prototype.add = function(bdec) {
    var tsign = this.sign;
    var bsign = bdec.sign;

    var ret;

    if (tsign == bsign) {
        ret = this.lowlevel_add(bdec);
        ret.sign = tsign;
    } else {
        // |a| < |b|
        if (this.cmp_mag(bdec) == MP_LT) {
            ret = bdec.lowlevel_sub(this);
            ret.sign = bsign;
        } else {
            ret = this.lowlevel_sub(bdec);
            ret.sign = tsign;
        }
    }
    return ret;
};
Bigdecimal.prototype.lowlevel_mul = function(bdec) {
    var tsign = this.sign;
    var t = this.digits;
    var tlen = this.used;
    var bsign = bdec.sign;
    var b = bdec.digits;
    var blen = bdec.used;
    var ret = new Bigdecimal(0),
        retv,temp;
    var tblen = tlen + blen;
    var carry,i,j;

    //if(typeof bdec == 'number') return this.lowlevel_mulD(bdec);

    if (bdec.isZero()) return ret;
    if (bdec.isOne()) return this.dup();

    retv = [];
    while(tblen--)retv[tblen] = 0;

    for (i = 0; i < tlen; i++) {
        carry = 0;
        for (j = 0; j < blen; j++) {
            temp = retv[i + j] + (t[i] * b[j]) + carry;
            carry = Math.floor(temp / BIGDECIMAL_BASE);
            retv[i + j] = temp % BIGDECIMAL_BASE;
        }
        retv[i + blen] = carry;
    }

    ret.digits = retv;
    ret.used = retv.length;
    ret.clamp();
    return ret;
};

Bigdecimal.prototype.mul = function(bdec) {
    var r;
    if(this.cmp(bdec) == MP_LT) r = bdec.lowlevel_mul(this)
    else  r = this.lowlevel_mul(bdec);
    r.sign = this.sign * bdec.sign;
    return r;
};
*/
Bigint.prototype.toString = function(radix) {
    var mp_s_rmap =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var ret;
    var t;
    var d = 0 | 0;
    var s = "";
    var sign = this.sign;

    if (!radix) {
        radix = 10;
    }

    if (this.isNaN()) {
        return "NaN";
    }
    if (this.isInf()) {
        return (this.isNegInf()) ? "-Infinity" : "Infinity";
    }
    // check for zero or single digit bigint
    if (this.isZero() == MP_YES) {
        return (sign < 0) ? "-0" : "0";
    }
    if (this.isUnity() == MP_YES) {
        return (sign < 0) ? "-1" : "1";
    }
    if (this.used == 1 && radix < 37) {
        // this.sign is either one or minus one
        return (this.dp[0] * this.sign).toString(radix);
    }

    // compute decimal from bigint now

    // we _could_ implement radix 1, too! Bwaaaaaahahahaha...*hem*
    if (radix < 2 || radix > 62) {
        return "Radix is out of range, should be 1<radix<63, and not: " +
            radix;
    }

    if (radix == 2) {
        for (var i = 0; i < this.used - 1; i++) {
            var tmp = this.dp[i];
            for (var j = 0; j < MP_DIGIT_BIT; j++) {
                s += (tmp & 0x1 == 1) ? "1" : "0";
                tmp >>>= 1;
            }
        }
        s += this.dp[this.used - 1].toString(2);
        s = s.asciireverse();
        return (sign < 0) ? "-" + s : s;
    }

    // Work on copy.
    t = this.copy();
    t.sign = MP_ZPOS;


    // assumes 26 bit digits
    if (radix == 16 && MP_DIGIT_BIT == 26) {
        //s += (t.sign == MP_NEG)?"-":"";
        var current_length = t.used - 1;
        if(current_length == 0){
            s = t.dp[0].toString(16);
            return (sign < 0) ? "-" + s : s;
        }
        else if(current_length == 1){
            s = (t.dp[1] * (1 << MP_DIGIT_BIT) + t.dp[0]).toString(16);
            return (sign < 0) ? "-" + s : s;
        }
        // the case of a single digit has been catched above, the loop will run
        // at least once
        while (current_length > 0) {
            // we need to fill 32 bit. 32-26 = 6, mask = 0x3f
            // take it from the digit above if it exists
            if (current_length >= 2) {
                tmp = t.dp[0] | (((t.dp[1] & 0x3f) << 26) & 0xffffffff);
            } else {
                tmp = t.dp[0];
            }
            // check if something is left
            if (t.used == 1) {
                if (t.dp[0] != 0) {
                    // use toString() here to avoid leading zeros
                    s = t.dp[0].toString(16) + s;
                }
                // it's the last one, let's get some coffee and make a break
                break;
            }
            // add it to the result string
            s = tmp.toHex32() + s;
            // divide by 2^32
            t.rShiftInplace(32);
            // adjust anchor
            current_length = t.used;
        }
        return (sign < 0) ? "-" + s : s;
    }

    /*
      // use the full available space a double offers
      if(radix == 10 && t.used > 20){
        var out = new Bigdecimal(0);
        var base = new Bigdecimal(MP_DIGIT_MAX*MP_DIGIT_MAX);
        var digit;
        var limit = (t.used %2 == 0)?0:1;
        for(var i = t.used-1;i>0;i-=2){
          digit = new Bigdecimal(t.dp[i-1] + (t.dp[i]*MP_DIGIT_MAX) );
          out = out.mul(base);
          out = out.add(digit);
        }
        if(limit == 1){
          digit = new Bigdecimal(t.dp[0] );
          out = out.mul(new Bigdecimal(MP_DIGIT_MAX));
          out = out.add(digit);
        }
        out.sign = this.sign;
        return out.toString();
      }
    */
    /*
       // a more conservative version
       if(radix == 10 && t.used > 20){
        var out = new Bigdecimal(0);
        var base = new Bigdecimal(MP_DIGIT_MAX);
        for(var i = t.used-1;i>=0;i--){
          var digit = new Bigdecimal(t.dp[i]);
          out = out.mul(base);
          out = out.add(digit);
        }
        out.sign = this.sign;
        return out.toString();
      }
    */
    // this is veeeeery slow
    while (t.isZero() == MP_NO) {
        ret = t.divremInt(radix);
        t = ret[0];
        d = ret[1].dp[0];
        s += mp_s_rmap[d];
    }

    s += (sign == MP_NEG) ? "-" : "";

    // reverse the digits of the string.
    s = s.asciireverse();
    return s;
};
// more or less quite shamelessly stolen from libtommmath's mp_read_radix
// does not make use of exponent given. No Prefixes (e.g. 0x, 0b, 0) allowed.
String.prototype.toBigint = function(radix) {
    var mp_s_rmap =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var neg;
    var ch, strlen, charnum;

    var str = this;

    if (!radix) {
        radix = 10;
    }

    if (radix < 2 || radix > 62) {
        return "Radix is out of range, should be 1<radix<63, not: " + radix;
    }

    if (str.charAt(0) == '-') {
        neg = MP_NEG;
    } else {
        neg = MP_ZPOS;
    }

    if (str.charAt(0) == '-' || str.charAt(0) == '+') {
        str = str.substr(1);
    }
    strlen = str.length;
    // Strip leading flags (e.g.: 0x,0b,0) elsewhere?

    // compute max length of binary number and allocate memory
    //var bilen = Math.floor((str.length - 1) * Math.log(10)/Math.log(2) ) +1;
    // The above suffers from rounding errors for very large numbers
    // so add one large digit as a reserve, get's clamp()'ed away later if
    // superfluous. The array should grow automatically, but I don't trust
    // every Javascript engine, if you understand what I mean.
    // If not: just pretend it is faster that way ;-)
    //bilen = Math.ceil(bilen/MP_DIGIT_BIT); // rounded to full large digits
    var ret = new Bigint(0);
    //ret.dp  = new Array(bilen+1);   // plus reserve
    //ret.used = bilen;

    // case insensitive in that range
    if (radix < 36) {
        str = str.toUpperCase();
    }
    /*
      // much faster version, needs Bigdecimal and some testing
      if(radix == 10 && strlen > 70){
        var i,j,k,tmp,astr;
        var rem = strlen % BIGDECIMAL_LOG10_BASE;
        for( i = 0;i < str.length-(rem+1);i += BIGDECIMAL_LOG10_BASE){
          tmp = 0;
          j = BIGDECIMAL_LOG10_BASE;
          while(j--){
            tmp *=10;
            tmp += str.charCodeAt(i+((BIGDECIMAL_LOG10_BASE-1)-j))&0xff - 48;
          }
          ret = ret.mulInt(BIGDECIMAL_BASE);
          if(tmp != 0)ret = ret.addInt(tmp);
        }
        if(rem){
          tmp = 0;
          j = rem+1;
          while(--j){tmp *=10;tmp += str.charCodeAt(i+(rem-j))&0xff - 48;}
          ret = ret.mulInt(Math.pow(10,rem-1));
          if(tmp != 0)ret = ret.addInt(tmp);
        }
        ret.sign = neg;
        ret.clamp();
        return ret;
      }
    */
    // left (high) to right (low)
    for (var i = 0; i < strlen; i++) {
        ch = str.charAt(i);
        charnum = mp_s_rmap.indexOf(ch);
        if (charnum < radix) {
            ret = ret.mulInt(radix);
            if (charnum != 0) {
                ret = ret.addInt(charnum);
            }
        } else {
            // Actually, this _is_ an error and not something one can let slip.
            // TODO: don't forget when implementing error-handling
            break;
        }
    }

    ret.sign = neg;

    ret.clamp();
    return ret;
};



// returns Bigint. Bigint might be set to Nan or Infinity if Number is
// not a small enough integer. Range: -9007199254740992..9007199254740992
Number.prototype.toBigint = function() {
    var ret = new Bigint(0);
    // Check Number
    if (!this.isOk() || !this.isInt()) {
        ret.setNaN();
        return ret;
    }

    // Check if Number is integer and smaller than MP_DIGIT_MAX for direct use
    if (this.issmallenough()) {
        ret.dp[0] = Math.abs(this);
        ret.sign = (this < 0) ? MP_NEG : MP_ZPOS;
        return ret;
    }
    var temp = Math.abs(this);
    ret.sign = (this < 0) ? MP_NEG : MP_ZPOS;

    ret.dp[0] = temp & MP_MASK;
    ret.dp[1] = Math.floor(temp / MP_DIGIT_MAX) & MP_MASK;
    ret.used = 2;

    ret.clamp();
    return ret;
};

Bigint.prototype.issmallenough = function() {
    // TODO: we can use two bigdigits if MP_DIGIT_BIT <= 26
    //       than change Bigint.prototype.toNumber accordingly
    if (this.used > 1) {
        return false;
    }
    return true;
};

Bigint.prototype.isOk = function() {
    if (this.isNaN() || !this.isFinite()) {
        return false;
    }
    return true;
};

Bigint.prototype.toNumber = function() {
    // Check Bigint
    if (!this.isOk()) {
        // the IEEE-754 conformant extras are in the first bigdigit
        return this.dp[0];
    }
    // Check if Bigint is already small enough to fit into a Number directly
    if (this.issmallenough()) {
        var ret = 0;
        // press an unsigned value
        ret = this.dp[0] >>> 0;
        if (this.sign == MP_NEG) {
            ret *= -1;
        }
        return ret;
    }

    // Shift Bigint right until 52 bits (two digits) are left, keep shift-#
    // No need to actually shift it, just take the two MSB-bigdigits
    var bd_high = this.dp[this.used - 1],
        bd_low = this.dp[this.used - 2];

    // make a Number

    // shift bigdigit-1 to the left by MP_DIGIT_BIT AND with Number and
    // AND bigdigit-0 to Number. Won't work directly (But: YMMV and so on)
    // So do instead:
    // multiply higher bigdigit by 2^MP_DIGIT_BIT
    bd_high *= MP_DIGIT_MAX;
    // add lower bigdigit and multiply by 2^shift
    bd_high += bd_low;

    // This will overflow Javascript Number when
    // (this.used-3) * MP_DIGIT_BIT + 15 > 1023;
    // Which is less then 40 bigdigits!
    bd_high *= Math.pow(2, (this.used - 3) * MP_DIGIT_BIT);

    if (this.sign == MP_NEG) {
        bd_high *= -1;
    }
    return bd_high;
};

// see http://burtleburtle.net/bob/rand/smallprng.html
var __burtlerand_ax = {
    a: 0xf1ea5eed,
    b: 2 >>> 0,
    c: 3 >>> 0,
    d: 4 >>> 0
};

function burtle_rand(seed) {
    var rot = function(s, k) {
        return (((s >>> 0) << (k >>> 0)) | ((s >>> 0) >>> (32 - (k >>>
            0))));
    };
    var ranval = function() {
        var e = __burtlerand_ax.a - rot(__burtlerand_ax.b, 23 >>> 0) >>>
            0;
        __burtlerand_ax.a = __burtlerand_ax.b ^ rot(__burtlerand_ax.c,
            16 >>>
            0) >>> 0;
        __burtlerand_ax.b = __burtlerand_ax.c + rot(__burtlerand_ax.d,
            11 >>>
            0) >>> 0;
        __burtlerand_ax.c = __burtlerand_ax.d + e >>> 0;
        __burtlerand_ax.d = e + __burtlerand_ax.a >>> 0;
        return __burtlerand_ax.d >>> 0;
    };
    var raninit = function(seed) {
        __burtlerand_ax.a = 0xf1ea5eed;
        __burtlerand_ax.b = __burtlerand_ax.c = __burtlerand_ax.d =
            seed;
        for (var i = 0; i < 20; ++i) {
            ranval();
        }
    };

    if (arguments.length == 1) {
        if (!isNaN(parseInt(seed))) {
            raninit(parseInt(seed >>> 0) >>> 0);
        }
    }

    return ranval() >>> 0;
}

// uses Bob Jenkins' small PRNG (with the extra round) listed above
// used instead of Math.random to get a well-known function with a good mix
// (good avalaunche values). This works in-place!
Bigint.prototype.random = function(bits, seed) {
    var digbits = Math.floor(bits / MP_DIGIT_BIT);
    var modbits = bits % MP_DIGIT_BIT;
    var mod_mask;

    if (bits && bits <= 0) {
        return new Bigint(0);
    }

    if (arguments.length == 2) {
        burtle_rand(seed & 0xffffffff);
    } else {
        burtle_rand(Date.now() & 0xffffffff);
    }

    mod_mask = (1 << modbits) - 1;
    if(mod_mask > 0){
        this.dp[digbits] = burtle_rand() & mod_mask;
    } else {
        // to keep it downwards compatible
        burtle_rand();
    }
    this.dp[digbits] = burtle_rand() & mod_mask;
    while (digbits--) {
        this.dp[digbits] = burtle_rand() & MP_MASK;
    }
    this.used = this.dp.length;
    return this.copy();
};

// does deep copy of THIS
Bigint.prototype.copy = function() {
    var tt;
    tt = new Bigint(0);
    tt.dp = new Array(this.used);
    tt.used = this.used;
    tt.alloc = this.used;
    tt.sign = this.sign;
    var i = this.used;
    while (i--) {
        tt.dp[i] = this.dp[i];
    }
    return tt;
};

Bigint.prototype.dup = function() {
    return this.copy();
};

// swap with deep copy (probably)
Bigint.prototype.swap = function(target) {
    var tmp = target.copy();
    target = this.copy();
    var i = tmp.used;
    while (i--) {
        this.dp[i] = tmp.dp[i];
    }
    this.sign = tmp.sign;
    this.used = tmp.used;
    // "this" might have been larger, so set the bigdigit after the last one to
    // zero
    this.dp[this.used] = 0 >>> 0;
    this.alloc = tmp.alloc;
    tmp.dp = null;
};
// swap with shallow copy (probably) unsure, don't use!
Bigint.prototype.exch = function(target) {
    var tmp = target;
    target = this;
    this.dp = tmp.dp;
    this.sign = tmp.sign;
    this.used = tmp.used;
    this.alloc = tmp.alloc;
};

// change sign, returns full copy, "this" stays unchanged
Bigint.prototype.neg = function() {
    var ret = this.copy();
    if (this.sign == MP_ZPOS) {
        ret.sign = MP_NEG;
    } else {
        ret.sign = MP_ZPOS;
    }
    return ret;
};

// make positive, returns full copy, "this" stays unchanged
Bigint.prototype.abs = function() {
    var ret = this.copy();
    if (this.sign == MP_NEG) {
        ret.sign = MP_ZPOS;
    }
    return ret;
};

/* Some useful tools and a very small bit of IEEE compliance */
// this == 0
Bigint.prototype.isZero = function() {
    if (this.used == 1 && this.dp[0] == 0) {
        return MP_YES;
    }
    return MP_NO;
};
// this == +1
Bigint.prototype.isOne = function() {
    if (this.used == 1 && this.sign == MP_ZPOS && this.dp[0] == 1) {
        return MP_YES;
    }
    return MP_NO;
};
// this == +1 || this == -1
Bigint.prototype.isUnity = function() {
    if (this.used == 1 && this.dp[0] == 1) {
        return MP_YES;
    }
    return MP_NO;
};
// this < 0
Bigint.prototype.isNeg = function() {
    return (this.sign == MP_ZPOS) ? MP_NO : MP_YES;
};
// this > 0
Bigint.prototype.isPos = function() {
    return (this.sign == MP_NEG) ? MP_NO : MP_YES;
};
Bigint.prototype.isEven = function() {
    return (this.dp[0].isOdd()) ? MP_NO : MP_YES;
};
Bigint.prototype.isOdd = function() {
    return (this.dp[0].isEven()) ? MP_NO : MP_YES;
};

Bigint.prototype.setNaN = function() {
    this.dp[0] = Number.NaN;
};
Bigint.prototype.isNaN = function() {
    return isNaN(this.dp[0]);
};

Bigint.prototype.setNegInf = function() {
    this.dp[0] = Number.NEGATIVE_INFINITY;
};
Bigint.prototype.isNegInf = function() {
    return (this.dp[0] == Number.NEGATIVE_INFINITY) ? MP_YES : MP_NO;
};

Bigint.prototype.setPosInf = function() {
    this.dp[0] = Number.POSITIVE_INFINITY;
};
Bigint.prototype.isPosInf = function() {
    return (this.dp[0] == Number.POSITIVE_INFINITY) ? MP_YES : MP_NO;
};


Bigint.prototype.setInf = function() {
    this.dp[0] = Number.POSITIVE_INFINITY;
};
Bigint.prototype.isInf = function() {
    return (this.isPosInf() || this.isNegInf()) ? MP_YES : MP_NO;
};

Bigint.prototype.isFinite = function() {
    return (this.dp[0].isFinite()) ? MP_YES : MP_NO;
};


// highest bit set (e.g.: 22 = 0b10110, returns 4)
Bigint.prototype.highBit = function() {
    if (this.used == 1) {
        return this.dp[0].highBit();
    } else {
        return MP_DIGIT_BIT * (this.used - 1) + (this.dp[this.used - 1].highBit());
    }
};

Bigint.prototype.ilog2 = function() {
    return (this.highBit() + 1);
};

// lowest bit set (e.g.: 22 = 0b10110, returns 1)
Bigint.prototype.lowBit = function() {
    if (this.used == 1) {
        return this.dp[0].lowBit();
    } else {
        var count = 0;
        while (this.dp[count] == 0 && count < this.used) {
            count++;
        }
        return this.dp[count].lowBit() + count * MP_DIGIT_BIT;
    }
};

Bigint.prototype.isPow2 = function() {
    if (this.highBit() == this.lowBit()) {
        return MP_YES;
    }
    return MP_NO;
};

// number of bits set (e.g.: 22 = 0b10110, returns 3)
// Awkward function name caused by function setBit()--which actually sets bits--
// the english grammar, and a clash of cultures (I just couldn't be persuaded to
// call the function hammingWeight).
Bigint.prototype.numSetBits = function() {
    if (this.used == 1) {
        return this.dp[0].setBits();
    } else {
        var count = 0;
        var n = this.used;
        while (n) {
            count += (this.dp[--n]).setBits();
        }
        return count;
    }
};
// TODO: check input!
// shift left big-digit-wise
Bigint.prototype.dlShift = function(i) {
    var ret = this.copy();
    if (i == 0) {
        return ret;
    }
    if (i < 0) {
        return this.drShift(-i);
    }
    var tmp = [];
    //for (var k = 0; k < i; ++k) tmp[k] = 0>>>0;
    while (i--) {
        tmp[i] = 0 >>> 0;
    }
    ret.dp = tmp.concat(ret.dp);
    ret.used = ret.dp.length;
    return ret;
};
Bigint.prototype.dlShiftInplace = function(i) {
    if (i == 0) {
        return;
    }
    if (i < 0) {
        this.drShiftInplace(-i);
        return;
    }
    var tmp = [];
    //for (var k = 0; k < i; ++k) tmp[k] = 0>>>0;
    while (i--) {
        tmp[i] = 0 >>> 0;
    }
    this.dp = tmp.concat(this.dp);
    this.used = this.dp.length;
};
// shift right big-digit-wise, returns 0 if shift is bigger or equal length
Bigint.prototype.drShift = function(i) {
    var ret;
    if ( i == 0) {
         return this.copy();
    }
    if( i < 0 ) {
         return this.dlShift(-i);
    }
    if (this.used < i) {
        ret = new Bigint();
        ret.dp[0] = 0;
        ret.used = 1;
        ret.sign = MP_ZPOS;
        return ret;
    }
    ret = new Bigint();
    if (i <= 0) {
        // Alternative: return dlShift (like GP/PARI for example)
        return ret;
    }
    ret.dp = this.dp.slice(i, this.used);
    ret.used = ret.dp.length;
    ret.sign = this.sign;
    return ret;
};
// shift right big-digit-wise
Bigint.prototype.drShiftInplace = function(i) {
    if (i == 0) {
        return;
    }
    if (i < 0) {
        this.dlShiftInplace(-i);
        return;
    }
    if (this.used < i) {
        this.dp[0] = 0;
        this.used = 1;
        this.sign = MP_ZPOS;
    }

    this.dp = this.dp.slice(i, this.used);
    this.used = this.dp.length;
};
// shift left bit-wise
Bigint.prototype.lShift = function(i) {
    var dlshift;
    var lshift;
    var r, rr, k;
    var ret;

    if (i == 0) {
        return this.copy();
    }
    if (i < 0) {
        return this.rShift(-i);
    }
    dlshift = Math.floor(i / MP_DIGIT_BIT);
    lshift = i % MP_DIGIT_BIT;

    ret = this.copy();
    ret.dlShiftInplace(dlshift);
    if (lshift == 0) {
        return ret;
    }

    var mask = (1 << lshift) - 1;
    var shift = MP_DIGIT_BIT - lshift;

    r = 0;
    for (k = 0; k < ret.used; k++) {
        rr = (ret.dp[k] >>> shift) & mask;
        ret.dp[k] = ((ret.dp[k] << lshift) | r) & MP_MASK;
        r = rr;
    }
    if (r != 0) {
        ret.dp[k] = r;
        ret.used++;
    }
    ret.clamp();
    return ret;
};
Bigint.prototype.lShiftInplace = function(i) {
    var dlshift;
    var lshift;
    var r, rr, k;

    if (i == 0) {
        return;
    }
    if (i < 0) {
        this.rShiftInplace(-i);
        return;
    }

    dlshift = Math.floor(i / MP_DIGIT_BIT);
    lshift = i % MP_DIGIT_BIT;

    this.dlShiftInplace(dlshift);
    if (lshift == 0) {
        return;
    }

    var mask = (1 << lshift) - 1;
    var shift = MP_DIGIT_BIT - lshift;

    r = 0;
    for (k = 0; k < this.used; k++) {
        rr = (this.dp[k] >>> shift) & mask;
        this.dp[k] = ((this.dp[k] << lshift) | r) & MP_MASK;
        r = rr;
    }
    if (r != 0) {
        this.dp[k] = r;
        this.used++;
    }
    this.clamp();
};

// shift right bit-wise
Bigint.prototype.rShift = function(i) {
    var ret;
    if (i == 0) {
        return this.copy();
    }
    if (i < 0) {
        return this.lShift(-i);
    }
    ret = this.copy();
    if (this.highBit() < i) {
        ret.dp[0] = 0;
        ret.used = 1;
        ret.sign = MP_ZPOS;
        return ret;
    }

    var drshift = Math.floor(i / MP_DIGIT_BIT);
    var rshift = i % MP_DIGIT_BIT;
    var r, rr;

    ret.drShiftInplace(drshift);

    if (rshift == 0) {
        return ret;
    }

    var mask = (1 << rshift) - 1;
    var shift = MP_DIGIT_BIT - rshift;

    r = 0;

    for (var k = ret.used - 1; k >= 0; k--) {
        rr = ret.dp[k] & mask;
        ret.dp[k] = (ret.dp[k] >>> rshift) | (r << shift);
        r = rr;
    }
    ret.clamp();

    return ret;
};
Bigint.prototype.rShiftInplace = function(i) {
    if (i == 0) {
        return;
    }
    if (i < 0) {
        this.lShiftInplace(-i);
        return;
    }
    if (this.highBit() < i) {
        this.dp[0] = 0;
        this.used = 1;
        this.sign = MP_ZPOS;
        return;
    }

    var drshift = Math.floor(i / MP_DIGIT_BIT);
    var rshift = i % MP_DIGIT_BIT;
    var r, rr;

    this.drShiftInplace(drshift);

    if (rshift == 0) {
        return;
    }

    var mask = (1 << rshift) - 1;
    var shift = MP_DIGIT_BIT - rshift;

    r = 0;

    for (var k = this.used - 1; k >= 0; k--) {
        rr = this.dp[k] & mask;
        this.dp[k] = (this.dp[k] >>> rshift) | (r << shift);
        r = rr;
    }
    this.clamp();
};
// like rShift but rounds to +inf
Bigint.prototype.rShiftRounded = function(i) {
    var ret = this.rShift(i);
    if (i > 0 && this.getBit(i - 1) == 1) {
        if (this.sign === MP_NEG) {
            ret.decr();
        } else {
            ret.incr();
        }
    }
    return ret;
};
// this % 2^b, like in libtommmath. Actually a port of the libtommmath function
Bigint.prototype.mod2d = function (b){
  var x, ret;

  if(b <= 0 ){
    return new Bigint(0);
  }
  if(b >= this.used * MP_DIGIT_BIT){
    return this.copy();
  }

  ret = this.copy();
  /* faster than doing a t&(2^b-1) */

  /* zero digits above the last digit of the modulus */
  for (x = (b / MP_DIGIT_BIT) + ((b % MP_DIGIT_BIT) == 0 ? 0 : 1); x < ret.used; x++) {
    ret.dp[x] = 0;
  }
  /* clear the digit that is not completely outside/inside the modulus */
  ret.dp[Math.floor(b / MP_DIGIT_BIT)] &= (1 << (b % MP_DIGIT_BIT)) -  1;
  ret.clamp();
  return ret;
};

Bigint.prototype.mul_digs = function(bi, digs) {
    var t;
    var pa, pb, ix, iy;
    var u;
    var r;
    var tmpx;

    /* can we use the fast multiplier? */
    /*
       Uhm ... no.

    if (((digs) < MP_WARRAY) &&
        MIN (a->used, b->used) <
            (1 << ((CHAR_BIT * sizeof (mp_word)) - (2 * DIGIT_BIT)))) {
      return fast_s_mp_mul_digs (a, b, c, digs);
    }
    */
    t = new Bigint();
    t.dp = new Array(digs);
    t.used = digs;

    /* compute the digits of the product directly */
    pa = this.used;
    for (ix = 0; ix < pa; ix++) {
        /* set the carry to zero */
        u = 0;

        /* limit ourselves to making digs digits of output */
        pb = Math.min(bi.used, digs - ix);

        /* setup some aliases */
        /* copy of the digit from a used within the nested loop */
        tmpx = this.dp[ix];
        /* compute the columns of the output and propagate the carry */
        for (iy = 0; iy < pb; iy++) {
            /* compute the column as a mp_word */
            r = t.dp[iy + ix] + tmpx * bi.dp[iy] + u;
            /* the new column is the lower part of the result */
            t.dp[iy + ix] = r & MP_MASK;
            /* get the carry word from the result */
            u = Math.floor(r / MP_DIGIT_MAX);
        }
        /* set carry if it is placed below digs */
        if (ix + iy < digs) {
            t.dp[iy + ix] = u;
        }
    }

    t.clamp();
    return t;
};
// standard unsigned multiply
Bigint.prototype.multiply = function(bi) {
    var ret, i, j, a, b, carry, temp;
    a = this;
    b = bi;
    ret = new Bigint(0);
    ret.dp = new Array(a.used + b.used);
    for (var k = 0; k < ret.dp.length; k++) {
        ret.dp[k] = 0 >>> 0;
    }
    ret.used = a.used + b.used;
    for (i = 0; i < a.used; i++) {
        carry = 0;
        for (j = 0; j < b.used; j++) {
            temp = ret.dp[i + j] + (a.dp[i] * b.dp[j]) + carry;
            carry = Math.floor(temp / MP_DIGIT_MAX);
            ret.dp[i + j] = temp & MP_MASK;
        }
        ret.dp[i + b.used] = carry;
    }
    ret.clamp();
    return ret;
};
Bigint.prototype.mul = function(bi) {
    var ret, asign, bsign, a, b;
    // larger one first
    if (this.used <= bi.used) {
        a = this;
        b = bi;
    } else {
        a = bi;
        b = this;
    }
    // check numbers for 1(one) or 0(zero) respectively
    if (a.isZero() || b.isZero()) {
        return new Bigint(0);
    }
    if (a.isUnity()) {
        ret = b.copy();
        if (a.sign != b.sign) {
            ret.sign = MP_NEG;
        }
        return ret;
    }
    if (b.isUnity()) {
        ret = a.copy();
        if (a.sign != b.sign) {
            ret.sign = MP_NEG;
        }
        return ret;
    }
    // Check if smaller number is small enough for mulInt()
    if (b.used == 1) {
        return a.mulInt(b.dp[0]);
    }

    // compute with abs. values
    asign = a.sign; // it's only a reference , so what we change here we change
    bsign = b.sign; // there, too, so keep a backup
    a.sign = MP_ZPOS;
    b.sign = MP_ZPOS;

    // check for absolute cutoff to do multiplier balancing here
    /*
       if(this.used + bi.used > MUL_BALANCING_CUTOFF){
         // check for relative difference for balancing multipliers here or
         // elsewhere
         return this.mulBalanced(bi);
       }
    */
    // check for cutoffs to do T-C or FFT respectively here
    if (Math.min(a.used, b.used) >= FFT_MUL_CUTOFF) {
        return a.fft_mul(b);
    }
    if (Math.min(a.used, b.used) >= 3 * TOOM_COOK_MUL_CUTOFF) {
        return a.toom_cook_mul(b);
    }

    ret = a.multiply(b);

    if (asign != bsign) {
        ret.sign = MP_NEG;
    }
    // reset originals
    a.sign = asign;
    b.sign = bsign;

    ret.clamp();
    return ret;
};

// basic unsigned square
Bigint.prototype.square = function() {
    var t;
    var r, ix, iy, c;

    t = new Bigint(0);
    t.dp = new Array(2 * this.used + 1);
    r = 2 * this.used + 2;
    while (r--) {
        t.dp[r] = 0;
    }
    t.used = 2 * this.used + 1;



    for (ix = 0; ix < this.used; ix++) {
        r = t.dp[2 * ix] + (this.dp[ix] * this.dp[ix]);
        t.dp[2 * ix] = r & MP_MASK;
        c = Math.floor(r / MP_DIGIT_MAX);


        for (iy = ix + 1; iy < this.used; iy++) {
            r = this.dp[ix] * this.dp[iy];
            //  (2^26-1) * 2 + (2^26-1)^2 + (2^26-1)^2 < 2^53 (by 134217728 )
            r = t.dp[ix + iy] + r + r + c;
            t.dp[ix + iy] = r & MP_MASK;
            c = Math.floor(r / MP_DIGIT_MAX);
        }

        while (c > 0) {
            iy++; // if you ask yourself: WTF? you're right
            r = t.dp[ix + iy - 1] + c;
            t.dp[ix + iy - 1] = r & MP_MASK;
            c = Math.floor(r / MP_DIGIT_MAX);
        }
    }

    t.clamp();
    return t;
};
// public: square function
Bigint.prototype.sqr = function() {
    this.sign = MP_ZPOS;

    if (this.used >= FFT_SQR_CUTOFF) {
        // FFT does both in one function
        return this.fft_mul();
    }
    if (this.used >= 3 * TOOM_COOK_SQR_CUTOFF) {
        return this.toom_cook_sqr();
    }

    return this.square();
};


Bigint.prototype.mulInt = function(si) {
    var a = this,
        b = si,
        ret;

    // check numbers for 1(one) or 0(zero) respectively
    if (a.isZero() || b == 0) {
        return new Bigint(0);
    }
    if (a.isUnity()) {
        ret = b.toBigint();
        if (a.sign != b.sign()) {
            ret.sign = MP_NEG;
        }
        return ret;
    }
    if (b == 1 || b == -1) {
        ret = a.copy();
        // b.sign() is a function because b is a Number
        if (a.sign != b.sign()) {
            ret.sign = MP_NEG;
        }
        return ret;
    }
    ret = new Bigint();
    ret.dp = new Array(a.used + 1);
    ret.used = a.used + 1;
    ret.dp[0] = 0;

    var carry = 0 >>> 0,
        tmp, k;
    for (k = 0; k < a.used; k++) {
        tmp = this.dp[k] * si + carry;
        ret.dp[k] = tmp & MP_MASK;
        carry = Math.floor(tmp / MP_DIGIT_MAX);
    }

    if (carry) {
        ret.dp[k] = carry;
    }

    ret.clamp();
    if (this.sign != si.sign()) {
        ret.sign = MP_NEG;
    }
    return ret;
};
// compares absolute values (magnitudes)
Bigint.prototype.cmp_mag = function(bi) {
    if (this.used < bi.used) {
        return MP_LT;
    }
    if (this.used > bi.used) {
        return MP_GT;
    }
    // same size, get into details msb->lsb
    for (var i = this.used; i >= 0; i--) {
        if (this.dp[i] > bi.dp[i]) {
            return MP_GT;
        }
        if (this.dp[i] < bi.dp[i]) {
            return MP_LT;
        }
    }
    return MP_EQ;
};

// compares signed values
Bigint.prototype.cmp = function(bi) {
    /* compare based on sign */
    if (this.sign != bi.sign) {
        if (this.sign == MP_NEG) {
            return MP_LT;
        } else {
            return MP_GT;
        }
    }
    /* compare digits */
    if (this.sign == MP_NEG) {
        /* if negative compare opposite direction */
        return bi.cmp_mag(this);
    } else {
        return this.cmp_mag(bi);
    }
};
// internal, unsigned adder, returns an Array, not a Bigint!
Bigint.prototype.kadd = function(bi) {
    var x, retdp, min, max, carry, i;

    /* find sizes, we let |a| <= |b| which means we have to sort
     * them.  "x" will point to the input with the most digits
     */
    if (this.used > bi.used) {
        min = bi.used;
        max = this.used;
        x = this;
    } else {
        min = this.used;
        max = bi.used;
        x = bi;
    }

    retdp = [];

    carry = 0;
    for (i = 0; i < min; i++) {
        retdp[i] = this.dp[i] + bi.dp[i] + carry;
        // works if MP_DIGIT_BIT < 32 bit (YMMV on a 64 bit machine)
        carry = retdp[i] >>> MP_DIGIT_BIT;
        retdp[i] &= MP_MASK;
    }
    // higher words
    if (min != max) {
        for (; i < max; i++) {
            retdp[i] = x.dp[i] + carry;
            carry = retdp[i] >>> MP_DIGIT_BIT;
            retdp[i] &= MP_MASK;
        }
    }
    retdp[i] = carry;
    return retdp;
};
// public signed adder
Bigint.prototype.add = function(bi) {
    var sa = this.sign;
    var sb = bi.sign;

    var ret = new Bigint();
    /* handle two cases, not four */
    if (sa == sb) {
        /* both positive or both negative */
        /* add their magnitudes, copy the sign */
        ret.sign = sa;
        ret.dp = this.kadd(bi);
    } else {
        /* one positive, the other negative */
        /* subtract the one with the greater magnitude from */
        /* the one of the lesser magnitude.  The result gets */
        /* the sign of the one with the greater magnitude. */
        if (this.cmp_mag(bi) == MP_LT) {
            ret.sign = sb;
            ret.dp = bi.ksub(this);
        } else {
            ret.sign = sa;
            ret.dp = this.ksub(bi);
        }
    }
    ret.used = ret.dp.length;
    ret.clamp();
    return ret;
};
// TODO: to do
Bigint.prototype.addInt = function(si) {
    var bi = si.toBigint();
    return this.add(bi);
};

// internal unsigned subtractor
Bigint.prototype.ksub = function(bi) {
    var retdp, min, max, carry, i;

    /* find sizes */
    min = bi.used;
    max = this.used;

    retdp = [];
    carry = 0;
    for (i = 0; i < min; i++) {
        // the unsigned shift is not an error here, but prob. only here
        retdp[i] = this.dp[i] - bi.dp[i] - carry;
        carry = (retdp[i] >> (MP_DIGIT_BIT + 1)) & 0x1;
        retdp[i] &= MP_MASK;
    }
    for (; i < max; i++) {
        retdp[i] = this.dp[i] - carry;
        carry = (retdp[i] >> (MP_DIGIT_BIT + 1)) & 0x1;
        retdp[i] &= MP_MASK;
    }
    return retdp;
};
// public signed subtractor
Bigint.prototype.sub = function(bi) {
    var sa, sb, ret;

    ret = new Bigint();

    sa = this.sign;
    sb = bi.sign;
    if (sa != sb) {
        /* subtract a negative from a positive, OR */
        /* subtract a positive from a negative. */
        /* In either case, ADD their magnitudes, */
        /* and use the sign of the first number. */
        ret.sign = sa;
        ret.dp = this.kadd(bi);
    } else {
        /* subtract a positive from a positive, OR */
        /* subtract a negative from a negative. */
        /* First, take the difference between their */
        /* magnitudes, then... */
        if (this.cmp_mag(bi) != MP_LT) {
            /* Copy the sign from the first */
            ret.sign = sa;
            /* The first has a larger or equal magnitude */
            ret.dp = this.ksub(bi);
        } else {
            /* The result has the *opposite* sign from */
            /* the first number. */
            ret.sign = (sa == MP_NEG) ? MP_ZPOS : MP_NEG;
            /* The second has a larger magnitude */
            ret.dp = bi.ksub(this);
        }
    }
    ret.used = ret.dp.length;
    ret.clamp();
    return ret;
};

// TODO: to do
Bigint.prototype.subInt = function(si) {
    return this.sub(si.toBigint());
};
// internal division with remainder (D. Knuth: Algo. D)
Bigint.prototype.kdivrem = function(bint) {
    // Port of divmnu64.c from "Hacker's Delight"
    var divmnu = function(q, r, u, v, m, n) {
        var b = MP_DIGIT_MAX >>> 0; // Number base.
        var mask = MP_MASK >>> 0; // Number mask b-1
        var un, vn; // Normalized form of u, v.
        var qhat; // Estimated quotient digit.
        var rhat; // A remainder.
        var p; // Product of two digits.
        var s, i, j, t, k;

        // gets checked by public function but we might use this
        // private function directly, too.
        if (n == 1) { // Take care of
            k = 0; // the case of a
            for (j = m - 1; j >= 0; j--) { // single-digit
                q[j] = Math.floor((k * b + u[j]) / v[0]); // divisor here.
                k = (k * b + u[j]) - q[j] * v[0];
            }
            r[0] = k;
            return [q, r];
        }

        // Normalize by shifting v left just enough so that
        // its high-order bit is on, and shift u left the
        // same amount.  We may have to append a high-order
        // digit on the dividend; we do that unconditionally.

        s = MP_DIGIT_BIT - (((v[n - 1]).highBit() + 1)); // 0 <= s <= 25 .
        // TODO: V ans U are already deep copies we can work on them directly
        vn = new Array(n);
        for (i = n - 1; i > 0; i--) {
            vn[i] = ((v[i] << s) & mask) | ((v[i - 1] >>> (MP_DIGIT_BIT -
                s)) & mask);
        }
        vn[0] = (v[0] << s) & mask;

        un = new Array((m + 1));
        un[m] = (u[m - 1] >>> (MP_DIGIT_BIT - s)) & mask;
        for (i = m - 1; i > 0; i--) {
            un[i] = ((u[i] << s) & mask) | ((u[i - 1] >>> (MP_DIGIT_BIT -
                s)) & mask);
        }
        un[0] = (u[0] << s) & mask;

        for (j = m - n; j >= 0; j--) { // Main loop.
            // Compute estimate qhat of q[j].
            qhat = Math.floor((un[j + n] * b + un[j + n - 1]) / vn[n -
                1]);
            rhat = (un[j + n] * b + un[j + n - 1]) - qhat * vn[n - 1];

            while (true) {
                if (qhat >= b || qhat * vn[n - 2] > b * rhat + un[j + n -
                        2]) {
                    qhat = qhat - 1;
                    rhat = rhat + vn[n - 1];
                    if (rhat < b) {
                        continue;
                    }
                }
                break;
            }

            // Multiply and subtract.
            k = 0;
            for (i = 0; i < n; i++) {
                p = qhat * vn[i];
                t = un[i + j] - k - (p & mask);
                un[i + j] = t & mask;
                k = Math.floor(p / b) - Math.floor(t / b);
            }
            t = un[j + n] - k;
            un[j + n] = t;

            q[j] = qhat; // Store quotient digit.
            if (t < 0) { // If we subtracted too
                q[j] = q[j] - 1; // much, add back.
                k = 0;
                for (i = 0; i < n; i++) {
                    t = un[i + j] + vn[i] + k;
                    un[i + j] = t & mask;
                    k = Math.floor(t / b);
                }
                un[j + n] = un[j + n] + k;
            }
        }
        // If the caller wants the remainder, unnormalize
        // it and pass it back.
        for (i = 0; i < n; i++) {
            r[i] = ((un[i] >>> s) & mask) | ((un[i + 1] << (
                MP_DIGIT_BIT - s)) & mask);
        }
        r[n - 1] = (un[n - 1] >>> s) & mask;
        return [q, r];
    };
    var U = this.dp;
    var M = this.used;
    var V = bint.dp;
    var N = bint.used;
    var Q = new Bigint(0);
    var R = new Bigint(0);


    // preallocate Arrays
    Q.dp = new Array(M);
    Q.used = M;
    R.dp = new Array(M);
    R.used = M;

    divmnu(Q.dp, R.dp, U, V, M, N);

    Q.clamp();
    R.clamp();

    return [Q, R];
};

// approximate reciprocal 1/this for Barrett-division
Bigint.prototype.inverse = function(n) {
    var m = this.highBit() + 1;
    var giantsteps;
    var steps, gs, gs0, i;
    var r, s, t, u, w, a, b;
    // truncated division
    if (n <= BARRETT_NEWTON_CUTOFF) {
        var ret = new Bigint(1);
        ret.lShiftInplace(2 * n);
        return ret.div(this.rShiftRounded(m - n));
    }
    // some rounds of Newton-Raphson
    giantsteps = computeGiantsteps(BARRETT_NEWTON_CUTOFF, n, 2);
    steps = giantsteps.length;
    gs = n;
    r = new Bigint(1);
    r.lShiftInplace(2 * giantsteps[0]);
    r = r.div(this.rShiftRounded(m - giantsteps[0]));
    gs0 = giantsteps[0];
    for (i = 0; i < steps; i++) {
        gs = giantsteps[i];
        a = r.lShift(giantsteps[i] - gs0 + 1);
        b = r.sqr().mul(this.rShift(m - giantsteps[i])).rShift(2 * gs0);
        r = a.sub(b);
        gs0 = giantsteps[i];
    }
    return r;
};
// Take an approximation of the reciprocal of the denominator and correct it
// the trick is to find the right amount of approximateness (is this really a
// proper English word? Found it in at least one book: Clifford Alan Hooker,
// "A Realistic Theory of Science", SUNY Press, 1987).
Bigint.prototype.barretDivisionCorrection = function(b, mu) {
    var m = this.highBit() + 1;
    var n = b.highBit() + 1;

    var digit = this.rShift(n - 1);
    var q = digit.mul(mu).rShift(m - n + 1);
    var r = this.sub(b.mul(q));

    while (r.sign < 0 || r.cmp(b) != MP_LT) {
        if (r.sign < 0) {
            r = r.add(b);
            q.decr();
        } else {
            r = r.sub(b);
            q.incr();
        }
    }
    return [q, r];
};
// Barrett-division works for N<=2*D, anything else needs some work
Bigint.prototype.barrettDivision = function(bint) {
    var m = this.highBit() + 1;
    var n = bint.highBit() + 1;
    var mu, largemu, start, q, r, mask, digit, c;
    if (m < n) {
        return [new Bigint(0), this.copy()];
    } else if (m <= 2 * n) {
        mu = bint.inverse(m - n);
        return this.barretDivisionCorrection(bint, mu);
    } else {
        // do school-division with big-digits of a size chosen such that
        // the condition N<=2*D holds.

        // Overall mu, gets splitted later
        largemu = bint.inverse(n);
        // choose the startpoint as an integer multiple of n
        start = Math.floor(m / n) * n;
        q = new Bigint(0);
        // first part of the new numerator
        r = this.rShift(start);
        // mask of size n
        mask = new Bigint(1);
        mask.lShiftInplace(n);
        mask.decr();
        while (start > 0) {
            start -= n;
            // Snip a large digit from the LSB side of the original numerator
            digit = this.rShift(start).and(mask);
            // make room for it in the new numerator
            r.lShiftInplace(n);
            // put the digit there
            r = r.add(digit);
            // get the right amount of mu (still under the condition N<=2*D)
            mu = largemu.rShiftRounded(2 * n - (r.highBit() + 1));
            // correct the result
            c = r.barretDivisionCorrection(bint, mu);
            // make room for the quotient-part
            q.lShiftInplace(n);
            // put it there
            q = q.add(c[0]);
            // the remainder is the new numerator
            r = c[1];
        }
        return [q, r];
    }
};

Bigint.prototype.divisionNewton = function(bint){
    var tlen, blen, rlen, extra;
    var t1, t2, t3, t4, ts, q, r;
    var giantsteps, steps, gs0, gsi, startprecision;

    tlen = this.highBit() + 1;
    blen = bint.highBit() + 1;
    rlen = tlen - blen;

    // probably too much and should be adjusted to fill a limb if possible, too.
    extra = blen.highBit() + 1;
    // should also have three bits at least
    if(extra < 3){
         extra = 3;
    }
    ts = this.lShift(extra);
    tlen += extra;
    rlen += extra;

    // The value of startprecision has been choosen to keep the first
    // approximation in the Number range but is was found to be of about the
    // same speed as with Bigints. YMMV, so please try it out yourself.
    startprecision = 15;
    // precompute individual precisions to keep the iteration loop legible.
    giantsteps = computeGiantsteps(startprecision,rlen,2);
    steps = giantsteps.length;

    t1 =  new Bigint(1);
    t1.lShiftInplace(2 * giantsteps[0]);
    t1 = t1.div(bint.rShiftRounded(blen - giantsteps[0]));

    // the first entry of giantsteps is not necessarily equal to startprecision
    gs0 = giantsteps[0];

    for(var i = 0; i < steps ; i++){
        gsi = giantsteps[i];
        // Adjust numerator (2^k) to new precision
        t3 = t1.lShift(gsi - gs0 + 1);
        // Adjust denominator to new precision
        t4 = bint.rShift(blen - gsi);
        // Do the squaring of the Newton-Raphson algorithm
        t1 = t1.sqr();
        // Do the multiplication of the Newton-Raphson algorithm
        t1 = t1.mul(t4);
        // The division of N-R gets replaced by a simple shift
        t4 = t1.rShift(2 * gs0);
        // Do the subtraction of the Newton-Raphson algorithm
        t1 = t3.sub(t4);
        gs0 = gsi;
    }
    // the reciprocal is in t1, do the final multiplication to get the quotient
    // Adjust the numerator's precision to the precision of the denominator
    ts.rShiftInplace(blen);
    // Do the actual multiplication N*1/D
    q = ts.mul(t1);
    // Divide by 2^k to get the quotient
    q.rShiftInplace(rlen + extra);
    // compute the remainder
    r = this.sub(q.mul(bint));
    // The N_R algorithm as implemented can be off by one, correct it
    if( r.sign == MP_NEG){
        r = r.add(bint);
        q.decr();
    }
    else if( r.cmp(bint) == MP_GT){
        r = r.sub(bint);
        q.incr();
    }
    return [q, r];
};

// public: truncated division with remainder
Bigint.prototype.divrem = function(bint) {
    var a = this.abs();
    var b = bint.abs();
    var q, r, ret;
    var qsign, rsign;

    /* Some checks (NaN, Inf) */
    if (isNaN(a.dp[0]) || isNaN(b.dp[0])) {
        return [a.setNaN(), b.setNaN()];
    }
    if (a.isInf() || b.isInf()) {
        return [a.setInf(), b.setInf()];
    }

    if (b.isZero()) {
        return (b.sign == MP_NEG) ? [a.setNegInf(), new Bigint(0)] : [a.setPosInf(),
            new Bigint(0)
        ];
    }

    // Single digit b
    if (b.used == 1) {
        return a.divremInt(b.dp[0]);
    }

    // a < b
    if (a.cmp_mag(b) == MP_LT) {
        return [new Bigint(0), a];
    }

    qsign = ((this.sign * bint.sign) < 0) ? MP_NEG : MP_ZPOS;
    rsign = (this.sign == MP_NEG) ? MP_NEG : MP_ZPOS;

    // The cutoffs overlap, these branches are just rough limits
    if (a.used >= NEWTON_NUMERATOR && b.used >= NEWTON_DENOMINATOR){
        ret = a.divisionNewton(b);
    } else if (a.used >= BARRETT_NUMERATOR || b.used >= BARRETT_DENOMINATOR){
        // splitted in two for legibility
        if ( a.used <= 2 * b.used && a.used >= BARRETT_NUMERATOR){
            ret = a.barrettDivision(b);
        } else if ( a.used > 2 * b.used && b.used >=  BARRETT_DENOMINATOR){
            ret = a.barrettDivision(b);
        }
    } else {
        ret = a.kdivrem(b);
    }
    // long version
    q = ret[0];
    r = ret[1];
    q.sign = qsign;
    r.sign = rsign;
    /*
        Arguments given to kdivrem() must be clean
        to avoid error checking here.
     */
    return [q, r];
};

// this function returns a bigint as the remainder.
// truncated division with remainder
Bigint.prototype.divremInt = function(si) {
    var divrem2in1 = function(u, m, v, q, B) {
        var k = 0,
            t;
        for (var j = m - 1; j >= 0; j--) {
            k = k * (1<<B);
            k += u[j];
            // No, this does not work in ECMAScript *hng!*
            //k = (k << B) | u[j];
            if (k >= v) {
                t = Math.floor(k / v);
                k -= t * v;
            } else {
                t = 0;
            }
            q[j] = t;
        }
        return k;
    };
    var Q = new Bigint(0);
    var R = new Bigint(0);
    // TODO: checks & balances
    var qsign = ((this.sign * si.sign()) < 0) ? MP_NEG : MP_ZPOS;
    var rsign = (this.sign == MP_NEG) ? MP_NEG : MP_ZPOS;
    R.dp[0] = divrem2in1(this.dp, this.used, si, Q.dp, MP_DIGIT_BIT);
    Q.used = Q.dp.length;
    Q.sign = qsign;
    R.used = 1;
    R.sign = rsign;
    Q.clamp();
    R.clamp();
    return [Q, R];
};

// division with remainder, rounding to -Infinity (like in GP/PARI for example)
Bigint.prototype.divmod = function(bint){
    var a = this;
    var b = bint;
    var qr;
    if(a.sign == MP_NEG && b.sign == MP_NEG){
        qr = a.abs().divrem(b.abs());
        if(!qr[1].isZero()){
            qr[0].incr();
            qr[1] = b.add(qr[1]).abs();
        }
        return qr;
    }
    else if(a.sign == MP_NEG  && b.sign == MP_ZPOS){
        qr = a.abs().divrem(b);
        if(!qr[1].isZero()){
            qr[0].incr();
            qr[0] = qr[0].neg();
            qr[1] = b.sub(qr[1]);
            return qr;
        }
        qr[0] = qr[0].neg();
        return qr;
    }
    else if(a.sign == MP_ZPOS && b.sign == MP_NEG){
        qr = a.divrem(b.abs());
        qr[0] = qr[0].neg();
        return qr;
    }
    return a.divrem(b);
};

// division by 3 if fraction is known to have no remainder (e.g. in Toom-Cook)
// uses MP_DIGIT_BIT = 26 only but is easily changed
// It depends on architecture if it is actually faster, please test but I found
// at 1,000,000 bit long numbers with my good ol' Duron a difference of a mere
// 150 milliseconds (201 to 53)
/*
    Uses multiplication with the multiplicative modular inverse of 3 with the
    modulus 2^26, that is, the canonical residue of v mod 2^26 such that
    v * 3 is congruent to 1 mod 2^26.

   modulus         v               ceil(v/2)
     2^26      0x2aaaaab           0x1555556
     2^28      0xaaaaaab           0x5555556
     2^30      0x2aaaaaab          0x15555556
     2^31      0x2aaaaaab          0x15555556
*/
MOD_MUL_INV_THREE = (3).modInv(1 << MP_DIGIT_BIT);
MOD_MUL_INV_THREE_HALF = Math.ceil(MOD_MUL_INV_THREE / 2);
Bigint.prototype.exactDiv3 = function() {
    var ret;
    var i, tmp, carry;
    // checks & balances
    ret = new Bigint(0);
    ret.dp = new Array(this.used);
    ret.used = ret.dp.length;
    carry = 0;
    for (i = 0; i < this.used; i++) {
        tmp = this.dp[i] - carry;
        if (tmp < 0) {
            carry = 1;
        } else {
            carry = 0;
        }
        ret.dp[i] = (tmp * MOD_MUL_INV_THREE) & MP_MASK;
        if (ret.dp[i] >= MOD_MUL_INV_THREE_HALF) {
            carry++;
            if (ret.dp[i] >= MOD_MUL_INV_THREE) {
                carry++;
            }
        }
    }
    return ret;
};



Bigint.prototype.div = function(bi) {
    return this.divrem(bi)[0];
};
Bigint.prototype.divInt = function(si) {
    return this.divremInt(si)[0];
};
Bigint.prototype.rem = function(bi) {
    return this.divrem(bi)[1];
};
Bigint.prototype.remInt = function(si) {
    return this.divremInt(si)[1];
};

// Beware: works in-place!
Bigint.prototype.incr = function() {
    var carry, i;
    carry = 1;
    i = 0;
    this.dp[i] = this.dp[i] + carry;
    carry = this.dp[i] >>> MP_DIGIT_BIT;
    this.dp[i] &= MP_MASK;
    // the chance of this early-out to happen has not yet been calculated but
    // conjectured to be quite high
    if (carry === 0) {
        return;
    }
    for (i = 1; i < this.used; i++) {
        this.dp[i] = this.dp[i] + carry;
        carry = this.dp[i] >>> MP_DIGIT_BIT;
        this.dp[i] &= MP_MASK;
    }
    if (carry) {
        this.dp[i] = carry;
    }
    this.used = this.dp.length;
};
// Beware: works in-place!
Bigint.prototype.decr = function() {
    var carry, i;

    carry = 0;
    this.dp[0] = this.dp[0] - 1;
    if (this.dp[0] < 0) {
        this.dp[0] += MP_DIGIT_MAX;
        carry = 1;
    } else {
        carry = 0;
    }
    if (carry) {
        for (i = 1; i < this.used; i++) {
            this.dp[i] = this.dp[i] - carry;
            if (this.dp[i] < 0) {
                this.dp[i] += MP_DIGIT_MAX;
                carry = 1;
            } else {
                carry = 0;
            }
        }
    }
    // 10 - 1 = 9
    if (this.dp[this.used - 1] == 0) {
        this.used--;
    }
};


Bigint.prototype.slice = function(start, end) {
    var ret = new Bigint(0);
    ret.dp = this.dp.slice(start, end);
    ret.used = end - start;
    ret.sign = this.sign;
    return ret;
};
Bigint.prototype.karatsuba = function(bint) {
    var x0, x1, y0, y1, x0y0, x1y1, t1, xy;

    var tlen = this.used;
    var blen = bint.used;

    var m = Math.min(tlen, blen) >>> 1;
    if (m <= KARATSUBA_MUL_CUTOFF) {
        return this.multiply(bint);
    }
    x1 = this.slice(m, tlen);
    x0 = this.slice(0, m);
    y1 = bint.slice(m, blen);
    y0 = bint.slice(0, m);
    x0y0 = x0.karatsuba(y0);
    x1y1 = x1.karatsuba(y1);

    t1 = x1.add(x0);
    x0 = y1.add(y0);
    t1 = t1.karatsuba(x0);

    x0 = x0y0.add(x1y1);
    t1 = t1.sub(x0);

    // z2 * B^(2*m) + z1 * B^m + z0
    xy = (x1y1.dlShift(2 * m)).add(t1.dlShift(m)).add(x0y0);

    return xy;
};
Bigint.prototype.karatsuba_square = function() {
    var x0, x1, x0y0, x1y1, t1, xy;

    var tlen = this.used;

    var m = tlen >>> 1;
    if (m <= KARATSUBA_SQR_CUTOFF) {
        return this.square();
    }
    x1 = this.slice(m, tlen);
    x0 = this.slice(0, m);
    x1y1 = x1.karatsuba_square();

    t1 = x1.add(x0);
    t1 = t1.karatsuba_square();

    x0 = x0y0.add(x1y1);
    t1 = t1.sub(x0);

    // z2 * B^(2*m) + z1 * B^m + z0
    xy = (x1y1.dlShift(2 * m)).add(t1.dlShift(m)).add(x0y0);

    return xy;
};


/*
Jaewook Chung, M. Anwar Hasan: Asymmetric Squaring Formulae, Centre for Applied
Cryptographic Research, University of Waterloo, Ontario, Canada, (3-August-2006). URL:
http://www.cacr.math.uwaterloo.ca/tech_reports.html. 551, 553, 557
*/
Bigint.prototype.toom_cook_mul = function(bint) {
    var a0, a1, a2, b0, b1, b2, t1, t2, w0, w1, w2, w3, w4, c;

    var tlen = this.used;
    var blen = bint.used;

    var m = Math.floor(Math.min(tlen, blen) / 3);
    if (m <= TOOM_COOK_MUL_CUTOFF) {
        return this.karatsuba(bint);
    }

    a0 = new Bigint(0);
    a1 = new Bigint(0);
    a2 = new Bigint(0);

    b0 = new Bigint(0);
    b1 = new Bigint(0);
    b2 = new Bigint(0);

    a0 = this.slice(0, m);
    a1 = this.slice(m, 2 * m);
    a2 = this.slice(2 * m, tlen);

    b0 = bint.slice(0, m);
    b1 = bint.slice(m, 2 * m);
    b2 = bint.slice(2 * m, blen);

    w0 = a0.toom_cook_mul(b0);
    w4 = a2.toom_cook_mul(b2);

    w1 = (a2.add(a1).add(a0)).toom_cook_mul(b2.add(b1).add(b0));

    w2 = (a2.lShift(2).add(a1.lShift(1)).add(a0)).toom_cook_mul(b2.lShift(2)
        .add(b1.lShift(1)).add(b0));

    w3 = (a2.sub(a1).add(a0)).toom_cook_mul(b2.sub(b1).add(b0));

    t1 = w3.lShift(1).add(w2);
    t1 = t1.exactDiv3();
    t1 = t1.add(w0);
    t1 = t1.rShift(1);
    t1 = t1.sub(w4.lShift(1));
    t2 = w1.add(w3).rShift(1);
    w1 = w1.sub(t1);
    w2 = t2.sub(w0).sub(w4);
    w3 = t1.sub(t2);

    w1 = w1.dlShift(1 * m); // c
    w2 = w2.dlShift(2 * m); // c
    w3 = w3.dlShift(3 * m); // c
    w4 = w4.dlShift(4 * m); // c

    c = w0.add(w1).add(w2).add(w3).add(w4);

    return c;
};

Bigint.prototype.toom_cook_sqr = function() {
    var a0, a1, a2, t1, w0, w1, w2, w3, w4, c;

    var tlen = this.used;

    var m = Math.floor(tlen / 3);
    if (m <= 40 /* TOOM_MUL_CUTOFF */ ) {
        return this.karatsuba_square();
    }

    a0 = new Bigint(0);
    a1 = new Bigint(0);
    a2 = new Bigint(0);


    a0 = this.slice(0, m);
    a1 = this.slice(m, 2 * m);
    a2 = this.slice(2 * m, tlen);

    w0 = a0.toom_cook_sqr();
    w4 = a2.toom_cook_sqr();

    w1 = (a2.add(a1).add(a0)).toom_cook_sqr();
    w2 = (a2.sub(a1).add(a0)).toom_cook_sqr();

    w3 = a1.lShift(1).mul(a2);

    t1 = w1.add(w2).rShift(1);
    w1 = w1.sub(t1).sub(w3);
    w2 = t1.sub(w4).sub(w0);

    // w0 = w0.dlShift(0*m)
    w1 = w1.dlShift(1 * m);
    w2 = w2.dlShift(2 * m);
    w3 = w3.dlShift(3 * m);
    w4 = w4.dlShift(4 * m);

    c = w0.add(w1).add(w2).add(w3).add(w4);

    return c;
};

// detects automatically if a square is wanted, just leave out the argument
Bigint.prototype.fft_mul = function(bint) {
    /* base two integer logarithm */
    var highbit = function(n) {
        var r = 0 >>> 0;
        var m = n >>> 0;
        while (m >>>= 1) {
            r++;
        }
        return r;
    };
    var bi_to_fft = function(a, fa, b, fb, len) {

        var length_a, length_b, length_needed, i, j, hb;

        /* Check of the multiplicands happens earlier */
        length_a = a.used;
        length_b = b.used;

        /* Digits get split in half, so twice the length is needed*/
        length_needed = (length_a + length_b) * 2;
        /* final length must be a power of two to keep the FFTs simple */
        hb = highbit(length_needed);
        /* check for the rare case that it is already a power of 2 */
        if (length_needed != 1 << hb) {
            length_needed = 1 << (hb + 1);
        }
        /* Send computed length back to caller */
        len[0] = length_needed;

        /* Put splitted digits in double-array, in the same order as in mp_int */
        for (i = 0, j = 0; i < length_needed / 2; i++, j += 2) {
            if (i < length_a) {
                fa[j] = 1.0 * (a.dp[i] & MP_HALF_DIGIT_MASK);
                fa[j + 1] = 1.0 * ((a.dp[i] >>> MP_HALF_DIGIT_BIT) &
                    MP_HALF_DIGIT_MASK);
            }
            /* padding a */
            if (i >= length_a) {
                fa[j] = 0.0;
                fa[j + 1] = 0.0;
            }
            if (i < length_b) {
                fb[j] = 1.0 * (b.dp[i] & MP_HALF_DIGIT_MASK);
                fb[j + 1] = 1.0 * ((b.dp[i] >>> MP_HALF_DIGIT_BIT) &
                    MP_HALF_DIGIT_MASK);
            }
            /* padding b */
            if (i >= length_b) {
                fb[j] = 0.0;
                fb[j + 1] = 0.0;
            }
        }
    };
    /* same as dp_to_fft() for a single multiplicand for squaring */
    var bi_to_fft_single = function(a, fa, len) {
        var length_a, length_needed, i, j, hb;
        length_a = a.used;
        length_needed = (length_a * 2) * 2;
        hb = highbit(length_needed);
        if (length_needed != 1 << hb) {
            length_needed = 1 << (hb + 1);
        }
        len[0] = length_needed;

        for (i = 0, j = 0; i < length_needed / 2; i++, j += 2) {
            if (i < length_a) {
                fa[j] = 1.0 * (a.dp[i] & MP_HALF_DIGIT_MASK);
                fa[j + 1] = 1.0 * ((a.dp[i] >>> MP_HALF_DIGIT_BIT) &
                    MP_HALF_DIGIT_MASK);
            }
            if (i >= length_a) {
                fa[j] = 0.0;
                fa[j + 1] = 0.0;
            }
        }
        return MP_OKAY;
    };
    var fft_to_bi = function(fft_array, len) {
        var new_length, i, j;
        var carry, temp;
        var a = new Bigint(0);

        /* Result cannot exceed length/2, hence add two */
        new_length = len[0];

        /* The FFT multiplication does no carry (it's one of the tricks of it) */
        carry = 0;
        for (i = 0; i < len; i++) {
            temp = carry;
            carry = 0;
            temp += Math.round(fft_array[i]);
            if (temp >= MP_HALF_DIGIT) {
                carry = Math.floor(temp / MP_HALF_DIGIT);
                temp = temp % MP_HALF_DIGIT;
            }
            /* memory is still expensive, not a thing to waste easily */
            fft_array[i] = temp;
        }

        /* re-marry the digits */
        for (i = 0, j = 0; j < new_length; i++, j += 2) {
            a.dp[i] = ((fft_array[j + 1])) & MP_HALF_DIGIT_MASK;
            a.dp[i] <<= MP_HALF_DIGIT_BIT;
            a.dp[i] |= ((fft_array[j])) & MP_HALF_DIGIT_MASK;
            /* and count them all */
            a.used++;
        }
        if (carry) {
            a.dp[i] = carry;
            a.used++;
        }
        a.clamp();
        return a;
    };
    var fht_dif_iterative = function(x, n, offset, do_loop) {
        var m = 0 >>> 0,
            mh = 0 >>> 0,
            mq = 0 >>> 0;
        var i, j, k;
        var a, b, t, c, s, u, v, tmp;
        // a pointer to x in the original
        var dp;
        for (m = n; m > 1; m >>>= 1) {
            mh = m >>> 1;
            mq = mh >>> 1;
            t = Math.PI / mh;
            a = Math.sin(0.5 * t);
            a *= 2.0 * a;
            b = Math.sin(t);
            for (i = 0; i < n; i += m) {
                dp = offset + i; // dp = x + i in original
                for (j = 0, k = mh; j < mh; ++j, ++k) {
                    u = x[dp + j];
                    v = x[dp + k];
                    x[dp + j] = u + v;
                    x[dp + k] = u - v;
                }
                dp += mh;
                c = 1.0;
                s = 0.0;
                for (j = 1, k = mh - 1; j < mq; ++j, --k) {
                    tmp = c;
                    c -= a * c + b * s;
                    s -= a * s - b * tmp;
                    u = x[dp + j];
                    v = x[dp + k];
                    x[dp + j] = u * c + v * s;
                    x[dp + k] = u * s - v * c;
                }
            }
            if (!do_loop) {
                break;
            }
        }
        return;
    };
    var fht_dif_rec = function(x, n, offset) {
        var nh = 0 >>> 0;
        if (n == 1) {
            return;
        }
        if (n < Math.floor(MP_L1_SIZE / (2 * 8))) { // 8 = sizeof(double)
            fht_dif_iterative(x, n, offset, true);
            return;
        }
        fht_dif_iterative(x, n, offset, false);
        nh = n >>> 1;
        fht_dif_rec(x, nh, offset);
        fht_dif_rec(x, nh, nh + offset);
        return;
    };
    var fht_dit_iterative = function(x, n, offset, do_loop) {
        var m = 0 >>> 0,
            mh = 0 >>> 0,
            mq = 0 >>> 0;
        var i, j, k;
        var a, b, t, u, v, c, s, tmp;
        var dp;

        m = (do_loop) ? 2 : n;
        for (; m <= n; m <<= 1) {
            mh = m >>> 1;
            mq = mh >>> 1;
            t = Math.PI / mh;
            a = Math.sin(0.5 * t);
            a *= 2.0 * a;
            b = Math.sin(t);
            for (i = 0; i < n; i += m) {
                dp = offset + i + mh; // was dp = x + i + mh
                c = 1.0;
                s = 0.0;
                for (j = 1, k = mh - 1; j < mq; ++j, --k) {
                    tmp = c;
                    c -= a * c + b * s;
                    s -= a * s - b * tmp;
                    u = x[dp + j];
                    v = x[dp + k];
                    x[dp + j] = u * c + v * s;
                    x[dp + k] = u * s - v * c;
                }
                dp -= mh;
                for (j = 0, k = mh; j < mh; ++j, ++k) {
                    u = x[dp + j];
                    v = x[dp + k];
                    x[dp + j] = u + v;
                    x[dp + k] = u - v;
                }
            }
        }
        return;
    };
    var fht_dit_rec = function(x, n, offset) {
        var nh;

        if (n == 1) {
            return;
        }
        if (n < Math.floor(MP_L1_SIZE / (2 * 8))) { // 8 = sizeof(double)
            fht_dit_iterative(x, n, offset, true);
            return;
        }
        nh = n >>> 1;
        fht_dit_rec(x, nh, offset);
        fht_dit_rec(x, nh, nh + offset);
        fht_dit_iterative(x, n, offset, false);
        return;
    };
    /*
      The FHT convolution from Jörg Arndt's book.
      The code looks a bit messy but only on the face of it. This method avoids
      the otherwise costly bit reversing (which is called "revbin" in J. Arndt's
      book).
    */
    var fht_conv_core = function(f, g, n, v /*=0.0*/ ) {
        var nh, r, rm, k, km, tr, m;
        var xi, xj, yi, yj;
        if (v == 0.0) {
            v = 1.0 / n;
        }

        g[0] *= (v * f[0]);
        if (n >= 2) {
            g[1] *= (v * f[1]);
        }
        if (n < 4) {
            return;
        }
        v *= 0.5;
        nh = (n >>> 1);
        r = nh;
        rm = n - 1;
        xi = f[r];
        xj = f[rm];
        yi = g[r];
        yj = g[rm];
        g[r] = v * ((xi + xj) * yi + (xi - xj) * yj);
        g[rm] = v * ((-xi + xj) * yi + (xi + xj) * yj);

        k = 2;
        km = n - 2;
        while (k < nh) {
            rm -= nh;
            tr = r;
            r ^= nh;
            for (m = (nh >>> 1); !((r ^= m) & m); m >>>= 1) {}

            xi = f[r];
            xj = f[rm];
            yi = g[r];
            yj = g[rm];
            g[r] = v * ((xi + xj) * yi + (xi - xj) * yj);
            g[rm] = v * ((-xi + xj) * yi + (xi + xj) * yj);
            --km;
            ++k;
            rm += (tr - r);
            r += nh;
            xi = f[r];
            xj = f[rm];
            yi = g[r];
            yj = g[rm];
            g[r] = v * ((xi + xj) * yi + (xi - xj) * yj);
            g[rm] = v * ((-xi + xj) * yi + (xi + xj) * yj);
            --km;
            ++k;
        }
        return;
    };
    var fht_autoconv_core = function(f, n, v /*=0.0*/ ) {
        var nh, r, rm, k, km, tr, m;
        var xi, xj, xi2, xj2, xij;
        if (v == 0.0) {
            v = 1.0 / n;
        }

        f[0] *= (v * f[0]);
        if (n >= 2) {
            f[1] *= (v * f[1]);
        }
        if (n < 4) {
            return;
        }
        v *= 0.5;
        nh = (n >>> 1);
        r = nh;
        rm = n - 1;
        xi = f[r];
        xj = f[rm];
        xi2 = xi * xi;
        xj2 = xj * xj;
        xij = (2 * xi * xj);
        f[r] = v * (xi2 + xij - xj2);
        f[rm] = v * (-xi2 + xij + xj2);

        k = 2;
        km = n - 2;
        while (k < nh) {
            rm -= nh;
            tr = r;
            r ^= nh;
            for (m = (nh >>> 1); !((r ^= m) & m); m >>>= 1) {}
            xi = f[r];
            xj = f[rm];
            xi2 = xi * xi;
            xj2 = xj * xj;
            xij = (2 * xi * xj);
            f[r] = v * (xi2 + xij - xj2);

            f[rm] = v * (-xi2 + xij + xj2);

            --km;
            ++k;
            rm += (tr - r);
            r += nh;
            xi = f[r];
            xj = f[rm];
            xi2 = xi * xi;
            xj2 = xj * xj;
            xij = (2 * xi * xj);
            f[r] = v * (xi2 + xij - xj2);
            f[rm] = v * (-xi2 + xij + xj2);
            --km;
            ++k;
        }
        return;
    };

    var MP_fft = function(x, y, len) {
        var n;
        n = len[0];
        if (n < 2) {
            return MP_VAL;
        }
        fht_dif_rec(x, n, 0);
        fht_dif_rec(y, n, 0);
        fht_conv_core(x, y, n, 0.0);
        fht_dit_rec(y, n, 0);
        return MP_OKAY;
    };
    var MP_fft_sqr = function(x, len) {
        var n;
        n = len[0];
        if (n < 2) {
            return MP_VAL;
        }
        fht_dif_rec(x, n, 0);
        fht_autoconv_core(x, n, 0.0);
        fht_dit_rec(x, n, 0);
        return MP_OKAY;
    };
    var fft_mul = function(a, b) {
        var fa = [],
            fb = [],
            len = [];
        var c;
        // checks and balances

        bi_to_fft(a, fa, b, fb, len);
        MP_fft(fa, fb, len);

        c = fft_to_bi(fb, len);
        return c;
    };
    var fft_sqr = function(a) {
        var fa = [],
            len = [];
        var c;
        // checks and balances

        bi_to_fft_single(a, fa, len);
        MP_fft_sqr(fa, len);

        c = fft_to_bi(fa, len);
        return c;
    };

    if (arguments.length == 1) {
        return fft_mul(this, bint);
    }
    return fft_sqr(this);
};



// simple right-to-left
// will implement and make use of left-to-right for x^y with very small x later
Bigint.prototype.kpow = function(ui) {
    var ret = new Bigint(1);
    var t = this;
    while (ui != 0) {
        if (ui & 1 == 1) {
            ret = ret.mul(t);
        }
        t = t.sqr();
        ui >>>= 1;
    }
    return ret;
};

Bigint.prototype.pow = function(ui) {
    var sign = this.sign;
    var t;

    if (ui < 0) {
        //rounds to zero
        return (new Bigint(0));
    }
    /*
    if(ui == 1/2){
      return this.sqrt();
    }  */
    if (ui == 1) {
        return this.dup();
    }
    if (ui == 2) {
        return this.sqr();
    }
    // useless? Redundant even?
    if (ui.isPow2()) {
        t = this.dup();
        ui--;
        do {
            t = t.sqr();
        } while (ui >>> 1)
        return t;
    }
    /*
      var r = new Array(2);
      if(ui.isPerfPow(r)){
      t = this.dup()
       ...
      return t;
    } */
    if (this.isZero()) {
        // IEEE 754
        if (ui == 0) {
            return (new Bigint(1));
        }
        return (new Bigint(0));
    }
    if (this.isInf()) {
        // IEEE 754
        if (ui == 0) {
            return (new Bigint(1));
        }
        return this.dup();
    }
    if (this.isUnity()) {
        if (this.sign > 0) {
            // IEEE 754 says it is always one, even for 1^\infty
            return (new Bigint(1));
        }
        if (ui == Infinity) {
            // IEEE 754 is unclear for -1
            return (new Bigint(0)).setNaN();
        }
        if (ui & 1 == 0) {
            return (new Bigint(1));
        }
        return this.dup();
    }
    t = this.abs();
    t = t.kpow(ui);
    if (sign < 0 && ui & 1 == 0) {
        t.sign = MP_NEG;
    }
    return t;
};


// should be done with left-to-right instead?
Number.prototype.kpow = function(bi) {
    var ret = new Bigint(1);
    var t = this.toBigint();
    while (bi.isZero() == MP_NO) {
        if (bi.isOdd() == MP_YES) {
            ret = ret.mul(t);
        }
        t = t.sqr();
        bi.rShiftInplace(1);
    }
    return ret;
};

Number.prototype.bigpow = function(si) {
    var ret = new Bigint(1);
    var bi = si.toBigint();
    var t = this.toBigint();
    while (bi.isZero() == MP_NO) {
        if (bi.isOdd() == MP_YES) {
            ret = ret.mul(t);
        }
        t = t.sqr();
        bi.rShiftInplace(1);
    }
    return ret;
};

// Bigint gets simple bracketing
Bigint.prototype.ilogb = function(base) {
    var low, bracket_low, high, bracket_high, mid, bracket_mid;
    // log(-x)/log(y) = log(x)/log(y) + (k*pi *i)/log(y)
    if (this.isNeg()) {
        return this.copy().setNaN();
    }
    // this works works for positive and integer bases only
    // if(base < 0) return this.toBigfloat().cilogb(b).abs().floor();
    if (base < 1 || !base.isInt()) {
        return this.copy().setNaN();
    }

    if (base == 1) {
        return this.copy();
    }
    if (base == 2) {
        return this.ilog2();
    }
    low = new Bigint(0);
    bracket_low = new Bigint(1);
    high = new Bigint(1);
    bracket_high = new Bigint(base);

    while (bracket_high.cmp(this) == MP_LT) {
        low = high.copy();
        bracket_low = bracket_high;
        high.lShiftInplace(1);
        bracket_high = bracket_high.sqr();
    }
    while (high.sub(low).cmp(Bigint.ONE) == MP_GT) {

        mid = (low.add(high)).rShift(1);
        bracket_mid = bracket_low.mul(base.kpow(mid.sub(low)));
        if (this.cmp(bracket_mid) == MP_LT) {
            high = mid;
            bracket_high = bracket_mid;
        }
        if (this.cmp(bracket_mid) == MP_GT) {
            low = mid;
            bracket_low = bracket_mid;
        }
        if (this.cmp(bracket_mid) == MP_EQ) {
            return mid;
        }
    }

    if (bracket_high.cmp(this) == MP_EQ) {
        return high;
    } else {
        return low;
    }
};

Bigint.prototype.nthroot = function(n) {
    var low, high, mid;

    if (!this.isZero() && n == 0) {
        return new Bigint(1);
    }
    if (this.isZero() && n != 0) {
        return new Bigint(1);
    }
    if (this.isZero() && n == 0) {
        return this.copy().setInf();
    }
    if (this.isNeg()) {
        return this.copy().setNaN();
    }
    // actually: x^(1/(-y)) = 1/(x^(1/y)) and x^(1/1/y) = x^y
    if (n < 0 || !n.isInt()) {
        return this.copy().setNaN();
    }

    high = new Bigint(1);
    high.lShiftInplace(Math.floor(this.highBit() / n) + 1);
    low = high.rShift(1);
    while (low.cmp(high) == MP_LT) {
        mid = low.add(high).rShift(1);
        if (low.cmp(mid) == MP_LT && mid.pow(n).cmp(this) == MP_LT) {
            low = mid;
        } else if (high.cmp(mid) == MP_GT && mid.pow(n).cmp(this) == MP_GT) {
            high = mid;
        } else {
            return mid;
        }
    }
    return mid.incr();
};


Bigint.prototype.gcd = function(bint) {
    var g = new Bigint(1);
    // checks and balances
    if(this.isZero()){
        return bint.abs();
    }
    if(bint.isZero()){
        return this.abs();
    }
    var x = this.copy();
    var y = bint.copy();
    var t;
    while (x.isEven() && y.isEven()) {
        x.rShiftInplace(1);
        y.rShiftInplace(1);
        g.lShiftInplace(1);
    }
    while (!x.isZero()) {
        while (x.isEven()) {
            x.rShiftInplace(1);
        }
        while (y.isEven()) {
            y.rShiftInplace(1);
        }
        t = x.sub(y);
        t.sign = MP_ZPOS;
        t.rShiftInplace(1);
        // TODO: full copy prob. not necessary, check
        if (x.cmp(y) != MP_LT) {
            x = t.copy();
        } else {
            y = t.copy();
        }
    }
    return g.mul(y);
};
Bigint.prototype.egcd = function(bint) {
    var g = new Bigint(1);
    // checks and balances
    var x = this.copy();
    var y = bint.copy();
    var u, v, A, B, C, D;
    while (x.isEven() && y.isEven()) {
        x.rShiftInplace(1);
        y.rShiftInplace(1);
        g.lShiftInplace(1);
    }
    u = x.copy();
    v = y.copy();
    A = new Bigint(1);
    B = new Bigint(0);
    C = new Bigint(0);
    D = new Bigint(1);
    do {
        while (u.isEven()) {
            u.rShiftInplace(1);
            if (A.isEven() && B.isEven()) {
                A.rShiftInplace(1);
                B.rShiftInplace(1);
            } else {
                A = A.add(y);
                A.rShiftInplace(1);
                B = B.sub(x);
                B.rShiftInplace(1);
            }
        }
        while (v.isEven()) {
            v.rShiftInplace(1);
            if (C.isEven() && D.isEven()) {
                C.rShiftInplace(1);
                D.rShiftInplace(1);
            } else {
                C = C.add(y);
                C.rShiftInplace(1);
                D = D.sub(x);
                D.rShiftInplace(1);
            }
        }
        if (u.cmp(v) != MP_LT) {
            u = u.sub(v);
            A = A.sub(C);
            B = B.sub(D);
        } else {
            v = v.sub(u);
            C = C.sub(A);
            D = D.sub(B);
        }
    } while (!u.isZero());

    return [C, D, g.mul(v)];
};

Bigint.prototype.lcm = function(bint) {
    var t1 = this.gcd(bint),
        ret;
    if (this.cmp_mag(bint) == MP_LT) {
        ret = bint.mul(this.div(t1));
    } else {
        ret = this.mul(bint.div(t1));
    }
    ret.sign = MP_ZPOS;
    return ret;
};


Bigint.prototype.or = function(bint) {
    var ret = new Bigint(0);
    var a,b,i;
    if(this.used > bint.used){
        a = this;
        b = bint;
    } else {
        a = bint;
        b = this;
    }
    ret.dp = new Array(b.used);
    for (i = 0; i < b.used; i++) {
        ret.dp[i] = a.dp[i] | b.dp[i];
    }
    for (; i < a.used; i++) {
        ret.dp[i] = a.dp[i];
    }
    ret.used = a.used;
    ret.clamp();
    return ret;
};

Bigint.prototype.and = function(bint) {
    var ret = new Bigint(0);
    var a,b,i;
    if(this.used < bint.used){
        a = bint;
        b = this;
    } else {
        a = this;
        b = bint;
    }
    ret.dp = new Array(b.used);
    for (i = 0; i < b.used; i++) {
        ret.dp[i] = a.dp[i] & b.dp[i];
    }
    ret.used = a.used;
    ret.clamp();
    return ret;
};

Bigint.prototype.xor = function(bint) {
    var ret = new Bigint(0);
    var a,b,i;
    if(this.used < bint.used){
        a = bint;
        b = this;
    } else {
        a = this;
        b = bint;
    }
    ret.dp = new Array(b.used);
    for (i = 0; i < b.used; i++) {
        ret.dp[i] = a.dp[i] ^ b.dp[i];
    }
    for (; i < a.used; i++) {
        ret.dp[i] = a.dp[i];
    }
    ret.used = a.used;
    ret.clamp();
    return ret;
};

// all single bit manipulators are zero based
Bigint.prototype.getBit = function(n) {
    var digit = this.dp[Math.floor(n / MP_DIGIT_BIT)];
    return ((digit >>> ((n % MP_DIGIT_BIT))) & 1);
};

Bigint.prototype.setBit = function(n) {
    this.dp[Math.floor(n / MP_DIGIT_BIT)] |= (1 << (n % MP_DIGIT_BIT));
};

Bigint.prototype.flipBit = function(n) {
    this.dp[Math.floor(n / MP_DIGIT_BIT)] ^= (1 << (n % MP_DIGIT_BIT));
};

Bigint.prototype.clearBit = function(n) {
    this.dp[Math.floor(n / MP_DIGIT_BIT)] &= ~(1 << (n % MP_DIGIT_BIT));
};













