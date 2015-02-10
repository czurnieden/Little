"use strict";
/*
      Need Bigint to function, even inherits a lot of global variables.

      Ignores large parts of IEEE 745 concerning the guts of the numbers but
      follows the rest (Infinity, NaN, divideByZero etc. pp.)
*/

/*
   TODO: a lot, but we need a check to handle subnormal numbers and infinity,
         too, when the number grows to big.

         strtof and ftostr handle base 10 numbers only for now, but should
         be able to handle base 16 and base 2, too at least.

         The way strtof and ftostr work the numbers shouldn't be too small or
         too large, but something between 1e-1,000 and 1e+1,000 should work
         fast enough.

         The way the finding of the initial values for the Newton based
         functions works, the size of the actual numbers must be those
         of the 64-bit double: between 1e-308 and 1e308, better between
         1e-300 and 1e300

         Rounding is fixed to half-to-nearest for now.

         Exception handling is exceptionally poor--without exceptions.
*/

// in bits, default is 104 bits (not a double-double that would be more)
/**
   Default precision in bits. Default value is the bit-size of two limbs of
   Bigint.
   @const {number}
   @default
*/
var MPF_PRECISION = MP_DIGIT_BIT * 4;
/**
   Default precision in decimal. Default value is the bit-size of two limbs of
   Bigint.
   @const {number}
   @default
*/
   var MPF_DECIMAL_PRECISION = 31;

// it is also the minimum
/**
   Default minimum precision in bits. Default value is the bit-size of two limbs of
   Bigint.
   @const {number}
   @default
*/
var MPF_PRECISION_MIN = MP_DIGIT_BIT * 4;
/**
   Default minimum precision in decimal. Default value is the size of two limbs of
   Bigint assuming a size of a limb to be 26 exactly.
   @const {number}
   @default
*/
var MPF_DECIMAL_PRECISION_MIN = 31;
// this is an arbitrary maximum, just a safe guard and free to change
/**
   Default maximum precision in bits.
   The default value is 2<sup><i>32</i></sup>, about 1,293,664,848 decimal digits.
   @const {number}
   @default
*/
var MPF_PRECISION_MAX = 4294967296; // 2^32 bits, 165,191,050 big-digits

// exception handling
/**
   Flag for exception: division by zero
   @const {number}
   @default
*/
var MPFE_DIVBYZERO = 1;
/**
   Flag for exception: inexact result
   @const {number}
   @default
*/
var MPFE_INEXACT = 2;
/**
   Flag for exception: invalid result
   @const {number}
   @default
*/
var MPFE_INVALID = 4;
/**
   Flag for exception: overflow
   @const {number}
   @default
*/
var MPFE_OVERFLOW = 8;
/**
   Flag for exception: overflow
   @const {number}
   @default
*/
var MPFE_UNDERFLOW = 16;
/**
   Bool sum of accepted exceptions.
   Included by default are: division by zero, inexact and invalid
   @const {number}
   @default
*/
var MPFE_ALL_EXCEPT = MPFE_DIVBYZERO | MPFE_INEXACT | MPFE_INVALID;

// Rounding modes
/**
   Flag for rounding mode: half to even.
   This is the default rounding mode
   @const {number}
   @default
*/
var MPFE_TONEAREST = 1; // default
/**
   Flag for rounding mode: to +infinity.
   @const {number}
   @default
*/
var MPFE_UPWARD = 2;
/**
   Flag for rounding mode: to -infinity.
   @const {number}
   @default
*/
var MPFE_DOWNWARD = 4;
/**
   Flag for rounding mode: to zero.
   @const {number}
   @default
*/
var MPFE_TOWARDZERO = 8;
/**
   Flag for rounding mode in duty.
   Default is half to even
   @const {number}
   @default
*/
var MPFLT_ROUNDS = 1;


/**
  Constructor for the Bigfloat object.
  It accepts only a small <em>integer</em> as an argument. For converting
  JavaScripts <code>Number</code> object to a Bigfloat use <code>toBigfloat()</code>
  on a number.
  @constructor
  @param {number} n small integer &lt; 2<sup>MP_DIGIT_BIT</sup>
*/
function Bigfloat(n) {
    // keep an extra sign and save some typing
    // Addendum: after lot of code writing the author can conclude that the
    //           comment above about the amount of typing is complete and
    //           utter...
    this.sign = MP_ZPOS;
    this.mantissa = new Bigint(0);
    this.exponent = 1;
    this.precision = MPF_PRECISION;
    if (arguments.length == 1 && n.isInt() && Math.abs(n) < MP_INT_MAX) {
        this.mantissa = Math.abs(n).toBigint();
        this.mantissa.lShiftInplace(MPF_PRECISION - Math.abs(n).highBit() -
            1);
        this.mantissa.sign = (n < 0) ? MP_NEG : MP_ZPOS;
        this.sign = this.mantissa.sign;
        this.exponent = -this.precision + Math.abs(n).highBit() + 1;
    }
}
/**
   Set the precision in bits. Does not actively change any Bigfloat, just
   sets the global variables <code>MPF_PRECISION</code> to the argument
   or to <code>MPF_PRECISION_MIN</code>
   @private
   @param {number} n a small integer, the new precision in bits
*/
function setPrecision(n) {
    if (arguments.length > 0 && n.isInt() && n > MPF_PRECISION_MIN) {
        MPF_PRECISION = n;
    } else {
        MPF_PRECISION = MPF_PRECISION_MIN;
    }
}
/**
   Get the precision in bits.
   @return {number} the precision in bits
*/
function getPrecision() {
    return MPF_PRECISION;
}
/**
   Get the precision of the actual Bigfloat in decimal
   @private
   @return {number} the new precision in decimal digits
*/
Bigfloat.prototype.getDecimalPrecision = function() {
    var log210 = parseFloat("3.321928094887362347870319429489390175865");
    return Math.floor(this.precision / log210);
};
/**
   Set the precision of the actual Bigfloat in decimal
   @private
   @param {number} prec a small integer, the new precision in decimal
*/
Bigfloat.prototype.setDecimalPrecision = function(prec) {
    var log210 = parseFloat("3.321928094887362347870319429489390175865");
    if (!prec || !prec.isInt() || prec < MPF_DECIMAL_PRECISION_MIN) {
        return MP_NO;
    }
    this.precision = Math.ceil(prec * log210) + 1;
    return true;
};
/**
   Set the precision of the actual Bigfloat in decimal digits
   @param {number} prec an optional small integer, the new precision in decimal
   @return {number} the current precision in decimal digits
*/
function epsilon(n){
    var log210 = parseFloat("3.321928094887362347870319429489390175865");

    if (arguments.length > 0 && n.isInt() && n > MPF_DECIMAL_PRECISION_MIN) {
        setPrecision(Math.ceil(n * log210) + 1);
        MPF_DECIMAL_PRECISION = n;
        //Little.config.decimalPrecision = n;
    } else if(n <= MPF_DECIMAL_PRECISION_MIN){
       setPrecision(MPF_PRECISION_MIN);
       //Little.config.decimalPrecision = MPF_DECIMAL_PRECISION_MIN;
    }
    return MPF_DECIMAL_PRECISION;
}

/**
   Get the current rounding mode.
   @return {number} the current rounding mode
*/
function mpfegetround() {
    return MPFLT_ROUNDS;
}
/**
   Set the current rounding mode.
   @param {number} n
*/
function mpfesetround(n) {
    if (!n.isInt() || n < 0 || n > 3) {
        MPFLT_ROUNDS = -1;
    } else {
        MPFLT_ROUNDS = n;
    }
}

// Measures size of integer part in bits
// for rough estimates only, e.g.: to find the needed precision of pi in
// argument reducing for trigonometric functions
// floor(abs(log_2(this)))
/**
   Measures size of integer part in bits.
   For rough estimates only, e.g.: to find the needed precision of pi in
   argument reducing for trigonometric functions.
   @return {number}
*/
Bigfloat.prototype.absBitSize = function() {
    var prec = this.precision;
    var exp = this.exponent;
    prec = prec + exp;
    if (prec < 0) {
        return 0;
    } else {
        return prec;
    }
};
// Measures size of integer part in decimal
// for rough estimates only, e.g.: to find the needed precision of pi in
// argument reducing for trigonometric functions
// floor(abs(log_10(this)))
/**
   Measures size of integer part in decimal.
   For rough estimates only, e.g.: to find the needed precision of pi in
   argument reducing for trigonometric functions.
   @return {number}
*/
Bigfloat.prototype.absDecimalSize = function() {
    var prec = this.absBitSize();
    if (prec != 0) {
        Math.floor(Math.log(prec) / Math.log(10));
    }
    return prec;
};
/**
   Caches the precision at the time EPS() had been run.
   @private
   @const {number}
   @default
*/
var BIGFLOAT_EPS_PRECISION = -1;
// Don't use directly, use Bigfloat.EPS() instead
/**
   Caches eps at the time EPS() had been run.
   Don't use directly, use Bigfloat.EPS() instead
   @private
   @const {number}
   @default
*/
var BIGFLOAT_EPS = -1;
/**
   Evaluates EPS of the Bigfloat
   @return {Bigfloat} the eps
*/
Bigfloat.prototype.EPS = function() {
    var ret;
    if (BIGFLOAT_EPS_PRECISION != MPF_PRECISION) {
        BIGFLOAT_EPS_PRECISION = MPF_PRECISION;
        ret = new Bigfloat(1);
        ret.exponent = -(2 * this.precision);
        BIGFLOAT_EPS = ret;
    }
    return BIGFLOAT_EPS;
};

/*
   Compute constants
   As a reminder: don't use the variables directly, use the
   functions instead.
*/
/**
   Caches the constant log(2)
   Don't use directly, use Bigfloat.constlog2() instead
   @private
   @const {Bigfloat}
   @default
*/
var bigfloat_const_ln2 = null;
/**
   Caches the current precision of the constant log(2)
   Don't use directly, use Bigfloat.constlog2() instead
   @private
   @const {Bigfloat}
   @default
*/
var bigfloat_const_ln2_precision = 0;
/**
   Constant <code>log(2)</code> by way of a hypergeometric sum
   This algorithm is shamelessly stolen from
   {ælink  http://numbers.computation.free.fr/Constants/TinyPrograms/OnlineConstants.html}
   (Webpage by Xavier Gourdon and Pascal Sebah)<br>
   It is not recommended to compute a million digits of <code>log(2)</code> with
   this function (1,000 digits needs a couple of seconds)--but
   you could.
   @return {Bigfloat} <code>log(2)</code> in current precision
*/
Bigfloat.prototype.constlog2 = function(i) {
    var precision = this.getDecimalPrecision();
    var r = new Bigfloat();
    // Hypergeometric series. Idea shamelessly stolen from
    // http://numbers.computation.free.fr/Constants/TinyPrograms/OnlineConstants.html
    // Paper: http://numbers.computation.free.fr/Constants/Log2/log2.ps, sec. 6 cor. 13
    var constlog2 = function(n) {
        var ret = new Bigint();
        // n / log_10(base) pluse one guard digit
        var rounds = Math.floor(n / 6 + 1);
        var base = Math.pow(10, 7);
        // number of terms
        var alen = Math.floor(n * 10 / 3);
        var a = new Array(alen + 1);
        var i, k, num, den;
        var digit;

        for (i = 0; i <= alen; i++) {
            a[i] = 5;
        }

        while (rounds--) {
            den = 0;
            k = alen;
            while (--k) {
                den += a[k] * base;
                num = 2 * k + 2;
                a[k] = den % num;
                den = Math.floor(den / num);
                den *= k;
            }
            den += a[0] * base;
            a[0] = den % base;
            digit = Math.floor(den / base);
            ret = ret.mul(base);
            ret = ret.add(digit);
        }
        return ret;
    };
    var log210 = parseFloat("3.321928094887362347870319429489390175865");

    // TODO: checks  & balances
    if (bigfloat_const_ln2 == null || bigfloat_const_ln2_precision == 0) {
        var tmp = constlog2(precision + 3);
        var tmplen = tmp.highBit() + 1;
        // we do have a big integer now (changing the algorithm to use
        // Bigfloats caused too much rounding errors), so make a
        // float out of it by doubling the length (shift left) and
        // divide by ten to the power of the number of decimal digits
        log210 = Math.floor((tmp.highBit() + 1) / log210);
        var ten = new Bigint(10);
        ten = ten.pow(log210);
        tmp.lShiftInplace(tmp.highBit() + 1);
        tmp = tmp.div(ten);
        r.mantissa = tmp;
        // new exponent is just the length of the bigint in bits, let
        // normalize() do all the hard work.
        r.exponent = -tmplen;
        r.normalize();

        bigfloat_const_ln2 = r;
        bigfloat_const_ln2_precision = r.precision;
        return r;
    } else {
        return bigfloat_const_ln2;
    }
};


