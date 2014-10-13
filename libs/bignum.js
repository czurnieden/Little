"use strict"

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
// to work"

/*
  This code contains parts of Libtommath (public domain) and some ports of
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
   the license is a problem.
*/

/*
  TODO: Quite a lot.

  - should be modern but also kept legible and easy to follow.
  - some things are superfluous
  - in urgent need of correct error-checking with try/catch and error throw-ing
  - some of the inner loops can make use of multiple cores/processors
    but the thread-like Worker() is quite restricted, so it may or may not of
    any use here
  - Make use of a general namespace for all of the global variables
    (Bignum or something which will make sense after adding of a Bigfloat )
  - ECMA 5 offers typed arrays, check if Uint32Array do the job better
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
// future.
var MP_PREC = 5;
// Flag for positive value
var MP_ZPOS = 1;
// Flag for negative value
var MP_NEG = -1;

// Comparing
b// less than
var MP_LT = -1;
// equal
var MP_EQ =  0;
// greater than
var MP_GT =  1;

// Errors
var MP_OKAY = 0;
// Input wrong
var MP_DOMAIN = -2;
var MP_VAL  = -3;
// Output out of range (mostly too large)
var MP_RANGE = MP_VAL;
// Function not supported (come back later)
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

// Cut-offs for fast multiplication

var KARATSUBA_MUL_CUTOFF = 125;
var KARATSUBA_SQR_CUTOFF = 200;
/*
var TOOM_MUL_CUTOFF;
var TOOM_SQR_CUTOFF;

var FFT_MUL_CUTOFF;
var FFT_UPPER_LIMIT; // only if NTT is not implemented
var FFT_SQR_CUTOFF;

var NTT_MUL_CUTOFF;
var NTT_SQR_CUTOFF;

var TOOM_COOK_4_MUL_CO;
var TOOM_COOK_4_SQR_CO;

var TOOM_COOK_5_MUL_CO;
var TOOM_COOK_5_SQR_CO;
*/


// Bits per digit. See below for details
var MP_DIGIT_BIT = 26;
// Digit mask (e.g.: 0x3fffffff for 30 bit long digits)
var MP_MASK = ((1<<MP_DIGIT_BIT)-1);
// Too large a digit by one.
var MP_DIGIT_MAX = (1<<MP_DIGIT_BIT);

// Some limits regarding floating point size (unused, came for Tom Wu's stuff)
// maximum usable bits in mantissa
var MP_FLOAT_BIT = 52;
// maximum number (4,503,599,627,370,496 with the 52 bits from above)
var MP_FLOAT_MAX = Math.pow(2,52);
// difference to MP_DIGIT_BIT (22)
var MP_FLOAT_DIGIT_DIFF = MP_FLOAT_BIT - MP_DIGIT_BIT;
// excess bits to be taken care of when multiplying (8 with the above cases)
var MP_FLOAT_2_DIGIT_DIFF = 2 * MP_DIGIT_BIT - MP_FLOAT_BIT;

Number.INT_MAX   =  9007199254740992; // 2^53

// Memory for some of the bit-juggling below
var double_int = new DataView(new ArrayBuffer(8));

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

  Throws a FatalError which you may or may not catch.
