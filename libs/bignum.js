"use strict";

/*
    Errors found by an unbridled eslint are mostly intentionally (e.g.: "=="
    instead of "===") but should be checked carefully nevertheless.

    The command

  eslint --rule "no-unused-vars:0, no-console:0, quotes:0, new-cap:0, no-empty:0, no-spaced-func:0, no-cond-assign:0, no-constant-condition:0, no-underscore-dangle:0, eqeqeq:0, camelcase:0, no-extend-native:0, yoda:0, eol-last:0, global-strict:0"  bignum.js

    will result in the following output (linenumbers may change)

   250:21  error  'DataView' is not defined                  no-undef
   303:19  error  'console' is not defined                   no-undef
   304:12  error  'console' is not defined                   no-undef
   306:19  error  'alert' is not defined                     no-undef
   246:11  error  MP_L1_SIZE was used before it was defined  no-use-before-define
  2330:17  error  div2n1n was used before it was defined     no-use-before-define
  2361:13  error  div3n2n was used before it was defined     no-use-before-define
  2366:13  error  div3n2n was used before it was defined     no-use-before-define

    The reasons for occuring and/or the reasons for ignoring:

  205:21 typed arrays are not in ECMAScript 5.1 but implemented everywhere
  303:19 we check if something is defined, so it is possible it wasn't defined
  304:12 in the first place
  306:19    -"-
  246:11 basically the same as above
 2330:17     _"_
 2361:13     _"_
 2366:13     _"_

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
/**
 Preallocated length of bitarray. Probably unnecessary, may be removed in the
 future. Or not if and when typed arrays gets used instead of normal ones.
 The latter is unlikely until no function like realloc or similar allow for
 dynamic growth of the buffer.
 @memberof Bigint
 @const {number}
 @default
*/
var MP_PREC = 5;
/**
   Flag for positive value
   @const {number}
   @default
*/
var MP_ZPOS = 1;
/**
   Flag for negative value
   @const {number}
   @default
*/
var MP_NEG = -1;

/**
   Largest integer possible with native number
   @const {number}
   @default
*/
var MP_LONG_MAX = 9007199254740992;
/**
   Smallest integer possible with native number
   @const {number}
   @default
*/
var MP_LONG_MIN = -9007199254740992;
/**
   Largest 32-bit integer (e.g.: for boolean operations)
   @const {number}
   @default
*/
var MP_INT_MAX = 0xffffffff;
/**
   Smallest 32-bit integer (e.g.: for boolean operations)
   @const {number}
   @default
*/
var MP_INT_MIN = -0xffffffff;

/**
   Comparing: value for less-than
   @const {number}
   @default
*/
var MP_LT = -1;
/**
   Comparing: value for equal
   @const {number}
   @default
*/
var MP_EQ = 0;
/**
   Comparing: value for greater-than
   @const {number}
   @default
*/
var MP_GT = 1;

/**
   Common Errors: no error
   @const {number}
   @default
*/
var MP_OKAY = 0;
/**
   Common Errors: Domain error (input wrong)
   @const {number}
   @default
*/
var MP_DOMAIN = -2;
/**
   Common Errors: range error
   @const {number}
   @default
*/
var MP_VAL = -3;
/**
   Common Errors: range error
   @const {number}
   @default
*/
var MP_RANGE = MP_VAL;
/**
   Common Errors: Function not supported (you may come back later?)
   @const {number}
   @default
*/
var MP_NOTSUP = -4;
/**
   Common Errors: Function not supported (you may come back later?)
   @const {number}
   @default
*/
var MP_NOSYS = MP_NOTSUP;
// Value too large for something to be specified elsewhere
/**
   Common Errors: Overflow
   @const {number}
   @default
*/
var MP_OVERFLOW = -5;
/**
   Common Errors: Underflow
   @const {number}
   @default
*/
var MP_UNDERFLOW = -6;
/**
   Common Errors: total loss of significance
   @const {number}
   @default
*/
var MP_TLOSS = -7;
/**
   Common Errors: partial loss of significance
   @const {number}
   @default
*/
var MP_PLOSS = -8;
/**
   Common Errors: Pole error (singularity)
   @const {number}
   @default
*/
var MP_SING = -9;

// A bit of Bool
/**
   An alias for true
   @const {bool}
   @default
*/
var MP_YES = true;
/**
   An alias for false
   @const {bool}
   @default
*/
var MP_NO = false;

/**
   Cut-Off values: Karatsuba multiplication
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var KARATSUBA_MUL_CUTOFF = 125;
/**
   Cut-Off values: Karatsuba squaring
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var KARATSUBA_SQR_CUTOFF = 200;
/**
   Cut-Off values: Toom-Cook 3-way multiplication
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var TOOM_COOK_MUL_CUTOFF = 475;
/**
   Cut-Off values: Toom-Cook 3-way squaring
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var TOOM_COOK_SQR_CUTOFF = 600;

/**
   Cut-Off values: FFT-multiplication
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var FFT_MUL_CUTOFF = 4096;
// do one karatsuba mul. if limit is reached
// 2^23 is below limit and still 8,388,608 limbs large which is > 10^(10^14)
/**
   Cut-Off values: Upper limit of rounding errors for FFT. It will do one round
   of Karatusba to reduce the individual sizes.
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var FFT_UPPER_LIMIT = 1 << 23; // only if NTT is not implemented
/**
   Cut-Off values: FFT-squaring
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var FFT_SQR_CUTOFF = 2048;


/*
var NTT_MUL_CUTOFF;
var NTT_SQR_CUTOFF;

var TOOM_COOK_4_MUL_CO;
var TOOM_COOK_4_SQR_CO;

var TOOM_COOK_5_MUL_CO;
var TOOM_COOK_5_SQR_CO;
*/

// all limits are in limbs exept when indicated differently

// Burnikel-Ziegel division (divide&conquer taken literally)
/**
   Cut-Off values: Burnikel-Ziegel division<br>
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var BURN_ZIEG_NUMERATOR = 500;
/**
   Cut-Off values: Burnikel-Ziegel division<br>
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var BURN_ZIEG_DENOMINATOR = 300;
/**
   Cut-Off values: Burnikel-Ziegel division, when to do the normal division
   instead of recursing (value in bits)<br>
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var BURN_ZIEG_CUTOFF = 3000;

// for N<=2*D size of numerator, size of denominator otherwise
// Reason: Barrett-division works only with multiplication faster than
// O(n^2) in theory, in praxi it needs the O(n^1.465) of Toom-Cook 3-way, 2-way
// does not seem fast enough
// TODO: find the bug
/**
  @ignore
*/
var BARRETT_NUMERATOR = 3800000; // was 3800
/**
  @ignore
*/
var BARRETT_DENOMINATOR = 1900000; // was 1900
// when to do some rounds of Newton-Raphson to refine mu (the reciprocal) for
// Barrett-division
/**
  @ignore
*/
var BARRETT_NEWTON_CUTOFF = 100;
/**
   Cut-Off values: Division by multiplication with reciprocal (simple Newton-Raphson)
   These are the ranges where the steps of FFT multiplication can influence
   some specific cutoffs values. Truncated FFT is planned but not yet implemented.<br>
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var NEWTON_NUMERATOR = 8000;
/**
   Cut-Off values: Division by multiplication with reciprocal (simple Newton-Raphson)
These are the ranges where the steps of FFT multiplication can influence
 some specific cutoffs values. Truncated FFT is planned but not yet implemented.<br>
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var NEWTON_DENOMINATOR = 4000;
/**
   Cut-Off values: Division by multiplication with reciprocal (simple Newton-Raphson)
   A reasonabel general cutoff if the k of N=k*D is not too large
These are the ranges where the steps of FFT multiplication can influence
 some specific cutoffs values. Truncated FFT is planned but not yet implemented.<br>
   (YMMV. Please send a note if it varies)
 @memberof Bigint
   @const {number}
   @default
*/
var NEWTON_CUTOFF = 77000; // >2 mio bits


// Bits per digit. See below for details
/**
   Bits per digit<br>
   Some of the functions rely on this constant being set to 26, the default value,
   so if you want to change it, look them up.
   @const {number}
   @default
*/
var MP_DIGIT_BIT = 26;
// Digit mask (e.g.: 0x3fffffff for 30 bit long digits)
/**
   Digit mask
   @const {number}
   @default
*/
var MP_MASK = ((1 << MP_DIGIT_BIT) - 1);
// Too large a digit by one. (radix)
/**
   Size of radix (limb)
   @const {number}
   @default
*/
var MP_DIGIT_MAX = (1 << MP_DIGIT_BIT);


// half digits needed for FFT multiplication
/**
   Half digits needed for FFT multiplication<br>
   Half of the number of digit bits
 @memberof Bigint
   @const {number}
   @default
*/
var MP_HALF_DIGIT_BIT = (MP_DIGIT_BIT >> 1);
/**
   Half digits needed for FFT multiplication<br>
   Half of the size of the radix
 @memberof Bigint
   @const {number}
   @default
*/
var MP_HALF_DIGIT = (1 << MP_HALF_DIGIT_BIT);
/**
   Half digits needed for FFT multiplication<br>
   Half of the size of the digit mask
 @memberof Bigint
   @const {number}
   @default
*/
var MP_HALF_DIGIT_MASK = (MP_HALF_DIGIT - 1);

if (typeof MP_L1_SIZE === 'undefined') {
    /**
       Used in FFT code

      The size of the L1-cache in bytes. The number here is that of the data cache
      part of an AMD Duron. The Linux kernel gives a lot of information e.g.:
      <pre>
        grep . /sys/devices/system/cpu/cpu0/cache/index
      </pre>
      There is also lscpu(1) wich is easier to use.
      On Windows:
        {@link http://msdn.microsoft.com/en-us/library/ms683194.aspx}<br>
        {@link http://www.cpuid.com/softwares/cpu-z.htm}<br>
      Lack of access to a Mac leaves that part blank. The new MacOS is based on BSD,
      so 'dmesg' might work or
      <pre>
        cat /var/run/dmesg.boot | grep CPU
      </pre>
      If in doubt leave the value as it is but give 32 kib (32768) at least a try.

       @memberof Bigint
       @const  {number}
       @default
    */

    var MP_L1_SIZE = 65536;
}
/**
   Memory for some of the bit-juggling below: an 8 (eight) byte buffer
   @const {object}
   @default
*/
var double_int = new DataView(new ArrayBuffer(8));

/**
   Modular multiplicative inverse of 3 (three) for exactDiv3.<br>
   Has no default value because of the different possible sizes of the limb
 @memberof Bigint
   @const {Bigint}
*/
var MOD_MUL_INV_THREE;
/**
   Half of the modular multiplicative inverse of 3 (three) for exactDiv3.<br>
   Has no default because of the different possible sizes of the limb
 @memberof Bigint
   @const {Bigint}
   @default
*/
var MOD_MUL_INV_THREE_HALF;

/**
  checking for endianess (little endian only for now)

  The method (shamelessly stolen from emscripten) is a bit more complicated than
  I want it but things like
<pre>
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
</pre>
  are a bit dubious ("test" needs to act like an unsigned 32 bit integer. Does
  it? Always?), so I've chosen the long and tedious but hopefully correct way.
<br>
  Throws a FatalError which you may or may not want to catch.
<br>
  It seems as if the endianess of typed arrays gets fixed in the next ECMAScript
  standard to big-endian. But only them.

  @throws {FatalError}
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
            alert(e.message);
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

/**
   Generalized, extendable "typeof" function. Please see the source for how to add
   more objects.
   @param {*} obj just anything
   @return {string} lowercase'd name of input
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
            /* 
               Or try using something like
                   var list = {
                       "bigint": "Bigint",
                       "bigfloat": "Bigfloat",
                       "bigrational": "Bigrational",
                       "complex": "Complex"
                  };

              and then, in the loop, do:

                  if (obj instanceof eval(list[p])) {
                       return p;
                  }

              But the people say: "Eval is evil!", so it is most probably not
              a good idea.
            */
            var list = {
                "bigint": Bigint/*,
                "bigfloat":Bigfloat,
                "bigrational":Bigrational
                "complex": Complex*/
            };
            for (var p in list) {
                if (obj instanceof list[p]) {
                    return p;
                }
            }
            return "object";
        }
    }
}
    /**
      A primesieve, full implementation.
      @see {@link https://github.com/czurnieden/primesieve/} for a full
      description.
      @namespace primesieve
    */