/**
   Caches pi
   Don't use directly, use Bigfloat.pi() instead
   @private
   @const {Bigfloat}
   @default
*/
var BIGFLOAT_PI = -1;
/**
   Caches precision of pi
   Don't use directly, use Bigfloat.pi() instead
   @private
   @const {Bigfloat}
   @default
*/
var BIGFLOAT_PI_PRECISION = -1;

// Pi by the AGM (Brent-Salamin)
// This algorithm is shamelessly stolen from
// http://numbers.computation.free.fr/Constants/Pi/piAGM.html
// Webpage by Xavier Gourdon and Pascal Sebah
// It is not recommended to compute a million digits of pi with
// this function (1,000 digits needs a couple of seconds)--but
// you could.

/**
   Pi by the AGM (Brent-Salamin)
   This algorithm is shamelessly stolen from
   {ælink http://numbers.computation.free.fr/Constants/Pi/piAGM.html }
   (Webpage by Xavier Gourdon and Pascal Sebah)<br>
   It is not recommended to compute a million digits of pi with
   this function (1,000 digits needs a couple of seconds)--but
   you could.
   @return {Bigfloat} pi in current precision
*/
Bigfloat.prototype.pi = function() {
    var a, b, d, s, t, p, two, twoinv, k;
    var eps = this.EPS();
    var oldprec = this.precision;
    // five percent plus 3 bit angst-allowance
    // TODO: compute correct value
    var extra = Math.floor(oldprec / 100) * 5 + 3;
    if (BIGFLOAT_PI_PRECISION >= MPF_PRECISION) {
        if(BIGFLOAT_PI_PRECISION > MPF_PRECISION){
           BIGFLOAT_PI.normalize();
        }
        return BIGFLOAT_PI;
    } else {
        setPrecision(oldprec + extra);

        a = new Bigfloat(1);
        two = new Bigfloat(2);
        twoinv = two.inv();
        b = two.sqrt().inv();
        t = twoinv.copy();
        k = 1;

        do {
            s = a.add(b).mul(twoinv);
            d = a.sub(s);
            d = d.sqr();
            a = s.copy();
            s = s.sqr();
            t = t.sub(d.lShift(k));
            b = s.sub(d).sqrt();
            k++;
        } while (a.sub(b).abs().cmp(eps) != MP_LT);

        t.lShiftInplace(1);
        t = t.inv();
        p = a.add(b).sqr().mul(t);
        setPrecision(oldprec);
        p.normalize();
    }
    BIGFLOAT_PI = p;
    BIGFLOAT_PI_PRECISION = this.precision;
    return p;
};

/**
  Deconstructs a <code>Bigfloat</code> into its fraction part and (binary) exponent, just
  like the <code>frexp</code> function in the standard C library.
  @return {array} With the fraction as a <code>Bigfloat</code> and the
                  exponent as a <code>Number</code> in that order
*/
Bigfloat.prototype.frexp = function() {
    var frac, exp;
    if (this.isInf() || this.isNaN()) {
        return [this, Number.NaN];
    }
    if (this.isZero()) {
        return [new Bigfloat(), 0];
    }
    frac = new Bigfloat();
    exp = this.exponent + this.precision;
    frac.exponent = -this.precision;
    frac.mantissa = this.mantissa.copy();
    frac.sign = this.sign;
    return [frac, exp];
};

/**
  Constructs a <code>Bigfloat</code> from a fraction part and a (binary) exponent, just
  like the <code>ldexp</code> function in the standard C library.
  @param {number} exp exponent for the new number
  @return {Bigfloat}
*/
Bigfloat.prototype.ldexp = function(exp) {
    var ret = new Bigfloat();
    if (exp.isNaN() || !exp.isInt()) {
        throw new RangeError(
            "Argument to Bigfloat.ldexp is not a small integer");
    }
    if (this.isInf()) {
        return ret.setInf();
    }
    if (this.isNaN()) {
        return ret.setNaN();
    }
    if (this.isZero()) {
        return ret;
    }
    ret.mantissa = this.mantissa.copy();
    ret.exponent = exp - this.precision;
    ret.sign = this.sign;
    return ret;
};

/**
  Converts a native JavaScript number to a Bigfloat
  @function external:Number#toBigfloat
  @return {Bigfloat}
*/
Number.prototype.toBigfloat = function() {
    var exponent;
    var sign;
    var ret, low, high, high_mant, digit, tmp, correction = 0;

    /*
       ECMAScript Numbers are 64 bit doubles, hopefuly. From ECMAScript 5.1:

       4.3.19 Number value

              primitive value corresponding to a double-precision 64-bit binary
              format IEEE 754 value

              NOTE A Number value is a member of the Number type and is a direct
                   representation of a number.


       So with MSB to the left:

       - ----------- ---------------------------------------------------
      64                                |                              0
       S    Expo                            Mantissa
     */

    var buf = new DataView(new ArrayBuffer(8));
    buf.setFloat64(0, this);
    low = buf.getUint32(4);
    high = buf.getUint32(0);
    // get the sign
    sign = (high & 0x80000000) >>> 31;

    // get the exponent (11 bits) and catch errors
    exponent = 0x7fffffff & high;
    if (exponent == 0x7ff00000) {
        // infinity
        if (low == 0) {
            ret = new Bigfloat();
            ret.setInf();
            if (sign < 0) {
                ret.sign = MP_NEG;
                ret.mantissa.sign = MP_NEG;
            }
            return ret;
        } else {
            ret = new Bigfloat();
            ret.setNaN();
            return ret;
        }
    }
    // NaN
    if (exponent > 0x7ff00000) {
        ret = new Bigfloat();
        ret.setNaN();
        return ret;
    }
    // signed zero;
    if ((exponent >>> 20) == 0) {
        ret = new Bigfloat();
        ret.exponent = 1;
        if (sign == 1) {
            ret.sign = MP_NEG;
            ret.mantissa.sign = MP_NEG;
        }
        return ret;
    }
    // subnormals
    if (exponent < 0x00100000) {
        tmp = buf.getFloat64(0);
        tmp *= 18014398509481984.0; // 2^54
        buf.setFloat64(0, tmp);
        high = buf.getUint32(4);
        exponent = high & 0x7fffffff;
        correction = -54;
    }

    high_mant = high & 0xfffff;

    // de-bias
    exponent = correction + ((exponent >>> 20) - 1022);

    /*
       Now we have the former mantissa in two parts high and low and a de-biased
       exponent. The Bigint digit is smaller than 32 bit so we need to fill the
       Bigfloat mantissa in chunks.
       FIXME: generalize
    */
    if (MP_DIGIT_BIT != 26) {
        return (new Bigfloat()).setNaN();
    }

    ret = new Bigfloat();

    // fill from right to left, high to low
    // set implicit bit because we have it explicit
    ret.mantissa = new Bigint(1);
    ret.mantissa.dlShiftInplace(1);

    // fill up high_mant with the upper bits of low. For 26 bit big-digits we
    // need five more to fill a big-digit

    high_mant = (high_mant << (MP_DIGIT_BIT - 20)) | (low >>> (32 - (
        MP_DIGIT_BIT - 20)));

    ret.mantissa.dp[0] = high_mant;

    // Make room for the next big-digit and fill; rinse and repeat
    ret.mantissa.dlShiftInplace(1);

    // Sometimes the programmer has some undeserved luck: 32 - (26-20) = 26
    // But the choice of 26 bits for a big-digit was made because 2x26 = 52
    // so it has nothing to do with luck.
    ret.mantissa.dp[0] = low & MP_MASK;
    ret.mantissa.used = ret.mantissa.dp.length;
    ret.mantissa.sign = (sign == 1) ? MP_NEG : MP_ZPOS;
    ret.mantissa.clamp();
    ret.sign = ret.mantissa.sign;
    ret.exponent = exponent - 53;
    ret.normalize();
    return ret;
};

// both function assume MP_DIGIT_BIT == 26
/**
  Converts a Bigfloat to a native JavaScript number if possible. If a zero is
  returned it inherits the sign of the Bigfloat
  @return {number} or the strings "Infinity", "-Infinity"
*/
Bigfloat.prototype.toNumber = function() {
    var high, mid, low, ret, buf, tmp, exponent, newthis, oldprec;
    // just reduce precision and put it into a JavaScript Number
    // A kind of ldexp
    oldprec = this.precision;
    setPrecision(53);
    newthis = this.copy();
    newthis.normalize();
    if (newthis.exponent < -1022) {
        return -Infinity;
    } else if (newthis.exponent > 1023) {
        return Infinity;
    } else if (newthis.mantissa.isNaN()) {
        return Number.NaN;
    } else if (newthis.isZero()) {
        return (newthis.sign < 0) ? -0 : 0;
    }
    this.precision = oldprec;
    setPrecision(oldprec);
    // we have at least one big-digit
    high = newthis.mantissa.dp[newthis.mantissa.used - 1];
    mid = 0;
    low = 0;
    // TODO: check for subnormals here
    if (newthis.mantissa.used >= 2) {
        mid = newthis.mantissa.dp[newthis.mantissa.used - 2];
    }
    if (this.mantissa.used >= 3) {
        low = newthis.mantissa.dp[newthis.mantissa.used - 3] >>> (
            MP_DIGIT_BIT - 1);
    }
    // build a 64 bit ECMAScript Number (IEEE-754 double precision)
    buf = new DataView(new ArrayBuffer(8));
    // MSB of the high word is the sign
    tmp = (newthis.sign < 0) ? 0x80000000 : 0;
    // add bias to exponent
    exponent = newthis.exponent + 1022;
    // add exponent to high word
    tmp |= exponent << 20;
    // IEEE double has an implicit first bit, we have it explicit.
    high = high & ((1 << (MP_DIGIT_BIT - 1)) - 1);
    // add the higher 20 bits to the high word
    tmp |= high >>> 5;
    // set high word
    buf.setUint32(0, tmp);
    // carry (lsb side five bits of highest big-digit)
    tmp = (high & 0x1f) << 27;
    if (mid != 0) {
        // if we have some bits here, fill up low word
        tmp |= mid << 1;
    }
    if (low != 0) {
        // we are not allowed to waste even a single bit!
        tmp |= low & 0x1;
    }
    buf.setUint32(4, tmp);
    ret = buf.getFloat64(0);
    tmp = Math.pow(2, newthis.precision);
    ret *= tmp;
    return ret;
};

