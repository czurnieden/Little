"use strict";
/*
   Library for arbitrary precision rationals.
   Depends on bignum.js.
   It is highly unlikely that it is apt for anything besides looking at it.
   And even that is doubtful.
*/

// makes no use of the Number object, alternatively
// Number.isBigEndian = function(){...};
/**
  Checks if the number is formatted in the big endian way. Some modern
  processors can switch between little and big endian, some even in software.
  @function external:number#isBigEndian
  @return {bool} true if it is big endian
*/
Number.prototype.isBigEndian = function() {
    var buffer = new ArrayBuffer(8);
    var i32 = new Int32Array(buffer);
    var ui8 = new Uint8Array(buffer);
    i32[0] = 0xff;
    if (ui8[3] === 0xff && ui8[0] === 0) {
        return true;
    }
    return false;
};
/**
  Like the <code>frexp()</code> in the C-library.<br>
  Implementation from scratch, no SunPro code has been used here
  @function external:number#frexp
  @return {array} fractional part and exponent in that order
*/
Number.prototype.frexp = function() {
    var fp, exp, dv, high, low, temp, hw, lw;
    if (this.isBigEndian()) {
        return [Number.NaN, Number.NaN];
    }
    // If you want to exchange the DataView with direct access
    // to the typed arrays be aware that the typed arrays have
    // a big endian layout but the DataView has a little endian
    // one.
    dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, this);
    high = dv.getUint32(0);
    low = dv.getUint32(4);
    // get IEEE-754 double exponent bits
    // mask is 0x7ff00000 because of the sign bit at 0x80000000
    exp = ((high & 0x7ff00000) >>> 20);
    // handle special cases first
    if (exp == 0) {
        // strip sign bit from high word and if both together
        // are zero the number itself is zero, too;
        if ((0x7fffffff & high) | low == 0) {
            fp = dv.getFloat64(0);
            exp = 0;
        } else {
            // we have subnormal (denormal) numbers

            // expand. exact power does not matter much but
            // must be >53
            temp = this * Math.pow(2, 100);
            dv.setFloat64(0, temp);
            // get the new exponent
            high = dv.getUint32(0);
            exp = ((high & 0x7ff00000) >>> 20);
            // correct exponent
            exp = exp - (1022 + 100);
        }

    } else if (exp == 0x7ff) {
        // infinity or NaN
        return [this, 0x7ff];
    } else {
        // normal, just de-bias exponent
        exp = exp - 1022;
    }
    // set exponent of fraction part to bias but keep sign bit
    high = (high & 0x800fffff) | 0x3fe00000;
    dv.setUint32(0, high);
    fp = dv.getFloat64(0);
    return [fp, exp];
};


// Fraction part of a IEEE-754 double precision number (ECMAScript's native
// number)
/**
  Precision for the case of e.g.: irrational numbers.<br>
  Precision in bits (53 is the size of the mantissa of the native number)
  @memberof Bigrational
  @constant {number}
  @default
*/
var BIGRATIONAL_PRECISION = 53; // in bits
/**
  Precision for the case of e.g.: irrational numbers.<br>
  Precision in decimal digits
  @memberof Bigrational
  @constant {number}
  @default
*/
var BIGRATIONAL_DECIMAL_PRECISION = 16; // in decimals