var primesieve = (function() {
    /**
       Basket for the easier return of the functions of this module
       @memberof primesieve
       @private
    */
    var Primesieve = {};
    /**
       Real size of the sieve in bits.
       @memberof primesieve
       @private
    */
    var primelimit = 0;
    /**
       Buffer for the <code>ArrayBuffer</code>
       @memberof primesieve
       @private
    */
    var buffer;
    /**
       The actual sieve.
       @memberof primesieve
       @private
    */
    var primesieve;
    /**
       The guard limit of the primesieve.
       @memberof primesieve
       @constant  {number}
       @default
       @see raiseLimit
    */
    var primesizelimit = 0x800000; // 1 megabyte
    /**
       This sieve works with normal Araays, too
       @memberof primesieve
       @private
    */
    if (typeof Uint32Array === 'undefined') {
        Uint32Array = Array;
        ArrayBuffer = function() {
            return 0;
        };
    }
    /**
       30*log(113)/113 see also {@link http://oeis.org/A209883 }
       @memberof primesieve
       @private
    */
    var LN_113 = 1.25505871293247979696870747618124469168920275806274;
    /**
       Rosser, J. B. and Schoenfeld, L. <i>Approximate Formulas for Some
       Functions of Prime Numbers.</i> Illinois J. Math. 6, 64-97, 1962
       {@link http://projecteuclid.org/DPubS?service=UI&version=1.0&verb=Display&handle=euclid.ijm/1255631807 }
       @memberof primesieve
       @param {number} limit upper limit of search
       @return {number} Approximation of p(limit)
       @see primesieve.approx_limit
       @private
    */
    var approx_pi = function(limit) {
        // Math.ceil(5*x/(4*Math.log(x))) // would be more exact for large x
        return Math.ceil((LN_113 * limit) / Math.log(limit)) + 2;
    };
    /**
       Upper limit of pi(x). Uses expansion of li(x)-li(2)
       @param {number} limit upper limit of search
       @return {number} Approximation of p(limit)
       @see primesieve.approx_pi
       @memberof primesieve
       @private
    */
    var approx_limit = function(prime_pi) {
        if (prime_pi < 10) {
            return 30;
        }
        // see first term of expansion of li(x)-li(2)
        return Math.ceil(prime_pi * (Math.log(prime_pi * Math.log(
            prime_pi))));
    };
    /**
       Checks if the given argument is a fitting integer
       @memberof primesieve
       @param {number} x an ECMAScript conforming number
       @return {bool}
       @private
    */
    var isInt = function(x) {
        if (isNaN(x)) {
            return false;
        }
        if (x > -9007199254740992 && x < 9007199254740992 && Math.floor(
                x) == x) {
            return true;
        }
    };
    /**
       Clear bit (set to zero) at given position
       @memberof primesieve
       @param {number} where position of the bit
       @private
    */
    var clear = function(where) {
        primesieve[where >>> 5] &= ~((1 << (31 - (where & 31))));
    };
    /**
       Get value of bit at given position
       @memberof primesieve
       @param {number} where position of the bit
       @return {number} value of bit at given position
       @private
    */
    var get = function(where) {
        return ((primesieve[where >>> 5] >>> ((31 - (where & 31)))) &
            1);
    };
    /**
       Get value next set (value = 1) bit from given position
       @memberof primesieve
       @param {number} where position of the start
       @return {number} position of next set bit or -1
       @private
    */
    var nextset = function(from) {
        while (from < primelimit && !get(from)) {
            from++;
        }
        if (from === primelimit && !get(from)) {
            return -1;
        }
        return from;
    };
    /**
       Get value previous set (value = 1) bit from given position
       @memberof primesieve
       @param {number} where position of the start
       @return {number} position of previous set bit or -1
       @private
    */
    var prevset = function(from) {
        while (from >= 0 && !get(from)) {
            from--;
        }
        if (from == 0 && !get(from)) {
            return -1;
        }
        return from;
    };
    /**
       Fill the primesieve.
       @memberof primesieve
       @param {number} n length of sieve. Maximum available prime is smaller or
                         equal to this argument
       @private
    */
    var fillsieve = function(n) {
        var k, r, j;
        n = n + 1;
        primelimit = n - 1;
        k = Math.ceil(n / 32);
        if (typeof ArrayBuffer !== "function") {
            buffer = new ArrayBuffer(k * 4);
        } else {
            buffer = k;
        }
        primesieve = new Uint32Array(buffer);
        while (k--) {
            primesieve[k] = 0xffffffff;
        }
        clear(0);
        clear(1);
        for (k = 4; k < n; k += 2) {
            clear(k);
        }
        r = Math.floor(Math.sqrt(n));
        k = 0;
        while (k < n) {
            k = nextset(k + 1);
            if (k > r || k < 0) {
                break;
            }
            for (j = k * k; j < n; j += 2 * k) {
                clear(j);
            }
        }
    };
    /**
       Error value for success/no error
       @memberof primesieve
       @constant {number}
       @default
       @private
    */
    var E_SUCCESS = 0;
    /**
       Error value for "not an integer"
       @memberof primesieve
       @constant {number}
       @default
       @private
    */
    var E_ARG_NO_INT = 1;
    /**
       Error value for "Argument given is too low"
       @memberof primesieve
       @constant {number}
       @default
       @private
    */
    var E_ARG_TOO_LOW = 2;
    /**
       Error value for "Argument given is too high"
       @memberof primesieve
       @constant {number}
       @default
       @private
    */
    var E_ARG_TOO_HIGH = 3;
    /**
       Error value for "above guard limit"
       @memberof primesieve
       @constant {number}
       @default 
       @private
       @see raiseLimit
    */
    var E_ABOVE_LIMIT = 4;
    /**
       Variable to hold error number
       @alias error
       @memberof primesieve
       @constant {number}
       @default
    */
    Primesieve.error = 0;
    /**
       Function to convert an error number into a human readable string
       @alias strerror
       @memberof primesieve
       @return {string} Summary of the error
    */
    Primesieve.strerror = function() {
        var strerrors = [
            "Success",
            "Argument not an integer",
            "Argument too low",
            "Argument too high",
            "Prime wanted is higher than the limit ",
            "Unknown error"
        ];
        var e = Primesieve.error;
        if (e == 0) {
            return strerrors[0];
        }
        if (e < 0 || e > strerrors.length - 1) {
            return strerrors[strerrors.length - 1];
        }
        if (e == E_ABOVE_LIMIT) {
            return strerrors[E_ABOVE_LIMIT] + primesizelimit;
        } else {
            return strerrors[e];
        }
    };
    /**
       Checks if the given number is a prime
       @alias isSmallPrime
       @memberof primesieve
       @param {number} prime positive small integer
       @return {bool} or undefined in case of an error
    */
    Primesieve.isSmallPrime = function(prime) {
        if (!isInt(prime)) {
            Primesieve.error = E_ARG_NO_INT;
            return undefined;
        } else if (prime < 2) {
            Primesieve.error = E_ARG_TOO_LOW;
            return undefined;
        }
        if (prime > primelimit) {
            Primesieve.grow(prime + 100);
            if (Primesieve.error == E_ABOVE_LIMIT) {
                return undefined;
            }
        }
        Primesieve.error = E_SUCCESS;
        if (get(prime) == 1) {
            return true;
        }
        return false;
    };
    /**
       Returns prime greater than argument
       @alias nextPrime
       @memberof primesieve
       @param {number} prime positive small integer
       @return {number} Next prime or undefined in case of an error
    */
    Primesieve.nextPrime = function(prime) {
        if (!isInt(prime)) {
            Primesieve.error = E_ARG_NO_INT;
            return undefined;
        }
        if (prime < 0) {
            return 2;
        }
        if (prime > primelimit) {
            Primesieve.grow(prime + 100);
            if (Primesieve.error == E_ABOVE_LIMIT) {
                return undefined;
            }
        }
        Primesieve.error = E_SUCCESS;
        return nextset(prime);
    };
    /**
       Returns prime greater than argument
       @alias precPrime
       @memberof primesieve
       @param {number} prime positive small integer
       @return {number} Preceding prime or undefined in case of an error
    */
    Primesieve.precPrime = function(prime) {
        if (!isInt(prime)) {
            Primesieve.error = E_ARG_NO_INT;
            return undefined;
        } else if (prime < 2) {
            Primesieve.error = E_ARG_TOO_LOW;
            return undefined;
        }
        if (prime > primelimit) {
            Primesieve.grow(prime + 100);
            if (Primesieve.error == E_ABOVE_LIMIT) {
                return undefined;
            }
        }
        Primesieve.error = E_SUCCESS;
        return prevset(prime);
    };
    /**
       Number of primes up to argument (counts primes in sieve)
       @alias primePi
       @memberof primesieve
       @param {number} prime positive small integer
       @return {number} Number of primes or undefined in case of an error
    */
    Primesieve.primePi = function(prime) {
        var k = 0;
        var ct = 0;

        if (!isInt(prime)) {
            Primesieve.error = E_ARG_NO_INT;
            return undefined;
        } else if (prime < 2) {
            Primesieve.error = E_ARG_TOO_LOW;
            return undefined;
        }

        if (prime > primelimit) {
            Primesieve.grow(prime + 100);
            if (Primesieve.error == E_ABOVE_LIMIT) {
                return undefined;
            }
        }
        while (k < prime) {
            k = nextset(k + 1);
            if (k > primelimit || k < 0 || k > prime) {
                break;
            }
            ct++;
        }
        Primesieve.error = E_SUCCESS;
        return ct;
    };
    /**
       Number of primes up to argument (approximation independant of sieve)
       @alias primePiApprox
       @memberof primesieve
       @param {number} prime positive small integer
       @return {number} Number of primes or undefined in case of an error
    */
    Primesieve.primePiApprox = function(prime) {
        if (!isInt(prime)) {
            Primesieve.error = E_ARG_NO_INT;
            return undefined;
        } else if (prime < 2) {
            Primesieve.error = E_ARG_TOO_LOW;
            return undefined;
        }
        Primesieve.error = E_SUCCESS;
        return approx_pi(prime);
    };
    /**
       Produces an Array holding all primes between <code>low</code> and <code>high</code>
       @alias primeRange
       @memberof primesieve
       @param {number} low positive small integer
       @param {number} high positive small integer
       @return {array} Primes between <code>low</code> and <code>high</code> or
                       undefined in case of an error
    */
    Primesieve.primeRange = function(low, high) {
        var down = 0,
            up = 0,
            ret = [],
            i = 1;

        if (!isInt(low) || !isInt(high)) {
            Primesieve.error = E_ARG_NO_INT;
            return undefined;
        } else if (low < 0) {
            Primesieve.error = E_ARG_TOO_LOW;
            return undefined;
        } else if (low > high) {
            /* try again, maybe just a fluke */
            return Primesieve.primeRange(high, low);
        }

        if (primelimit < high) {
            Primesieve.grow(high + 100);
            if (Primesieve.error == E_ABOVE_LIMIT) {
                return undefined;
            }
        }
        down = nextset(low);
        up = prevset(high);
        ret[0] = down;
        if (down == up) {
            return ret;
        }
        while (down < up) {
            down = nextset(down + 1);
            if (down > high || down < 0) {
                break;
            }
            ret[i++] = down;
        }
        Primesieve.error = E_SUCCESS;
        return ret;
    };
    /**
       Produces an Array with the primes between zero and the given argument
       @alias primes
       @memberof primesieve
       @param {number} prime positive small integer
       @return {array} Primes between zero and the given argument
    */
    Primesieve.primes = function(prime) {
        var ret, k, count, limit, i;
        limit = approx_limit(prime);

        if (!isInt(prime)) {
            Primesieve.error = E_ARG_NO_INT;
            return undefined;
        } else if (prime < 2) {
            Primesieve.error = E_ARG_TOO_LOW;
            return undefined;
        }

        if (primelimit < limit) {
            Primesieve.grow(limit);
            if (Primesieve.error == E_ABOVE_LIMIT) {
                return undefined;
            }
        }
        ret = [];
        k = 0;
        i = 0;
        count = prime;
        while (count--) {
            k = nextset(k + 1);
            if (k > primelimit || k < 0) {
                break;
            }
            ret[i++] = k;
        }
        Primesieve.error = E_SUCCESS;
        return ret;
    };
    /**
       Grows the sieve to the size given by the argument. Does not reduce the size
       or increment the sieve, it just produces a new sieve of the given size.
       @alias grow
       @memberof primesieve
       @param {number} alot positive small integer
       @return {bool} undefined in case of an error
       @see primesieve.raiseLimit
    */
    Primesieve.grow = function(alot) {
        if (!isInt(alot)) {
            Primesieve.error = E_ARG_NO_INT;
            return undefined;
        } else if (alot < 2) {
            Primesieve.error = E_ARG_TOO_LOW;
            return undefined;
        } else if (alot > primesizelimit) {
            Primesieve.error = E_ABOVE_LIMIT;
            return undefined;
        } else if (alot > primelimit) {
            Primesieve.error = E_SUCCESS;
            fillsieve(alot);
            return true;
        }
        /* else {
                   Do nothing for now
                }*/
    };
    /**
       Grows the sieve to the size given by the argument. Does not reduce the size
       or increment the sieve, it just produces a new sieve of the given size.
       @alias fill
       @memberof primesieve
       @param {number} alot positive small integer
       @return {bool} undefined in case of an error
       @see raiseLimit
       @see primesieve.grow
    */
    Primesieve.fill = Primesieve.grow;
    /**
       To avoid unexpected surprises this primesieve has an in-build limit for
       the size of the primesieve of one megabyte. Does not lower the limit.
       @alias raiseLimit
       @memberof primesieve
       @param {number} raise size of the new maximum in bits
       @return {bool} undefined in case of an error
    */
    Primesieve.raiseLimit = function(raise) {
        if (!isInt(raise)) {
            Primesieve.error = E_ARG_NO_INT;
            return undefined;
        } else if (raise < 2) {
            Primesieve.error = E_ARG_TOO_LOW;
            return undefined;
        } else if (raise > primesizelimit) {
            Primesieve.error = E_SUCCESS;
            primesizelimit = raise;
            return true;
        }
    };
    /**
       Returns the raw prime-sieve. It might be an <code>Array</code> or a
       <code>TypedArray</code>, so please check before use.
       @alias sieve
       @memberof primesieve
       @return {primesieve} the raw primesieve
    */
    Primesieve.sieve = function() {
        return primesieve;
    };
    return Primesieve;
})( /* You may place a start-size here */ );

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = primesieve;
} else {
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return primesieve;
        });
    } else {
        window.primesieve = primesieve;
    }
}


/**
Computes iteration steps for e.g. Newton-Raphson.
"stepsize" is the length of the steps and a multiplicator.
For example stepsize=2 for quadratic convergences (Newton), stepsize=3
for cubic ones (Housholder), etc.
Yep, just like the similarily named Python function
@param start precision at start
@param end precision at end
@param stepsize size of steps (e.g.: 2 for quadratic, 3 for cubic convergences and so on)
@return {array} an Array with a list of the precisions
*/
function computeGiantsteps(start, end, stepsize) {
    var ret = [end],
        i = 1;
    if (arguments.length != 3) {
        return MP_VAL;
    }
    while (true) {
        if (ret[ret.length - 1] <= start * stepsize) {
            break;
        }
        ret[i++] = Math.floor(ret[ret.length - 1] / stepsize) + 2;
    }
    return ret.reverse();
}