/**
  Converts a Bigint to a Bigfloat
  @function external:Bigint#toBigfloat
  @return {Bigfloat}
*/
Bigint.prototype.toBigfloat = function() {
    var ret = new Bigfloat();
    if (this.isNaN()) {
        return ret.setNaN();
    }
    if (this.isInf()) {
        return ret.setInf();
    }
    if (this.isZero()) {
        return ret;
    }
    ret.mantissa = this.copy();

    ret.sign = ret.mantissa.sign;
    ret.exponent = 0;
    ret.normalize();
    return ret;
};
/**
  Converts a Bigfloat to a Bigint.
  Truncates the fraction part.
  @return {Bigint}
*/
Bigfloat.prototype.toBigint = function() {
    var ret, one;
    if (this.isNaN()) {
        return (new Bigint()).setNaN();
    }
    if (this.isInf()) {
        return (new Bigint()).setInf();
    }
    if (this.isZero()) {
        return new Bigint();
    }
    // check if it has an integer part otherwise return zero
    if (this.exponent <= -this.precision) {
        // set sign?
        return new Bigint();
    }
    // if the exponent is larger then zero shift mantissa by exponent
    // end return a copy of the mantissa
    if (this.exponent >= 0) {
        ret = this.mantissa.lShift(this.exponent);
        ret.sign = this.sign;
        return ret;
    }
    // strip fraction part with floor() or round()?
    ret = this.floor();
    // divide mantissa by 2^-exponent
    one = (new Bigint(1)).lShift(Math.abs(this.exponent));
    ret = ret.mantissa.div(one);
    ret.sign = this.sign;
    // return result
    return ret;
};

if (typeof Bigrational !== "undefined") {
/**
  Converts a Bigrational to a Bigfloat.
  @function external:Bigrational#toBigfloat
  @return {Bigfloat}
*/
    Bigrational.prototype.toBigfloat = function() {
        var ret;
        if (this.isZero()) {
            return new Bigfloat();
        }
        if (this.isNaN()) {
            return (new Bigfloat()).setNaN();
        }
        if (this.isInf()) {
            return (new Bigfloat()).setInf();
        }
        if (this.den.isOne()) {
            return this.num.toBigfloat();
        }
        // just divide
        ret = this.num.div(this.den).toBigfloat();
        ret.sign = this.sign;
        return ret;
    };
/**
  Converts a Bigfloat to a Bigrational. Just puts the scaled fractionpart
  into the numerator, the value of 2<sup><i>|exponent|</i></sup> into the
  denumerator and reduces. Quite fast but maybe not what you want. See
  bestApprox() for a more exact alternative based on continued fractions.
  @return {Bigrational}
*/
    Bigfloat.prototype.toBigrational = function() {
        var ret, num, den;
        // either just divide the mantissa by the exponent (man/2^abs(exponent))
        // (check, if it is an integer (positive exponent) first!)
        // or do a very costly CF decomposition. CF decomposition is the best but
        // simply putting mantissa and 2^-exponent into numerator and denominator
        // respectively is easy and, even including the necessary reducing of the
        // fraction, computationally way cheaper.
        if (this.exponent >= 0) {
            ret = this.toBigint();
            ret.sign = this.sign;
            return new Bigrational(ret, 1);
        }
        num = this.mantissa.copy();
        num.sign = this.sign;
        den = (new Bigint(1)).lShift(Math.abs(this.exponent));
        ret = new Bigrational(num, den);
        ret.normalize();
        return ret;
    };

/**
  Converts a Bigfloat to a Bigrational using continued fractions.
  @param {number} precision the maximum size of the denominator in decimal
  @param {array} contFrac an empty array to hold the computed continued fraction
  @return {Bigrational}
*/
    Bigfloat.prototype.bestApprox = function(precision, contFrac) {
        var prec, i, p, q, cf, x, fx, eps, sign, diff, decprec;
        var log210 = parseFloat("3.321928094887362347870319429489390175865");
        decprec = this.getDecimalPrecision();
        if (arguments.length > 0) {
            if (!precision.isInt()) {
                return (new Bigrational()).setNaN();
            }
            if (precision < decprec) {
                prec = precision;
            }
        } else {
            prec = decprec;
        }
        if (this.isZero()) {
            return new Bigrational();
        }
        eps = this.EPS();
        cf = [];
        if (arguments.length > 1) {
            if (contFrac instanceof Array) {
                cf = contFrac;
            } else {
                return (new Bigrational()).setNaN();
            }
        }
        sign = this.sign;
        x = this.abs();

        p = [];
        q = [];
        p[0] = new Bigint(0);
        q[0] = new Bigint(1);
        p[1] = new Bigint(1);
        q[1] = new Bigint(0);

        i = 2;
        do {
            fx = x.floor();
            cf[i - 2] = fx.toBigint();
            p[i] = cf[i - 2].mul(p[i - 1]).add(p[i - 2]);
            q[i] = cf[i - 2].mul(q[i - 1]).add(q[i - 2]);
            diff = x.sub(fx);
            if (diff.cmp(eps) == MP_LT){
                break;
            }
            x = diff.inv();
            i++;
        } while (i < prec);

        return new Bigrational(p[i - 1], q[i - 1]);
    };
}