/**
  Bigrational class, constructor.<br>
  Does not reduce itself!<br>
  Found more situations where an automatic reducing was superfluous than vice
  versa
  @constructor
  @param {number|Bigint} [a] Numerator
  @param {number|Bigint} [b] Denominator
*/
function Bigrational(a,b) {
    if (arguments.length == 2) {
        // just Bigint and number for now, add Complex later
        if (xtypeof(arguments[0]) == "bigint") {
            this.num = arguments[0];
        } else if (xtypeof(arguments[0]) == "number") {
            this.num = arguments[0].toBigint();
        } else {
            this.num = new Bigint(0).setNaN();
            this.den = new Bigint(0).setNaN();
        }
        if (xtypeof(arguments[1]) == "bigint") {
            this.den = arguments[1];
        } else if (xtypeof(arguments[1]) == "number") {
            this.den = arguments[1].toBigint();
        } else {
            this.den = new Bigint(0).setNaN();
            this.den = new Bigint(0).setNaN();
        }
        this.sign = (this.num.sign != this.den.sign) ? MP_NEG : MP_ZPOS;
        this.num.sign = this.sign;
        this.den.sign = MP_ZPOS;
    } else if (arguments.length == 1) {
        // just Bigint and number for now, add Complex later
        if (xtypeof(arguments[0]) == "bigint") {
            this.num = arguments[0];
            this.den = new Bigint(1);
        } else if (xtypeof(arguments[0]) == "number") {
            this.num = arguments[0].toBigint();
            this.den = new Bigint(1);
        } else {
            this.num = new Bigint(0).setNaN();
            this.den = new Bigint(0).setNaN();
        }
        this.sign = (this.num.sign != this.den.sign) ? MP_NEG : MP_ZPOS;
        this.num.sign = this.sign;
        this.den.sign = MP_ZPOS;
    } else {
        // Special value 0/1 for zero
        this.num = new Bigint(0);
        this.den = new Bigint(1);
        this.sign = MP_ZPOS;
    }
}
/**
  Offer memory to GC.<br>
  This function empties the <code>Bigrational</code> only, to sacrifice it completely the
  variable must be set to 'null', too.<br>
  Example:
  <pre>
  tmp = new Bigrational(0,1);
  // do some stuff with tmp
  // tmp got large but we'll do a lot of stuff after it in the same
  // scope and need to get rid of tmp
  tmp.free();
  tmp = null;
  </pre>
*/
Bigrational.prototype.free = function() {
    this.num.free();
    this.num = null;
    this.den.free();
    this.den = null;
    this.sign = null;
};
/**
   Sets values of to a <code>Bigint</code> <code>NaN</code>
*/
Bigrational.prototype.setNaN = function() {
    this.num = new Bigint(0).setNaN();
    this.den = new Bigint(0).setNaN();
};
/**
  Checks if <code>this</code> is <em>not</em> a number
  @return {bool} true if it is <em>not</em> a number
*/
Bigrational.prototype.isNaN = function() {
    if (this.num.isNaN() || this.den.isNaN()) {
        return MP_YES;
    }
    return MP_NO;
};
/**
  Checks if <code>this</code> is zero.<br>
  Zero is the special value <code>0/1</code>
  @return {bool} true if it is zero
*/
Bigrational.prototype.isZero = function() {
    // sign does not get checked, -0 is also OK
    if (this.num.isZero() && this.den.isOne()) {
        return MP_YES;
    }
    return MP_NO;
};
/**
  Checks if <code>this</code> is plus one.<br>
  Does not work with unreduced fractions, because it checks for the special
  value <code>1/1</code>
  @return {bool} true if it is plus one
*/
Bigrational.prototype.isOne = function() {
    if (this.num.isOne() && this.den.isOne() && this.sign == MP_ZPOS) {
        return MP_YES;
    }
    return MP_NO;
};
/**
  Checks if <code>this</code> is plus or minus one.<br>
  Does not work with unreduced fractions, because it checks for the special
  values <code>1/1</code> and <code>-1/1</code>
  @return {bool} true if it is plus or minus one
*/
Bigrational.prototype.isUnity = function() {
    if (this.num.isUnity() && this.den.isOne()) {
        return MP_YES;
    }
    return MP_NO;
};
/**
  Checks if <code>this</code> is an integer.<br>
  Does not work with unreduced fractions, because it checks for the special
  values <code>x/1</code> and <code>-x/1</code>
  @return {bool} true if it is an integer
*/
Bigrational.prototype.isInt = function() {
    if (this.den.isOne() && !this.num.isZero()) {
        return MP_YES;
    }
    return MP_NO;
};
/**
  Checks if <code>this</code> is finite.<br>
  @return {bool} true if it is finite
*/
Bigrational.prototype.isFinite = function() {
    if (this.den.isFinite() && this.num.isFinite()) {
        return MP_YES;
    }
    return MP_NO;
};
/**
  Checks if <code>this</code> is infinite.<br>
  @return {bool} true if it is infinite
*/
Bigrational.prototype.isInf = function() {
    if (this.den.isInf() || this.num.isInf()) {
        return MP_YES;
    }
    return MP_NO;
};
/**
  Sets <code>this</code> to infinity.<br>
*/
Bigrational.prototype.setInf = function() {
    this.den.setInf();
    this.num.setInf();
};
/**
  Copy <code>this</code>
  @return {Bigrational} a deep copy of <code>this</code>
*/
Bigrational.prototype.copy = function() {
    var ret = new Bigrational();
    ret.num = this.num.copy();
    ret.den = this.den.copy();
    ret.sign = this.sign;
    return ret;
};
/**
  Absolute value
  @return {Bigrational} <code>this</code>
*/
Bigrational.prototype.abs = function() {
    var ret = this.copy();
    ret.num.sign = MP_ZPOS;
    ret.sign = ret.num.sign;
    return ret;
};
/**
  Change sign of <code>this</code>
  @return {Bigrational} <code>-this</code>
*/
Bigrational.prototype.neg = function() {
    var ret = this.copy();
    ret.num.sign = (this.sign == MP_NEG) ? MP_ZPOS : MP_NEG;
    ret.sign = ret.num.sign;
    return ret;
};