/*
 * All functions implemented by prototyping to avoid name-clashes
 * E.g.: there is a Number.isNaN but no Number.prototype.isNaN
 * but mainly to support a common codebase, such that it will not matter if the
 * variable A in A.isNaN() is a Bigint, a Number, a Bigfloat, or anything else.
 */

/**
   The built-in Number object.
   @external Number
 */

/**
   The built-in String object.
   @external String
 */

/**
  Checks if the number is not a number.<br>
  <strong>Caution:</strong> uses the global object which auto-converts numbers!
  @function external:Number#isNaN
  @return {bool}
*/
Number.prototype.isNaN = function() {
    return isNaN(this);
};
// Does not use the new Number.isFinite for reasons layed down
// in blog post TODO: look-up URL of aforementioned blog post
/**
  Checks if the number is finite.
  @function external:Number#isFinite
  @return {bool}
*/
Number.prototype.isFinite = function() {
    if (isNaN(this) || this === Infinity || this === -Infinity) {
        return false;
    }
    return true;
};
/**
  Checks if the number is even.
  <strong>Caution:</strong> will return inexact results for numbers > 2<sup>53</sup>
  @function external:Number#isEven
  @return {bool}
*/
Number.prototype.isEven = function() {
    if (Math.abs(this) > 0x1fffffffffffff) {
        return MP_RANGE;
    }
    return (this % 2 == 0);
};
/**
  Checks if the number is odd.
  <strong>Caution:</strong> will return inexact results for numbers > 2<sup>53</sup>
  @function external:Number#isOdd
  @return {bool}
*/
Number.prototype.isOdd = function() {
    if (Math.abs(this) > 0x1fffffffffffff) {
        return MP_RANGE;
    }
    return (this % 2 == 1);
};
//TODO: check for exceptions (NaN, Inf)
/**
  Returns the sign of the number
  @function external:Number#sign
  @return {number}
*/
Number.prototype.sign = function() {
    return (this < 0) ? MP_NEG : MP_ZPOS;
};

/*
 *  Most of the following functions assume 32-bit little-endian integers.
 */
/**
  Look for the the power of two bigger than the number
  @function external:Number#nextPow2
  @return {number} 2<sup>x</sup>&gt; <code>this</code>
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
/**
  Lowest bit set (zero based counting)
  @function external:Number#lowBit
  @return {number}
*/
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

/**
  Highest bit set (zero based counting).
  @see {@link http://graphics.stanford.edu/~seander/bithacks.html}
  @function external:Number#highBit
  @return {number}
*/
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
/**
  Checks if <code>this</code> is a power of 2 (two)
  @function external:Number#isPow2
  @param {number} b must be smaller than 2<sup>32</sup>
  @return {bool}
*/
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
/**
  Reverses the characters in a string.
  <strong>Caution:</strong> Despite common opinion, this function is not generally applicable, the
 name should give a hint!
  @function external:String#asciireverse
  @return {string}
*/
String.prototype.asciireverse = function() {
    return this.split('').reverse().join('');
};

// written for isOk() but not (yet?) used
/**
  Checks if <code>this</code> is a subnormal (denormal) number
  @function external:Number#isSubnormal
  @return {bool}
*/
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
/**
  Checks if <code>this</code> is NaN according to IEEE-754. This code is licensed under the
  SunPro license listed near the top of this file.<br>
  This function is not yet used.
  @function external:Number#ieee_754_isNaN
  @license SunPro
  @return {bool}
*/
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
/**
  Checks if the number is a proper number and finite, too.
  @function external:Number#isOk
  @return {bool}
*/
Number.prototype.isOk = function() {
    return (!this.isNaN() && this.isFinite()) ? MP_YES : MP_NO;
};
/**
  Checks if the number is a proper small integer.
  @function external:Number#isInt
  @return {bool}
*/
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

/**
  Checks if the number fits into one limb
  @function external:Number#issmallenough
  @return {bool}
*/
Number.prototype.issmallenough = function() {
    if (!this.isInt() || (Math.abs(this) >= MP_DIGIT_MAX)) {
        return false;
    }
    return true;
};

/**
  Number of Bits set (Hamming weight)<br>
  {@link  http://graphics.stanford.edu/~seander/bithacks.html}
  @function external:Number#setBits
  @return {number}
*/
Number.prototype.setBits = function() {
    if (this == 0) {
        return 0;
    }
    var x = this >>> 0;
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
};

/**
  Calculate multiplicative modular inverse (for exactDiv3)
  @function external:Number#modInv
  @param {number} m modulus
  @return {number}
*/
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
/**
  Absolute value
  @function external:Number#abs
  @return {number} absolute value
*/
Number.prototype.abs = function() {
    return Math.abs(this);
};
/**
  GCD: greatest common divisor
  @function external:Number#gcd
  @param {number} n
  @return {number} gcd
*/
Number.prototype.gcd = function(n) {
    var x, y, g, temp;
    if (this.abs() > n.abs()) {
        return n.gcd(this);
    }
    x = Math.abs(this);
    y = Math.abs(n);
    if (x == 0 && y != 0) {
        return y;
    }
    if (x != 0 && y == 0) {
        return x;
    }
    if (x == 0 && y == 0) {
        return 0;
    }
    if (x == y) {
        return x;
    }
    if (x == 1 || n == 1) {
        return 1;
    }
    if (x == 2) {
        if (y.isOdd()) {
            return 1;
        }
        return 2;
    }
    g = 1;
    if (x > MP_INT_MAX || y > MP_INT_MAX) {
        while (x.isEven() && y.isEven()) {
            x = Math.floor(x / 2);
            y = Math.floor(y / 2);
            g = Math.floor(g * 2);
        }
        while (x != 0) {
            while (x.isEven()) {
                x = Math.floor(x / 2);
            }
            while (y.isEven()) {
                y = Math.floor(y / 2);
            }
            temp = Math.floor(Math.abs(x - y) / 2);
            if (x >= y) {
                x = temp;
            } else {
                y = temp;
            }
        }
        return (g * y);
    } else {
        while (!(x & 1) && !(y & 1)) {
            x = x >>> 1;
            y = y >>> 1;
            g = g << 1;
        }
        while (x != 0) {
            while (!(x & 1)) {
                x >>>= 1;
            }
            while (!(y & 1)) {
                y >>>= 1;
            }
            temp = Math.abs(x - y) >>> 1;
            if (x >= y) {
                x = temp;
            } else {
                y = temp;
            }
        }
        return (g * y);
    }
};

/**
  Constructor for the Bigint object.
  @constructor
  @param {number} n small integer &lt; 2<sup>MP_DIGIT_BIT</sup>
*/
function Bigint(n) {
        /**
           memory for limbs, preallocated to hold at least five limbs
        */
        this.dp = new Array(MP_PREC);
        // Set all to zero (keep it simpel)
        for (var i = this.dp.length - 1; i >= 0; i--) {
            this.dp[i] = 0 >>> 0;
        }
        /**
           number of limbs actually used
        */
        this.used = 1;
        // Allocated length of limb-array. Probably unnecessary, may be removed in
        // the future. On the other side, it is possible--depending on the javascript
        // interpreter--to offer the GC something to collect by tinkering with the
        // Array.length property.
        // I'll probably remove it and use this.dp.length instead.
        this.alloc = MP_PREC;
        /**
           sign of Bigint
        */
        this.sign = MP_ZPOS;

        // Allow for a small number to be set directly
        if (xtypeof(n) === 'number' && Math.abs(n) < MP_DIGIT_MAX) {
            this.dp[0] = Math.abs(n);
            this.sign = (n < 0) ? MP_NEG : MP_ZPOS;
        }
    }
    // Ones and zeros are always useful especially in binary arithmetic but
    // it is probably easier to do the "new Bigint(0)" directly
    //Bigint.ZERO = new Bigint(0);
    //Bigint.ONE = new Bigint(1);

/**
  We don't need an extra init() function since new Bigint() already does that,
  but we need something to clean up; the size of the Array holding the digits
  can get quite large and even a lot of small ones can sum up.
  <br>
  We cannot free the memory directly, we are only able to give the GC a change
  to do it for us.
  <br>
  This functions empties the Bigint only, to sacrifice it completely the
  variable must be set to 'undefined', too.<br>
  Example:
  <pre>
  tmp = new Bigint(0);
  // do some stuff with tmp
  // tmp got large but we'll do a lot of stuff after it in the same
  // scope and need to get rid of tmp
  tmp.free();
  tmp = undefined;
  </pre>
  @memberof Bigint
  @instance
*/
Bigint.prototype.free = function() {
    delete this.dp;
    delete this.used;
    delete this.alloc;
    delete this.sign;
};
/**
  Offer memory to GC but keep the rest for later use.
  @memberof Bigint
  @instance
*/
Bigint.prototype.clear = function() {
    this.dp = [0 >>> 0];
    this.used = 1;
    this.alloc = 1;
    this.sign = MP_ZPOS;
};
/**
  Set to zero and offer memory to GC
  @memberof Bigint
  @instance
*/
Bigint.prototype.toZero() = function() {
    this.clear();
};
/*
   Add "n" numbers of zeros to the MSB side aka preallocate more memory.
   Probably faster then the engines heuristics for growing an Array.
   Does *not* set this.used!
*/
/**
   Add "n" numbers of zeros to the MSB side aka preallocate more memory.
   Probably faster then the engines heuristics for growing an Array.
   Does not set <code>this.used</code>!
  @memberof Bigint
  @instance
  @param {number} n number of limbs added
  @return {number} length of new limb-array
*/
Bigint.prototype.grow = function(n) {
    //checks & balances
    var t = [];
    while (n--) {
        t[n] = 0 >>> 0;
    }
    this.dp = this.dp.concat(t);
    return (this.dp.length);
};

// avoid mess
/**
  Clamps off leading zeros to give the GC a chance to clean up.
  @memberof Bigint
  @instance
*/
Bigint.prototype.clamp = function() {
    while (this.used > 1 && (this.dp[this.used - 1] == 0 || isNaN(this.dp[
            this.used - 1]))) {
        this.used--;
    }
    // this may keep the whole array allocated, at least for some time.
    this.dp.length = this.used;
    this.alloc = this.used;
};

/**
  Sign
  @memberof Bigint
  @instance
  @return {number} sign
*/
Bigint.prototype.sign = function() {
    return this.sign;
};

// print all four bytes even if zero (little endian). toString(16) does not
// do that
/**
  Print all four bytes even if they are zero (little endian).<br>
  <code>toString(16)</code> does not do that.
  @function external:Number#toHex32
  @param {*} uppercase returns uppercase string if any argument has been given
  @return {string}
*/
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
/**
   Radix for <code>Bigdecimal</code>
 @memberof Bigdecimal
   @constant {number}
   @default
*/
var BIGDECIMAL_BASE = 10000000;
/**
   Logarithm base ten of radix of <code>Bigdecimal</code>
 @memberof Bigdecimal
   @constant {number}
   @default
*/
var BIGDECIMAL_LOG10_BASE = 7;
/**
   Rudimentary Bigdecimal for speeding up <code>a_bigint.toString()</code>
   @constructor
   @param {number} k small integer
*/
function Bigdecimal(k) {
        this.digits = [];
        this.sign = 1;
        this.used = 0;
        if (arguments.length != 0) {
            var n = arguments[0];
            if (n.isInt()) {
                if (n < BIGDECIMAL_BASE) {
                    this.digits[0] = n;
                    this.sign = n.sign();
                    this.used = 1;
                } else if (n < BIGDECIMAL_BASE * BIGDECIMAL_BASE) {
                    this.digits[0] = n % BIGDECIMAL_BASE;
                    this.digits[1] = Math.floor(n / BIGDECIMAL_BASE);
                    this.used = 2;
                } else {
                    this.digits[0] = n % BIGDECIMAL_BASE;
                    this.digits[1] = Math.floor(n / BIGDECIMAL_BASE);
                    this.digits[2] = Math.floor(this.digits[1] /
                        BIGDECIMAL_BASE) >>> 0;
                    this.digits[1] = (this.digits[1] % BIGDECIMAL_BASE) >>> 0;
                    this.used = 3;
                }
            }
        } else {
            this.digits[0] = 0;
        }
    }
    /**
      Clamps of leading zeros to give the GC a chance to clean up.
      @memberof Bigdecimal
      @instance
    */
Bigdecimal.prototype.clamp = function() {
    while (this.used > 1 && (this.digits[this.used - 1] == 0 || isNaN(this.digits[
            this.used - 1]))) {
        this.used--;
    }
    this.digits.length = this.used;
};
/**
  Copy <code>this</code>
  @return {Bigdecimal} a deep copy of <code>this</code>
  @memberof Bigdecimal
  @instance
*/
Bigdecimal.prototype.dup = function() {
    var copy = new Bigdecimal(0);
    if (this.used == 0) {
        return copy;
    }
    copy.digits = new Array(this.used);
    copy.sign = this.sign;
    copy.used = this.used;
    for (var i = 0; i < this.used; i++) {
        copy.digits[i] = this.digits[i];
    }
    return copy;
};
/**
  Checks if <code>this</code> is zero
  @memberof Bigdecimal
  @instance
  @return {bool}
*/
Bigdecimal.prototype.isZero = function() {
    if (this.used == 0 && this.sign == 1) {
        return true;
    }
    return false;
};
/**
  Checks if <code>this</code> is plus one
  @memberof Bigdecimal
  @instance
  @return {bool}
*/
Bigdecimal.prototype.isOne = function() {
    if (this.used == 1 && this.sign == 1 && this.digits[0] == 1) {
        return true;
    }
    return false;
};
/**
  Checks if <code>this</code> is plus two
  @memberof Bigdecimal
  @instance
  @return {bool}
*/
Bigint.prototype.isTwo = function() {
    if (this.sign == MP_ZPOS && this.used == 1 && this.dp[0] == 2) {
        return true;
    }
    return false;
};