/**
  Converts a String to a Bigfloat. Rounding mode is restricted to half-to-even
  for now. String must be clean: no whitespace around, no thousand-separator
  inside, only ASCII characters.
  @function external:String#toBigfloat
  @param {number} base of the input string (only base 10 for now)
  @return {Bigfloat}
*/
String.prototype.toBigfloat = function(numbase) {
    var parseNumber = function(s) {
        var slen = s.length;
        var c;
        var exponent_part = "";
        var decimal_point = -1;
        var is_expo_part = false;
        var str_number = "";
        var sign = "+";
        var expo_sign = "+";
        var base = 10;
        var i;
        var k = 0;

        // NOTE: strip leading (and trailing) whitespace?

        // unitary minus/plus comes before base marks (e.g.: "0x")
        if (s.charAt(k) == "-" || s.charAt(k) == "+") {
            sign = s.charAt(0);
            k += 1;
        }

        // Case should not matter but kept short for legibility
        if (s.charAt(k) == "I" && s.charAt(k + 1) == "n" && s.charAt(k +
                1) ==
            "f") {
            return sign + "Infinity";
        }

        if (s.charAt(k) == "N" && s.charAt(k + 1) == "a" && s.charAt(k +
                1) ==
            "N") {
            return sign + "NaN";
        }


        if (s.charAt(k) == "0") {
            if (s.charAt(k + 1) == "x") {
                base = 16;
                k += 2;
            } else if (s.charAt(k + 1) == "b") {
                base = 2;
                k += 2;
            }
            // no leading zeros allowed for octal numbers, except the first
            // to make things simpler
            else if (s.charAt(k + 1) && s.charAt(k + 1) != "0" && s.charAt(
                    k + 1) !=
                ".") {
                base = 8;
                k += 1;
            }
            if (s.length == 1) {
                // return a signed zero (zero is the special number "0e1"")
                return [base, sign, "0", decimal_point, 1];
            }
        }
        // strip leading zeros
        while (s.charAt(k) == "0") {
            k++;
        }
        // all zeros
        if (k == slen) {
            // return a signed zero (zero is the special number "0e1"")
            return [base, sign, "0", decimal_point, 1];
        }

        // some code here to handle "0.0" or ".0"?

        for (i = 0; i < slen - k; i++) {
            c = s.charAt(i + k);
            switch (c) {
                case "0":
                case "1":
                    if (is_expo_part == true) {
                        exponent_part += c;
                    } else {
                        str_number += c;
                    }
                    break;
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                    if (base == 2) {
                        return "Parse error: digit > base 2";
                    }
                    if (is_expo_part == true) {
                        exponent_part += c;
                    } else {
                        str_number += c;
                    }
                    break;
                case "8":
                case "9":
                    if (base <= 8) {
                        return "Parse error: digit > base 8";
                    }
                    if (is_expo_part == true) {
                        exponent_part += c;
                    } else {
                        str_number += c;
                    }
                    break;
                case "a":
                case "A":
                case "b":
                case "B":
                case "c":
                case "C":
                case "d":
                case "D":
                    if (is_expo_part == true) {
                        return "Parse error: base in exponent > 10";
                    } else if (base <= 10) {
                        return "Parse error: digit > base 10";
                    } else {
                        str_number += c;
                    }
                    break;
                case "e":
                case "E":
                    if (base != 16 && is_expo_part == true) {
                        return "Parse error: additional exponent part found";
                    }
                    if (base == 16) {
                        str_number += c;
                    } else {
                        is_expo_part = true;
                    }
                    break;
                case "f":
                case "F":
                    if (base <= 10) {
                        return "Parse error: digit > base 10";
                    } else {
                        str_number += c;
                    }
                    break;
                case "p":
                case "P":
                    if (base == 16) {
                        is_expo_part = true;
                    } else {
                        return "Parse error: wrong character: \"" + c +
                            "\"";
                    }
                    break;
                case ".":
                    if (decimal_point >= 0) {
                        return "Parse error: additional decimal point found";
                    }
                    decimal_point = i;
                    break;
                case '+':
                case "-":
                    if (is_expo_part == true) {
                        expo_sign = c;
                    } else {
                        return "Parse error: sign at wrong position";
                    }
                    break;
                    // either this or ignore. Add "_" (underbars) like in Perl?
                default:
                    return "Parse error: unknown character = \"" + c +
                        "\"";

            }
        }
        if (str_number.length == 0) {
            // No error, just return zero instead, for simplicity
            // Maybe raise a warning, for debugging purposes
            // console.log("Parse error: number has no digits?");
            return [base, sign, "0", decimal_point, 1];
        }
        if (is_expo_part == true) {
            exponent_part = parseInt(expo_sign + exponent_part);
        } else {
            exponent_part = 0;
        }
        // Strip leading and trailing zeros of fractions
        if (decimal_point >= 0) {
            var parts0 = str_number.substring(0, decimal_point);
            var parts1 = str_number.substring(decimal_point);
            k = 0;
            i = parts1.length - 1;
            // count leading zeros, integer part
            while (parts0.charAt(k) == "0") {
                k++;
            }
            // count trailing zeros, fractional part
            while (parts1.charAt(i) == "0") {
                i--;
            }
            // strip the zeros
            parts0 = parts0.substring(k);
            parts1 = parts1.substring(0, i + 1);
            k = 0;
            // count leading zeros, fractional part
            while (parts1.charAt(k) == "0") {
                k++;
                if (k == parts1.length) {
                    break;
                }
            }
            // move number of trailing zeros to exponent,
            // that is: 0.0001 = 1e-4
            // but only if there is no integer part
            if (k > 0 && parts0.length == 0) {
                parts1 = parts1.substring(k);
                exponent_part -= k;
            }
            // catch a zero here
            if (parts0.length == 0 && parts1.length - k == 0) {
                parts0 = "0";
                exponent_part = 1;
            }
            return [base, sign, parts0, parts1, decimal_point,
                exponent_part
            ];
        } else {
            k = 0;
            // strip leading zeros
            while (str_number.charAt(k) == "0") {
                k++;
            }
            str_number = str_number.substring(k);
            return [base, sign, str_number, "", decimal_point,
                exponent_part
            ];
        }
    };
    var stringToBigfloat = function(arrayFromParseNumber) {
        var exceptions;
        if (typeof arrayFromParseNumber === 'string') {
            // check if it is +-Infinity or +-NaN
            if (arrayFromParseNumber.search(/[+-]{0,1}Infinity/) >= 0) {
                exceptions = (new Bigfloat()).setInf();
                exceptions.sign = arrayFromParseNumber.match(/{+-}/)[0];
                exceptions.sign = (exceptions.sign == "-") ? MP_NEG : MP_ZPOS;
                exceptions.mantissa.sign = exceptions.sign;
                return exceptions.sign;
            } else if (arrayFromParseNumber.search(/[+-]{0,1}NaN/) >= 0) {
                exceptions = (new Bigfloat()).setNaN();
                exceptions.sign = arrayFromParseNumber.match(/[+-]/)[0];
                exceptions.sign = (exceptions.sign == "-") ? MP_NEG : MP_ZPOS;
                exceptions.mantissa.sign = exceptions.sign;
                return exceptions.sign;
            } else {
                // raise some error and...
                return (new Bigfloat()).setNaN();
            }
        }
        var base = arrayFromParseNumber[0];
        var sign = arrayFromParseNumber[1];
        var int_part = arrayFromParseNumber[2];
        var fract_part = arrayFromParseNumber[3];
        var decimal_point = arrayFromParseNumber[4];
        var exponent = arrayFromParseNumber[5];
        var ten = new Bigint(10);
        var k = 0;
        var slen = int_part.length + fract_part.length;
        var numerator, denominator;
        var num_len, den_len;
        var s;
        var fraction;
        var the_number = new Bigfloat();
        var log210 = parseFloat(
            "3.321928094887362347870319429489390175865");

        var roundFraction = function(num, den, S) {
            var frac, Q, R, dhalf, cmp;
            // We might need to do the next lines multiple times
            // so either loop or use a goto. JavaScript has no goto
            // so a loop it is.
            // LOOP:
            do {
                // Divide, keep quotient and remainder
                // numerator = Q * denominator + R
                frac = num.divrem(den);
                Q = frac[0];
                R = frac[1];
                // we need one half of the denominator to compare
                // the remainder against, so dhalf = denominator/2
                // works only if denominator is even. There
                // are some rare cases where that is not the case
                // It's a cheap test, so...
                if (den.isEven()) {
                    dhalf = den.rShift(1);
                } else {
                    dhalf = den.sub(R);
                }
                // Rounding. Fixed mode: "half to even"
                // if(R > dhalf) Q' = Q +1
                // if(R == dhalf && Q.isOdd()) Q' = Q +1
                cmp = R.cmp(dhalf);
                if (cmp == MP_GT) {
                    Q.incr();
                }
                if (cmp == MP_EQ) {
                    if (Q.isOdd()) {
                        Q.incr();
                    }
                }
                /*
                    Other rounding modes may need information about the
                    sign, too.
                 */
                // Q' might got too large and is > work-precision now
                // if that is the case set numerator = numerator/2
                // and s = s + 1, then goto LOOP
                if ((Q.highBit() + 1) > the_number.precision) {
                    num.rShiftInplace(1);
                    S++;
                    continue;
                }
                // else break out of the loop if one was used instead of
                // a goto
                break;
            } while (true);
            return [Q, S];
        };
        // handle integers separatly to increase legibility
        var handleInteger = function(expo) {
            var exp;
            if (arguments.length > 0) {
                exp = expo;
            } else {
                exp = exponent;
            }
            numerator = (int_part + fract_part).toBigint();
            numerator = numerator.mul(ten.pow(expo));
            // the denominator is one and needs to be scaled instead
            // of the numerator
            denominator = new Bigint(1);
            // the scale factor s is just the bitlength of the numerator
            s = numerator.highBit();
            // any integers smaller than the work-precsion can be
            // taken as is, all others need rounding
            if (s <= the_number.precision) {
                // console.log("si = " + s);
                numerator.lShiftInplace(the_number.precision - s);
                exponent = -(the_number.precision - s);
                the_number.mantissa = numerator;
                the_number.mantissa.sign = (sign == "-") ? MP_NEG :
                    MP_ZPOS;
                the_number.sign = the_number.mantissa.sign;
                the_number.exponent = exponent;
                return the_number;
            } else {
                denominator.lShiftInplace(s - the_number.precision);
                fraction = roundFraction(numerator, denominator, s);
                // console.log("frac1 = " + fraction[1])
                exponent = -(the_number.precision - fraction[1]);
                the_number.mantissa = fraction[0];
                the_number.mantissa.sign = (sign == "-") ? MP_NEG :
                    MP_ZPOS;
                the_number.sign = the_number.mantissa.sign;
                the_number.exponent = exponent;
                return the_number;
            }
        };


        if (int_part == "0" && fract_part == "" && exponent == 1) {
            // special number zero
            the_number.mantissa.sign = (sign == "-") ? MP_NEG : MP_ZPOS;
            the_number.sign = the_number.mantissa.sign;
            return the_number;
        }

        if (decimal_point < 0  && exponent >= 0) {
            return handleInteger(exponent);
        }


        if (base == 10) {
            // handles base 10, who would have thought.
            // scale exponent
            // 12.34e4 = 1234e2     -> integer
            // 12.34e2 = 1234e0     -> integer
            // 12.34e1 = 1234e-1    -> fraction
            // 12.34e-10 = 1234e-12 -> fraction
            exponent -= fract_part.length;
            if (exponent >= 0) {
                return handleInteger(exponent);
            }
            // convert number string to integer (Bigint), that
            // will be the numerator
            numerator = (int_part + fract_part).toBigint();
            // Build denominator as 10 to the power of the decimal
            // places of the number.
            denominator = ten.pow(Math.abs(exponent));
            // Scale it. Both values are already in binary, we can
            // just take the difference of the bit length.
            num_len = numerator.highBit();
            den_len = denominator.highBit();
            // Compute the scale factor s = #(N_r) - #(D_r)
            s = (num_len - den_len);
            // Multiply the numerator by 2^(precision - s) where
            // "precision"" is the working precision of the Bigfloat
            numerator.lShiftInplace(the_number.precision - s);
            // Built the Bigfloat's fraction part and round it;
            // rounding mode is "half to nearest"
            fraction = roundFraction(numerator, denominator, s);
            exponent = -(the_number.precision - fraction[1]);
            // build the Bigfloat and return it.
            the_number.mantissa = fraction[0];
            the_number.mantissa.sign = (sign == "-") ? MP_NEG : MP_ZPOS;
            the_number.sign = the_number.mantissa.sign;
            the_number.exponent = exponent;

            return the_number;
        } else {
            // handle bases 2, 8 and 16
            // most of the base-10 code can be reused here
        }
    };
    var parsedString = parseNumber(this);
    var ret = stringToBigfloat(parsedString);
    // checks and balances
    ret.normalize();
    return ret;
};
/**
   Convert a Bigfloat to a String
   @param {number} base of output (only base 10 for now)
   @return {string} the number in scientific notation
*/
Bigfloat.prototype.toString = function(numbase) {
    var ret, quot;
    var log210 = parseFloat("3.321928094887362347870319429489390175865");
    var sign = (this.sign == MP_NEG) ? "-" : "";
    var decprec = this.getDecimalPrecision();
    var exponent = this.exponent;
    var signexpo = (this.exponent < 0) ? "-" : "";
    var decexpo;
    var ten = new Bigint(10);
    var one = new Bigint(1);

    if (this.isZero()) {
        return sign + "0.0E0";
    }

    // we could use the sign of the mantissa directly but that might
    // not be the correct one.
    ret = this.mantissa.abs();

    // if exponent >= 0 shift left by exponent
    if (exponent >= 0) {
        // lShiftInplace() does nothing if exponent is zero, no check needed.
        ret.lShiftInplace(exponent);
        if (ret.isZero()) {
            ret = "00";
        } else {
            ret = ret.toString();
        }
        decexpo = ret.length - 1;
        signexpo = "";
    } else {
        // multiply by 10^(toDec(this.precision)) and divide by 2^exponent
        // the decimal point is at 10^(toDec(this.precision)).
        // don't check for a proper integer; it can't be known if it is a
        // real one
        // What can be done is checking the remainder in the division below--
        // if it is zero it is an integer for all intent and purposes
        decexpo = Math.floor(Math.abs(this.exponent) / log210);
        // scale
        ret = ret.mul(ten.pow(decexpo));
        // convert
        one.lShiftInplace(Math.abs(exponent));
        ret = ret.div(one);
        // TODO: needs some rounding here, too, or some guard digits in general
        // NOTE: general guard  digits are better--in general. I think.
        var mod100 = ret.divremInt(100)[1];
        var mod10 = mod100 % 10;
        if (mod10 > 5) {
            ret = ret.addInt(10 - mod10);
        } else if (mod10 == 5) {
            mod100 = Math.floor(mod100 / 10) % 10;
            if (mod100 & 1 == 1) {
                ret = ret.addInt(10 - mod10);
            }
        }
        if (ret.isZero()) {
            ret = "00";
        } else {
            ret = ret.toString();
        }
        // rounding might have added a digit (e.g.: 0.999... <> 1.000...)
        // so calculate the decimal exponent accordingly
        if (ret.length > decprec) {
            decexpo = decprec - decexpo;
        } else {
            decexpo = decprec - decexpo - 1;
        }
        if (Math.abs(this.exponent) < this.precision) {
            signexpo = "";
        }
    }

    if (decexpo == 0) {
        signexpo = "";
    }
    ret = sign + ret.slice(0, 1) + "." + ret.slice(1, decprec) + "e" +
        signexpo + Math.abs(decexpo).toString();
    return ret;
};
/**
   Set Bigfloat to <code>NaN</code>
*/
Bigfloat.prototype.setNaN = function() {
    this.mantissa.setNaN();
};
/**
   Check if Bigfloat is <code>NaN</code>
   @return {bool} true if it is NaN
*/
Bigfloat.prototype.isNaN = function() {
    this.mantissa.isNaN();
};
/**
   Set Bigfloat to <code>Infinity</code>
   Sign of the infinity is kept.
*/
Bigfloat.prototype.setInf = function() {
    this.mantissa.setInf();
};
/**
   Check if Bigfloat is <code>Infinity</code>
   @return {bool} true if it is Infinity
*/
Bigfloat.prototype.isInf = function() {
    this.mantissa.isInf();
};
/**
   Check if Bigfloat is exactly zero
   @return {bool} true if it is exactly zero
*/
Bigfloat.prototype.isZero = function() {
    if (this.mantissa.isZero() == MP_YES &&
        this.exponent == 1) {
        return MP_YES;
    }
    return MP_NO;
};
/**
   Check if Bigfloat is between zero and plusminus one exclusively:
   <code>0&lt;x&lt;1</code>
   @return {bool} true if it is fraction
*/
Bigfloat.prototype.isFraction = function() {
    if (this.isZero()) {
        return true;
    }
    return (this.exponent <= -this.precision) ? true : false;
};

/**
   Check if <code>this</code> is inside the allowed magnitude for a 64 bit
   IEEE-double (between ca. 2.225e-308 and 1.798e308)
   @return {bool} true if it fits a double in magnitude
*/
Bigfloat.prototype.isDouble = function(){
    var prec = this.precision;
    var exp = this.exponent;
    // The bias is dynamical and at -precision, so any exponent
    // which is in -(1022 + precision) < exp < (1023 - precision)
    // is inside the domain for a 64 bit IEEE-double
    if(-(1021 + prec) <= exp && exp <= (1024 - prec)){
        return MP_YES;
    } else {
        return MP_NO;
    }
};