// works on copy
/**
  Reduce a fraction.
  @return {Bigrational} the reduced fraction
*/
Bigrational.prototype.reduce = function() {
    var ret = new Bigrational();
    if (this.num.isZero()) {
        return ret;
    }
    if (this.den.isZero()) {
        // raise DivsionByZero
        return ret.setNaN();
    }
    if (this.den.isOne()) {
        return this.copy();
    }
    this.num.sign = MP_ZPOS;
    var gcd = this.den.gcd(this.num);
    ret.num = this.num.div(gcd);
    ret.den = this.den.div(gcd);
    ret.sign = this.sign;
    ret.num.sign = this.sign;
    return ret;
};
// works in-place
/**
  Reduce a fraction.<br>
  This function does it in-place!
*/
Bigrational.prototype.normalize = function() {
    if (this.num.isZero()) {
        return MP_OKAY;
    }
    if (this.den.isZero()) {
        // raise DivsionByZero
        this.setNaN();
        return MP_VAL;
    }
    if (this.den.isOne()) {
        return MP_OKAY;
    }
    this.num.sign = MP_ZPOS;
    var gcd = this.den.gcd(this.num);
    this.num = this.num.div(gcd);
    this.den = this.den.div(gcd);
    this.num.sign = this.sign;
    return MP_OKAY;
};
// -1/(2^eps) < 0 < 1/(2^eps)
/**
   <code-1/(2^eps) < 0 < 1/(2^eps)></code><br>
   Is the magnitude of the fraction inside the above mentioned range?
   @return {bool} true if it fits
*/
Bigrational.prototype.isEpsZero = function(eps) {
    var EPS = (arguments.length == 1) ? eps : BIGRATIONAL_PRECISION;
    var n, d;
    if (this.isZero()) {
        return true;
    }
    n = this.num.highBit();
    d = this.den.highBit();
    if ((d - n) >= EPS) {
        return true;
    }
    return false;
};
// compares against 0 - 1/(2^eps)
/**
   Checks if <code>this</code> is below zero plus eps.<br>
   Compares against <code>0 - 1/(2^eps)</code>
   @return {bool} true if it fits
*/
Bigrational.prototype.isEpsLowerZero = function(eps) {
    var EPS = (arguments.length == 1) ? eps : BIGRATIONAL_PRECISION;
    var negZero, den, cmp;
    if (this.isZero()) {
        return false;
    }
    negZero = new Bigrational(-1, 1);
    den = new Bigint(1);
    den.lShiftInplace(EPS);
    negZero.den = den;
    cmp = this.cmp(negZero);
    if (cmp == MP_LT) {
        return true;
    }
    return false;
};
// compares against 0 + 1/(2^eps)
/**
   Checks if <code>this</code> is above zero plus eps.<br>
   Compares against <code>0 + 1/(2^eps)</code>
   @return {bool} true if it fits
*/
Bigrational.prototype.isEpsGreaterZero = function(eps) {
    var EPS = (arguments.length == 1) ? eps : BIGRATIONAL_PRECISION;
    var posZero, den, cmp;
    if (this.isZero()) {
        return false;
    }
    posZero = new Bigrational(1, 1);
    den = new Bigint(1);
    den.lShiftInplace(EPS);
    posZero.den = den;
    cmp = this.cmp(posZero);
    if (cmp == MP_GT) {
        return true;
    }
    return false;
};
// might be useful for rationals.
/**
   Checks if <code>this</code> is smaller than one.<br>
   Compares against <code>1/1</code>
   @return {bool} true if it is smaller
*/
Bigrational.prototype.isLowerOne = function() {
    var one = new Bigrational(1, 1);
    var cmp = this.cmp(one);
    if (cmp == MP_LT) {
        return true;
    }
    return false;
};

//Bigrational.prototype.toBigfloat = function(){};


// more care should have been taken with the
// selection of the variable names, but in
// these times of well under-represented
// profit margins ...
/**
   Addition
   @param {Bigrational} brat addend
   @return {Bigrational} the sum
*/
Bigrational.prototype.add = function(brat) {
    var a = this.num;
    var b = this.den;
    var c = brat.num;
    var d = brat.den;

    var ret = new Bigrational();

    if (this.num.isZero()) {
        ret = brat.copy();
        return ret;
    }
    if (brat.num.isZero()) {
        ret = this.copy();
        return ret;
    }
    if (this.isInt() && brat.isInt()) {
        ret.num = this.num.add(brat.num);
        ret.den = this.den;
        ret.sign = ret.num.sign;
        ret.den.sign = MP_ZPOS;
        return ret;
    }

    var d1 = b.gcd(d);
    if (d1.isOne()) {
        ret.num = a.mul(d).add(b.mul(c));
        ret.den = b.mul(d);
        ret.sign = ret.num.sign;
        ret.den.sign = MP_ZPOS;
        return ret;
    }
    var t = a.mul(d.div(d1)).add(c.mul(b.div(d1)));
    var d2 = t.gcd(d1);

    ret.num = t.div(d2);
    ret.den = b.div(d1).mul(d.div(d2));

    ret.sign = ret.num.sign;
    ret.den.sign = MP_ZPOS;

    return ret;
};

/**
   Subtraction
   @param {Bigrational} brat subtrahend
   @return {Bigrational} the difference
*/
Bigrational.prototype.sub = function(brat) {
    var a = this.num;
    var b = this.den;
    var c = brat.num;
    var d = brat.den;

    var ret = new Bigrational();

    if (this.num.isZero()) {
        ret = brat.copy();
        ret.num.sign = (brat.sign == MP_NEG) ? MP_ZPOS : MP_NEG;
        ret.sign = ret.num.sign;
        return ret;
    }
    if (brat.num.isZero()) {
        return this.copy();
    }

    if (this.den.isOne() && brat.den.isOne()) {
        ret.num = this.num.sub(brat.num);
        ret.den = this.den;
        ret.sign = ret.num.sign;
        ret.den.sign = MP_ZPOS;
        return ret;
    }

    var d1 = b.gcd(d);
    if (d1.isOne()) {
        ret.num = a.mul(d).sub(b.mul(c));
        ret.den = b.mul(d);
        ret.sign = ret.num.sign;
        ret.den.sign = MP_ZPOS;
        return ret;
    }
    var t = a.mul(d.div(d1)).sub(c.mul(b.div(d1)));
    var d2 = t.gcd(d1);

    ret.num = t.div(d2);
    ret.den = b.div(d1).mul(d.div(d2));

    ret.sign = ret.num.sign;
    ret.den.sign = MP_ZPOS;

    return ret;
};