Bigdecimal.ZERO = new Bigdecimal(0);
Bigdecimal.ONE = new Bigdecimal(1);
/**
  Absolute value
  @memberof Bigdecimal
  @instance
  @return {Bigdecimal} <code>abs(this)</code>
*/
Bigdecimal.prototype.abs = function() {
    var r = this.dup();
    r.sign = 1;
    return r;
};
/**
  Change sign of <code>this</code>
  @memberof Bigdecimal
  @instance
  @return {Bigdecimal} <code>-this</code>
*/
Bigdecimal.prototype.neg = function() {
    var r = this.dup();
    if (this.used == 0) {
        return r;
    }
    if (this.used == 1 && this.digits[0] == 0) {
        return r;
    }
    r.sign = this.sign * -1;
    return r;
};
/**
  Comparing with another <code>Bigdecimal</code>, magnitude only
  @memberof Bigdecimal
  @instance
  @param {Bigdecimal} bdec
  @private
*/
Bigdecimal.prototype.cmp_mag = function(bdec) {
    if (this.used > bdec.used) {
        return MP_GT;
    }
    if (this.used < bdec.used) {
        return MP_LT;
    }

    for (var i = this.used - 1; i >= 0; i--) {
        if (this.digits[i] > bdec.digits[i]) {
            return MP_GT;
        }
        if (this.digits[i] < bdec.digits[i]) {
            return MP_LT;
        }
    }
    return MP_EQ;
};
/**
  Comparing with another <code>Bigdecimal</code>
  @memberof Bigdecimal
  @instance
  @param {Bigdecimal} bdec
  @return {number}
*/
Bigdecimal.prototype.cmp = function(bdec) {
    if (this.sign > bdec.sign) {
        return MP_GT;
    }
    if (this.sign < bdec.sign) {
        return MP_LT;
    }
    if (this.sign < 0) {
        return bdec.cmp_mag(this);
    }
    return this.cmp_mag(bdec);
};
/**
  Converts the <code>Bigdecimal</code> into a string.
  @memberof Bigdecimal
  @instance
  @param {number} [radix=10] radix of the resulting string
  @return {string}
*/
Bigdecimal.prototype.toString = function() {
    var len = this.used - 1;
    var str = "";
    if (this.isZero()) {
        return "0";
    }
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
/**
  Lowlevel addition
  @memberof Bigdecimal
  @instance
  @param {Bigdecimal} bdec
  @return {Bigdecimal}
  @private
*/
Bigdecimal.prototype.lowlevel_add = function(bdec) {
    var t = this.digits;
    var tlen = this.used;

    var b = bdec.digits;
    var blen = bdec.used;
    var tblen = tlen + blen;

    var temp, carry = 0,
        i;
    var ret;
    if (tlen < blen) {
        return bdec.add(this);
    }
    ret = new Bigdecimal(0);
    ret.digits = [];
    while (tblen--) {
        ret.digits[tblen] = 0;
    }
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

    if (carry) {
        ret.digits[i] = carry;
    }
    ret.used = ret.digits.length;
    ret.clamp();
    return ret;
};

/**
  Addition
  @memberof Bigdecimal
  @instance
  @param {Bigdecimal} bdec
  @return {Bigdecimal}
*/
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
/**
  Lowlevel multiplication
  @memberof Bigdecimal
  @instance
  @param {Bigdecimal} bdec
  @return {Bigdecimal}
  @private
*/
Bigdecimal.prototype.lowlevel_mul = function(bdec) {
    var tsign = this.sign;
    var t = this.digits;
    var tlen = this.used;
    var bsign = bdec.sign;
    var b = bdec.digits;
    var blen = bdec.used;
    var ret = new Bigdecimal(0),
        retv, temp;
    var tblen = tlen + blen;
    var carry, i, j;

    //if(typeof bdec == 'number') return this.lowlevel_mulD(bdec);

    if (bdec.isZero()) {
        return ret;
    }
    if (bdec.isOne()) {
        return this.dup();
    }

    retv = [];
    while (tblen--) {
        retv[tblen] = 0;
    }

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
/**
  Multiplication
  @memberof Bigdecimal
  @instance
  @param {Bigdecimal} bdec
  @return {Bigdecimal}
*/
Bigdecimal.prototype.mul = function(bdec) {
    var r;
    if (this.cmp(bdec) == MP_LT) {
        r = bdec.lowlevel_mul(this);
    } else {
        r = this.lowlevel_mul(bdec);
    }
    r.sign = this.sign * bdec.sign;
    return r;
};

/**
  Converts the Bigint into a string.
  @memberof Bigint
  @instance
  @param {number} [radix=10] radix of the resulting string
  @return {string}
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
        if (current_length == 0) {
            s = t.dp[0].toString(16);
            return (sign < 0) ? "-" + s : s;
        } else if (current_length == 1) {
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


    // use the full available space a double offers
    if (radix == 10 && t.used > 20) {
        var out = new Bigdecimal(0);
        var base = new Bigdecimal(MP_DIGIT_MAX * MP_DIGIT_MAX);
        var digit;
        var limit = (t.used % 2 == 0) ? 0 : 1;
        for (i = t.used - 1; i > 0; i -= 2) {
            digit = new Bigdecimal(t.dp[i - 1] + (t.dp[i] * MP_DIGIT_MAX));
            out = out.mul(base);
            out = out.add(digit);
        }
        if (limit == 1) {
            digit = new Bigdecimal(t.dp[0]);
            out = out.mul(new Bigdecimal(MP_DIGIT_MAX));
            out = out.add(digit);
        }
        out.sign = this.sign;
        return out.toString();
    }

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

/**
  Conversion of a string to a Bigint.<br>
  More or less quite shamelessly stolen from libtommmath's mp_read_radix.<br>
  Does not make use of exponent given. No Prefixes (e.g. 0x, 0b, 0) allowed.
  @function external:String#toBigint
  @param {number} [radix=10] radix of the number given
  @return {Bigint}
*/
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

    // much faster version, needs Bigdecimal and some testing
    if (radix == 1000 && strlen > 70) {
        var i, j, k, tmp, astr;
        var rem = strlen % BIGDECIMAL_LOG10_BASE;
        for (i = 0; i < str.length - (rem + 1); i += BIGDECIMAL_LOG10_BASE) {
            tmp = 0;
            j = BIGDECIMAL_LOG10_BASE;
            while (j--) {
                tmp *= 10;
                tmp += str.charCodeAt(i + ((BIGDECIMAL_LOG10_BASE - 1) - j)) &
                    0xff - 48;
            }
            ret = ret.mulInt(BIGDECIMAL_BASE);
            if (tmp != 0) {
                ret = ret.addInt(tmp);
            }
        }
        if (rem) {
            tmp = 0;
            j = rem + 1;
            while (--j) {
                tmp *= 10;
                tmp += str.charCodeAt(i + (rem - j)) & 0xff - 48;
            }
            ret = ret.mulInt(Math.pow(10, rem - 1));
            if (tmp != 0) {
                ret = ret.addInt(tmp);
            }
        }
        ret.sign = neg;
        ret.clamp();
        return ret;
    }

    // left (high) to right (low)
    for (i = 0; i < strlen; i++) {
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

/**
  Converts a small integer into a {Bigint}
  Bigint might be set to Nan or Infinity if Number is
  not a small enough integer. Range: -9007199254740992..9007199254740992
  @function external:Number#toBigint
  @return {Bigint}
*/
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
    ret.dp[1] = Math.floor(temp / MP_DIGIT_MAX);
    // we might have one bit left-over
    if (ret.dp[1] > MP_MASK) {
        var t = ret.dp[1];
        ret.dp[1] &= MP_MASK;
        ret.dp[2] = Math.floor(t / MP_DIGIT_MAX) & MP_MASK;
    }

    ret.used = ret.dp.length;
    ret.clamp();
    return ret;
};

/**
  Checks if <code>this</code> has only one limb.
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.issmallenough = function() {
    // TODO: we can use two bigdigits if MP_DIGIT_BIT <= 26
    //       than change Bigint.prototype.toNumber accordingly
    if (this.used > 1) {
        return false;
    }
    return true;
};

/**
  Checks if <code>this</code> is a number and finite.
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isOk = function() {
    if (this.isNaN() || !this.isFinite()) {
        return false;
    }
    return true;
};
/**
  Converts a Bigint into anative number if possible
  @memberof Bigint
  @instance
  @return {number}
*/
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

/**
  Seed for PRNG<br>
  {@link http://burtleburtle.net/bob/rand/smallprng.html}
  @constant  {object}
  @default
  @private
*/
var __burtlerand_ax = {
    a: 0xf1ea5eed,
    b: 2 >>> 0,
    c: 3 >>> 0,
    d: 4 >>> 0
};
/**
  Actual PRNG.<br>
  {@link http://burtleburtle.net/bob/rand/smallprng.html}
  @param {number} [seed] optional seed
  @return {number} 32-bit integer
  @private
*/
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
/**
  Set <code>this</code> to a random number.
  Uses Bob Jenkins' small PRNG (with the extra round) listed at {@link burtle_rand}<br>
  Used instead of <code>Math.random</code> to get a well-known function with a good mix
  (good avalaunche values).<br>
  This works in-place!
  @memberof Bigint
  @instance
  @param {number} bits size of random number in bits; resulting number might be smaller!
  @param {number} [seed] a small integer, defaults to <code>Date.now()</code>
  @return {Bigint}
*/
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
    if (mod_mask > 0) {
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

/**
  Copy <code>this</code>
  @memberof Bigint
  @instance
  @return {Bigint} a deep copy of <code>this</code>
*/
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
/**
  Copy <code>this</code>
  @return {Bigint} a deep copy of <code>this</code>
  @memberof Bigint
  @instance
  @see Bigint.prototype.copy
*/
Bigint.prototype.dup = function() {
    return this.copy();
};

// swap with deep copy (probably)
/**
  Swap <code>this</code> with argument
  @memberof Bigint
  @instance
  @param {Bigint} target the Bigint to swap with
*/
Bigint.prototype.swap = function(target) {
    var tmp = target.copy();
    target = this.copy();
    var i = tmp.used;
    while (i--) {
        this.dp[i] = tmp.dp[i];
    }
    this.sign = tmp.sign;
    this.used = tmp.used;
    // "this" might have been larger, so set the limb after the last one to
    // zero
    this.dp[this.used] = 0 >>> 0;
    this.alloc = tmp.alloc;
    tmp.dp = null;
};
// swap with shallow copy (probably) unsure, don't use!
/**
  @ignore
*/
Bigint.prototype.exch = function(target) {
    var tmp = target;
    target = this;
    this.dp = tmp.dp;
    this.sign = tmp.sign;
    this.used = tmp.used;
    this.alloc = tmp.alloc;
};
/**
  Change sign of <code>this</code>
  @memberof Bigint
  @instance
  @return {Bigint} <code>-this</code>
*/
Bigint.prototype.neg = function() {
    var ret = this.copy();
    if (this.sign == MP_ZPOS) {
        ret.sign = MP_NEG;
    } else {
        ret.sign = MP_ZPOS;
    }
    return ret;
};
/**
  Absolute value
  @memberof Bigint
  @instance
  @return {Bigint} <code>this</code>
*/
Bigint.prototype.abs = function() {
    var ret = this.copy();
    if (this.sign == MP_NEG) {
        ret.sign = MP_ZPOS;
    }
    return ret;
};
/**
  Checks if <code>this</code> is zero
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isZero = function() {
    if (this.used == 1 && this.dp[0] == 0) {
        return MP_YES;
    }
    return MP_NO;
};
/**
  Checks if <code>this</code> is plus one
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isOne = function() {
    if (this.used == 1 && this.sign == MP_ZPOS && this.dp[0] == 1) {
        return MP_YES;
    }
    return MP_NO;
};
/**
  Checks if <code>this</code> is plus one or minus one
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isUnity = function() {
    if (this.used == 1 && this.dp[0] == 1) {
        return MP_YES;
    }
    return MP_NO;
};
/**
  Checks if <code>this</code> is negative
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isNeg = function() {
    return (this.sign == MP_ZPOS) ? MP_NO : MP_YES;
};
/**
  Checks if <code>this</code> is positive
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isPos = function() {
    return (this.sign == MP_NEG) ? MP_NO : MP_YES;
};
/**
  Checks if <code>this</code> is even
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isEven = function() {
    return (this.dp[0].isOdd()) ? MP_NO : MP_YES;
};
/**
  Checks if <code>this</code> is odd
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isOdd = function() {
    return (this.dp[0].isEven()) ? MP_NO : MP_YES;
};
/**
  Sets <code>this</code> to NaN
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.setNaN = function() {
    this.dp[0] = Number.NaN;
};
/**
  Checks if <code>this</code> is NaN
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isNaN = function() {
    return isNaN(this.dp[0]);
};
/**
  Sets <code>this</code> to negative infinity
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.setNegInf = function() {
    this.dp[0] = Number.NEGATIVE_INFINITY;
};
/**
  Checks if <code>this</code> is negative infinite
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isNegInf = function() {
    return (this.dp[0] == Number.NEGATIVE_INFINITY) ? MP_YES : MP_NO;
};
/**
  Sets <code>this</code> to positive infinity
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.setPosInf = function() {
    this.dp[0] = Number.POSITIVE_INFINITY;
};
/**
  Checks if <code>this</code> is positive infinite
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isPosInf = function() {
    return (this.dp[0] == Number.POSITIVE_INFINITY) ? MP_YES : MP_NO;
};

/**
  Sets <code>this</code> to Infinity
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.setInf = function() {
    this.dp[0] = Number.POSITIVE_INFINITY;
};
/**
  Checks if <code>this</code> is not finite
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isInf = function() {
    return (this.isPosInf() || this.isNegInf()) ? MP_YES : MP_NO;
};
/**
  Checks if <code>this</code> is finite
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isFinite = function() {
    return (this.dp[0].isFinite()) ? MP_YES : MP_NO;
};


// highest bit set (e.g.: 22 = 0b10110, returns 4)
/**
  Highest bit set, zero based
  @memberof Bigint
  @instance
  @return {number}
*/
Bigint.prototype.highBit = function() {
    if (this.used == 1) {
        return this.dp[0].highBit();
    } else {
        return MP_DIGIT_BIT * (this.used - 1) + (this.dp[this.used - 1].highBit());
    }
};
/**
  Integer logarithm base two
  @memberof Bigint
  @instance
  @return {number}
*/
Bigint.prototype.ilog2 = function() {
    return (this.highBit() + 1);
};

// lowest bit set (e.g.: 22 = 0b10110, returns 1)
/**
  Lowest bit set, zero based
  @memberof Bigint
  @instance
  @return {number}
*/
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
/**
  Checks if <code>this</code> is a power of two
  @memberof Bigint
  @instance
  @return {bool}
*/
Bigint.prototype.isPow2 = function() {
    if (this.highBit() == this.lowBit()) {
        return MP_YES;
    }
    return MP_NO;
};

// number of bits set (e.g.: 22 = 0b10110, returns 3)
/**
  Number of bits set (Hamming weight)<br>
  Awkward function name caused by function setBit()--which actually sets bits--
  the english grammar, and a clash of cultures (I just couldn't be persuaded to
  call the function hammingWeight).
  @memberof Bigint
  @instance
  @return {number}
*/
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
/**
  Number of decimal digits of <code>this</code>. Returns 1 (one) if <code>this</code> is zero
  @memberof Bigint
  @instance
  @return {number}
*/
Bigint.prototype.digits = function() {
    var log102 = Math.log(10) / Math.log(2);
    var log2 = this.highBit();
    return Math.floor(log2 / log102) + 1;
};

// TODO: check input!
// shift left big-digit-wise
/**
  Left Shift limb-wise (multiplication with 2<sup>i*MP_DIGIT_BIT</sup>).
  Input can be negative for division
  @memberof Bigint
  @instance
  @param {number} i the amount to be shifted
  @return {Bigint}
*/
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
    ret.clamp();
    return ret;
};
/**
  Left Shift limb-wise (multiplication with 2<sup>i*MP_DIGIT_BIT</sup>), in place.
  Input can be negative for division
  @memberof Bigint
  @instance
  @param {number} i the amount to be shifted
*/
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
    this.clamp();
};
// shift right big-digit-wise, returns 0 if shift is bigger or equal length
/**
  Right Shift limb-wise (division with 2<sup>i*MP_DIGIT_BIT</sup>).
  Returns 0 if shift is bigger or equal length.
  Input can be negative for multiplication
  @memberof Bigint
  @instance
  @param {number} i the amount to be shifted
  @return {Bigint}
*/
Bigint.prototype.drShift = function(i) {
    var ret;
    if (i == 0) {
        return this.copy();
    }
    if (i < 0) {
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
    ret.clamp();
    return ret;
};
// shift right big-digit-wise
/**
  Right Shift limb-wise (division with 2<sup>i*MP_DIGIT_BIT</sup>), in place.
  Sets <code>this</code> to 0 if shift is bigger or equal length.
  Input can be negative for multiplication
  @memberof Bigint
  @instance
  @param {number} i the amount to be shifted
*/
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
    this.clamp();
};
// shift left bit-wise
/**
  Left Shift bit-wise (multiplication with 2<sup>i</sup>).
  Input can be negative for division
  @memberof Bigint
  @instance
  @param {number} i the amount to be shifted
  @return {Bigint}
*/
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
/**
  Left Shift bit-wise (multiplication with 2<sup>i</sup>), in place.
  Input can be negative for division
  @memberof Bigint
  @instance
  @param {number} i the amount to be shifted
*/
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
/**
  Right Shift bit-wise (multiplication with 2<sup>i</sup>)
  Returns to 0 if shift is bigger or equal length.
  Input can be negative for multiplication
  @memberof Bigint
  @instance
  @param {number} i the amount to be shifted
  @return {Bigint}
*/
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
/**
  Right Shift bit-wise (multiplication with 2<sup>i</sup>), in place.
  Sets <code>this</code> to 0 if shift is bigger or equal length.
  Input can be negative for multiplication
  @memberof Bigint
  @instance
  @param {number} i the amount to be shifted
*/
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
/**
  Right Shift bit-wise (multiplication with 2<sup>i</sup>) rounding to +Inf.
  Sets <code>this</code> to 0 if shift is bigger or equal length.
  Input can be negative for multiplication
  @memberof Bigint
  @instance
  @param {number} i the amount to be shifted
  @return {Bigint}
*/
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
/**
  <code>this % 2^b</code> , like in libtommmath. Actually a port of the libtommmath functi
  @param {number} b exponent of 2<sup>b</sup>
  @memberof Bigint
  @instance
  @return {Bigint}
*/
Bigint.prototype.mod2d = function(b) {
    var x, ret;

    if (b <= 0) {
        return new Bigint(0);
    }
    if (b >= this.used * MP_DIGIT_BIT) {
        return this.copy();
    }

    ret = this.copy();
    /* faster than doing a t&(2^b-1) */

    /* zero digits above the last digit of the modulus */
    for (x = (b / MP_DIGIT_BIT) + ((b % MP_DIGIT_BIT) == 0 ? 0 : 1); x <
        ret.used; x++) {
        ret.dp[x] = 0;
    }
    /* clear the digit that is not completely outside/inside the modulus */
    ret.dp[Math.floor(b / MP_DIGIT_BIT)] &= (1 << (b % MP_DIGIT_BIT)) - 1;
    ret.clamp();
    return ret;
};
/**
  Multiplication limited to the higher digits
  @param {Bigint} bint multiplicant
  @param {number} digs lower limit
  @return {Bigint}
  @see {@link barrettreduce}
  @private
*/
Bigint.prototype.mulhighdigs = function(bint, digs) {
    var pa, pb, ix, iy, i;
    var u;
    var r;
    var t;
    var a, b;
    var tmpx, tmpt, tmpy;

    if (bint.isZero() || this.isZero()) {
        return new Bigint(0);
    }

    a = this;
    b = bint;
    t = new Bigint(0);
    t.grow(a.used + b.used + 1);
    t.used = a.used + b.used + 1;
    pa = a.used;
    pb = b.used;
    for (ix = 0; ix < pa; ix++) {
        u = 0;
        tmpx = a.dp[ix];
        tmpt = digs;
        tmpy = digs - ix;
        for (i = 0, iy = digs - ix; iy < pb; iy++, i++) {
            r = t.dp[tmpt + i] + tmpx * b.dp[tmpy + i] + u;
            t.dp[tmpt + i] = r & MP_MASK;
            u = Math.floor(r / MP_DIGIT_MAX);
        }
        t.dp[tmpt + i] = u;
    }
    t.used = t.dp.length;
    t.clamp();
    return t;
};
/**
  Multiplication modulo 2<sup>digs * MP_DIGIT_BIT</sup>
  @param {Bigint} bint multiplicant
  @param {number} digs higer limit
  @return {Bigint}
  @see {@link barrettreduce}
  @private
*/
Bigint.prototype.muldigs = function(bint, digs) {
    var u, r, pb, ix, iy;
    var sign;
    var ret;
    if (bint.isZero() || this.isZero() || (digs && digs <= 0)) {
        return new Bigint(0);
    }
    // fallback is full multiplication?
    if (arguments.length == 1) {
        return this.mul(bint);
    }
    sign = (this.sign != bint.sign) ? MP_NEG : MP_ZPOS;
    ret = new Bigint(0);
    ret.grow(digs);

    for (ix = 0; ix < this.used; ix++) {
        u = 0;
        pb = Math.min(bint.used, digs - ix);
        for (iy = 0; iy < pb; iy++) {
            r = ret.dp[iy + ix] + this.dp[ix] * bint.dp[iy] + u;
            ret.dp[iy + ix] = r & MP_MASK;
            u = Math.floor(r / MP_DIGIT_MAX);
        }
        if (ix + iy < digs) {
            ret.dp[ix + iy] = u;
        }
    }
    ret.used = ret.dp.length;
    ret.clamp();
    return ret;
};
// standard unsigned multiply
/**
  Standard unsigned multiplication
  @param {Bigint} bi multiplicant
  @return {Bigint}
  @private
*/
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
/**
  Multiplication
  @memberof Bigint
  @instance
  @param {Bigint} bi multiplicant
  @return {Bigint}
*/
Bigint.prototype.mul = function(bi, flag) {
    var ret, asign, bsign, a, b;
    var mulBalanced = function(x, y) {
        var tmp, ret;
        var xlen, ylen, nblocks;
        xlen = x.used;
        ylen = y.used;
        // make big-digits and work with them like normal
        // sized digits with b representing a single digit.
        nblocks = Math.floor(xlen / ylen);
        ret = new Bigint(0);
        for (var i = 0; i < nblocks; i++) {
            tmp = x.slice(ylen * i, ylen * (i + 1)).mul(y, true);
            tmp.dlShiftInplace(ylen * i);
            ret = ret.add(tmp);
        }
        tmp = x.slice(ylen * i, x.used).mul(y, true);
        tmp.dlShiftInplace(ylen * i);
        ret = ret.add(tmp);

        return ret;
    };
    // larger one first
    if (this.used <= bi.used) {
        a = bi;
        b = this;
    } else {
        a = this;
        b = bi;
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

    if (a.used == 1 && b.used == 1) {
        asign = (a.sign != b.sign) ? MP_NEG : MP_ZPOS;
        ret = a.dp[0] * b.dp[0];
        ret = ret.toBigint();
        ret.sign = asign;
        return ret;
    }

    // Check if smaller number is small enough for mulInt()
    if (b.used == 1) {
        asign = (a.sign != b.sign) ? MP_NEG : MP_ZPOS;
        ret = a.mulInt(b.dp[0]);
        ret.sign = asign;
        return ret;
    }

    // compute with abs. values
    asign = a.sign; // it's only a reference , so what we change here we change
    bsign = b.sign; // there, too, so keep a backup
    a.sign = MP_ZPOS;
    b.sign = MP_ZPOS;

    // check for absolute cutoff to do multiplier balancing here
    if (arguments.length == 1 &&
        a.used >= b.used + (KARATSUBA_MUL_CUTOFF >>> 1) &&
        b.used >= KARATSUBA_MUL_CUTOFF) {
        ret = mulBalanced(a, b);
    } else {
        // check for cutoffs to do T-C or FFT respectively here
        if (Math.min(a.used, b.used) >= FFT_MUL_CUTOFF) {
            ret = a.fft_mul(b);
        } else if (Math.min(a.used, b.used) >= 3 * TOOM_COOK_MUL_CUTOFF) {
            ret = a.toom_cook_mul(b);
        } else if (Math.min(a.used, b.used) >= 2 * KARATSUBA_MUL_CUTOFF) {
            ret = a.karatsuba(b);
        } else {
            ret = a.multiply(b);
        }
    }
    if (asign != bsign) {
        ret.sign = MP_NEG;
    }
    // reset originals
    a.sign = asign;
    b.sign = bsign;

    ret.clamp();
    return ret;
};

/**
  Basic unsigned square
  @return {Bigint}
  @private
*/
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
/**
  Squaring
  @memberof Bigint
  @instance
  @return {Bigint}
*/
Bigint.prototype.sqr = function() {
    this.sign = MP_ZPOS;

    if (this.used >= FFT_SQR_CUTOFF) {
        // FFT does both in one function
        return this.fft_mul();
    } else if (this.used >= 3 * TOOM_COOK_SQR_CUTOFF) {
        return this.toom_cook_sqr();
    } else if (this.used >= 2 * KARATSUBA_SQR_CUTOFF) {
        return this.karatsuba_square();
    } else {
        return this.square();
    }
};

/**
  Multiplication with a a small integer
  @memberof Bigint
  @instance
  @param {number} si a small integer
  @return {Bigint}
*/
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
/**
  Comparing with another <code>Bigint</code>, magnitude only
  @memberof Bigint
  @instance
  @param {Bigint} bi
  @return {number}
  @private
*/
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

/**
  Comparing with another Bigint
  @memberof Bigint
  @instance
  @param {Bigint} bi
  @return {number}
*/
Bigint.prototype.cmp = function(bi) {
    /*
        We have signed zeros, that makes it a bit more complicated to avoid
        curious things when comparing to -0. We just set -0 = +0 temprorarily.
     */
    var a = this;
    var b = bi;
    var asign = a.sign;
    var bsign = b.sign;
    if (a.isZero()) {
        a.sign = MP_ZPOS;
    }
    if (b.isZero()) {
        b.sign = MP_ZPOS;
    }
    /* compare based on sign */
    if (a.sign != b.sign) {
        if (a.sign == MP_NEG) {
            a.sign = asign;
            b.sign = bsign;
            return MP_LT;
        } else {
            a.sign = asign;
            b.sign = bsign;
            return MP_GT;
        }
    }
    /* compare digits */
    if (a.sign == MP_NEG) {
        a.sign = asign;
        b.sign = bsign;
        /* if negative compare opposite direction */
        return b.cmp_mag(a);
    } else {
        a.sign = asign;
        b.sign = bsign;
        return a.cmp_mag(b);
    }
};
/**
  Lowlevel addition
  @memberof Bigint
  @instance
  @param {Bigint} bi
  @return {Array} 
  @private
*/
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
/**
  Addition
  @memberof Bigint
  @instance
  @param {Bigint} bi
  @return {Bigint}
*/
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
/**
  Addition with a (small integer)
  @param {number} si a small integer
  @return {Bigint}
*/
Bigint.prototype.addInt = function(si) {
    var bi = si.toBigint();
    return this.add(bi);
};

/**
  Lowlevel subtraction
  @memberof Bigint
  @instance
  @param {Bigint} bi
  @return {Array} 
  @private
*/
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
/**
  Subtraction with a {Bigint}
  @memberof Bigint
  @instance
  @param {Bigint} bi
  @return {Bigint}
*/
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
/**
  Subtraction with a small integer
  @memberof Bigint
  @instance
  @param {number} si a small integer
  @return {Bigint}
*/
Bigint.prototype.subInt = function(si) {
    return this.sub(si.toBigint());
};
/**
  Internal division with remainder (D. Knuth: Algo. D)
  @memberof Bigint
  @instance
  @param {Bigint} bint Divisor
  @return {Array} Quotient and reminder in that order
  @private
*/
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
/**
  Internal division with remainder (Burnikel-Ziegler division)
  @memberof Bigint
  @instance
  @param {Bigint} bint Divisor
  @return {Array} Quotient and reminder in that order
  @private
*/
Bigint.prototype.burnZiegDivision = function(bint) {
    var divrem = function(a, b) {
        // (max) size of one block
        var n = b.highBit() + 1;
        var tlen = a.highBit() + 1;
        // # of blocks
        var nblocks = Math.ceil((a.highBit() + 1) / n);
        // # of n-sized blocks
        var mblocks = Math.floor((a.highBit() + 1) / n);

        var firstblock;
        var r, q, qr, t;
        var count;
        var mask = new Bigint(0);

        mask.mask(n);

        count = 0;

        //firstblock = a.bitSlice(mblocks*n, tlen);
        firstblock = a.rShift(mblocks * n).and(mask);
        if (firstblock.cmp(b) != MP_LT) {
            r = new Bigint(0);
        } else {
            r = firstblock;
            mblocks--;
            nblocks--;
        }
        q = new Bigint(0);

        while (nblocks--) {
            t = a.rShift(mblocks * n).and(mask);
            qr = div2n1n(r.lShift(n).add(t), b, n);
            t = qr[0];
            r = qr[1];
            q = q.lShift(n).add(t);
            mblocks--;
        }
        return [q, r];
    };

    var div2n1n = function(a, b, n) {
        var mask, q1, q2, r, qr, a3, b1, b2;
        var half;
        if (n <= BURN_ZIEG_CUTOFF) {
            return a.divrem(b);
        }
        var isodd = n & 1;
        if (isodd) {
            a.lShiftInplace(1);
            b = b.lShift(1);
            //b.lShiftInplace(1);
            n++;
        }
        half = n >>> 1;
        mask = new Bigint(0);
        mask.mask(half);
        b1 = b.rShift(half);
        b2 = b.and(mask);
        //b2 = b.bitSlice(0,half);
        a3 = a.rShift(half).and(mask);
        //a3 =  a.bitSlice(half, n);
        r = a.rShift(n);
        qr = div3n2n(r, a3, b1, b2, half);
        q1 = qr[0];
        r = qr[1];
        a3 = a.and(mask);
        //a3 = a.bitSlice(0,half);
        qr = div3n2n(r, a3, b1, b2, half);
        q2 = qr[0];
        r = qr[1];
        if (isodd) {
            r.rShiftInplace(1);
        }
        return [q1.lShift(half).or(q2), r];
    };
    var div3n2n = function(a12, a3, b1, b2, n) {
        var t = a12.rShift(n),
            qr, q, r;
        if (t.cmp(b1) == MP_EQ) {
            q = new Bigint(1);
            q = q.lShift(n);
            q.decr();
            r = a12.sub(b1.lShift(n)).add(b1);
        } else {
            qr = div2n1n(a12, b1, n);
            q = qr[0];
            r = qr[1];
        }
        r = r.lShift(n).or(a3).sub(q.mul(b2));
        while (r.sign == MP_NEG) {
            q.decr();
            r = r.add(b1.lShift(n).or(b2));
        }
        return [q, r];
    };
    return divrem(this, bint);
};

/**
  Approximate reciprocal 1/this for Barrett-division
  @memberof Bigint
  @instance
  @param {number} n precision
  @return {Bigint}
  @private
*/
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
    giantsteps = computeGiantsteps(MP_DIGIT_BIT >> 1, n, 2);
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
/**
  Take an approximation of the reciprocal of the denominator and correct it
  the trick is to find the right amount of approximateness (is this really a
  proper English word? Found it in at least one book: Clifford Alan Hooker,
  "A Realistic Theory of Science", SUNY Press, 1987).
  @memberof Bigint
  @instance
  @param {Bigint} b Divisor
  @param {Bigint} mu
  @return {Array} Quotient and reminder in that order
  @private
*/
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
/**
  Internal division with remainder (Barret division)
  @memberof Bigint
  @instance
  @param {Bigint} bint Divisor
  @return {Array} Quotient and reminder in that order
  @private
*/
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
/**
  Internal division with remainder (Newton-Raphson inverse)
  @memberof Bigint
  @instance
  @param {Bigint} bint Divisor
  @return {Array} Quotient and reminder in that order
  @private
*/
Bigint.prototype.divisionNewton = function(bint) {
    var tlen, blen, rlen, extra;
    var t1, t2, t3, t4, ts, q, r;
    var giantsteps, steps, gs0, gsi, startprecision;

    tlen = this.highBit() + 1;
    blen = bint.highBit() + 1;
    rlen = tlen - blen;

    // probably too much and should be adjusted to fill a limb if possible, too.
    extra = blen.highBit() + tlen.highBit() + 1;
    // should also have three bits at least
    if (extra < 3) {
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
    giantsteps = computeGiantsteps(startprecision, rlen, 2);
    steps = giantsteps.length;

    t1 = new Bigint(1);
    t1.lShiftInplace(2 * giantsteps[0]);
    t1 = t1.div(bint.rShiftRounded(blen - giantsteps[0]));

    // the first entry of giantsteps is not necessarily equal to startprecision
    gs0 = giantsteps[0];

    for (var i = 0; i < steps; i++) {
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
    if (r.sign == MP_NEG) {
        r = r.add(bint);
        q.decr();
    } else if (r.cmp(bint) == MP_GT) {
        r = r.sub(bint);
        q.incr();
    }
    return [q, r];
};

// public: truncated division with remainder
/**
  Truncated division with remainder
  @memberof Bigint
  @instance
  @param {Bigint} bint Divisor
  @return {array} Quotient and remainder in that order
*/
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
        return this.divremInt(bint.dp[0]);
    }

    // a < b
    if (a.cmp_mag(b) == MP_LT) {
        return [new Bigint(0), a];
    }

    qsign = ((this.sign * bint.sign) < 0) ? MP_NEG : MP_ZPOS;
    rsign = (this.sign == MP_NEG) ? MP_NEG : MP_ZPOS;

    // The cutoffs overlap, these branches are just rough limits
    if (a.used >= NEWTON_NUMERATOR && b.used >= NEWTON_DENOMINATOR) {
        ret = a.divisionNewton(b);
    } else if (a.used >= BARRETT_NUMERATOR || b.used >= BARRETT_DENOMINATOR) {
        // splitted in two for legibility
        if (a.used <= 2 * b.used && a.used >= BARRETT_NUMERATOR) {
            ret = a.barrettDivision(b);
        } else if (a.used > 2 * b.used && b.used >= BARRETT_DENOMINATOR) {
            ret = a.barrettDivision(b);
        }
    } else if (a.used >= BURN_ZIEG_NUMERATOR && b.used >=
        BURN_ZIEG_DENOMINATOR) {
        ret = a.burnZiegDivision(b);
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

/**
  Truncated division with remainder
  @memberof Bigint
  @instance
  @param {number} si a small integer
  @return {array} Quotient and remainder in that order and both Bigints
*/
Bigint.prototype.divremInt = function(si) {
    var divrem2in1 = function(u, m, v, q, B) {
        var k = 0,
            t;
        for (var j = m - 1; j >= 0; j--) {
            k = k * (1 << B);
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
/**
  Division with remainder, rounding to -Infinity (like in GP/PARI for
   example)
  @memberof Bigint
  @instance
  @param {Bigint} bint Divisor
  @return {array} Quotient and remainder in that order
*/
Bigint.prototype.divmod = function(bint) {
    var a = this;
    var b = bint;
    var qr;
    if (a.sign == MP_NEG && b.sign == MP_NEG) {
        qr = a.abs().divrem(b.abs());
        if (!qr[1].isZero()) {
            qr[0].incr();
            qr[1] = b.add(qr[1]).abs();
        }
        return qr;
    } else if (a.sign == MP_NEG && b.sign == MP_ZPOS) {
        qr = a.abs().divrem(b);
        if (!qr[1].isZero()) {
            qr[0].incr();
            qr[0] = qr[0].neg();
            qr[1] = b.sub(qr[1]);
            return qr;
        }
        qr[0] = qr[0].neg();
        return qr;
    } else if (a.sign == MP_ZPOS && b.sign == MP_NEG) {
        qr = a.divrem(b.abs());
        qr[0] = qr[0].neg();
        return qr;
    }
    return a.divrem(b);
};
MOD_MUL_INV_THREE = (3).modInv(1 << MP_DIGIT_BIT);
MOD_MUL_INV_THREE_HALF = Math.ceil(MOD_MUL_INV_THREE / 2);
/**
<p>
   Division by 3 if fraction is known to have no remainder (e.g. in Toom-Cook)
   uses MP_DIGIT_BIT = 26 only but is easily changed
   It depends on architecture if it is actually faster, please test but I found
   at 1,000,000 bit long numbers with my good ol' Duron a difference of a mere
   150 milliseconds (201 to 53)
</p><p>
    Uses multiplication with the multiplicative modular inverse of 3 with the
    modulus 2^26, that is, the canonical residue of v mod 2^26 such that
    v * 3 is congruent to 1 mod 2^26.
</p>
<table>
  <thead>
    <tr><th> modulus</th><th>v</th><th>ceil(v/2)</th></tr>
  </thead>
  <tbody>
    <tr><td> 2^26 </td><td> 0x2aaaaab  </td><td> 0x1555556  </td></tr>
    <tr><td> 2^28 </td><td> 0xaaaaaab  </td><td> 0x5555556  </td></tr>
    <tr><td> 2^30 </td><td> 0x2aaaaaab </td><td> 0x15555556 </td></tr>
    <tr><td> 2^31 </td><td> 0x2aaaaaab </td><td> 0x15555556 </td></tr>
  </tbody>
</table>
  @memberof Bigint
  @instance
  @return {Bigint}
*/
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


/**
  Truncated division
  @memberof Bigint
  @instance
  @param {Bigint} bi Divisor
  @return {Bigint} Quotient
*/
Bigint.prototype.div = function(bi) {
    return this.divrem(bi)[0];
};
/**
  Truncated division with a small integer
  @memberof Bigint
  @instance
  @param {number} si Divisor
  @return {Bigint} Quotient
*/
Bigint.prototype.divInt = function(si) {
    return this.divremInt(si)[0];
};
/**
  Truncated division
  @memberof Bigint
  @instance
  @param {Bigint} bi Divisor
  @return {Bigint} Remainder
*/
Bigint.prototype.rem = function(bi) {
    return this.divrem(bi)[1];
};
/**
  Truncated division with a small integer
  @param {number} si Divisor
  @return {Bigint} Remainder
*/
Bigint.prototype.remInt = function(si) {
    return this.divremInt(si)[1];
};

/**
  Add one to <code>this</code>.
  <strong>Caution:</strong> works in-place!
  @memberof Bigint
  @instance
*/
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
/**
  Subtract one from <code>this</code>.
  <strong>Caution:</strong> works in-place!
  @memberof Bigint
  @instance
*/
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
/**
  Slice a piece of limbs out of the number (for e.g.: Toom-Cook multiplication)
  @param {number} start of slice
  @param {number} end of slice
  @return {Bigint}
  @private
*/
Bigint.prototype.slice = function(start, end) {
    var ret = new Bigint(0);
    ret.dp = this.dp.slice(start, end);
    ret.used = end - start;
    ret.sign = this.sign;
    return ret;
};
/**
  Toom-Cook 2-way multiplication better known as Karatsuba multiplication.
  @param {Bigint} bint multiplicant
  @return {Bigint}
  @private
*/
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
/**
  Toom-Cook 2-way squaring better known as Karatsuba squaring.
  @return {Bigint}
  @private
*/
Bigint.prototype.karatsuba_square = function() {
    var x0, x1, x0y0, x1y1, t1, xy;

    var tlen = this.used;

    var m = tlen >>> 1;
    if (m <= KARATSUBA_SQR_CUTOFF) {
        return this.square();
    }
    x1 = this.slice(m, tlen);
    x0 = this.slice(0, m);
    x0y0 = x0.karatsuba_square();
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
/**
  Toom-Cook 3-way multiplication.<br>
Jaewook Chung, M. Anwar Hasan: Asymmetric Squaring Formulae, Centre for Applied
Cryptographic Research, University of Waterloo, Ontario, Canada, (3-August-2006). URL:
{@link http://www.cacr.math.uwaterloo.ca/tech_reports.html}. 551, 553, 557
  @param {Bigint} bint multiplicant
  @return {Bigint}
  @private
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
/**
  Toom-Cook 3-way squaring
  @return {Bigint}
  @private
*/
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
/**
  FFT multiplication <em>and</em> squaring.<br>
  Detects automatically if a square is wanted, just leave out the argument for
  squaring.<br>
  @param {Bigint} bint multiplicant
  @return {Bigint}
  @private
*/
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
/**
  Exponentiation by a positive small integer
  @param {number} ui exponent
  @return {Bigint}
  @private
*/
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
/**
  Exponentiation by a <code>Bigint</code>
  @param {Bigint} bi exponent
  @return {Bigint}
  @private
*/
Bigint.prototype.bpow = function(bi) {
    var ret = new Bigint(1);
    var t = this.copy();
    while (bi.isZero() == MP_NO) {
        if (bi.isOdd() == MP_YES) {
            ret = ret.mul(t);
        }
        t = t.sqr();
        bi.rShiftInplace(1);
    }
    return ret;
};
/**
  Exponentiation
  @memberof Bigint
  @instance
  @param {number|Bigint} ui exponent
  @return {Bigint}
*/
Bigint.prototype.pow = function(ui) {
    var sign = this.sign;
    var t;

    if (xtypeof(ui) == "bigint") {
        return this.powBigint(ui);
    }

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
/**
  Exponentiation with a Bigint
  @memberof Bigint
  @instance
  @param {Bigint} bi an unsigned (positive) Bigint
  @return {Bigint}
  @private
*/
Bigint.prototype.powBigint = function(bi) {
    var sign = this.sign;
    var t;

    if (bi.sign == MP_NEG) {
        //rounds to zero
        return (new Bigint(0));
    }
    /*
    if(bi == 1/2){
      return this.sqrt();
    }  */
    if (bi.isOne()) {
        return this.dup();
    }
    if (bi.used == 1 && bi.dp[0] == 2) {
        return this.sqr();
    }

    if (this.isZero()) {
        // IEEE 754
        if (bi.isZero()) {
            return (new Bigint(1));
        }
        return (new Bigint(0));
    }
    if (this.isInf()) {
        // IEEE 754
        if (bi.isZero()) {
            return (new Bigint(1));
        }
        return this.dup();
    }
    if (this.isUnity()) {
        if (this.sign > 0) {
            // IEEE 754 says it is always one, even for 1^\infty
            return (new Bigint(1));
        }
        if (bi.isInf()) {
            // IEEE 754 is unclear for -1
            return (new Bigint(0)).setNaN();
        }
        if (bi.dp[0] & 1 == 0) {
            return (new Bigint(1));
        }
        return this.dup();
    }
    t = this.abs();
    t = t.bpow(bi);
    if (sign < 0 && bi.dp[0] & 1 == 0) {
        t.sign = MP_NEG;
    }
    return t;
};

// should be done with left-to-right instead?
/**
  Exponentiation with a Bigint
  @function external:Number#kpow
  @param {Bigint} bi exponent
  @return {Bigint}
*/
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
/**
  Exponentiation with a small positive integer
  @function external:Number#bigpow
  @param {number} si exponent
  @return {Bigint}
*/
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
/**
  Integer logarithm of arbitrary positive base
  @memberof Bigint
  @instance
  @param {number} base base of the logarithm
  @return {Bigint}
*/
Bigint.prototype.ilogb = function(base) {
    var low, bracket_low, high, bracket_high, mid, bracket_mid;
    var ONE = new Bigint(1);
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
    while (high.sub(low).cmp(ONE) == MP_GT) {

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
/**
  Integer square root
  @memberof Bigint
  @instance
  @return {Bigint}
*/
Bigint.prototype.sqrt = function() {
    var t1, t2;

    // complex comes later
    if (this.sign == MP_NEG) {
        return MP_VAL;
    }

    if (this.isZero()) {
        return new Bigint();
    }

    t1 = this.copy();
    t1.rShiftInplace((t1.highBit() + 1) >>> 1);

    // one round of N-R beforehand
    t1 = t1.add(this.div(t1)).rShift(1);
    do {
        t2 = this.div(t1);
        t1 = t1.add(t2).rShift(1);
    } while (t1.cmp_mag(t2) == MP_GT);
    return t1;
};

/**
  N-th root
  @memberof Bigint
  @instance
  @param {number} b denominator of exponent
  @return {Bigint}
*/
Bigint.prototype.nthroot = function(b) {
    var t1, t2, t3, t4, a;
    var sign, ilog2;

    if (this.isZero()) {
        if (b > 0) {
            return new Bigint(0);
        } else {
            return (new Bigint()).setNaN();
        }
    }

    if (this.isUnity()) {
        if (b == 0) {
            return (new Bigint()).setNaN();
        } else {
            return this.copy();
        }
    }

    if (b < 0) {
        // would return 1/(x^(1/-b)) but that is always < 1
        return new Bigint(0);
    }
    if (b == 0 || b.isNaN()) {
        // zero means this^(1/0) which is a division by zero
        return (new Bigint()).setNaN();
    }
    if (b == 1) {
        // one means this^(1/1) -> no effect
        return this.copy();
    }

    /* input must be positive if b is even */
    if ((b & 1) == 0 && this.sign == MP_NEG) {
        return (new Bigint()).setNaN();
    }
    if (b == 2) {
        return this.sqrt();
    }
    a = this;

    sign = a.sign;
    a.sign = MP_ZPOS;

    /*

    This is, believe it or not, slower than a full blown round together
    with the next shortcut.
    Are the native functions really that slow?

    if (a.used == 0) {
        if (b == 0) {
            return (new Bigint()).setNaN();
        } else if (b < 0) {
            return new Bigint(0);
        } else {
            t1 = Math.exp(Math.log(a.dp[0]) / b);
            t1 = Math.floor(t1);
            t1.sign = sign;
            return t1;
        }
    }
     */

    /* Set initial value:
     *     n-th root of r = exp(log_e(r) / n)
     * That can be done with every base for the logarithm, so with base 2 and
     * integer logarithm:
     *     n-th root of r < 2^( floor( ceil( log_2(r) ) / n) +1 )
     */
    // floor(log_2(this)) + 1
    ilog2 = a.highBit() + 1;
    // smallest base is 2
    if (b >= ilog2) {
        return new Bigint(1);
    }
    /*
       If ilog2/b<=52 we can do a shortcut here and have a better initial
       value, too. That makes it as fast as the binary algorithm for large b
    */
    if (ilog2 / b <= 52) {
        var r = Math.floor(Math.pow(2, (ilog2) / b)) + 1;
        t2 = r.toBigint();
    } else {
        ilog2 = Math.floor(ilog2 / b);
        t2 = new Bigint(1);
        t2.lShiftInplace(ilog2 + 1);
    }
    do {
        // compute difference
        t3 = t2.pow(b - 1);
        t3 = a.div(t3);
        t3 = t3.sub(t2);
        t3 = t3.divInt(b);
        // add difference to last approximation
        t2 = t2.add(t3);
        // we reach the final approximation when the difference is zero
    } while (!t3.isZero())

    /*
       The value is most probable 1 (one) digit too large, so to save one
       exponentiation subtract 1 (one) in advance.
       TODO: check if that is always the case, as the author of the patch
             conjectures.
       DONE: it isn't: (321^123)^(1/321) ~ 9 but comes out as 16 with this
             method. The initial value is too much off in this case.
       REOPEN: with the better initial value it works better and the questions
               is open again.
    */
    while (true) {
        t1 = t2.pow(b);
        if (t1.cmp(a) == MP_GT) {
            t2.decr();
        } else {
            break;
        }
    }
    //   console.log("i = " + i)
    /* reset the sign of a first */
    a.sign = sign;
    /* set the sign of the result */
    t2.sign = sign;
    return t2;
};

/**
  N-th root, old version with bracketing
  @memberof Bigint
  @instance
  @param {number} b denominator of exponent
  @return {Bigint}
  @private
*/
Bigint.prototype.nthrootold = function(n) {
    var low, high, mid, sign;

    if (this.isZero()) {
        if (n > 0) {
            return new Bigint(0);
        } else {
            return this.copy().setNaN();
        }
    }
    if (this.isOne()) {
        if (n == 0) {
            return (new Bigint()).setNaN();
        } else {
            return new Bigint(1);
        }
    }
    if ((n & 1) == 0 && this.isNeg()) {
        return this.copy().setNaN();
    }
    // actually: x^(1/(-y)) = 1/(x^(1/y)) and x^(1/1/y) = x^y
    if (n < 0 || !n.isInt()) {
        return this.copy().setNaN();
    }
    sign = this.sign;
    this.sign = MP_ZPOS;

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
    mid.incr();
    mid.sign = sign;
    return mid;
};

/**
  GCD, greatest common divisior
  @memberof Bigint
  @instance
  @param {Bigint} bint
  @return {Bigint}
*/
Bigint.prototype.gcd = function(bint) {
    var g = new Bigint(1);
    // checks and balances
    if (this.isZero()) {
        return bint.abs();
    }
    if (bint.isZero()) {
        return this.abs();
    }
    var x = this.abs();
    var y = bint.abs();
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
/**
  Extended GCD
  @memberof Bigint
  @instance
  @param {Bigint} bint
  @return {array} x, y, and gcd in that order
*/
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
/**
  LCM: lowest common multiplicator
  @memberof Bigint
  @instance
  @param {Bigint} bint
  @return {Bigint}
*/
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

/**
  OR with a <code>Bigint</code>
  @memberof Bigint
  @instance
  @param {Bigint} bint
  @return {Bigint}
*/
Bigint.prototype.or = function(bint) {
    var ret = new Bigint(0);
    var a, b, i;
    if (this.used > bint.used) {
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
/**
  AND with a <code>Bigint</code>
  @memberof Bigint
  @instance
  @param {Bigint} bint
  @return {Bigint}
*/
Bigint.prototype.and = function(bint) {
    var ret = new Bigint(0);
    var a, b, i;
    if (this.used < bint.used) {
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
/**
  XOR with a <code>Bigint</code>
  @memberof Bigint
  @instance
  @param {Bigint} bint
  @return {Bigint}
*/
Bigint.prototype.xor = function(bint) {
    var ret = new Bigint(0);
    var a, b, i;
    if (this.used < bint.used) {
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
/**
  NOT <code>this</code>
  @memberof Bigint
  @instance
  @return {Bigint}
*/
Bigint.prototype.not = function() {
    var ret = new Bigint(0);
    var a, i;
    a = this;
    ret.dp = new Array(a.used);
    for (i = 0; i < a.used; i++) {
        ret.dp[i] = (~a.dp[i]) & MP_MASK;
    }
    ret.used = ret.dp.length;
    ret.clamp();
    return ret;
};
/**
  NOT <code>this</code>
  Despite its name it <em>does<em> work in-place
  @memberof Bigint
  @instance
*/
Bigint.prototype.notInplace = function() {
    var i;
    var a = this;
    for (i = 0; i < a.used; i++) {
        a.dp[i] = (~a.dp[i]) & MP_MASK;
    }
    this.clamp();
};

// all single bit manipulators are zero based
/**
  Get a bit of <code>this</code>
  @memberof Bigint
  @instance
  @param {number} n place of bit
  @return {number}
*/
Bigint.prototype.getBit = function(n) {
    var digit = this.dp[Math.floor(n / MP_DIGIT_BIT)];
    return ((digit >>> ((n % MP_DIGIT_BIT))) & 1);
};
/**
  Set a bit of <code>this</code>
  @memberof Bigint
  @instance
  @param {number} n place of bit
*/
Bigint.prototype.setBit = function(n) {
    this.dp[Math.floor(n / MP_DIGIT_BIT)] |= (1 << (n % MP_DIGIT_BIT));
};
/**
  Flip a bit of <code>this</code>
  @memberof Bigint
  @instance
  @param {number} n place of bit
*/
Bigint.prototype.flipBit = function(n) {
    this.dp[Math.floor(n / MP_DIGIT_BIT)] ^= (1 << (n % MP_DIGIT_BIT));
};
/**
  Clear a bit of <code>this</code>
  @memberof Bigint
  @instance
  @param {number} n place of bit
*/
Bigint.prototype.clearBit = function(n) {
    this.dp[Math.floor(n / MP_DIGIT_BIT)] &= ~(1 << (n % MP_DIGIT_BIT));
};
/**
  Construct a bit-mask
  @memberof Bigint
  @instance
  @param {number} n number of bits
  @return {Bigint}
*/
Bigint.prototype.mask = function(n) {
    var ndlen, nblen, mask, ret;
    // or allow zero?
    if (n <= 0) {
        this.dp[0] = Number.NaN;
        return;
    }
    ndlen = Math.floor(n / MP_DIGIT_BIT);
    nblen = n % MP_DIGIT_BIT;

    mask = (1 << nblen) - 1;
    if (ndlen == 0) {
        this.dp = [];
        this.dp[0] = mask;
        this.used = 1;
        this.sign = MP_ZPOS;
        return;
    }
    this.dp = [];
    if (mask) {
        this.dp[ndlen] = mask;
    }
    while (ndlen--) {
        this.dp[ndlen] = MP_MASK;
    }
    this.used = this.dp.length;
    this.sign = MP_ZPOS;
    return;
};

/*
     Modular arithmetic and other number theoretical functions
*/

/**
  Jacobi function.<br>
  First argument can be negative, too.
  @memberof Bigint
  @instance
  @param {Bigint} p positive odd integer
  @return {number} {-1,0,1} or <code>MP_VAL</code> in case of error
*/
Bigint.prototype.jacobi = function(p) {
    var f, b, ret;
    // Mathematica (wolframalpha.com actually) returns zero for p=0
    // but 0 is even!?
    if (p.sign == MP_NEG || p.isZero()) {
        return MP_VAL;
    }
    if(p.isOne()){
        return 1;
    }
    if (p.isEven()) {
        return MP_VAL;
    }
    if (this.isZero()) {
        return 0;
    }
    if (this.sign == MP_NEG) {
        // (-1)^((b-1)/2)
        /*b = p.copy();
        b.decr();
        b.rShiftInplace(1);*/
        b = p.dp[0] - 1;
        b >>>= 1;
        f = (b.isOdd()) ? -1 : 1;
        if (this.isUnity()){
            return f;
        }
        ret = this.abs().kjacobi(p);
        ret *= f;
        return ret;
    } else {
        return this.kjacobi(p);
    }
};
/**
  Unsigned Jacobi-symbol (internal)
  @memberof Bigint
  @instance
  @param {Bigint} p positive odd integer
  @return {number}
  @private
*/
Bigint.prototype.kjacobi = function(p) {
    var aprime, k, s, r, pdigit, adigit, pprime;
    if (this.used == 1) {
        if (this.dp[0] == 0 || this.dp[0] == 1) {
            return this.dp[0];
        }
    }
    s = 0;
    aprime = this.copy();
    k = aprime.lowBit();
    aprime.rShiftInplace(k);
    if (k.isEven()) {
        s = 1;
    } else {
        pdigit = p.dp[0];
        r = pdigit & 7; // equiv. to: r = pdigit % 8;
        if (r == 1 || r == 7) {
            s = 1;
        } else if (r == 3 || r == 5) {
            s = -1;
        }
    }
    pdigit = p.dp[0];
    adigit = aprime.dp[0];
    // equiv. to:
    // if(pdigit % 4 == 3 && adigit % 4 == 3){
    if (((pdigit & 3) == 3) && ((adigit & 3) == 3)) {
        s = -s;
    }
    if (aprime.isOne()) {
        return s;
    } else {
        pprime = p.rem(aprime);
        s = s * pprime.kjacobi(aprime);
    }
    return s;
};


/**
  Modular inverse
  @memberof Bigint
  @instance
  @param {Bigint} b
  @return {Bigint}
*/
Bigint.prototype.modInv = function(b) {
    var x, y, u, v, A, B, C, D;
    if (b.sign == MP_NEG) {
        return MP_VAL;
    }
    if (b.dp[0].isOdd()) {
        return this.fastModInv(b);
    }
    x = this.rem(b);
    y = b.copy();
    if (x.isEven() && y.isEven()) {
        return MP_VAL;
    }
    /* 3. u=x, v=y, A=1, B=0, C=0,D=1 */
    u = x.copy();
    v = y.copy();
    A = new Bigint(1);
    B = new Bigint(0);
    C = new Bigint(0);
    D = new Bigint(1);
    while (!u.isZero()) {
        while (u.used > 0 && u.isEven()) {
            u.rShiftInplace(1);
            if ((A.used > 0 && A.isOdd()) || (B.used > 0 && B.isOdd())) {
                A = A.add(y);
                B = B.sub(x);
            }
            A.rShiftInplace(1);
            B.rShiftInplace(1);
        }
        while (v.used > 0 && v.isEven()) {
            v.rShiftInplace(1);
            if ((C.used > 0 && C.isOdd()) || (D.used > 0 && D.isOdd())) {
                C = C.add(y);
                D = D.sub(x);
            }
            C.rShiftInplace(1);
            D.rShiftInplace(1);
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
    }
    if (!v.isOne()) {
        return MP_VAL;
    }
    while (C.sign == MP_NEG || C.isZero()) {
        C = C.add(b);
    }
    while (C.cmp(b) != MP_LT) {
        C = C.sub(b);
    }
    return C;
};

/**
  @ignore
*/
Bigint.prototype.fastModInv = function(b) {
    var x, y, u, v, A, B, C, D;
    if (b.sign == MP_NEG) {
        return MP_VAL;
    }
    // The author insists on being mean instead of just brutal
    if (b.dp[0].isEven()) {
        return this.modInv(b);
    }
    y = this.rem(b);
    x = b.copy();
    if (y.isEven()) {
        return MP_VAL;
    }
    /* 3. u=x, v=y, A=1, B=0, C=0,D=1 */
    u = x.copy();
    v = y.copy();
    B = new Bigint(0);
    D = new Bigint(1);
    while (!u.isZero()) {
        while (u.used > 0 && u.isEven()) {
            u.rShiftInplace(1);
            if ((B.used > 0 && B.isOdd())) {
                B = B.sub(x);
            }
            B.rShiftInplace(1);
        }
        while (v.used > 0 && v.isEven()) {
            v.rShiftInplace(1);
            if ((D.used > 0 && D.isOdd())) {
                D = D.sub(x);
            }
            D.rShiftInplace(1);
        }
        if (u.cmp(v) != MP_LT) {
            u = u.sub(v);
            B = B.sub(D);
        } else {
            v = v.sub(u);
            D = D.sub(B);
        }
    }
    if (!v.isOne()) {
        return MP_VAL;
    }
    while (D.sign == MP_NEG || D.isZero()) {
        D = D.add(b);
    }
    D.sign = this.sign;
    return D;
};

/**
  Barrett reduction, slower than division
  @memberof Bigint
  @instance
  @param {Bigint} bint
  @return {Bigint}
*/
Bigint.prototype.barrettreduce = function(bint) {
    var calcmu = function(m, b) {
        var mu = new Bigint(1);
        mu = mu.lShift(2 * MP_DIGIT_BIT * m);
        return mu.div(b);
    };
    var blen;
    var ret, q, mu;
    // checks and balances
    blen = bint.used;
    q = this.copy();
    q.drShiftInplace(blen - 1);
    mu = calcmu(blen, bint);

    if (blen > (1 << (MP_DIGIT_BIT - 1))) {
        q = q.mul(mu);
    } else {
        q = q.mulhighdigs(mu, blen);
    }

    q.drShiftInplace(blen + 1);
    ret = this.mod2d(MP_DIGIT_BIT * (blen + 1));
    q = q.muldigs(bint, blen + 1);
    ret = ret.sub(q);
    if (ret.sign == MP_NEG) {
        q = new Bigint(1);
        q.dlShiftInplace(blen + 1);
        ret = ret.add(q);
    }
    while (ret.cmp(bint) != MP_LT) {
        ret = ret.sub(bint);
    }
    return ret;
};

/**
  Modular exponentiation
  @memberof Bigint
  @instance
  @param {Bigint|number} exp exponent
  @param {Bigint|number} mod modulus
  @return {Bigint}
*/
Bigint.prototype.powmod = function(exp, mod) {
    var z1, ret;
    if (typeof exp === "number") {
        exp = exp.toBigint();
    }
    if (typeof mod === "number") {
        mod = mod.toBigint();
    }
    if (mod.isZero() || mod.sign == MP_NEG) {
        return (new Bigint()).setNaN();
    }
    if (exp.sign == MP_NEG) {
        return (new Bigint()).setNaN();
    }
    if ((this.isZero() && !exp.isZero()) || mod.isOne()) {
        return new Bigint(0);
    }
    if (exp.isZero()) {
        return new Bigint(1);
    }
    if (mod.isTwo()) {
        if (this.isOdd()) {
            return new Bigint(1);
        } else {
            return new Bigint(0);
        }
    }
    if (this.isUnity() && (this.sign == MP_NEG || exp.isEven())) {
        return new Bigint(1);
    }
    if (this.sign == MP_NEG || this.cmp(mod) != MP_LT) {
        z1 = this.rem(mod);
    } else {
        z1 = this.copy();
    }
    if (z1.isZero()) {
        return new Bigint(0);
    }
    if (z1.isOne()) {
        return new Bigint(1);
    }
    // TODO: include Montgomery etc.

    var ret = new Bigint(1);
    var e = exp.copy();
    while (e.isZero() == MP_NO) {
        if (e.isOdd() == MP_YES) {
            ret = ret.mul(z1).rem(mod);
        }
        z1 = z1.sqr().rem(mod);
        e.rShiftInplace(1);
    }
    return ret;
};
/**
  Modular multiplication
  @memberof Bigint
  @instance
  @param {Bigint|number} bint multiplicant
  @param {Bigint|number} mod modulus
  @return {Bigint}
*/
Bigint.prototype.mulmod = function(bint, mod){
    var t1, t2;
    if (typeof exp === "number") {
        bint = bint.toBigint();
    }
    if (typeof mod === "number") {
        mod = mod.toBigint();
    }
    if(mod.isZero()){
        return (new Bigint()).setNaN();
    }
    if(this.isZero() || bint.isZero()){
        return new Bigint(0);
    }

    if(this.isOne()){
        return bint.rem(mod);
    }
    if(bint.isOne()){
        return this.rem(mod);
    }
    // Argument reducing
    // (a * b) % m = ((a % m) * (b % m)) % m
    t1 = this.rem(mod);
    t2 = bint.rem(mod);
    return t1.mul(t2).rem(mod);
};

/*
   Prime testing and factorization
*/

/**
  Test if <code>this</code> is a perfect square.<br>
  A little bit faster than computing a square root alone. Does not accept
  negative input. Takes 0 (zero) and 1 (one) as perfect squares, too.
  @memberof Bigint
  @instance
  @return {bool} or <code>MP_VAL</code> in case of an error
*/
Bigint.prototype.isPerfectSquare = function() {
    var sqrtn, lastsix, lasthex;

    // The last six bits of a perfect square must be one of these numbers
    lastsix = [0x00, 0x01, 0x04, 0x09, 0x10, 0x11, 0x19, 0x21, 0x24, 0x29,
        0x31, 0x39
    ];
    lasthex = this.dp[0] & 0x3f;

    if (this.sign == MP_NEG) {
        return MP_VAL;
    }
    if (this.isZero() || this.isOne()) {
        return MP_YES;
    }
    if (lastsix.indexOf(lasthex) < 0) {
        return MP_NO;
    }

    sqrtn = this.sqrt();
    if (sqrtn.sqr().cmp(this) == MP_EQ) {
        return MP_YES;
    } else {
        return MP_NO;
    }
};

/**
  Test if <code>this</code> is a small prime.<br>
  Numbers up to <code>34,155,071,728,320</code> are accepted.
  @memberof Bigint
  @instance
  @return {bool} or <code>MP_VAL</code> in case of an error
*/
Bigint.prototype.isSmallPrime = function() {
    var n, k, sqrtn, primes;
    if (this.isEven()) {
        return MP_NO;
    }
    if (this.used > 1) {
        if (this.cmp((34155071728321).toBigint()) == MP_LT) {
            return this.isPseudoprime();
        } else {
            return MP_VAL;
        }
    }
    n = this.dp[0];
    sqrtn = Math.floor(Math.sqrt(n));
    if (sqrtn * sqrtn == n) {
        return MP_NO;
    }
    // sqrt(2^26) = 8192 and pi(8192) = 1028
    primes = primesieve.primeRange(0, sqrtn);
    for (k = 0; k < primes.length; k++) {
        if (Math.floor(n / primes[k]) == (n / primes[k] * 1.0)) {
            return MP_NO;
        }
    }
    return MP_YES;
};

/**
  Test if <code>this</code> is divisible by <code>d</code> without remainder
  @memberof Bigint
  @instance
  @param {Bigint|number} d divisor
  @return {bool}
*/
Bigint.prototype.divisible = function(d) {
    var r;
    if (typeof d === "number") {
        d = d.toBigint();
    }
    r = this.rem(d);
    if (!r.isZero()) {
        return MP_NO;
    }
    return MP_YES;
};

/**
  Miller-Rabin test
  @memberof Bigint
  @instance
  @param {number} base Miller-Rabin base
  @return {bool}
  @private
*/
Bigint.prototype.rabinMiller = function(base) {
    var zbase, zNm1, zd, zrem, s, k;

    zbase = base.toBigint();
    zNm1 = this.subInt(1);
    s = this.lowBit();

    zd = zNm1.rShift(s);
    zrem = zbase.powmod(zd, this);

    if (zrem.isOne()) {
        return MP_YES;
    }

    if (zrem.cmp(zNm1) == MP_EQ) {
        return MP_YES;
    }
    for (k = 1; k < s; k++) {
        zrem = zrem.mulmod(zrem);
        if (zrem.cmp(zNm1) == MP_EQ) {
            return MP_YES;
        }
    }
    return MP_NO;
};

/**
  Test if <code>this</code> is a pseudo prime.<br>
  Primes up to <code>34,155,071,728,247</code> are certified primes.<br>
  Timing for 2^200 + 235, 61 decimal digits: ~2,5 sec. on an old 1 GHz Duron
  Timing for 2^200 - 75,  61 decimal digits: ~3.8 sec.
  @memberof Bigint
  @instance
  @return {bool} or <code>MP_VAL</code> in case of an error
*/
Bigint.prototype.isPseudoprime = function() {
    var sqrtN, qmax, primes, k;

    // Step 1: simple cases
    if (this.isEven()) {
        return MP_NO;
    }
    if (this.used == 1) {
        return this.isSmallPrime();
    }

    // Step 2: trial division
    qmax = this.highBit() + 1;
    if (qmax < 36) {
        qmax = 36;
    }
    primes = primesieve.primeRange(0, qmax);
    for (k = 0; k < primes.length; k++) {
        if (this.cmp(primes[k].toBigint()) == MP_EQ) {
            return MP_YES;
        }
        if (this.divisible(primes[k].toBigint()) == MP_YES) {
            return MP_NO;
        }
    }
    // Step 2a: see if we did an already exhaustive test
    sqrtN = this.sqrt();
    if (sqrtN.cmp(qmax.toBigint()) != MP_GT) {
        return MP_YES;
    }

    // Step 3a: check if we have a perfect square
    if (sqrtN.sqr().cmp(this) == MP_EQ) {
        return MP_NO;
    }

    // Step 3b: some rounds of Miller-Rabin (bases 2, 3, 5, 7, 11, 13 and 17)
    for (k = 0; k < 8; k++) {
        // Miller-Rabin does not return false positives
        if (this.rabinMiller(primes[k]) == MP_NO) {
            return MP_NO;
        }
    }
    // Step 4: all primes below 34155071728321 are surely prime now
    if (this.cmp((34155071728321).toBigint()) == MP_LT) {
        return MP_YES;
    }
    /* TODO:
       // Step 5: Lucas-Selfridge test
       if(this.lucasSelfridge() == MP_NO){
          return MP_NO;
       }
       
       // Step 6: strong Lucas-Selfridge test
       return this.strongLucasSelfridge();
    */
    return MP_YES;
};

/**
  Miller-Rabin test
  @memberof Bigint
  @instance
  @param {number} base Miller-Rabin base
  @return {bool}
  @private
*/
Bigint.prototype.rabinMiller = function(base) {
    var zbase, zNm1, zd, zrem, s, k;

    zbase = base.toBigint();
    zNm1 = this.subInt(1);
    s = this.lowBit();

    zd = zNm1.rShift(s);
    zrem = zbase.powmod(zd, this);

    if (zrem.isOne()) {
        return MP_YES;
    }

    if (zrem.cmp(zNm1) == MP_EQ) {
        return MP_YES;
    }
    for (k = 1; k < s; k++) {
        zrem = zrem.mulmod(zrem);
        if (zrem.cmp(zNm1) == MP_EQ) {
            return MP_YES;
        }
    }
    return MP_NO;
};