/**
   Check if the absolute value of the Bigfloat is smaller or equal to EPS
   @return {bool} true if it is smaller or equal to EPS
*/
Bigfloat.prototype.isEPSZero = function() {
    var eps, cmp;
    if (this.mantissa.isZero() == MP_YES &&
        this.exponent == 1) {
        return MP_YES;
    }
    eps = this.EPS();
    cmp = this.abs().cmp(eps);
    if (cmp != MP_GT) {
        return MP_YES;
    }
    return MP_NO;
};
// calls normalize() at the end, usable to change prec. temporary
/**
   Deep copy of a Bigfloat. Calls normalize() at the end, which is for example
   usable to temporarily change precision
   @return {Bigfloat} a copy of the original
*/
Bigfloat.prototype.copy = function() {
    var ret = new Bigfloat();
    ret.sign = this.sign;
    ret.exponent = this.exponent;
    ret.precision = this.precision;
    ret.mantissa = this.mantissa.copy();
    ret.normalize();
    return ret;
};
/**
   Deep copy of a Bigfloat. Calls normalize() at the end, which is for example
   usable to temporarily change precision
   @return {Bigfloat} a copy of the original
*/
Bigfloat.prototype.dup = function() {
    return this.copy();
};
/**
   Absolute value of the  Bigfloat. Works on copy.
   @return {Bigfloat} the absolute value
*/
Bigfloat.prototype.abs = function() {
    var ret = this.copy();
    ret.sign = MP_ZPOS;
    ret.mantissa.sign = MP_ZPOS;
    return ret;
};
/**
   Negate the  Bigfloat. Works on copy.
   @return {Bigfloat}
*/
Bigfloat.prototype.neg = function() {
    var ret = this.copy();
    ret.sign = (this.sign == MP_ZPOS) ? MP_NEG : MP_ZPOS;
    ret.mantissa.sign = ret.sign;
    return ret;
};
/**
   Deep copy of a Bigfloat. Calls normalize() at the end, which is for example
   usable to temporarily change precision
   @return {Bigfloat} a copy of the original
*/
Bigfloat.prototype.exch = function(bf) {
    // of not much use here
    return this.copy();
};
/**
   Tests if <code>this</code> is an integer. Uses the <code>floor()</code>
   function which can be more expensive than intented.
   @return {boolean}
*/
Bigfloat.prototype.isInt = function() {
    return (this.floor().cmp(this) == MP_EQ);
};

/**
   Floor function. Works on copy.
   @return {Bigfloat}
*/
Bigfloat.prototype.floor = function() {
    var qr, q, r, one, ret;
    // integer
    if (this.exponent > 0) {
        return this.copy();
    }
    // fraction, return zero
    if (this.exponent <= -this.precision) {
        return new Bigfloat();
    }
    //mixed/integer
    one = new Bigint(1);
    one.lShiftInplace(Math.abs(this.exponent));
    qr = this.mantissa.divrem(one);
    q = qr[0];
    r = qr[1];
    // No remainder means no fraction part
    if (r.isZero()) {
        return this.copy();
    }
    // return integer part
    ret = new Bigfloat();
    ret.mantissa = q.copy();
    ret.exponent = 0;
    ret.normalize();
    // round to -infinity, e.g.: floor(-1.9) = -2
    if(this.sign == MP_NEG){
       one = new Bigfloat(1);
       return ret.sub(one);
    }
    return ret;
};
/**
   Round function. Works on copy.
   @return {Bigfloat}
*/
Bigfloat.prototype.round = function() {
    var qr, q, r, one, two, ret, cmp;
    if (this.isNaN() || this.isInf()) {
        return this.copy();
    }
    if (this.isZero()) {
        return this.copy();
    }
    // integer
    if (this.exponent > 0) {
        return this.copy();
    }
    one = new Bigfloat(1);
    two = new Bigfloat(2);
    two = two.inv();
    // fraction
    if (this.exponent <= -this.precision) {
        ret = this.abs();
        cmp = ret.cmp(two);
        // >= .5 round up
        if (cmp != MP_LT) {
            if(cmp == MP_EQ){
               // -.5 rounds up to zero
               if(this.sign == MP_NEG){
                  return new Bigfloat();
               }
            }
            if (this.sign == MP_NEG) {
                one.sign = MP_NEG;
                one.mantissa.sign = MP_NEG;
            }
            return one;
        } else {
            return new Bigfloat();
        }
    }
    // mixed/integer
    // just add .5 for now, other rounding methods come later
    ret = this.add(two).floor();
    return ret;
};
/**
   Ceil function. Works on copy.
   @return {Bigfloat}
*/
Bigfloat.prototype.ceil = function() {
    var one = new Bigfloat(1);
    return this.floor().add(one);
};
/**
   Normalizes the Bigfloat. Works in-place.
   Only needed when changing precision or manipulating the innards of
   Bigfloat.
   @return {Bigfloat}
*/
Bigfloat.prototype.normalize = function() {
    var cb, diff;
    var err;
    var c;

    // So one can set precision by way of normalizing
    if (this.precision != MPF_PRECISION && this.precision >=
        MPF_PRECISION_MIN) {
        this.precision = MPF_PRECISION;
    } else if(this.precision < MPF_PRECISION_MIN){
        this.precision = MPF_PRECISION_MIN;
    }

    if (this.isZero()) {
        return MP_OKAY;
    }

    cb = this.mantissa.highBit() + 1;

    if (cb > this.precision) {
        diff = cb - this.precision;
        this.exponent += diff;
        if (!this.exponent.isInt()) {
            this.setInf();
            this.sign = MP_ZPOS;
            return MPFE_OVERFLOW;
        }
        /* round it, add 1 after shift if diff-1'th bit is 1 */
        c = this.mantissa.dp[Math.floor(diff / MP_DIGIT_BIT)] & (1 << (diff %
            MP_DIGIT_BIT));
        this.mantissa.rShiftInplace(diff);

        if (c != 0) {
            this.mantissa.incr();
            return MP_OKAY;
        } else {
            return MP_OKAY;
        }
    } else if (cb < this.precision) {
        if (this.mantissa.isZero() == MP_YES) {
            this.exponent = 1;
            return MP_OKAY;
        } else {
            diff = this.precision - cb;
            this.exponent -= diff;
            if (!this.exponent.isInt()) {
                this.setInf();
                this.sign = MP_NEG;
                return MPFE_UNDERFLOW;
            }
            this.mantissa.lShiftInplace(diff);
            return MP_OKAY;
        }
    }
    return MP_OKAY;
};

/**
  Compares one Bigfloat to another.
  @param {Bigfloat} the bigfloat to compare against
  @return {number} MP_LT, MP_EQ, and MP_GT when this is lower, equal or greater
                   than the argument, respectively
*/
Bigfloat.prototype.cmp = function(bf) {
    var za, zb, sa, sb, tmp;

    if(!(bf instanceof Bigfloat)){
        return this.cmp(bf.toBigfloat());
    }
    // just in case one of the participants is not normalized
    // would otherwise cause a very curious error
    if(this.precision != bf.precision){
        if(this.precision < bf.precision){
            tmp = this.copy();
            tmp.normalize();
            return tmp.cmp(bf);
        } else {
            tmp = bf.copy();
            tmp.normalize();
            return this.cmp(tmp);
        }
    }

    /* if one is zero than we early out */
    za = this.mantissa.isZero();
    sa = this.mantissa.sign;
    zb = bf.mantissa.isZero();
    sb = bf.mantissa.sign;

    if (za == MP_YES && zb == MP_NO) {
        /* result depends on b */
        if (sb == MP_NEG) {
            return MP_GT;
        } else {
            return MP_LT;
        }
    } else if (za == MP_NO && zb == MP_YES) {
        /* result depends on a */
        if (sa == MP_NEG) {
            return MP_LT;
        } else {
            return MP_GT;
        }
    }

    /* compare the signs */
    if (sa == MP_NEG && sb == MP_ZPOS) {
        return MP_LT;
    } else if (sa == MP_ZPOS && sb == MP_NEG) {
        return MP_GT;
    }

    /* they're both non-zero, the same sign and normalized, compare the exponents */
    if (this.exponent > bf.exponent) {
        return (sa == MP_NEG) ? MP_LT : MP_GT;
    } else if (this.exponent < bf.exponent) {
        return (sa == MP_NEG) ? MP_GT : MP_LT;
    }

    /* same exponent and sign, compare mantissa */
    return this.mantissa.cmp(bf.mantissa);
};
/**
   Add one Bigfloat to another.<br>
   This algorithm works by truncating instead of expanding. This is much faster
   for large differences in size but makes it harder to detect inexact/invalid
   outcomes.
   @todo: detect inexact/invalid errors
   @param {Bigfloat} the other part of the sum
   @return {Bigfloat}
*/
Bigfloat.prototype.add = function(bf) {
    var tmp, other;
    var diff;
    var ret;

    if(!(bf instanceof Bigfloat)){
        return this.add(bf.toBigfloat());
    }

    if (this.isZero()) {
        tmp = bf.copy();
        tmp.normalize();
        return tmp;
    }
    if (bf.isZero()) {
        tmp = this.copy();
        tmp.normalize();
        return tmp;
    }
    if (this.exponent < bf.exponent) {
        /* tmp == a normalize to b's exp */
        tmp = this.copy();

        /* now make tmp.exp == b.exp by dividing tmp by 2^(b.exp - tmp.exp) */
        diff = bf.exponent - tmp.exponent;
        tmp.exponent = bf.exponent;
        tmp.mantissa.rShiftInplace(diff);
        /* other arg */
        other = bf;
    } else {
        /* tmp == b normalize to a's radix */
        tmp = bf.copy();

        /* now make tmp.exp == a.exp by dividing tmp by 2^(a.exp - tmp.exp) */
        diff = this.exponent - tmp.exponent;
        tmp.exponent = this.exponent;
        tmp.mantissa.rShiftInplace(diff);
        other = this;
    }

    /* perform addition, set the exponent and then normalize */

    ret = new Bigfloat();
    ret.mantissa = tmp.mantissa.add(other.mantissa);
    ret.exponent = other.exponent;
    ret.sign = ret.mantissa.sign;
    ret.normalize();
    return ret;
};
/**
   Subtract one Bigfloat from another.<br>
   This algorithm works by truncating instead of expanding. This is much faster
   for large differences in size but makes it harder to detect inexact/invalid
   outcomes.
   @todo: detect inexact/invalid errors
   @param {Bigfloat} the other part of the difference
   @return {Bigfloat}
*/
Bigfloat.prototype.sub = function(bf) {
    var err;
    var tmp;
    var diff;
    var ret = new Bigfloat();

    if(!(bf instanceof Bigfloat)){
        return this.sub(bf.toBigfloat());
    }

    if (this.isZero()) {
        tmp = bf.neg();
        tmp.normalize();
        return tmp;
    }
    if (bf.isZero()) {
        tmp = this.copy();
        tmp.normalize();
        return tmp;
    }
    if (this.exponent < bf.exponent) {
        /* tmp == a normalize to b's exp */
        tmp = this.copy();
        /* now make tmp.exp == b.exp by dividing tmp by 2^(b.exp - tmp.exp) */
        diff = bf.exponent - tmp.exponent;
        tmp.exp = bf.exponent;
        tmp.mantissa.rShiftInplace(diff);
        ret.mantissa = tmp.mantissa.sub(bf.mantissa);
        ret.exponent = bf.exponent;
    } else {
        /* tmp == b normalize to a's radix */
        tmp = bf.copy();
        diff = this.exponent - tmp.exponent;
        tmp.exp = this.exponent;
        /* now make tmp.exp == a.exp by dividing tmp by 2^(a.exp - tmp.exp) */
        tmp.mantissa.rShiftInplace(diff);
        ret.mantissa = this.mantissa.sub(tmp.mantissa);
        ret.exponent = this.exponent;
    }

    ret.sign = ret.mantissa.sign;
    ret.normalize();
    return ret;
};