/**
   Multiplication
   @param {Bigrational} brat multiplicator
   @return {Bigrational} the product
*/
Bigrational.prototype.mul = function(brat) {
    var a = this.num;
    var b = this.den;
    var c = brat.num;
    var d = brat.den;
    var ret = new Bigrational();

    if (this.isZero() || brat.isZero()) {
        return ret;
    }

    if (this.den.isOne() && brat.den.isOne()) {
        ret.num = this.num.mul(brat.num);
        ret.den = this.den;
        ret.sign = ret.num.sign;
        return ret;
    }

    var d1 = a.gcd(d);
    var d2 = b.gcd(c);

    ret.num = a.div(d1).mul(c.div(d2));
    ret.den = b.div(d2).mul(d.div(d1));
    ret.sign = (this.sign != brat.sign) ? MP_NEG : MP_ZPOS;
    ret.num.sign = ret.sign;
    ret.den.sign = MP_ZPOS;
    return ret;
};
// works on copy
/**
   Reciprocal of the fraction
   @return {Bigrational} the reciprocal
*/
Bigrational.prototype.reciprocal = function() {
    var num = this.num.copy();
    var den = this.den.copy();
    var ret;
    den.sign = num.sign;
    num.sign = MP_ZPOS;
    ret = new Bigrational(den, num);
    ret.sign = this.sign;
    return ret;
};
// works in-place
/**
   Reciprocal of the fraction<br>
   This function works in-place!
*/
Bigrational.prototype.inverse = function() {
    var temp = this.num;
    this.num = this.den;
    this.den = temp;
    this.num.sign = this.den.sign;
    this.den.sign = MP_ZPOS;
};
/**
   Division
   @param {Bigrational} brat divisor
   @return {Bigrational} quotient
*/
Bigrational.prototype.div = function(brat) {
    var a = this;
    if (brat.num.isZero()) {
        return (new Bigrational()).setNaN();
    }
    brat.inverse();
    var ret = a.mul(brat);
    brat.inverse();
    ret.sign = (this.sign != brat.sign) ? MP_NEG : MP_ZPOS;
    ret.num.sign = ret.sign;
    ret.den.sign = MP_ZPOS;
    return ret;
};

// multiplying with itself might be faster. To be checked
/**
   Squaring
   @return {Bigrational} the square
*/
Bigrational.prototype.sqr = function() {
    var a = this.num;
    var b = this.den;

    var ret = new Bigrational();

    if (this.isZero()) {
        return ret;
    }

    if (this.den.isOne()) {
        ret.num = this.num.sqr();
        ret.den = this.den;
        ret.sign = ret.num.sign;
        return ret;
    }
    ret.num = a.sqr();
    ret.den = b.sqr();

    ret.sign = MP_ZPOS;
    ret.num.sign = ret.sign;
    ret.den.sign = MP_ZPOS;

    //ret.normalize();

    return ret;
};


// TODO: signs handled different from libczrational, adapt this function
// accordingly
/**
  Comparing with another <code>Bigrational</code>
  @param {Bigrational} brat
  @return {number}
*/
Bigrational.prototype.cmp = function(brat) {
    var a, b;
    var p1, p2;
    var e, wnuma, wdena, wnumb, wdenb, s1, s2;

    a = this;
    b = brat;

    /* -a < +b */
    if (a.sign == MP_NEG && b.sign == MP_ZPOS) {
        return MP_LT;
    }
    /* +a > -b */
    if (a.sign == MP_ZPOS && b.sign == MP_NEG) {
        return MP_GT;
    }
    /* some more shortcuts */
    if (a.isZero()) {
        /* a == b (both zero) */
        if (b.isZero()) {
            return MP_EQ;
        }
        /* a < b */
        if (b.sign == MP_ZPOS) {
            return MP_LT;
        }
        /* a > b but superfluent, caught by +a > -b*/
        return MP_GT;
    }
    if (b.isZero()) {
        /* a > b */
        if (a.sign == MP_ZPOS) {
            return MP_GT;
        }
        /* a < b */
        return MP_LT;
    }


    if (a.isInt() && b.isInt()) {
        return a.cmp(b);
    }

    /*
     * We can use a rough approximation of the result because we are only
     * interested in the magnitudes for now.
     */
    wnuma = a.num.highBit();
    wdena = a.den.highBit();
    wnumb = b.num.highBit();
    wdenb = b.den.highBit();
    s1 = wnuma + wdenb;
    s2 = wnumb + wdena;
    if (s1 < s2) {
        return ((a.sign == MP_NEG) ? MP_LT : MP_GT);
    }
    if (s2 < s1) {
        return ((a.sign == MP_NEG) ? MP_GT : MP_LT);
    }
    /* This is gonna be brutal, so don't use cmp() frivolously! */
    /* According to Prof. Knuth (answ. to 4.5.1-1) it is the only way.*/
    p1 = a.num.mul(b.den);
    p2 = b.num.mul(a.den);

    e = p1.cmp(p2);

    if (a.sign == MP_NEG) {
        return ((e == MP_GT) ? MP_LT : MP_GT);
    }
    return e;
};