*/
var __bigint_check_endianess = (function () {
  try {
    var buffer = new ArrayBuffer(8);
    var strerror = 'Bigint was written for a little-endian system only, sorry.';
    var MP_ENDIANESS_TEST_32 = new Int32Array(buffer);
    var MP_ENDIANESS_TEST_8 = new Uint8Array(buffer);
    MP_ENDIANESS_TEST_32[0] = 0xff;
    if (MP_ENDIANESS_TEST_8[3] === 0xff && MP_ENDIANESS_TEST_8[0] === 0) {
      throw {
        name: 'FatalError',
        message: strerror
      };
    }
  } 
  catch (e) {
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

Array.prototype.memset = function(x){
  for(var i = 0;i<this.length;i++){
    this[i] = x;
  }
};
/*
 * generalized, extendable "typeof" function
 */
function xtypeof(obj){
  // try it the traditional way
  var tmp = typeof obj;
  if( tmp !== "object"){
    return tmp;
  }
  else{
    // try the toString prototype
    var toString = Object.prototype.toString;
    tmp = toString.call(obj);
    // it is one of the build-ins
    if(tmp !== "[object Object]"){
      return tmp.slice(8, -1).toLowerCase();
    }
   /* else{
      // Put your own objects here
      // they must exist at this point
      var list = {
                  "bigint":Bigint,
                  "complex":Complex
                 };
      for(var p in list){
        if(obj instanceof list[p]){
          return p;
        }
    }
    */
    return "object";
  }
}

/*
 * All functions implemented by prototyping to avoid name-clashes
 * E.g.: ther is a Number.isNaN but no Number.prototype.isNaN
 * but mainly to support a common codebase, such that it will not matter if the
 * variable A in A.isNaN() is a Bigint, a Number, a Bigfloat, or anything else.
 */

// uses the global object which auto-converts numbers!
Number.prototype.isNaN = function(){
  return isNaN(this); 
};
// Does not use the new Number.isFinite for reasons layed down
// in blog post TODO: look-up URL
Number.prototype.isFinite = function(){
  if ( isNaN(this) || this === Infinity || this === -Infinity) {
    return false;
  }
  return true;
};
// Danger: will return inexact results for numbers > 2^53!
Number.prototype.isEven = function(){
  return (this%2 == 0);
};
// Danger: will return inexact results for numbers > 2^53!
Number.prototype.isOdd = function(){
  return (this%2 == 1);
};
//TODO: check for exceptions (NaN, Inf)
Number.prototype.sign = function(){
  return (this<0)?MP_NEG:MP_ZPOS;
};

/*
 *  Most of the following functions assume 32-bit little-endina integers.
 */

Number.prototype.lowBit = function(){
  if (this == 0)
    return 0;
  var ret = 0>>>0, x = this>>>0;
  while ((x & 1) == 0){
    x >>>= 1;
    ret++;
  }
  return ret;
};

// http://graphics.stanford.edu/~seander/bithacks.html
Number.prototype.highBit = function(){
  if (this == 0)
    return 0;
  var bits = [0x2, 0xC, 0xF0, 0xFF00, 0xFFFF0000];
  var Shift = [1, 2, 4, 8, 16];
  var ret = 0>>>0, x = this>>>0;
  for (var i = bits.length -1; i >= 0; i--){
    if (x & bits[i]){
      x >>>= Shift[i];
      ret |= Shift[i];
    } 
  }
  return ret;
};

// this is a function with a limit of MP_DIGIT_BIT instead of 32!
Math.isPow2 = function(b){
   var x = 0>>>0;
   /* fast return if no power of two */
   if ((b==0) || (b & (b-1))) {
      return 0;
   }
   for (; x < MP_DIGIT_BIT; x++) {
      if (b == (1<<x)) {
         return true;
      }
   }
   return false;
};
// this is a function with a limit of 32
Number.prototype.isPow2 = function(b){
   var x = 0>>>0;
   /* fast return if no power of two */
   if ((b==0) || (b & (b-1))) {
      return 0;
   }
   for (; x < 32; x++) {
      if (b == (1<<x)) {
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
}

// TODO: find out what the hell I tried to do with _that_ abomination!
String.prototype.toXDigits = function(){
  var s = this;
  var ret = "";
  var xdigit = "/[\u0030-\u0039\u0041-\u0046\u0061-\u0066]/";
               // Rest of Unicode xdigits
               // "\uff10-\uff19\uff21-\uff26\uff41-\uff46]/";
  var rgx  = new RegExp(eval(xdigit));
  for(var i = 0;i<s.length;i++){
    if(rgx.test(s.charAt(i)))
      ret += s.charAt(i);
  }
  return ret;
};

// written for isOk() but not (yet?) used
Number.prototype.isSubnormal = function(){
    var high = 0 >>> 0;
    double_int.setFloat64(0, this);
    high = double_int.getUint32(4);
    if(high<0x00100000)
      return true;
    return false;
};

// contains code from SunPro, see license at the start of this file
Number.prototype.ieee_754_isNaN = function(){
  var high,low,nan;
  double_int.setFloat64(0, x);
  high = double_int.getInt32(0);
  low = double_int.getInt32(4);
  high &= 0x7fffffff;
  high |= (low|(-low))>>>31;
  high = 0x7ff00000 - high;
  nan = (high>>>31)|0;
  return (nan)?true:false;
};

// subnormals are ok?
Number.prototype.isOk = function(){
  return ( !this.isNaN() && this.isFinite() )?MP_YES:MP_NO;
};

Number.prototype.isInt = function(){
  if(!this.isOk()){
    return MP_NO;
  }
  /* ECMA 6 (Draft). Impl. by Firefox ( >= 32 ) only toBi
  if(Number.isSafeInteger){
    return ( Number.isSafeInteger(this) )?MP_YES:MP_NO;
  }
  else{*/
    if(   this > -9007199254740992 
       && this <  9007199254740992 
       && Math.floor(this) == this )
      return MP_YES;
  /* } */
  return MP_NO;
};


// Checks if the number fits into one big-digit
Number.prototype.issmallenough = function(){
  if(!this.isInt()  || (Math.abs(this) >= MP_DIGIT_MAX)){
    return false
  }
  return true;
};

// number of bits set (Hamming weight)
// http://graphics.stanford.edu/~seander/bithacks.html
Number.prototype.setBits = function(){
  if (this == 0)
    return 0;
  var x = this>>>0;
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
};



/*
  Prototype of Bigint.
  Parameters: a small integer (<  MP_DIGIT_MAX).
  Return: none.
*/
function Bigint(n){
  // memory for digits, preallocated to hold at least five digits
  this.dp = new Array(MP_PREC);
  // Set all to zero (keep it simpel)
  for(var i= this.dp.length-1;i>=0;i--){
     this.dp[i] = 0>>>0;
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
  if( xtypeof(n) === 'number' && Math.abs(n) <  MP_DIGIT_MAX){
    this.dp[0] = Math.abs(n);
    this.sign = (n<0)?MP_NEG:MP_ZPOS;
  }
}
// Ones and zeros are always useful especially in binary arithmetic but
// it is probably easier to do the "new Bigint(0)" directly
Bigint.ZERO = new Bigint(0);
Bigint.ONE  = new Bigint(1);

/*
  We don't need an extra init() function since new Bigint() already does that, 
  but we need something to clean up; the size of the Array holding the digits
  can get quite large and even a lot of small ones can sum up.

  We cannot free the memory directly, we are only able to give the GC a change
  to do it for us.
  There are four methods available:

    1) arr.length = 0;
    2) arr = null;
    3) delete arr;
    4) arr = [];

   A benchmark tool is available at http://jsperf.com/array-destroy which says
   that for my test-browser (Firefox 31.0 on Debian squeeze, ia32 single-core)
   the method number two is the best by a magnitude (15 times better than number
   three which came second itself beeing two times faster than the last place
   number one). YMMV, so test for yourself but that page includes a frame from
   browserscope (click on "family" to see what I have seen) which seems to lead
   to the conlusion that the method with null is fast on every common browser.

   The page above has several versions of  it which I saw too late, so with the
   latest version ( http://jsperf.com/array-destroy/105 ) and a lot more methods
   to clean up an Array (but not the one setting it to null, why?). The fastest
   methods within that set are loops of the kind

     while (arr.length > 0) {
       arr.pop();
     }

   with both shift() and pop(). The method with null would be still faster but
   only for a fraction.
   
   TODO: test if splice/slice to tmp-var and setting tmp-var to null makes sense
*/

Bigint.prototype.clear = function(){
  this.dp = null;
  this.used = null;
  this.alloc = null;
  this.sign = null;
  //void MP_CLEAR(this);
};
/*
function MP_CLEAR(bi){
  delete bi;
}
*/

// avoid mess
Bigint.prototype.clamp = function(){
  while(this.used > 1 && (this.dp[this.used-1] == 0 || isNaN(this.dp[this.used-1])) ) this.used--;
  this.dp.length = this.used;
  this.alloc =  this.used;
};
// print all four bytes even if zero (little endian)
Number.prototype.toHex32 = function(uppercase){
  var t     = this;
  var lower = "0123456789abcdef";
  var upper = "0123456789ABCDEF";
  var rcase = uppercase||false;
  var ret   = "";

  rcase = (rcase)?upper:lower;
  if(t == 0){return "0";}  
  for(var i = 0;i<8;i++){
    ret = rcase.charAt((t&0xF)) + ret;
    t >>>= 4;
  }
  return ret;
};
Bigint.prototype.toString = function(radix){
  var mp_s_rmap = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  var  ret;
  var  t;
  var  d = 0|0;
  var  s = "";
  var sign = this.sign;

  if(!radix)
    radix = 10;

  if(this.isNaN()){
    return "NaN";
  }
  if(this.isInf()){
    return (this.isNegInf())?"-Infinity":"Infinity";;
  }
  // check for zero or single digit bigint
  if(this.isZero() == MP_YES){
    return (sign < 0)?"-0":"0";
  }
  if(this.isUnity() == MP_YES){
    return (sign < 0)?"-1":"1";
  }
  if(this.used == 1 && radix < 37 ){
    // this.sign is either one or minus one
    return (this.dp[0]*this.sign).toString(radix);
  }

  // compute decimal from bigint now

  // we _could_ implement radix 1, too! Bwaaaaaahahahaha...*hem*
  if (radix < 2 || radix > 62) {
    return "Radix is out of range, should be 1<radix<63, and not: " + radix;
  }

  /*

  if(radix == 2){
    for(var i = 0;i<this.used -1;i++){
      var tmp = this.dp[i];
      for(var j=0;j<MP_DIGIT;j++){
        s += (t&0x1 == 1)?"1":"0";
        t >>>= 1;
      }
    }
    return  (sign < 0)?"-" + s: s;
  }
   */

  // Work on copy.
  t = this.copy();
  t.sign = MP_ZPOS;

  /*
  // assumes 26 bit digits
  if(radix == 16){
    //s += (t.sign == MP_NEG)?"-":"";
    var current_length = t.used;
    var tmp;
    // the case of a single digit has been catched above, the loop will run
    // at least once
    while(current_length-1 > 0){
      // we need to fill 32 bit. 32-26 = 6, mask = 0x3f
      // take it from the digit above if it exists
      if(current_length-1 >= 2){
        tmp = t.dp[0] | ( ( ( t.dp[1] & 0x3f ) << 26 ) & 0xffffffff );
      }
      else {
        tmp = t.dp[0];
      }
      // add it to the result string
      s += tmp.toHex32();
      // divide by 2^32
      t.rShiftInPlace(32);
      // adjust anchor
      current_length = t.used;
      // check if something is left
      if(t.used == 0){
        if(t.dp[0] != 0){
          // use toString() here to avoid leading zeros
          s += t.dp[0].toString(16);
        }
        // it's the last one, let's get some coffee and make a break
        break;
      }
    }
    return (sign < 0)?"-" + s: s;
  }
  */


  // this is veeeeery slow
  while ( t.isZero() == MP_NO) {
    ret = t.divremInt(radix);
    t = ret[0];
    d = ret[1].dp[0];
    s += mp_s_rmap[d];
  }

  s += (sign == MP_NEG)?"-":"";

  // reverse the digits of the string.
  s = s.asciireverse();
  return s;
};

// more or less quite shamelessly stolen from libtommmath's mp_read_radix
// does not make use of exponent given. No Prefixes (e.g. 0x, 0b, 0) allowed.
String.prototype.toBigint = function(radix){
  var mp_s_rmap = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  var     y, res, neg;
  var    ch,strlen,charnum;

  var str = this;

  if(!radix){
    radix = 10;
  }

  if (radix < 2 || radix > 62) {
    return "Radix is out of range, should be 1<radix<63, not: " + radix;
  }

  if(str.charAt(0) == '-'){
    neg = MP_NEG;
  }
  else{
    neg = MP_ZPOS;
  }

  if(str.charAt(0) == '-' ||str.charAt(0) == '+'  ){
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
  if(radix < 36){
    str = str.toUpperCase();
  }

  // left (high) to right (low)
  for(var i = 0 ; i < strlen ; i++){
    ch = str.charAt(i);
    charnum = mp_s_rmap.indexOf(ch);
    if(charnum < radix){
      ret = ret.mulInt(radix);
      if(charnum != 0)ret = ret.addInt(charnum);
    }
    else {
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
Number.prototype.toBigint = function(){
  var ret = new Bigint(0);
  // Check Number
  if(!this.isOk() || !this.isInt()){
    ret.setNaN();
    return ret;
  }

  // Check if Number is integer and smaller than MP_DIGIT_MAX for direct use
  if(this.issmallenough()){
    ret.dp[0] = Math.abs(this);
    ret.sign = (this < 0 )?MP_NEG:MP_ZPOS;
    return ret;
  }
  var temp = Math.abs(this);
  var sign = (this < 0 )?MP_NEG:MP_ZPOS;

  ret.dp[0] =  this & MP_MASK;
  ret.dp[1] = Math.floor(this/MP_DIGIT_MAX)&MP_MASK;
  ret.used = 2;

  ret.clamp();
  return ret;
};

Bigint.prototype.issmallenough = function(){
  // TODO: we can use two bigdigits if MP_DIGIT_BIT <= 26
  //       than change Bigint.prototype.toNumber accordingly
  if(this.used > 1){
    return false
  }
  return true;
};

Bigint.prototype.isOk = function(){
  if(this.isNaN || !this.isFinite()){
    return false;
  }
  return true;
};

Bigint.prototype.toNumber = function(){
  // Check Bigint
  if(!this.isOk()){
    // the IEEE-754 conformant extras are in the first bigdigit
    return this.dp[0];
  }
  // Check if Bigint is already small enough to fit into a Number directly
  if(this.issmallenough()){
    var ret = 0;
    // press an unsigned value
    ret = this.dp[0]>>>0;
    if(this.sign == MP_NEG){
      ret *= -1;
    }
    return ret;
  }

  // Shift Bigint right until 52 bits (two digits) are left, keep shift-#
  // No need to actually shift it, just take the two MSB-bigdigits
  var bd_high = this.dp[this.used-1], bd_low = this.dp[this.used-2];

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
  bd_high *= Math.pow(2, (this.used-3) * MP_DIGIT_BIT);

  if(this.sign == MP_NEG){
      bd_high *= -1;
  }
  return bd_high;
};

// does deep copy of THIS
Bigint.prototype.copy = function(){
  var tt;
  tt = new Bigint(0);
  tt.dp = new Array(this.used);
  tt.used = this.used;
  tt.alloc = this.used;
  tt.sign = this.sign; 
  var i = this.used;
  while(i--) { tt.dp[i] = this.dp[i];}
  return tt;
};

Bigint.prototype.dup = function(){
  return this.copy();
};

// swap with deep copy (probably)
Bigint.prototype.swap = function(target){
  var tmp = target.copy();
  target = this.copy();
  var i = tmp.used-1;
  while(i--) { this.dp[i] = tmp.dp[i]; }
  this.sign = tmp.sign;
  this.used = tmp.used;
  this.alloc = tmp.alloc;
  tmp.dp = null;
};
// swap with shallow copy (probably) unsure, don't use!
Bigint.prototype.exch = function(target){
  var tmp = target;
  target = this;
  var i = tmp.used-1;
  this.dp = tmp.dp
  this.sign = tmp.sign;
  this.used = tmp.used;
  this.alloc = tmp.alloc;
};

// change sign, returns full copy, "this" stays unchanged
Bigint.prototype.neg = function(){
  var ret = this.copy();
  if(this.sign == MP_ZPOS){
    ret.sign = MP_NEG;
  }
  else{
    ret.sign = MP_ZPOS;
  }
  return ret;
};

// make positive, returns full copy, "this" stays unchanged
Bigint.prototype.abs = function(){
  var ret = this.copy();
  if(this.sign == MP_NEG){
    ret.sign = MP_ZPOS;
  }
  return ret;
};

/* Some useful tools and a very small bit of IEEE compliance */
// this == 0
Bigint.prototype.isZero = function(){
  if( this.used == 1 && this.dp[0] == 0)
    return MP_YES;
  return MP_NO;
};
// this == +1
Bigint.prototype.isOne = function(){
  if( this.used == 1 && this.sign == MP_ZPOS && this.dp[0] == 1)
    return MP_YES;
  return MP_NO;
};
// this == +1 || this == -1
Bigint.prototype.isUnity = function(){
  if( this.used == 1 && this.dp[0] == 1)
    return MP_YES;
  return MP_NO;
};
// this < 0
Bigint.prototype.isNeg = function(){
  return (this.sign == MP_ZPOS)?MP_NO:MP_YES; 
};
// this > 0
Bigint.prototype.isPos = function(){
  return (this.sign == MP_NEG)?MP_NO:MP_YES; 
};
Bigint.prototype.isEven = function(){
  return (this.dp[0].isOdd())?MP_NO:MP_YES; 
};
Bigint.prototype.isOdd = function(){
  return (this.dp[0].isEven())?MP_NO:MP_YES; 
};

Bigint.prototype.setNaN = function(){
  this.dp[0] = Number.NaN;
};
Bigint.prototype.isNaN = function(){
  return Number.isNaN(this.dp[0]);
};

Bigint.prototype.setNegInf = function(){
  this.dp[0] = Number.NEGATIVE_INFINITY;
};
Bigint.prototype.isNegInf = function(){
  return  (this.dp[0] == Number.NEGATIVE_INFINITY)?MP_YES:MP_NO; 
};

Bigint.prototype.setPosInf = function(){
  this.dp[0] = Number.POSITIVE_INFINITY;
};
Bigint.prototype.isPosInf = function(){
  return  (this.dp[0] == Number.POSITIVE_INFINITY)?MP_YES:MP_NO; 
};


Bigint.prototype.setInf = function(){
  this.dp[0] = Number.POSITIVE_INFINITY;
};
Bigint.prototype.isInf = function(){
  return  (this.isPosInf() || this.isNegInf())?MP_YES:MP_NO; 
};

Bigint.prototype.isFinite = function(){
  return  ( this.dp[0].isFinite() )?MP_YES:MP_NO; 
};


// highest bit set (e.g.: 22 = 0b10110, returns 5)
Bigint.prototype.highBit = function(){
  if(this.used == 1)
    return this.dp[0].highBit();
  else
    return MP_DIGIT_BIT*(this.used-1)+( this.dp[this.used-1].highBit() );
};
// lowest bit set (e.g.: 22 = 0b10110, returns 2)
Bigint.prototype.lowBit = function(){
  if(this.used == 1)
    return this.dp[0].lowBit();
  else{
    var count = 0;
    while(this.dp[count] == 0 && count < this.used )count++;
    return this.dp[count].lowBit()+count*MP_DIGIT_BIT;
  }
};
// number of bits set (e.g.: 22 = 0b10110, returns 3)
// Awkward function name caused by function setBit()--which actually sets bits--
// the english grammar, and a clash of cultures (I just couldn't be persuaded to
// call the function hammingWeight).
Bigint.prototype.numSetBits = function(){
  if(this.used == 1)
    return this.dp[0].setBits();
  else{
    var count = 0;
    var n = this.used;
    while(n){
      count+(this.dp[--n]).setBits();
    }
    return count;
  }
};
// TODO: check input!
// shift left big-digit-wise
Bigint.prototype.dlShift = function(i){
  var ret = this.copy();
  if(i <= 0){
    return ret;
  }
  var tmp = [];
  //for (var k = 0; k < i; ++k) tmp[k] = 0>>>0;
  while(i--) tmp[i] = 0>>>0;
  ret.dp = tmp.concat(ret.dp);
  ret.used = this.used + i;
  return ret;
};
Bigint.prototype.dlShiftInplace = function(i){
  if(i <= 0){
    return;
  }
  var tmp = [];
  //for (var k = 0; k < i; ++k) tmp[k] = 0>>>0;
  while(i--) tmp[i] = 0>>>0;
  this.dp = tmp.concat(this.dp);
  this.used += i;
};
// shift right big-digit-wise, returns 0 if shift is bigger or equal length
Bigint.prototype.drShift = function(i){
  var ret;
  if(this.used < i){
    ret = new Bigint();
    ret.dp[0] = 0;
    ret.used  = 1;
    ret.sign = MP_ZPOS;
    return ret;
  }
  ret = new Bigint();
  if(i <= 0){
    // Alternative: return dlShift (like GP/PARI for example)
    return ret;
  }
  ret.dp = this.dp.slice(i,this.used );
  ret.used = ret.dp.length;
  ret.sign = this.sign;
  return ret;
};
// shift right big-digit-wise, returns 0 if shift is bigger or equal length
Bigint.prototype.drShiftInplace = function(i){
  if(i <= 0){
    return;
  }
  if(this.used < i){
    this.dp[0] = 0;
    this.used  = 1;
    this.sign = MP_ZPOS;
  }

  this.dp = this.dp.slice(i,this.used );
  this.used = this.dp.length;
};
// shift left bit-wise
Bigint.prototype.lShift = function(i){
  var dlshift = Math.floor(i/MP_DIGIT_BIT);
  var  lshift = i%MP_DIGIT_BIT;
  var r,rr,k;
  var ret;

  if(i<=0){
   return ret;
  }

  ret = this.copy()
  ret.dlShiftInplace(dlshift);
  if(lshift == 0){
    return ret;
  }

  var mask = (1 << lshift)-1;
  var shift = MP_DIGIT_BIT - lshift;

  r = 0;
  for(k = 0;k<ret.used;k++){
    rr = (ret.dp[k] >>> shift) & mask;
    ret.dp[k] = ( ( ret.dp[k] << lshift ) | r ) & MP_MASK;
    r = rr;
  }
  if (r != 0){
     ret.dp[k] = r;
  }
  ret.clamp();
  return ret;
};
Bigint.prototype.lShiftInplace = function(i){
  var dlshift = Math.floor(i/MP_DIGIT_BIT);
  var  lshift = i%MP_DIGIT_BIT;
  var r,rr,k;
  if(i<=0){
   return ;
  }

  this.dlShiftInplace(dlshift);
  if(lshift == 0){
    return ;
  }

  var mask = (1 << lshift)-1;
  var shift = MP_DIGIT_BIT - lshift;

  r = 0;
  for(k = 0;k<this.used;k++){
    rr = (this.dp[k] >>> shift) & mask;
    this.dp[k] = ( ( this.dp[k] << lshift ) | r ) & MP_MASK;
    r = rr;
  }
  if (r != 0){
     this[k] = r;
  }
  this.clamp();
};

// shift right bit-wise
Bigint.prototype.rShift = function(i){
  var ret = this.copy();
  if (i <= 0){
    return ret;
  }

  if(this.highBit() < i){
    ret.dp[0] = 0;
    ret.used  = 1;
    ret.sign = MP_ZPOS;
    return ret;
  }

  var drshift = Math.floor(i/MP_DIGIT_BIT);
  var  rshift = i%MP_DIGIT_BIT;
  var r,rr;

  ret.drShiftInplace(drshift);

  if(rshift == 0){
    return ret;
  }

  var mask = (1<<rshift)-1;
  var shift = MP_DIGIT_BIT - rshift;

  r = 0;

  for(var k=ret.used-1 ; k>=0 ; k-- ){
     rr = ret.dp[k] & mask;
     ret.dp[k] = (ret.dp[k] >>> rshift) | (r << shift);
     r = rr
  }
  ret.clamp();

  return ret;
};
Bigint.prototype.rShiftInplace = function(i){
  if (i <= 0){
    return;
  }
  if(this.highBit() < i){
    this.dp[0] = 0;
    this.used  = 1;
    this.sign = MP_ZPOS;
    return;
  }

  var drshift = Math.floor(i/MP_DIGIT_BIT);
  var  rshift = i%MP_DIGIT_BIT;
  var r,rr;

  this.drShiftInplace(drshift);

  if(rshift == 0){
    return ret;
  }

  var mask = (1<<rshift)-1;
  var shift = MP_DIGIT_BIT - rshift;

  r = 0;

  for(var k=this.used-1 ; k>=0 ; k-- ){
     rr = this.dp[k] & mask;
     this.dp[k] = (this.dp[k] >>> rshift) | (r << shift);
     r = rr
  }
  this.clamp();
};

Bigint.prototype.mul_digs = function(bi,digs){
  var  t;
  var    res, pa, pb, ix, iy;
  var u;
  var r;
  var tmpx, tmpt, tmpy;

  /* can we use the fast multiplier? */
  /*
     Uhm ... no.
     And because of that we don't need the restriction (digs) but
     I'll leave it for later.
  
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
      u = Math.floor(r/MP_DIGIT_MAX);
    }
    /* set carry if it is placed below digs */
    if (ix + iy < digs) {
     t.dp[iy + ix]  = u;
    }
  }

  t.clamp();
  return t;
};
// standard unsigned multiply
Bigint.prototype.multiply = function(bi){
  var ret,i,j,a,b,carry,temp;
  a = this;
  b = bi;
  ret = new Bigint(0);
  ret.dp = new Array(a.used + b.used);
  for(var k=0;k<ret.dp.length;k++)
    ret.dp[k] = 0>>>0;
  ret.used = a.used + b.used;
  for(i=0;i<a.used;i++){
    carry = 0;
    for(j=0;j<b.used;j++){
      temp = ret.dp[i+j]+(a.dp[i]*b.dp[j])+carry;
      carry = Math.floor(temp / MP_DIGIT_MAX);
      ret.dp[i+j] = temp & MP_MASK;
    }
    ret.dp[i+b.used] = carry;
  }
  ret.clamp();
  return ret;
}
Bigint.prototype.mul = function(bi){
  var ret,asign,bsign;
  // larger one first
  if(this.used <= bi.used){
    var a = this, b = bi;
  }
  else{
    var a = bi, b = this;
  }
  // check numbers for 1(one) or 0(zero) respectively
  if(a.isZero() || b.isZero()){
    return new Bigint(0);
  }
  if(a.isUnity()){
    var ret = b.copy();
    if(a.sign != b.sign){
      ret.sign = MP_NEG;
    }
     return ret;
  }
  if(b.isUnity()){
    var ret = a.copy();
    if(a.sign != b.sign){
      ret.sign = MP_NEG;
    }
     return ret;
  }
  // Check if smaller number is small enough for mulInt()
  if(b.used == 1){
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
  if(Math.min(a.used,b.used) >= 2 * KARATSUBA_MUL_CUTOFF){
    return a.karatsuba(b);
  }

  ret = a.multiply(b);

  if(asign != bsign){
    ret.sign = MP_NEG;
  }
  // reset originals
  a.sign = asign;
  b.sign = bsign;

  ret.clamp();
  return ret;
};

// basic unsigned square
Bigint.prototype.square = function(){
  var t;
  var r,u,ix,iy;

  t = new Bigint(0);
  t.dp = new Array(2 * this.used + 1);
  r = 2 * this.used + 2;
  while(r--) t.dp[r] = 0;
  t.used = 2 * this.used + 1;



  for(ix = 0;ix < this.used;ix++){
    r = t.dp[2*ix] + (this.dp[ix] * this.dp[ix]);
    t.dp[2*ix] = r & MP_MASK;
    c = Math.floor(r/MP_DIGIT_MAX);


    for(iy = ix + 1;iy < this.used;iy++){
      r = this.dp[ix] * this.dp[iy] ;
      //  (2^26-1) * 2 + (2^26-1)^2 + (2^26-1)^2 < 2^53 (by 134217728 )
      r = t.dp[ix + iy] + r + r + c;
      t.dp[ix + iy] =  r & MP_MASK;
      c = Math.floor(r/MP_DIGIT_MAX);
    }

    while(c > 0){
      iy++;// if you ask yourself: WTF? you're right
      r = t.dp[ix + iy - 1] + c;
      t.dp[ix + iy - 1] = r & MP_MASK;
      c = Math.floor(r/MP_DIGIT_MAX);
    }
  }
 
  t.clamp();
  return t;
};
// public: square function
Bigint.prototype.sqr = function(){
  this.sign = MP_ZPOS;

  if(this.used >= 2 * KARATSUBA_SQR_CUTOFF){
    return this.karatsuba_square();
  }
  
  return this.square();
};


Bigint.prototype.mulInt = function(si){
  var a = this, b = si;

  // check numbers for 1(one) or 0(zero) respectively
  if(a.isZero() || b == 0){
    return new Bigint(0);
  }
  if(a.isUnity()){
    var ret = b.toBigint();
    if(a.sign != b.sign()){
      ret.sign = MP_NEG;
    }
    return ret;
  }
  if(b == 1 || b == -1){
    var ret = a.copy();
    // b.sign() is a function because b is a Number
    if(a.sign != b.sign()){
      ret.sign = MP_NEG;
    }
     return ret;
  }
  var ret = new Bigint();
  ret.dp = new Array(a.used + 1);
  ret.used = a.used + 1;
  ret.dp[0] = 0;

  var carry = 0>>>0, tmp,k;
  for(k = 0; k < a.used; k++){
    tmp = this.dp[k] * si + carry;
    ret.dp[k] = tmp & MP_MASK;
    carry = Math.floor(tmp/MP_DIGIT_MAX);
  }

  if(carry){
    ret.dp[k] = carry;
  }
 
  ret.clamp();
  if(this.sign != si.sign()){
    ret.sign = MP_NEG;
  }
  return ret;
};
// compares absolute values (magnitudes)
Bigint.prototype.cmp_mag = function(bi){
  if(this.used < bi.used) return MP_LT;
  if(this.used > bi.used) return MP_GT;
  // same size, get into details msb->lsb
  for(var i = this.used;i>=0;i--){
    if(this.dp[i] > bi.dp[i]) return MP_GT;
    if(this.dp[i] < bi.dp[i]) return MP_LT;
  }
  return MP_EQ;
};

// compares signed values
Bigint.prototype.cmp = function(bi){
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
}
// internal, unsigned adder, returns an Array, not a Bigint!
Bigint.prototype.kadd = function(bi){
  var x,retdp, min, max,carry,i;

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

  retdp = new Array(max + 1);

  carry = 0;
  for (i = 0; i < min; i++) {
    retdp[i] = this.dp[i] + bi.dp[i] + carry;
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
Bigint.prototype.add = function(bi){
  var sa = this.sign;
  var sb = bi.sign;

  var ret = new Bigint();
  /* handle two cases, not four */
  if (sa == sb) {
    /* both positive or both negative */
    /* add their magnitudes, copy the sign */
    ret.sign = sa;
    ret.dp= this.kadd(bi);
    ret.used = ret.dp.length;
  } else {
    /* one positive, the other negative */
    /* subtract the one with the greater magnitude from */
    /* the one of the lesser magnitude.  The result gets */
    /* the sign of the one with the greater magnitude. */
    if (this.cmp_mag(bi) == MP_LT) {
      ret.sign = sb;
      ret.dp = bi.ksub(this);
      ret.used = ret.dp.length;
    } else {
      ret.sign = sa;
      ret.dp = this.ksub(bi);
      ret.used = ret.dp.length;
    }
  }
  ret.clamp();
  return ret;
};
// TODO: to do
Bigint.prototype.addInt = function(si){
  var bi = si.toBigint();
  return this.add(bi);
};

// internal unsigned subtractor
Bigint.prototype.ksub = function(bi){
  var x,retdp, min, max,carry,i;

  /* find sizes */
  min = this.used;
  max = bi.used;

  retdp = new Array(max );
  carry = 0;
  for (i = 0; i < min; i++) {
    retdp[i] = this.dp[i] - bi.dp[i] - carry;
    if(retdp[i] < 0){
      retdp[i] += MP_DIGIT_MAX;
      carry = 1;
    } else {
      carry = 0;
    }
  }
  for(;i< max;i++){
    retdp[i] = this.dp[i] - carry;
    if(retdp[i] < 0){
      retdp[i] += MP_DIGIT_MAX;
      carry = 1;
    } else {
      carry = 0;
    }
  }
  return retdp;
};
// public signed subtractor
Bigint.prototype.sub = function(bi){
  var  sa, sb, ret;

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
    ret.used = ret.dp.length;
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
      ret.sign = (sa == MP_ZPOS) ? MP_NEG : MP_ZPOS;
      /* The second has a larger magnitude */
      ret.dp = bi.ksub(this);
    }
  }
  ret.used = ret.dp.length;
  ret.clamp();
  return ret;
};

// TODO: to do
Bigint.prototype.subInt = function(si){
  return this.sub(si.toBigint());
};
// internal division with remainder (D. Knuth: Algo. D)
Bigint.prototype.kdivrem = function(bint){
  // Port of divmnu64.c from "Hacker's Delight"
  var divmnu = function (q,r,u,v,m,n){ 
    var b = MP_DIGIT_MAX>>>0; // Number base.
    var mask = MP_MASK>>>0;   // Number mask b-1
    var un, vn;               // Normalized form of u, v.
    var qhat;                 // Estimated quotient digit.
    var rhat;                 // A remainder.
    var p;                    // Product of two digits.
    var s, i, j, t, k;

    // gets checked by public function but we might use this
    // private function directly, too.
    if (n == 1) {                             // Take care of
      k = 0;                                  // the case of a
      for (j = m - 1; j >= 0; j--) {          // single-digit
        q[j] = Math.floor((k*b + u[j])/v[0]); // divisor here.
        k = (k*b + u[j]) - q[j]*v[0];
      }
      r[0] = k;
      return [q,r];
    }

    // Normalize by shifting v left just enough so that
    // its high-order bit is on, and shift u left the
    // same amount.  We may have to append a high-order
    // digit on the dividend; we do that unconditionally.

    s = MP_DIGIT_BIT - ( ( (v[n-1]).highBit() + 1 ) ) ; // 0 <= s <= 25 .
    // TODO: V ans U are already deep copies we can work on them directly
    vn = new Array(n);
    for (i = n - 1; i > 0; i--){
      vn[i] = ((v[i] << s)&mask) | ((v[i-1] >>> (MP_DIGIT_BIT-s))&mask);
    }
    vn[0] = (v[0] << s)&mask;

    un = new Array((m + 1));
    un[m] = (u[m-1] >>> (MP_DIGIT_BIT-s))&mask;
    for (i = m - 1; i > 0; i--)
      un[i] = ((u[i] << s)&mask) | ((u[i-1] >>> (MP_DIGIT_BIT-s))&mask);
    un[0] = (u[0] << s)&mask;

    for (j = m - n; j >= 0; j--) {       // Main loop.
      // Compute estimate qhat of q[j].
      qhat = Math.floor( (un[j+n]*b + un[j+n-1]) / vn[n-1] );
      rhat = (un[j+n]*b + un[j+n-1]) - qhat*vn[n-1];

      while(true){
        if (qhat >= b || qhat*vn[n-2] > b*rhat + un[j+n-2])
        { 
          qhat = qhat - 1;
          rhat = rhat + vn[n-1];
          if (rhat < b) continue;
        }
        break;
      }

      // Multiply and subtract.
      k = 0;
      for (i = 0; i < n; i++) {
        p = qhat*vn[i];
        t = un[i+j] - k - (p & mask);
        un[i+j] = t&mask;
        k = Math.floor(p/b) - Math.floor(t/b);
      }
      t = un[j+n] - k;
      un[j+n] = t;

      q[j] = qhat;              // Store quotient digit.
      if (t < 0) {              // If we subtracted too
        q[j] = q[j] - 1;       // much, add back.
        k = 0;
        for (i = 0; i < n; i++) {
          t = un[i+j] + vn[i] + k;
          un[i+j] = t&mask;
          k = Math.floor(t/b);
        }
        un[j+n] = un[j+n] + k;
      }
    }
    // If the caller wants the remainder, unnormalize
    // it and pass it back.
    for (i = 0; i < n; i++)
      r[i] = ((un[i] >>> s)&mask) | ((un[i+1] << (MP_DIGIT_BIT-s))&mask);
    r[n-1] = (un[n-1] >>> s)&mask;
    return [q,r];
  };
  var U = this.dp;
  var M = this.used;
  var V = bint.dp;
  var N = bint.used;
  var Q = new Bigint(0);
  var R = new Bigint(0);
  var ret;

  // preallocate Arrays
  Q.dp = new Array(M);
  Q.dp
  Q.used = M;
  R.dp = new Array(M);
  R.used = M;
  
  ret = divmnu(Q.dp,R.dp,U,V,M,N);

  Q.clamp();
  R.clamp();

  return [Q,R];
};
// public: division with remainder
Bigint.prototype.divrem = function(bint){
  var a = this.abs();
  var b = bint.abs();
  var q,r,ret;
  var qsign, rsign;

  /* Some checks (NaN, Inf) */
  if(isNaN(a.dp[0]) || isNaN(b.dp[0]) ){
    return [a.setNaN(),b.setNaN()]
  }
  if(a.isInf() || b.isInf()){
    return [a.setInf(),b.setInf()]
  }

  if(b.isZero()){
    return (b.sign == MP_NEG)?[a.setNegInf(),new Bigint(0)]
                             :[a.setPosInf(),new Bigint(0)];
  }

  // Single digit b
  if(b.used == 1){
    return a.divremInt(b.dp[0]);
  }

  // a < b
  if(a.cmp_mag(b) == MP_LT ){
    return [new Bigint(0),a];
  }

  qsign = ( (this.sign * bint.sign) < 0)?MP_NEG:MP_ZPOS;
  rsign = (this.sign == MP_NEG)?MP_NEG:MP_ZPOS;

  ret = a.kdivrem(b);
  // long version
  q = ret[0];
  r = ret[1];
  q.sign = qsign;
  r.sign = rsign;
  /* 
      Arguments given to kdivrem() must be clean
      to avoid error checking here.
   */
  return [q,r];
};


Bigint.prototype.divremInt = function(si){
  var divrem2in1 = function(u,m,v,q,B){
    var k = 0,t; 
    for (var j = m - 1; j >= 0; j--) {
      k = (k << MP_DIGIT_BIT) | u[j];  
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
  var qsign = ( (a.sign * si.sign()) < 0)?MP_NEG:MP_ZPOS;
  var rsign = (a.sign = MP_NEG)?MP_NEG:MP_ZPOS;
  R.dp[0] = divrem2in1(this.dp,this.used,si,Q.dp,MP_DIGIT_MAX);
  Q.used = Q.dp.length;
  Q.sign = qsign;
  R.used = 1;
  R.sign = rsign;
  Q.clamp();
  R.clamp()
  return [Q,R];
};





Bigint.prototype.div = function(bi){
  return this.divrem(bi)[0];
};
Bigint.prototype.divInt = function(si){
  return this.divremInt(si)[0];
};
Bigint.prototype.rem = function(bi){
  return this.divrem(bi)[1];
};
Bigint.prototype.remInt = function(si){
    return this.divremInt(si)[1];
};

// Beware: works in-place!
Bigint.prototype.incr = function(){
  var carry,i;
  carry = 0;
  for (i = 0; i < this.used; i++) {
    this.dp[i] = this.dp[i] + 1 + carry;
    carry = this.dp[i] >>> MP_DIGIT_BIT;
    this.dp[i]  &= MP_MASK;
  }
  if(carry)
    this.dp[i] = carry;
  this.used = this.dp.length;
};
// Beware: works in-place!
Bigint.prototype.decr = function(){
  var carry,i;

  carry = 0;
  this.dp[0] = this.dp[0] - 1;
  if(this.dp[0] < 0){
    this.dp[0] += MP_DIGIT_MAX;
    carry = 1;
  } else {
    carry = 0;
  }
  if(carry){
    for (i = 1; i < this.used; i++) {
      this.dp[i] = this.dp[i] - carry;
      if(this.dp[i] < 0){
        this.dp[i] += MP_DIGIT_MAX;
        carry = 1;
      } else {
        carry = 0;
      }
    }
  }
  // 10 - 1 = 9
  if(this.dp[this.used -1] == 0){
    this.used--;
  }
};


Bigint.prototype.slice = function(start,end){
  var ret = new Bigint(0);
  ret.dp = this.dp.slice(start,end);
  ret.used = end - start;
  ret.sign = this.sign;
  return ret;
};
Bigint.prototype.karatsuba = function(bint){
  var x0,x1,y0,y1,x0y0,x1y1,t1,xy;

  var tlen = this.used;
  var blen = bint.used;

  var m = Math.min(tlen, blen)>>>1;
  if(m <= KARATSUBA_MUL_CUTOFF)return this.multiply(bint)
  x1 = this.slice(m,tlen);
  x0 = this.slice(0,m);
  y1 = bint.slice(m,blen);
  y0 = bint.slice(0,m);
  x0y0 = x0.karatsuba(y0);
  x1y1 = x1.karatsuba(y1);

  t1 = x1.add(x0);
  x0 = y1.add(y0);
  t1 = t1.karatsuba(x0);

  x0 = x0y0.add(x1y1);
  t1 = t1.sub(x0);

  // z2 * B^(2*m) + z1 * B^m + z0
  xy = (x1y1.dlShift(2*m)).add(t1.dlShift(m)).add(x0y0);
  
  return xy;
};
Bigint.prototype.karatsuba_square = function(bint){
  var x0,x1,y0,y1,x0y0,x1y1,t1,xy;

  var tlen = this.used;
  var blen = bint.used;

  var m = Math.min(tlen, blen)>>>1;
  if(m <= KARATSUBA_SQR_CUTOFF)return this.square();
  x1 = this.slice(m,tlen);
  x0 = this.slice(0,m);
  x0y0 = x0.karatsuba_square();
  x1y1 = x1.karatsuba_square();

  t1 = x1.add(x0);
  t1 = t1.karatsuba_square();

  x0 = x0y0.add(x1y1);
  t1 = t1.sub(x0);

  // z2 * B^(2*m) + z1 * B^m + z0
  xy = (x1y1.dlShift(2*m)).add(t1.dlShift(m)).add(x0y0);
  
  return xy;
};



// simple right-to-left
// will implement and make use of left-to-right for x^y with very small x later
Bigint.prototype.kpow = function(ui){
  var ret = new Bigint(1);
  var t   = this;
  while(ui != 0){
    if(ui&1 == 1){
      ret = ret.mul(t);
    }
    t = t.sqr();
    ui >>>= 1;
  }
  return ret;
};

Bigint.prototype.pow = function(ui){
  var sign = this.sign;
  var t;

  if(ui < 0){
    //rounds to zero
    return (new Bigint(0));
  }
  /*
  if(ui == 1/2){
    return this.sqrt();
  }  */
  if(ui == 1){
    return this.dup();
  }
  if(ui == 2){
    return this.sqr();
  }
  // useless? Redundant even?
  if(ui.isPow2()){
    t = this.dup();
    ui--;
    do{
      t = t.sqr();
    }while(ui>>>1)
    return t;
  }
  /*
    var r = new Array(2);
    if(ui.isPerfPow(r)){
    t = this.dup()
     ...
    return t;
  } */
  if(this.isZero()){
    // IEEE 754
    if(ui == 0 ){
      return (new Bigint(1));
    }
    return (new Bigint(0));
  }
  if(this.isInf()){
    // IEEE 754
    if(ui == 0 ){
      return (new Bigint(1));
    }
    return this.dup();
  }
  if(this.isUnity()){
    if(this.sign > 0 ){
      // IEEE 754 says it is always one, even for 1^\infty
      return (new Bigint(1));
    }
    if(ui == Infinity){
      // IEEE 754 is unclear for -1
      return (new Bigint(0)).setNaN();
    }
    if(ui &1 == 0){
       return (new Bigint(1));
    }
    return this.dup();
  }
  t = this.abs();
  t = t.kpow(ui);
  if(sign < 0 && ui&1 == 0){
    t.sign = MP_NEG;
  }
  return t;
};


// should be done with left-to-right instead?
Number.prototype.kpow = function(bi){
  var ret = new Bigint(1);
  var t   = this.toBigint();
  while(bi.isZero() == MP_NO){
    if(bi.isOdd() == MP_YES){
      ret = ret.mul(t);
    }
    t = t.sqr();
    bi.rShiftInplace(1);
  }
  return ret;
};

// Bigint gets simple bracketing
Bigint.prototype.ilogb = function(base){
  var low, bracket_low, high, bracket_high, mid, bracket_mid;
  // log(-x)/log(y) = log(x)/log(y) + (k*pi *i)/log(y)
  if(this.isNeg()) return this.copy().setNaN();
  // this works works for positive and integer bases only
  // if(base < 0) return this.toBigfloat().cilogb(b).abs().floor();
  if(base < 1 || !base.isInt()) return this.copy().setNaN();

  if(base == 1) return this.copy();
  if(base == 2 ) return this.highBit().toBigint();
  low = new Bigint(0);
  bracket_low = new Bigint(1);
  high = new Bigint(1);
  bracket_high = new Bigint(base);
 
  while ( bracket_high.cmp(this) == MP_LT ){
    low = high.copy();
    bracket_low = bracket_high;
    high.lShiftInplace(1);
    bracket_high = bracket_high.sqr();
  }
  while( high.sub(low).cmp(Bigint.ONE) == MP_GT ){

    mid = ( low.add(high) ).rShift(1);
    bracket_mid = bracket_low.mul(base.kpow(mid.sub(low) ));
    if ( this.cmp(bracket_mid) == MP_LT ) {
      high = mid;
      bracket_high = bracket_mid;
    }
    if ( this.cmp(bracket_mid) == MP_GT ) {
      low = mid;
      bracket_low = bracket_mid;
    }
    if ( this.cmp(bracket_mid) == MP_EQ ){
       return mid;
    }
  }
      
  if(bracket_high.cmp(this) == MP_EQ) return high;
  else return low;
};

Bigint.prototype.nthroot = function(n){
  var low, high, mid;

  if(!this.isZero() && n == 0) return new Bigint(1);
  if(this.isZero() && n != 0) return new Bigint(1);
  if(this.isZero() && n == 0) return this.copy().setInf();
  if(this.isNeg()) return this.copy().setNaN();
  // actually: x^(1/(-y)) = 1/(x^(1/y)) and x^(1/1/y) = x^y
  if(n < 0 || !n.isInt()) return this.copy().setNaN();

  high = new Bigint(1);
  high.lShiftInplace(Math.floor(this.highBit()/n)+1);
  low = high.rShift(1);
  while (low.cmp(high) == MP_LT){
    mid = low.add(high).rShift(1);
    if (low.cmp(mid) == MP_LT && mid.pow(n).cmp(this) == MP_LT){
      low = mid;
    } else if( high.cmp(mid) == MP_GT &&  mid.pow(n).cmp(this) == MP_GT){
      high = mid;
    } else {
      return mid;
    }
  }
  return mid.incr();
};





//Bigint.prototype. = function(){};
//Bigint.prototype. = function(){};






















function Bigfloat(){
  var sign = MP_ZPOS;
  // new Bigint() is automatically zero
  var mantissa = new Bigint();
  var exponent = 0;
  // in bigdigits(?)
  var precision = MP_DIGIT_BIT*2;
}
// per default two bigdigits == JS Number (8-byte double) for MP_DIGIT_BIT = 26
Bigfloat.precision = MP_DIGIT_BIT*2;






/*******************************************************************************
  Bignumber

  Includes everything. Bad idea?

*******************************************************************************/

function Bignumber(){
  var number = 0;
  /*
    One of
    "number"   = Number;
    "bigint"   = Bigint;
    "bigfloat" = Bigfloat;
    "tcomplex"  = Complex; can be nested, e.g: Complex(Bignumber,Bignumber)
                            if Bignumber is not a Complex , so nothing like
                            Complex(Complex,Complex)
    "quaternion" = Quaternion; can be nested but see Complex for restrictions
   */
  var type   = "number";
}
/*
var a = "123456789000123456789000123456789000"
var b = a.toBigint();
var c = b.sqr();
c.toString();
*/
var a1 = "912345678900012345678900012345678900091234567890001234567890001234567890009123456789000123456789000123456789000912345678900012345678900012345678900091234567890001234567890001234567890009123456789000123456789000123456789000912345678900012345678900012345678900091234567890001234567890001234567890009123456789000123456789000123456789000"
var a2 = "91234567890001234567890001912345678900012345678900012345678900091234567890001234567890001234567890009123456789000123456789000123456789000912345678900012345678900012345678900091234567890001234567890001234567890009123456789000123456789000123456789000912345678900012345678900012345678900091234567890001234567890001234567890009123456789000123456789000123456789000"
var a = a1.toBigint();
var b = a2.toBigint();

a.toString()