/**
   Multiply two Bigfloats
   @param {Bigfloat}
   @return {Bigfloat}
*/
Bigfloat.prototype.mul = function(bf) {
    var ret = new Bigfloat();
    if(!(bf instanceof Bigfloat)){
        return this.mul(bf.toBigfloat());
    }
    ret.mantissa = this.mantissa.mul(bf.mantissa);
    ret.exponent = this.exponent + bf.exponent;
    ret.sign = ret.mantissa.sign;
    ret.normalize();
    return ret;
};
/**
   Square this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.sqr = function() {
    var ret = new Bigfloat();

    ret.mantissa = this.mantissa.sqr();
    ret.exponent = 2 * this.exponent;
    ret.sign = ret.mantissa.sign;
    ret.normalize();
    return ret;
};
/**
   Divide one Bigfloat by another
   @param {Bigfloat}
   @return {Bigfloat}
*/
Bigfloat.prototype.div = function(bf) {
    var tmp;
    var ret;
    if(!(bf instanceof Bigfloat)){
        return this.div(bf.toBigfloat());
    }
    /* ensure b is not zero */
    if (bf.mantissa.isZero() == MP_YES) {
        return MP_VAL;
    }
    // TODO: the rest of the IEEE-754 exceptions

    /* find 1/b */
    tmp = bf.inv();

    /* now multiply */
    ret = this.mul(tmp);
    return ret;
};
/**
   Remainder of th division of one Bigfloat by another
   @param {Bigfloat}
   @return {Bigfloat}
*/
Bigfloat.prototype.rem = function(bf) {
    var r;
    if(!(bf instanceof Bigfloat)){
        return this.rem(bf.toBigfloat());
    }
    if (this.isZero()) {
        return new Bigfloat();
    }
    if (bf.isZero()) {
        // raise divisionByZero
        return (new Bigfloat()).setNaN();
    }
    // r = b - floor(a/b)*a
    r = bf.sub(this.div(bf).floor().mul(this));
    return r;
};
/**
   Compute multiplicative inverse (1/x) of this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.inv = function() {
    var ret, x0, xn, hn, A, inval, oldprec, one, nloops, eps,diff;
    // compute initial value x0 = 1/A
    inval = this.toNumber();
    inval = Math.abs(inval);
    if(inval == 0){
       inval = 0.000000000000001;
    }
    inval = 1 / inval;
    oldprec = this.precision;
    // number of loops:
    // quadratic, so every round doubles the number of correct digits
    // TODO: this is the function for decimal digits, need a different one here
    // NOTE: maximum #rounds is log_2(precision)
    var maxrounds = oldprec.highBit() + 1;
    nloops = 0;
    setPrecision(oldprec + 3);
    xn = inval.toBigfloat();
    eps = xn.EPS();
    // x0 = xn.copy();
    one = new Bigfloat(1);
    A = this.abs();
    // xn = 2*xn-A*xn^2 normally but here we do something different:
    // hn =  1-A*xn
    // x(n+1) = xn + xn*hn.
    do {
        x0 = xn.copy();
        hn = one.sub(A.mul(xn));
        xn = xn.add(xn.mul(hn));
        nloops++;
        if(nloops >= maxrounds){
           break;
        }
        diff = x0.sub(xn).abs();
        if(diff.isZero()){
           break;
        }
    }while(diff.cmp(eps) == MP_GT);
    // we are probably (hopefuly) too high
    setPrecision(oldprec);
    xn.normalize();
    // set sign
    xn.sign = this.sign;
    xn.mantissa.sign = this.sign;
    return xn;
};
/**
   Compute square root (x^(1/2)) of this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.sqrt = function() {
    var ret, x0, xn, hn, A, sqrtval, oldprec, one, two, nloops, diff;
    var eps;
    if (this.sign == MP_NEG) {
        return (new Bigfloat()).setNaN();
    }
    // compute initial value x0 = 1/sqrt(A)
    sqrtval = this.toNumber();
    if (sqrtval == 1) {
        if (Math.abs(this.exponent) >= 104) {
            sqrtval = 1.00000000000001;
        } else {
            sqrtval = 0.99999999999999;
        }
    }
    sqrtval = 1 / Math.sqrt(sqrtval);
    oldprec = this.precision;
    eps = this.EPS();
    // see Bigfloat.inv() for problems with this approach
    var maxrounds = oldprec.highBit() + 1;
    nloops = 0;
    setPrecision(oldprec + 3);
    xn = sqrtval.toBigfloat();
    // x0 = xn.copy();
    one = new Bigfloat(1);
    two = new Bigfloat(2);
    two = two.inv();
    A = this.abs();
    // inverse sqrt
    // hn = 1-A*xn^2
    // x(n+1) = xn + xn/2 * hn.
    do {
        x0 = xn.copy();
        hn = one.sub(A.mul(xn.sqr()));
        xn = xn.add(xn.mul(two).mul(hn));
        nloops++;
        if (nloops >= maxrounds) {
            break;
        }
        diff = x0.sub(xn).abs();
        if (diff.isZero()) {
            break;
        }
    } while (diff.cmp(eps) == MP_GT);
    // we are probably (hopefuly) too high
    setPrecision(oldprec);
    xn.normalize();
    // sqrt(A) = 1/sqrt(A) * A
    xn = xn.mul(A);
    return xn;
};
/**
   Exponentiate (x^e) this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.exp = function() {
    var n, to, t, tx, ret, x0, one, two, m, nt, i, oldprec, sign = MP_ZPOS,diff;
    // TODO: checks & balances

    if (this.isZero()) {
        return new Bigfloat(1);
    }
    // TODO: check if size of input is too large



    oldprec = getPrecision();
    //var extra = Math.floor(oldprec / 100) * 5  + 3;

    // TODO: compute number of guard digits more precisely
    setPrecision(oldprec + 30 );

    if (this.sign == MP_NEG) {
        sign = MP_NEG;
        nt = this.abs();
    } else {
        nt = this.copy();
    }

    ret = new Bigfloat(1);
    var eps = ret.EPS();
    to = new Bigfloat(1);
    tx = new Bigfloat(1);
    n = 1;

    // NOTE: calculate a bit more precisely
    i = Math.floor(this.precision / 3.32) + 10;
    // argument reduction by 1/2^m
    one = new Bigint(1);
    two = new Bigfloat(2);
    // TODO: calculate according to size of input
    // High is good for large input size bit if the input
    // is already small it is quite a waste
    m = 32;
    one.lShiftInplace(m);
    one = one.toBigfloat();
    one = one.inv();
    nt = nt.mul(one);
    do {
        x0 = ret.copy();
        t = new Bigfloat(n++);
        t = t.inv();
        to = t.mul(to);
        tx = tx.mul(nt);
        t = to.mul(tx);
        ret = t.add(ret);
        if (i-- == 0) {
            break;
        }
        diff = x0.sub(ret).abs();
        if(diff.isZero()){
           break;
        }
    } while (diff.cmp(eps) == MP_GT);
    // we used the standard series to compute exp(z/2^m) + 1
    one = new Bigfloat(1);
    ret = ret.sub(one);
    // reverse argument reduction
    for (i = 0; i < m; i++) {
        to = ret.sqr();
        ret.lShiftInplace(1);
        ret = ret.add(to);
    }
    // we have exp(z) - 1 now, add one unit
    ret = ret.add(one);
    // exp(-z) = 1/exp(z)
    if (sign == MP_NEG) {
        ret = ret.inv();
    }
    setPrecision(oldprec);
    ret.normalize();
    return ret;
};

/**
   Logarithm base e (log(x)) of this Bigfloat<br>
   Algorithm based on Taylor series for <code>log(1 + x)</code>
   @return {Bigfloat}
*/
Bigfloat.prototype.log = function() {
    var ret;
    var eps;
    var x, f, e;
    var x0, n = 2,
        diff, to, t, argred, xc;
    var oldeps = epsilon();
    if(this.isZero()){
        throw new RangeError("argument to Bigfloat.log is zero");
    }
    if(this.isInf()){
        return (new Bigfloat()).setInf();
    }
    if(this.sign == MP_NEG ){
        // TODO: send to Complex instead
        throw new RangeError("argument to Bigfloat.log is negativ");
    }
    // a bit of extra precision, mostly for the argument reduction
    epsilon(oldeps + 3);
    // argument reduction
    argred = (256).toBigfloat();
    eps = argred.EPS();
    x = this.copy();
    // use the fraction part which is guaranteed to be < 1
    f = x.frexp();
    x = f[0];
    // log(x^n) = n log(x)
    for (var k = 0; k < 8; k++) {
        x = x.sqrt();
    }
    x = x.sub(new Bigfloat(1));
    xc = x.copy();
    ret = x.copy();
    e = f[1].toBigfloat();
    do {
        x0 = ret.copy();
        t = new Bigfloat(n);
        t = t.inv(); // -> 1/n
        x = x.mul(xc); // x^(n-1) -> x^(n)
        t = t.mul(x); // 1/n*x^(n)
        if (n.isOdd()) {
            ret = ret.add(t);
        } else {
            ret = ret.sub(t); // series + 1/n*x^(n)
        }
        diff = x0.abs().sub(ret.abs()).abs();
        if (diff.isZero()) {
            break;
        }
        n++;
    } while (diff.cmp(eps) != MP_LT);
    ret = ret.mul(argred).add(e.mul(ret.constlog2()));
    epsilon(oldeps);
    ret.normalize();
    return ret;
};

/**
   Logarithm base e (log(x)) of this Bigfloat<br>
   Algorithm based on x(n+1) = xn - 1 + A/exp(xn)
   @return {Bigfloat}
*/
Bigfloat.prototype.oldlog = function() {
    var init, ret, x0, xn, t, A, logval, prec, oldprec, one, two, nloops, diff,eps;

    if (this.sign == MP_NEG) {
        return (new Bigfloat()).setNaN();
    }
    if (this.isZero()) {
        return (new Bigfloat()).setInf();
    }
    // compute initial value x0 = 1/sqrt(A)
    logval = this.toNumber();
    logval = Math.log(logval);
    oldprec = this.precision;

    // see Bigfloat.inv() for problems with this approach
    var maxloops = oldprec.highBit()  + 1;
    nloops = 0;
    var extra = Math.floor(oldprec / 100) * 5  + 3;
    setPrecision(oldprec + extra + 20);
    xn = logval.toBigfloat();
    eps = xn.EPS();
    one = new Bigfloat(1);
    A = this.abs();
    // logarithm
    // x(n+1) = xn - 1 + A/exp(xn).
    do {
        x0 = xn.copy();
        xn = xn.sub(one);
        t = A.div(x0.exp());
        xn = xn.add(t);
        diff = xn.sub(x0).abs();

        nloops++;
        if(nloops >= maxloops){
           break;
        }
        if(diff.isZero()){
           break;
        }
    } while (diff.cmp(eps) == MP_GT);
    // we are probably (hopefuly) too high
    setPrecision(oldprec);
    xn.normalize();
    return xn;
};

/**
   Computes <code>this</code> to the power of <code>e</code><br>
   It might be a faster way for large integer exponents to use
   the method x^n = exp(n log(x)) directly.
   @param {number|Bigint|Bigfloat} e the exponent
   @return {Bigfloat}
*/
Bigfloat.prototype.pow = function(e) {
    var bigintpow = function(b, e) {
        var ret = new Bigfloat(1);
        var bi;
        if (!(e instanceof Bigint)) {
            bi = e.toBigint();
        } else {
            bi = e.copy();
        }
        while (bi.isZero() == MP_NO) {
            if (bi.isOdd() == MP_YES) {
                ret = ret.mul(b);
            }
            b = b.sqr();
            bi.rShiftInplace(1);
        }
        return ret;
    };
    var intpow = function(b, e) {
        var ret = new Bigfloat(1);
        var bi = e;
        while (bi != 0) {
            if (bi.isOdd() == MP_YES) {
                ret = ret.mul(b);
            }
            b = b.sqr();
            bi >>>= 1;
        }
        return ret;
    };
    if (!(e instanceof Bigfloat)) {
        if (e.isInt()) {
            if(e instanceof Bigint){
                return bigintpow(this.copy(), e);
            } else {
                return intpow(this.copy(), e);
            }
        } else {
            return this.pow(e.toBigfloat());
        }
    }
    // Now it gets quite expensive
    var logt = this.log();
    var ret = logt.mul(e);
    return ret.exp();
};