/**
   Conversion of a <code>Bigrational</code> to a string
   @param {number} [base=10] the base of the output
   @return {string}  The format is <i>number</i>"/"<i>number</i>
*/
Bigrational.prototype.toString = function(base) {
    var sign = (this.sign == MP_NEG) ? "-" : "";
    if (this.num.isZero()) {
        return sign + "0";
    }
    if (this.den.isZero()) {
        return "Division by Zero";
    }
    if (this.isNaN()) {
        return "NaN";
    }
    return this.num.toString(base) + "/" + this.den.toString(base);
};
/**
   Conversion of a <code>String</code> to a <code>Bigrational</code><br>
   The input is expected to be of the form <i>number</i>"/"<i>number</i>
   @function external:String#toBigrational
   @param {number} [base=10] the base of the input
   @return {Bigrational}
*/
String.prototype.toBigrational = function(base) {
    var ret = new Bigrational();
    // TODO: replace general regex with one according to given base
    var s = this.replace(/[^0-9a-zA-Z\/]/g,"");
    var rat;
    // TODO: checks & balances & cleanup
    rat = s.split("/");
    ret.num = rat[0].toBigint(base);
    ret.den = rat[1].toBigint(base);
    ret.sign = (ret.num.sign == ret.den.sign) ? MP_ZPOS : MP_NEG;

    ret.num.sign = ret.sign;
    ret.den.sign = MP_ZPOS;
    ret.normalize();
    return ret;
};
/**
   Conversion of a <code>Bigint</code> to a <code>Bigrational</code><br>
   @return {Bigrational}
*/
Bigint.prototype.toBigrational = function(){
  return new Bigrational(this,1);
};

// Assumes standard-conforming Number/IEEE-754-Double
/**
  Convert a number to a <code>Bigrational</code>
  @function external:number#toBigrational
  @return {Bigrational}
*/
Number.prototype.toBigrational = function() {
    var num, den, fp, ep, xp, i;
    if (this.isInt()) {
        fp = new Bigrational(this, 1);
        fp.sign = fp.num.sign;
        return fp;
    }

    xp = this.frexp();
    fp = xp[0];
    ep = xp[1];

    for (i = 0; i < 300 && fp != Math.floor(fp); i++) {
        fp *= 2.0;
        ep--;
    }
    num = fp.toBigint();
    den = new Bigint(1);
    den.lShiftInplace(Math.abs(ep));
    if (ep > 0) {
        num.lShiftInplace(Math.abs(ep));
        den = new Bigint(1);
    }
    fp = new Bigrational(num, den);
    fp.sign = fp.num.sign;
    fp.normalize();
    return fp;
};
/**
  Convert a <code>Bigrational</code> to a number
  @return {number}
*/
Bigrational.prototype.toNumber = function() {
    return this.num.toNumber() / this.den.toNumber();
};

/**
   Return current precision in bits
   @return {number} current precison in bits
*/
Bigrational.prototype.isBitPrecision = function() {
    return this.den.highBit();
};
/**
   Return current precision in decimal digits
   @return {number} current precison in decimal digits
*/
Bigrational.prototype.isDecPrecision = function() {
    return Math.floor(this.den.highBit() / (Math.log(10) / Math.log(2))) +
        1;
};
/**
   Checks if actual precision in bits is smaller than or equal to the given argument or
   the value of <code>BIGRATIONAL_PRECISION</code> if no argument is given
   @param {number} [eps=BIGRATIONAL_PRECISION] value to compare against
   @return {bool} true if the actual precision fits
*/
Bigrational.prototype.fitsBitPrecision = function(eps) {
    var EPS = (arguments.length == 1) ? eps : BIGRATIONAL_PRECISION;
    if (this.den.highBit() <= EPS) {
        return true;
    }
    return false;
};
/**
   Checks if actual precision in decimal digits is smaller than or equal to the given argument or
   the value of <code>BIGRATIONAL_DECIMAL_PRECISION</code> if no argument is given
   @param {number} [eps=BIGRATIONAL_DECIMAL_PRECISION] value to compare against
   @return {bool} true if the actual precision fits
*/
Bigrational.prototype.fitsDecPrecision = function(eps) {
    var EPS = (arguments.length == 1) ? eps : BIGRATIONAL_DECIMAL_PRECISION;
    var log10den = Math.floor(this.den.highBit() / (Math.log(10) / Math.log(
        2))) + 1;
    if (log10den <= EPS) {
        return true;
    }
    return false;
};
/**
   Set precision in decimal digits
   @memberof Bigrational
   @param {number} [eps=BIGRATIONAL_DECIMAL_PRECISION] the wanted precision
   @return {number} the new precision
*/
function setDecPrecision(eps) {
    var EPS = (arguments.length == 1) ? eps : BIGRATIONAL_DECIMAL_PRECISION;
    BIGRATIONAL_DECIMAL_PRECISION = EPS;
    EPS = Math.floor(EPS * (Math.log(10) / Math.log(2)));
    BIGRATIONAL_PRECISION = EPS;
    return EPS;
}
/**
   Set precision in bits
   @memberof Bigrational
   @param {number} [eps=BIGRATIONAL_PRECISION] the wanted precision
   @return {number} the new precision
*/
function setBitPrecision(eps) {
    var EPS = (arguments.length == 1) ? eps : BIGRATIONAL_PRECISION;
    BIGRATIONAL_PRECISION = EPS;
    EPS = Math.floor(EPS / (Math.log(10) / Math.log(2))) + 1;
    BIGRATIONAL_DECIMAL_PRECISION = EPS;
    return EPS;
}

/**
   Rough but fast rounding for e.g. Newton-Raphson or other tamings. It rounds
   to a slightly larger value<br>
   Is a bit sensible to input and might not work with everything.
   @param {number} prec the wanted precision
   @return {Bigrational} the rounded result
*/
Bigrational.prototype.fastround = function(prec) {
    var num = this.num.copy();
    var den = this.den.copy();
    var t, t1, t2, num0, den0, num1, den1, den2, ret;

    // TODO: checks & balances

    if (this.isInt()) {
        return this.copy();
    }

    if (this.den.highBit() + 1 <= prec) {
        return this.copy();
    }

    num0 = new Bigint(0);
    den0 = new Bigint(1);
    num1 = new Bigint(1);
    den1 = new Bigint(0);

    while (true) {
        t = num.div(den);
        den2 = den0.add(t.mul(den1));
        if (den2.highBit() > prec) {
            den1 = den2;
            num1 = num0.add(t.mul(num1));
            break;
        }
        t1 = num0;
        num0 = num1;
        den0 = den1;
        num1 = t1.add(t.mul(num1));
        den1 = den2;
        t2 = num;
        num = den;
        den = t2.sub(t.mul(den));
    }

    ret = new Bigrational(num1, den1);
    ret.sign = this.sign;
    ret.num.sign = ret.sign;
    ret.den.sign = MP_ZPOS;
    return ret;
};

/**
   Exact rounding (vid. e.g.: D. W. Matula "Number theoretic foundations of
   finite precision arithmetic" in Application of Number Theory to Numerical
   Analysis, W. Zaremba, ed., Academic Press, New York, 1971<br>
   and<br>
   "Fixed slash and floating slash rational arithmetic" by the same author
   where he describes the median rounding in detail.<br>
   And D. Knuth, of course, in TAoCP II, 4.5.1. Very short but an example
   is given)
   @param {number} prec precision wanted
   @return {Bigrational} Rounded to median
*/
Bigrational.prototype.round = function(prec) {
    var num = this.num.copy();
    var den = this.den.copy();
    var cf, median, num0, den0, num1, den1, den2, lf, uf, t1, t2, bprec,
        ret;
    // TODO: checks & balances
    // first shortcut: we don't treat integers
    if (this.isInt()) {
        return this.copy();
    }
    // the precision is given in bits, we make a number out of it
    // this is the number that gets compared to the denominator
    // from now on
    bprec = new Bigint(1);
    bprec.lShiftInplace(prec);
    // second short cut if the actual denominator is already lower
    // Yes, that means raising precision, like in floating point
    // numbers is possible by adding zeros but not needed at all.
    if (this.den.cmp(bprec) != MP_GT) {
        return this.copy();
    }
    // initialize the two convergents
    num0 = new Bigint(0);
    den0 = new Bigint(1);
    num1 = new Bigint(1);
    den1 = new Bigint(0);

    while (true) {
        // continued fraction entry
        cf = num.div(den);
        // denominator of convergent
        den2 = den0.add(cf.mul(den1));
        // we have the second point
        if (den2.cmp(bprec) == MP_GT) {
            break;
        }
        // a bit of shuffling around
        // TODO: increase legibility
        t1 = num0;
        num0 = num1;
        den0 = den1;
        // numerator of convergent
        num1 = t1.add(cf.mul(num1));
        den1 = den2;
        t2 = num;
        // build new fraction for cf
        num = den;
        den = t2.sub(cf.mul(den));
    }
    // check neighbourhood and take the nearest to exact result
    // Build a new denominator: the median.
    median = bprec.sub(den0).div(den1);
    // build lower fraction
    lf = (new Bigrational(num0.add(num1.mul(median)),
        den0.add(den1.mul(median)))).reduce();
    // upper fraction is the last convergent
    uf = (new Bigrational(num1, den1)).reduce();
    // compute the differences to the original and take the
    // one with the smaller distance.
    if (uf.sub(this).abs().cmp(lf.sub(this).abs()) != MP_GT) {
        ret = uf;
    } else {
        ret = lf;
    }
    ret.sign = this.sign;
    ret.num.sign = ret.sign;
    ret.den.sign = MP_ZPOS;
    return ret;
};

Bigrational.prototype.isEpsZero = function(eps) {
    var EPS = (arguments.length == 1) ? eps : BIGRATIONAL_PRECISION;
    var n, d;
    if (this.isZero()) {
        return true;
    }
    n = this.num.highBit();
    d = this.den.highBit();
    if ((d - n) >= EPS) {
        return true;
    }
    return false;
};

/**
   Returns integer and fractional parts. The integer part gets the sign
   @return {array} integer part (<code>Bigint</code>) and fractional part
                   (<code>Bigrational</code>) in that order
*/
Bigrational.prototype.parts = function() {
    var parts = this.num.divmod(this.den);
    var ret = new Bigrational();
    ret.num = parts[1];
    ret.den = this.den;
    return [parts[0], ret];
};

/**
   Square root
   @return {Bigrationa} square root
*/
Bigrational.prototype.sqrt = function() {
    var a, xn, oxn, bnum, bden, two, diff;

    if (this.sign == MP_NEG) {
        return (new Bigrational()).setNaN();
    }
    if (this.isZero()) {
        return new Bigrational();
    }
    // might come from an unregulated operation (+,-,*, etc.)
    if (!this.fitsBitPrecision()) {
        a = this.fastround(BIGRATIONAL_PRECISION);
    } else {
        a = this;
    }
    bnum = a.num.sqrt();
    if (!this.isInt()) {
        bden = a.den.sqrt();
    } else {
        bden = a.den.copy();
    }
    two = new Bigrational(1, 2);
    xn = new Bigrational(bnum, bden);
    while (true) {
        oxn = xn;
        xn = xn.add(this.div(xn)).mul(two).fastround(BIGRATIONAL_PRECISION);
        // a kind of comparing magnitudes
        diff = oxn.sub(xn);
        if (diff.isEpsZero()) {
            break;
        }
    }
    return xn.round(BIGRATIONAL_PRECISION);
};