/**
   Integer logarithm base 2 of <code>this</code><br>
   Returns zero for 0 &lt; this &lt;= 1
   @return {number}
*/
Bigfloat.prototype.ilog2 = function(){
    var d = this.precision - Math.abs(this.exponent);
    if(d < 0){
        return 0;
    } else {
        return d - 1;
    }
};

/**
   Computes <code>this</code> to the power of <code>1/b</code>, the so called
   n<sup><i>th</(i></sup>-root<br>
   @param {number} b the exponent, th <i>n</i> in n<sup><i>th</(i></sup>-root
   @return {Bigfloat}
*/
// TODO: initial value!
Bigfloat.prototype.nthroot = function(b) {
    var t1, t2, t3, t4, a;
    var sign, ilog2;

    if (this.isZero()) {
        if (b > 0) {
            return new Bigfloat();
        } else {
            throw new RangeError("b negative in bigfloat.nthroot")
                //return (new Bigint()).setNaN();
        }
    }

    if (this.cmp(new Bigfloat(1)) == MP_EQ) {
        if (b == 0) {
            return (new Bigfloat()).setNaN();
        } else {
            return new Bigfloat();
        }
    }

    if (b < 0) {
        // 1/(x^(1/-b))
        return this.nthroot(-b).inv();
    }
    if (b == 0) {
        // zero means this^(1/0) which is a division by zero
        throw new DivisionByZero("b is zero in Bigfloat.nthroot");
    }
    if (b.isNaN()) {
        throw new RangeError("b is NaN in Bigfloat.nthroot");
    }
    if (b == 1) {
        // this^(1/1)
        return this.copy();
    }
    if (b == 2) {
        return this.sqrt();
    }
    if ((b & 1) == 0 && this.sign == MP_NEG) {
        // return new Complex(this.copy(),new Bigfloat()).nthroot(b)
        throw new RangeError("input negative and b odd in Bigfloat.nthroot");
    }
    var oldeps = epsilon();
    epsilon(oldeps + 3);
    a = this.copy();

    sign = a.sign;
    a.sign = MP_ZPOS;
    if (this.isDouble()) {
        t2 = Math.pow(a.toNumber(), 1 / b).toBigfloat();
    } else {
        ilog2 = this.ilog2() + 1;

        if (ilog2 / b <= 52) {
            var r = Math.floor(Math.pow(2, (ilog2) / b)) + 1;
            t2 = r.toBigfloat();
        } else {
            ilog2 = Math.floor(ilog2 / b);
            t2 = new Bigfloat(1);
            t2.lShiftInplace(ilog2 + 1);
        }
    }
    var invb = b.toBigfloat().inv();
    // safe guard--result might be off by slightly more than EPS
    var sg = Math.ceil(this.precision.highBit()) + 1;
    do {
        // compute difference
        t3 = t2.pow(b - 1);
        t3 = a.div(t3);
        t3 = t3.sub(t2);
        t3 = t3.mul(invb);
        t2 = t2.add(t3);
        if (sg-- == 0) {
            break;
        }
    } while (!t3.isEPSZero());

    /* reset the sign of a first */
    a.sign = sign;
    /* set the sign of the result */
    t2.sign = sign;
    epsilon(oldeps);
    t2.normalize();
    return t2;
};
/**
   Multiplication with 2<sup><i>n</i></sup>. This gets done in constant
   time by manipulating the exponent and <em>only</em> the exponent.<br>
   Works on copy.
   @param {number} n
   @return {Bigfloat}
*/
Bigfloat.prototype.lShift = function(n) {
    var ret;
    if (!n.isInt()) {
        return (new Bigfloat()).setNaN();
    }
    if (n == 0) {
        return this.copy();
    }
    if (this.isZero()) {
        return new Bigfloat();
    }
    if (n < 0) {
        return this.rShift(-n);
    }
    ret = this.copy();
    ret.exponent += n;
    return ret;
};
/**
   Multiplication with 2<sup><i>n</i></sup>. This gets done in constant
   time by manipuationg the exponent and <em>only</em> the exponent.<br>
   Works in-place.
   @param {number} n
   @return {Bigfloat}
*/
Bigfloat.prototype.lShiftInplace = function(n) {
    var ret;
    if (!n.isInt()) {
        this.mantissa.setNaN();
        return;
    }
    if (n == 0) {
        return;
    }
    if (this.isZero()) {
        return;
    }
    if (n < 0) {
        this.rShiftInplace(-n);
        return;
    }
    this.exponent += n;
};

/**
   Division by 2<sup><i>n</i></sup>. This gets done in constant
   time by manipuationg the exponent and <em>only</em> the exponent.<br>
   Works on copy.
   @param {number} n
   @return {Bigfloat}
*/
Bigfloat.prototype.rShift = function(n) {
    var ret;
    if (!n.isInt()) {
        return (new Bigfloat()).setNaN();
    }
    if (n == 0) {
        return this.copy();
    }
    if (this.isZero()) {
        return new Bigfloat();
    }
    if (n < 0) {
        return this.lShift(-n);
    }
    ret = this.copy();
    ret.exponent -= n;
    return ret;
};
/**
   Division by 2<sup><i>n</i></sup>. This gets done in constant
   time by manipuationg the exponent and <em>only</em> the exponent.<br>
   Works in-place.
   @param {number} n
   @return {Bigfloat}
*/
Bigfloat.prototype.rShiftInplace = function(n) {
    var ret;
    if (!n.isInt()) {
        this.mantissa.setNaN();
        return;
    }
    if (n == 0) {
        return;
    }
    if (this.isZero()) {
        return;
    }
    if (n < 0) {
        this.lShiftInplace(-n);
        return;
    }
    this.exponent -= n;
};

/* Basic trigonometric functions */

// Computes sine and cosine with |x| < 1
//http://en.wikipedia.org/wiki/Taylor_series
/**
  Computes sine, cosine, tangent and their hyperbolic variations with |x| < 1.
  Uses the standard MacLaurin series
  {@link http://en.wikipedia.org/wiki/Taylor_series}<br>
  Computes the tangent function by computing sine and cosine with a final
  division, whch makes it run a little bit slower than for the single
  functions alone.
  @private
  @param {bool} cosine compute the cosine (tangent) if true, sine otherwise
  @param {bool} tan compute the tangent if true
  @param {bool} hyper compute the hyperbolic versions if true
  @return {Bigfloat}
*/
Bigfloat.prototype.kcossin = function(cosine, tan, hyper) {
    var sin, cos, tmp, n, eps;
    eps = this.EPS();
    sin = this.copy();
    cos = new Bigfloat(1);
    tmp = this.copy();
    n = 2;
    do {
        // sin/cos have alternating sums, the hyperbolic functions don't,
        // vice versa with the tangent
        if (hyper == true) {
            tmp = tmp.mul(this).div(new Bigfloat(n));
        } else {
            tmp = tmp.mul(this).div(new Bigfloat(-n));
        }
        if (cosine == true || tan == true) {
            cos = cos.add(tmp);
        }
        n++;
        tmp = tmp.mul(this).div(new Bigfloat(n));
        if (cosine == false || tan == true) {
            sin = sin.add(tmp);
        }
        n++;
    } while (tmp.abs().cmp(eps) != MP_LT);
    if (tan == true) {
        return sin.div(cos);
    } else if (cosine == true) {
        return cos;
    } else {
        return sin;
    }
};

// Reduce sin/cos argument |x| to <= Pi/4
/**
   Argument reduction for sine, cosine and tangent to x <= pi/4
   @private
   @return {Bigfloat}
*/
Bigfloat.prototype.reduceTrigArg = function() {
    var pi, pihalf, piquart, k, r, x, sign, size, oldprec, newprec,
        eps, three, one;

    if (this.isZero()) {
        return this.copy();
    }
    x = this.abs();
    three = new Bigfloat(3);
    pi = this.pi();
    pihalf = pi.rShift(1);
    piquart = pi.rShift(2);
    // nothing to do if it is already small enough
    if (x.cmp(piquart) != MP_GT) {
        return [this.copy(), 0];
    }

    // it starts to get tricky for x < 3pi/4 especially around pi/2
    // but not for the reduction part
    three = three.mul(piquart);
    if (x.cmp(three) == MP_LT) {
        x = x.sub(pihalf);
        x.sign = this.sign;
        x.mantissa.sign = x.sign;
        return [x, 1];
    }

    sign = this.sign;
    // size of integer part in bits
    size = this.absBitSize();

    // Reduction must be done in precision
    //     work_precision_(base 2) +  log_2(x)
    // if we have an integer part
    oldprec = getPrecision();
    if (size > 0) {
        newprec = oldprec + size + 3;
    } else {
        newprec = oldprec + 3;
    }
    setPrecision(newprec);
    // we need as many digits of pi as there are digits in the integer part of the
    // number, so for 1e308 we need 308 decimal digits of pi.
    // Computing that much may take a while.

    // Compute remainder of x/Pi/2
    pi = this.pi();
    // k = round(x * 2/Pi)
    k = x.lShift(1).div(pi).round();
    // r = x - k * Pi/2
    r = x.sub(k.mul(pi.rShift(1)));
    setPrecision(oldprec);
    r.normalize();
    k.normalize();
    k = k.toBigint();
    // we need the last two bits only
    k = k.dp[0];
    r.sign = this.sign;
    r.mantissa.sign = this.sign;
    return [r, k];
};

/*
  Use of reduced argument:

  k = round(x * 2/Pi)
  r = x - k * Pi/2
  n = k % 4

    goal ->  sin(x)  cos(x)  sin(x)/cos(x)
   n = 0 ->  sin(r)  cos(r)  sin(r)/cos(r)
   n = 1 ->  cos(r) -sin(r) -cos(r)/sin(r) = (-inverse(tan))
   n = 2 -> -sin(r) -cos(r)  sin(r)/cos(r)
   n = 3 -> -cos(r)  sin(r) -cos(r)/sin(r) = (-inverse(tan))
*/
/**
   Sine of this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.sin = function() {
    var x, k, sign;

    if (this.isZero()) {
        return new Bigfloat();
    }
    sign = this.sign;
    x = this.reduceTrigArg();
    k = x[1];
    x = x[0];
    k = k % 4;
    switch (k) {
        case 0:
            x = x.kcossin(false, false, false);
            break;
        case 1:
            x = x.kcossin(true, false, false);
            break;
        case 2:
            x = x.kcossin(false, false, false);
            break;
        default:
            x = x.kcossin(true, false, false);
            break;
    }
    x.sign = sign;
    x.mantissa.sign = sign;
    return x;
};
/**
   Hyperbolic sine of this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.sinh = function() {
    var x, sign;
    if (this.isZero()) {
        return new Bigfloat();
    }
    sign = this.sign;
    // TODO: check size of input and adjust work precision
    //       accordingly
    x = this.abs();

    x = x.kcossin(false, false, true);

    x.sign = sign;
    x.mantissa.sign = sign;
    return x;
};

/**
   Cosine of this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.cos = function(){
    var x, k, sign, pi, pihalf,one,eps;
    if (this.isZero()) {
        return new Bigfloat(1);
    }
    // cos(-z) = cos(z)
    // zeros at pi * n + pi/2
    // -one^n at pi*n (e.g.: cos(pi) = -1 )
    // 1/2 at n*pi/3 (useful?)
    // sign: q2,q3 < 0 ; q1,q4 > 0

    x = this.reduceTrigArg();
    k = x[1];
    x = x[0];
    k = k % 4;
    // It is a zero or one
    if(x.isZero()){
       if (k == 0 || k == 3) {
          return new Bigfloat(1);
       } else {
          return new Bigfloat(0);
       }
    }
    eps = x.EPS();
    // Very close to a zero or one
    if(x.abs().cmp(eps) != MP_GT){
       if (k == 0 || k == 3) {
          return new Bigfloat(1);
       } else {
          return new Bigfloat(0);
       }
    }
    sign = MP_ZPOS;
    switch (k) {
        case 0:
            x = x.kcossin(true, false, false);
            break;
        case 1:
            x = x.kcossin(false, false, false);
            sign = -sign;
            break;
        case 2:
            x = x.kcossin(true, false, false);
            sign = -sign;
            break;
        default:
            x = x.kcossin(false, false, false);
            break;
    }
    // TODO: set sign correctly
    x.sign = sign;
    x.mantissa.sign = sign;
    return x;
};
/**
   Hyperbolic cosine of this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.cosh = function() {
    var x;
    if (this.isZero()) {
        return new Bigfloat(1);
    }

    // TODO: check size of input and adjust work precision
    //       accordingly
    x = this.abs();

    x = x.kcossin(true, false, true);

    return x;
};

/**
   Tangent of this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.tan = function() {
    var x, k, sign, eps;
    if (this.isZero()) {
        return new Bigfloat();
    }
    sign = this.sign;
    x = this.reduceTrigArg();
    k = x[1];
    x = x[0];
    k = k % 4;
    // It is a zero
    if (x.isZero()) {
        return new Bigfloat(0);
    }
    eps = x.EPS();
    // Very close to a zero
    if (x.abs().cmp(eps) != MP_GT) {
        return new Bigfloat(0);
    }
    x = x.kcossin(true, true, false);
    switch (k) {
        case 0:
            break;
        case 1:
            x = x.inv();
            break;
        case 2:
            break;
        default:
            x = x.inv();
            break;
    }
    x.sign = sign;
    x.mantissa.sign = sign;
    return x;
};

/**
   Hyperbolic tangent of this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.tanh = function() {
    var x, sign;
    if (this.isZero()) {
        return new Bigfloat();
    }
    if (this.isInf()) {
        return new Bigfloat(1);
    }

    // TODO: check size of input and adjust work precision
    //       accordingly
    sign = this.sign;
    x = this.abs();

    x = x.kcossin(true, true, true);

    x.sign = sign;
    x.mantissa.sign = sign;
    return x;
};

/* Inverse functions */