/**
   Exponentiation with a small positive integer
   @param {number} b exponent
   @return {Bigrational}
*/
Bigrational.prototype.powInt = function(b) {
    // TODO: checks and balances
    var num = this.num.pow(b);
    var den = this.den.pow(b);
    var ret = new Bigrational(num, den);
    ret.sign = num.sign;
    return ret;
};
/**
   N<sup><i>th</i></sup>-root
   @param {number} b exponent
   @return {Bigrational}
*/
Bigrational.prototype.nthroot = function(b) {
    var t1, t2, t3, a, rb;
    var sign, bsign;
    var bnum, bden;

    if (this.isZero()) {
        if (b > 0) {
            return new Bigrational();
        } else {
            return (new Bigrational()).setNaN();
        }
    }

    if (this.isUnity()) {
        if (b == 0) {
            return (new Bigrational()).setNaN();
        } else {
            return this.copy();
        }
    }
    if (b < 0) {
        // x^(-1/b) = 1/(x^(1/-b)), so keep sign in mind
        bsign = MP_NEG;
        b = -b;
    }
    if (b == 0 || b.isNaN()) {
        // zero means this^(1/0) which is a division by zero
        return (new Bigrational()).setNaN();
    }
    if (b == 1) {
        // one means this^(1/1) -> no effect
        return this.copy();
    }

    /* input must be positive if b is even */
    if ((b & 1) == 0 && this.sign == MP_NEG) {
        return (new Bigrational()).setNaN();
    }
    if (b == 2) {
        return this.sqrt();
    }
    // might come from an unregulated operation (+,-,*, etc.)
    if (!this.fitsBitPrecision()) {
        a = this.fastround(BIGRATIONAL_PRECISION);
    } else {
        a = this;
    }

    sign = a.sign;
    a.sign = MP_ZPOS;
    a.num.sign = MP_ZPOS;

    // Seems costly but most of the time is spend in the
    // Newton loop, especially for higher precisions
    bnum = a.num.nthroot(b);
    bden = a.den.nthroot(b);

    // no normalization needed here, co-primes stay co-primes
    // even after exponentiation.
    t2 = new Bigrational(bnum, bden);

    rb = new Bigrational(1, b);
    while (true) {
        // compute difference
        // inexact rounding here, just to keep the fraction parts small
        t3 = t2.powInt(b - 1).fastround(BIGRATIONAL_PRECISION);
        t3 = a.div(t3);
        t3 = t3.sub(t2);
        t3 = t3.mul(rb);
        t3 = t3;
        // add difference to last approximation
        // inexact rounding here, just to keep the fraction parts small
        t2 = t2.add(t3).fastround(BIGRATIONAL_PRECISION);
        // we have reached the final approximation when the difference
        // is close enough to zero
        if (t3.isEpsZero()) {
            break;
        }
    }
    // round to median
    t2 = t2.round(BIGRATIONAL_PRECISION);
    // Might be superfluous if we work on copy, but does cost almost nothing
    a.sign = sign;
    t2.sign = sign;
    // x^(-1/b) = 1/(x^(1/-b))
    if (bsign == MP_NEG) {
        t2.inverse();
    }
    return t2;
};
// keeps B_n != 0 only
/**
  Cache holding compute Bernoulli number but only those that are not zero
  @memberof Bigrational
  @constant   {array}
*/
var STATIC_BERN_ARRAY;
// for B_n: STATIC_BERN_ARRAY_SIZE = floor(n/2) +1
// plus one because B_1 = -1/2 and the rest of odd(n) = 0
/**
   Current size of Bernoulli cache<br>
   For B_n: <code>STATIC_BERN_ARRAY_SIZE = floor(n/2) +1</code>
  @memberof Bigrational
   @constant  {number}
   @default
*/
var STATIC_BERN_ARRAY_SIZE = 0;
// for B_max set STATIC_BERN_ARRAY_PREFILL
/**
   Minimum amount of Bernoulli numbers in cache
  @memberof Bigrational
   @constant  {number}
   @default
*/
var STATIC_BERN_ARRAY_PREFILL = 50;
/**
   Compute Bernoulli numbers. B<sub>1</sub> = -1/2<br>
<p>
   Algorithm is good but won't run sufficiently fast for
   values above about n = 500.
   Got B_1000 calulated in slightly under twenty minutes on
   an old 1GHz AMD-Duron. Not bad for such an old destrier.
</p><p>
   The algorithm using Riemann zeta function is being worked on
   but will most probably need the Bigfloat to work fast enough.
   Although no floating point arithmetic is essential, the
   Bigrational is just too slow for this.
</p>
   Brent, Richard P., and David Harvey. <i>Fast computation of Bernoulli, Tangent
   and Secant numbers.<i> Computational and Analytical Mathematics. Springer New
   York, 2013. 127-142.
<br>
   Preprint: {@link http://arxiv.org/abs/1108.0286}
  @todo This should be a normal function, not a prototype
  @param {number} index of Bernoulli number
  @return {Bigrational} the Bernoulli number
*/
Bigrational.prototype.bernoulli = function(N) {

    var n, e, k;
    var bhbern = function(limit) {
        var tmp, A, U, E;
        var T;
        var j, k, alloc_mem;
        var e, counter = 0;

        if (limit < STATIC_BERN_ARRAY_SIZE) {
            //console.log("Cache hit: " + limit);
            return MP_OKAY;
        }
        // calculate the first one hundred to fill the cache
        // because Bernoulli numbers almost always come in hordes.
        if (STATIC_BERN_ARRAY_SIZE == 0 && limit <
            STATIC_BERN_ARRAY_PREFILL) {
            limit = STATIC_BERN_ARRAY_PREFILL;
        }

        T = new Array(limit + 2);
        /* For sake of simplicity */
        STATIC_BERN_ARRAY = new Array(limit + 4);

        /* This algorithm starts at B_2 = 1/6 */
        /* B_0 = 1 */
        STATIC_BERN_ARRAY[counter++] = new Bigrational(1, 1);
        /* B_1 = -1/2 */
        STATIC_BERN_ARRAY[counter++] = new Bigrational(-1, 2);
        // Compute tangent numbers
        // T[0] is not used
        T[1] = new Bigint(1);

        for (k = 2; k <= limit; k++) {
            /* T[k] = (k-1)*T[k-1] */
            if (typeof T[k] === "undefined") {
                T[k] = new Bigint(1);
            }
            T[k] = T[k - 1].mulInt(k - 1);
        }

        for (k = 2; k <= limit; k++) {
            for (j = k; j < limit; j++) {
                /* T[j] =  (j-k)*T[j-1]  +   (j-k+2)*T[j] */
                /* tmp  =  (j-k)*T[j-1]  */
                tmp = T[j - 1].mulInt(j - k);
                /* T[j] =   (j-k+2)*T[j] */
                T[j] = T[j].mulInt(j - k + 2);
                /* T[j] =   T[j]  + tmp */
                T[j] = T[j].add(tmp);
            }
        }
        // compute Bernoulli numbers from tangent numbers
        /* E = -2; U = 1 */
        E = new Bigint(-2);
        U = new Bigint(1);

        for (k = 1; k <= limit; k++) {
            /* U = 4*U */
            U = U.mulInt(4);
            /*  A = U*(U-1) */
            A = U.mul(U.subInt(1));
            /* E = -E */
            E = E.neg();
            /* result = (E*T[k]*k) / (A) */
            tmp = E.mulInt(k);
            tmp = tmp.mul(T[k]);

            e = new Bigrational(tmp, A);
            e.normalize();
            e.sign = e.num.sign;
            STATIC_BERN_ARRAY[counter++] = e;
        }

        // Denominator of last entry is incompletely computed
        STATIC_BERN_ARRAY_SIZE = counter - 1;

        /*  It is deemed good style to clean up after work */
        // The array T holds the tangent numbers.
        for (k = 1; k < limit; k++) {
            T[k].free();
            T[k] = null;
        }
        T = null;
        return MP_OKAY;
    };

    // works for small values only.
    // Really small values.
    if (arguments.length == 0 && this.num.used != 1) {
        return this.copy().setNaN();
    }
    // argument given wins over "this". Should it?
    if (arguments.length == 0) {
        n = this.num.dp[0];
    } else {
        n = N;
    }
    if (n < 0) {
        // Riemann's zeta function not yet implemented.
        // There is also Harvey's multi-modal approach...
        // PARI/GP returns zero and so do we
        return new Bigrational(0, 1);
    }
    /* all odd Bernoulli numbers are zero except B_1 */
    if ((n & 0x1) && n != 1) {
        return new Bigrational(0, 1);
    }
    // cache already and sufficiently filled?
    if (STATIC_BERN_ARRAY_SIZE < n) {
        // does not return an error yet
        if ((e = bhbern(Math.floor(n / 2) + 1)) != MP_OKAY) {
            return e;
        }
    }
    /* It simplifies things a bit to get the exceptions out of the way */
    if (n < 2) {
        return STATIC_BERN_ARRAY[n];
    }
    k = Math.floor(n / 2) + 1;
    return STATIC_BERN_ARRAY[k];
};
/**
   Free Bernoulli cache
   @memberof Bigrational
*/
function bernoulli_free(){
    var i = 0;
    for (; i < bern_array_size; i++) {
      STATIC_BERN_ARRAY[i].free();
      STATIC_BERN_ARRAY[i] = null;
    }
    STATIC_BERN_ARRAY = null;
    STATIC_BERN_ARRAY_SIZE = 0;
}


// Some shortcuts
/**
   Division by a small integer
   @param {number} si divisor
   @return {Bigrational} Quotient
*/
Bigrational.prototype.divInt = function(si) {
    if (si == 0) {
        return (new Bigrational()).setNaN();
    }
    if (si == 1) {
        return this.copy();
    }
    if (this.isZero()) {
        return new Bigrational(0, 1);
    }
    var num = this.num.copy();
    var den = this.den.mulInt(si);
    var ret = new Bigrational(num, den);
    ret.normalize();
    return ret;
};
/**
   Multiplication with a small integer
   @param {number} si multiplicant
   @return {Bigrational} product
*/
Bigrational.prototype.mulInt = function(si) {
    var num = this.num.mulInt(si);
    var den = this.den.copy();
    var ret = new Bigrational(num, den);
    ret.normalize();
    return ret;
};
/**
   Addition of a small integer
   @param {number} si addend
   @return {Bigrational} sum
*/
Bigrational.prototype.addInt = function(si) {
    if (si == 0) {
        return this.copy();
    }
    var tmp = new Bigrational(si, 1);
    return this.add(tmp);
};
/**
   Subtraction of a small integer
   @param {number} si subtrahend
   @return {Bigrational} difference
*/
Bigrational.prototype.subInt = function(si) {
    if (si == 0) {
        return this.copy();
    }
    var tmp = new Bigrational(si, 1);
    return this.sub(tmp);
};