// evaluates both atan and atanh but not at the same time
/**
   Evaluates both atan and atanh but not at the same time.
   @private
   @param {bool} hyper computes hyperbolic version if true
   @return {Bigfloat}
*/
Bigfloat.prototype.katan = function(hyper) {
    var sum1, sum2, eps, t2, t4, tmp, n;
    // checks & balances
    // -1 < this < 1
    // atan(h)(0) = 0
    eps = this.EPS();
    sum1 = this.copy();
    t2 = this.sqr();
    t4 = t2.sqr();
    sum2 = this.div(new Bigfloat(3));
    tmp = this.mul(t4);
    n = 5;
    while (tmp.cmp(eps) != MP_LT) {
        // Doing it this way saves some branching for the hyperbolic case and
        // because of the rule "legibility wins if it is cheaply to have" it is
        // done here.
        // It can be done for the cosine, too.
        sum1 = sum1.add(tmp.div(new Bigfloat(n)));
        n += 2;
        sum2 = sum2.add(tmp.div(new Bigfloat(n)));
        n += 2;
        tmp = tmp.mul(t4);
    }
    sum2 = t2.mul(sum2);
    if (hyper == true) {
        return sum1.add(sum2);
    } else {
        return sum1.sub(sum2);
    }
};
/*
    Argument reduction for atan(x) with |x| > 1

      atan(x) = Pi/2 - atan(1/x)       \; x > 0
      atan(x) = -1 * (Pi/2 + atan(1/x) \; x < 0

    Argument reduction for atan(x) with |x| < 1

      atan(x) = atan( 1 ) + atan( (t-1)/(1+t) ) \; good for .5<x<1

    Sign:

      atan(x) = -atan(-x)

    Fixed values:

      atan(1) = Pi/4
      atan(0) = 0
      atan(Inf) = P/2;
*/
/**
   Atan of this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.atan = function() {
    var one, x, pi, ret, sign, eps;

    if (this.isNaN()) {
        return (new Bigfloat()).setNaN();
    }
    if (this.isZero()) {
        return new Bigfloat();
    }
    one = new Bigfloat(1);
    pi = this.pi();
    sign = this.sign;
    if (this.cmp(one) == MP_EQ) {
        ret = pi.rShift(1);
        if (sign == MP_NEG) {
            ret.sign = MP_NEG;
            ret.mantissa.sign = MP_NEG;
        }
        return ret;
    }
    x = this.abs();
    // The smaller x is, the better the series works
    // but foremost because of the instability near one.
    if (x.cmp(one) == MP_LT) {
        // atan(x) = atan( 1 ) + atan( (x-1)/(1+x) ) \; .5<x<1
        // atan(1) = pi/4
        // Actually, the exact limit is sqrt(2)-1, the positive solution of
        // x + (x - 1)/(1 + x)
        if (x.cmp(one.rShift(1)) != MP_LT){
            ret = pi.rShift(2);
            x = x.sub(one).div(one.add(x));
            // x will be negative, make it positive again
            x.sign = MP_ZPOS;
            x.mantissa.sign = MP_ZPOS;
            ret = ret.sub(x.katan());
        } else {
             ret = x.katan();
        }
    } else {
        // atan(x) = Pi/2 - atan(1/x)       \; x > 0
        // atan(x) = -1 * (Pi/2 + atan(1/x) \; x < 0
        // the last one is not necessary because of
        // atan(x) = -atan(-x)

        // The inverse can get very small if x is very large, obviously.
        // Cutoff depends on actual precision and absolute size of x, hence the
        // check against EPS.
        x = x.inv();
        eps = x.EPS();
        if (x.cmp(eps) == MP_GT) {
            ret = pi.rShift(1).sub(x.katan());
        } else {
            // \lim x\to\infty tan^{-1} x = \frac{\pi}{2}
            ret = pi.rShift(1);
        }
    }
    if (sign == MP_NEG) {
        ret.sign = MP_NEG;
        ret.mantissa.sign = MP_NEG;
    }
    return ret;
};
// Conforms to most of ECMAScript 5.1 15.8.2.5
// exceptions shall be considered bugs
// Comments starting with "If" are from ECMAScript 5.1 15.8.2.5, sometimes
// abbreviated
/**
   Atan2 of this Bigfloat.<br>
   Order of arguments is <code>atan2(this,bf) = atan(y,x)</code> resulting in
   the computation of <code>atan(y/x)</code>
   @param {Bigfloat} bf second argument to atan2(y,x)
   @return {Bigfloat}
*/
Bigfloat.prototype.atan2 = function(bf) {
    var ret, pi;
    if(!(bf instanceof Bigfloat)){
        return this.atan2(bf.toBigfloat());
    }
    // atan2(y,x) (this = y, bf = x)
    // If either x or y is NaN, the result is NaN
    if (this.isNaN() || bf.isNaN()) {
        return (new Bigfloat()).setNaN();
    }
    pi = this.pi();
    if (this.isZero() && bf.isZero()) {
        /*
           The definition of the two-argument inverse tangent is

            \tan^{-1}(x, y) = -i \log[ \fract{(x + yi) }{\sqrt{x^2 + y^2} }]

           The square root of zero is zero: division by zero.
           But we will follow suit here.
           Just saying,
        */
        // If y is +0 and x is +0, the result is +0
        if (this.sign == MP_ZPOS && bf.sign == MP_ZPOS) {
            return new Bigfloat();
        }
        // If y is +0 and x is −0, the result is impl.-dep. approximation to +pi
        if (this.sign == MP_ZPOS && bf.sign == MP_NEG) {
            return pi;
        }
        // If y is −0 and x is +0, the result is −0
        if (this.sign == MP_NEG && bf.sign == MP_ZPOS) {
            ret = new Bigfloat();
            ret.sign = MP_NEG;
            ret.mantissa.sign = MP_NEG;
            return ret;
        }
        // If y is −0 and x is −0, the result is impl.-dep. approximation to −pi
        if (this.sign == MP_NEG && bf.sign == MP_NEG) {
            ret = pi;
            ret.sign = MP_NEG;
            ret.mantissa.sign = MP_NEG;
            return ret;
        }
    }
    if (bf.isZero()) {
        ret = pi.rShift(1);
        // If y<0 and x is +-0, the result is impl.-dep. approximation to -pi/2
        if (this.sign == MP_NEG) {
            ret.sign = MP_NEG;
            ret.mantissa.sign = MP_NEG;
        }
        // If y>0 and x is +-0, the result is impl.-dep. approximation to +pi/2
        return ret;
    }
    if (this.isZero()) {
        if (this.sign == MP_NEG) {
            // If y is −0 and x<0, the result is impl.-dep. approximation to −pi
            if (bf.sign == MP_NEG) {
                ret = pi;
            } else {
                // If y is −0 and x>0, the result is −0
                ret = new Bigfloat();
            }
            ret.sign = MP_NEG;
            ret.mantissa.sign = MP_NEG;
            return ret;
        } else {
            // If y is +0 and x<0, the result is impl.-dep. approximation to +pi
            if (bf.sign == MP_NEG) {
                ret = pi;
            } else {
                // If y is +0 and x>0, the result is +0
                ret = new Bigfloat();
            }
            return ret;
        }
    }
    if (this.isInf()) {
        if (!bf.isInf()) {
            ret = pi.rShift(1);
            // If y is -Inf & x is finite, the result is impl.-dep. approx. to -pi/2
            if (this.sign == MP_NEG) {
                ret.sign = MP_NEG;
                ret.mantissa.sign = MP_NEG;
            }
            // If y is +Inf & x is finite, the result is impl.-dep. approx. to +pi/2
            return ret;
        }
        if (bf.isInf()) {
            ret = pi.rShift(2);
            // If y is +Inf & x is +Inf, the result is impl.-dep. approx. to +pi/4
            if (this.sign = MP_ZPOS && bf.sign == MP_ZPOS) {
                return ret;
            }
            // If y is +Inf & x is -Inf, the result is i-d approx. to +3*pi/4
            if (this.sign = MP_ZPOS && bf.sign == MP_NEG) {
                return ret.mul(new Bigfloat(3));
            }
            // If y is -Inf & x is +Inf, the result is impl.-dep. approx. to -pi/4
            if (this.sign = MP_NEG && bf.sign == MP_ZPOS) {
                ret.sign = MP_NEG;
                ret.mantissa.sign = MP_NEG;
                return ret;
            }
            // If y is -Inf & x is -Inf, the result is i-d approx. to -3*pi/4
            if (this.sign = MP_ZPOS && bf.sign == MP_NEG) {
                ret.sign = MP_NEG;
                ret.mantissa.sign = MP_NEG;
                return ret.mul(new Bigfloat(3));
            }
        }
    }
    if (this.sign == MP_NEG) {
        ret = this.neg().div(bf);
    } else {
        ret = this.div(bf);
    }
    return ret.atan();
};
/**
   Atan hyperbolicus of this Bigfloat
   @return {Bigfloat}
*/
Bigfloat.prototype.atanh = function() {
    var oldeps, ret;
    if (this.isZero()) {
        return new Bigfloat();
    }
    if (this.cmp(new Bigfloat(1)) == MP_EQ || this.cmp(new Bigfloat(-1)) ==
        MP_EQ) {
        return (new Bigfloat()).setInf();
    }
    if(!this.isFraction()){
        throw new RangeError("Argument outside of domain of Bigfloat.atanh");
    }
    oldeps = epsilon();
    epsilon(oldeps + 3);
    ret = this.copy();
    ret = ret.katan(true);
    epsilon(oldeps);
    ret.normalize();
    return ret;
};


