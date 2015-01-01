/*
      Need Bigint to function, even inherits a lot of global variables.

      Ignores large parts of IEEE 745 concerning the guts of the numbers but
      follows the rest (Infinity, NaN, divideByZero etc. pp.)

      The chance of getting subnormal number by using the bigfloat numbers is
      low.
*/

/*
   TODO: a lot, but we need a check to handle subnormal numbers and infinity,
         too, when the number grows to big.

         strtof and ftostr handle base 10 numbers only for now, but should
         be able to handle base 16 and base 2, too at least.

         The way strtof and ftostr work the numbers shouldn't be too small or
         too large, but something between 1e-1,000 and 1e+1,000 should work
         fast enough.

         Rounding is fixed to half-to-nearest for now.

         Exception handling is exceptionally poor--without exceptions.
*/

// in bits, default is 104 bits (not a double-double that would be more)
var MPF_PRECISION = MP_DIGIT_BIT*4;
// it is also the minimum
var MPF_PRECISION_MIN = MP_DIGIT_BIT*4;
var MPF_DECIMAL_PRECISION_MIN = 31;
// this is an arbitrary maximum, just a safe guard and free to change
var MPF_PRECISION_MAX = 4294967296; // 2^32 bits, 165,191,050 big-digits

// exception handling
var MPFE_DIVBYZERO  = 1;
var MPFE_INEXACT    = 2;
var MPFE_INVALID    = 4;
var MPFE_OVERFLOW   = 8;
var MPFE_UNDERFLOW  = 16;

var MPFE_ALL_EXCEPT = MPFE_DIVBYZERO | MPFE_INEXACT | MPFE_INVALID;

// Rounding modes
var MPFE_TONEAREST   = 1; // default
var MPFE_UPWARD      = 2;
var MPFE_DOWNWARD    = 4;
var MPFE_TOWARDZERO  = 8;

var MPFLT_ROUNDS     = 1;

function Bigfloat(n){
  // keep an extra sign and save some typing
  this.sign = MP_ZPOS;
  this.mantissa = new Bigint(0);
  this.exponent = 1;
  this.precision = MPF_PRECISION;
  if(arguments.length == 1 && n.isInt() && Math.abs(n) < MP_INT_MAX){
    this.mantissa = Math.abs(n).toBigint();
    this.mantissa.lShiftInplace(MPF_PRECISION - Math.abs(n).highBit() - 1);
    this.mantissa.sign = (n < 0)?MP_NEG:MP_ZPOS;
    this.sign = this.mantissa.sign;
    this.exponent = -this.precision + Math.abs(n).highBit() + 1;
  }
}

function setPrecision(n){
  if(n != null && n.isInt() && n > MPF_PRECISION_MIN){
    MPF_PRECISION = n;
  } else {
    MPF_PRECISION = MPF_PRECISION_MIN;
  }
}

function getPrecision(){
    return MPF_PRECISION;
}

Bigfloat.prototype.getDecimalPrecision = function(){
  var log210 = parseFloat("3.321928094887362347870319429489390175865");
  return Math.floor( this.precision / log210) ;
};

Bigfloat.prototype.setDecimalPrecision = function(prec){
  var log210 = parseFloat("3.321928094887362347870319429489390175865");
  if(!prec || !prec.isInt() || prec < MPF_DECIMAL_PRECISION_MIN){
      return MP_NO;
  }
  this.precision = Math.ceil(prec * log210) + 1;
  return true;
};

function mpfegetround(){
    return MPFLT_ROUNDS;
}
function mpfesetround(n){
    if(!n.isInt() || n < 0 || n > 3){
        MPFLT_ROUNDS = -1;
    } else {
        MPFLT_ROUNDS = n;
    }
}

Number.prototype.toBigfloat = function(){
    var exponent;
    var sign;
    var ret,low,high,high_mant, digit,tmp,correction=0;

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
    exponent =  0x7fffffff & high;
    if (exponent == 0x7ff00000 ) {
        // infinity
        if(low == 0){
            ret = new Bigfloat();
            ret.setInf();
            if(sign < 0){
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
    if (exponent > 0x7ff00000 ) {
        ret = new Bigfloat();
        ret.setNaN();
        return ret;
    }
    // signed zero;
    if ((exponent >>> 20) == 0 ) {
        ret = new Bigfloat();
        ret.exponent = 1;
        if(sign == 1){
            ret.sign = MP_NEG;
            ret.mantissa.sign = MP_NEG;
        }
        return ret;
    }
    // subnormals
    if (exponent < 0x00100000) {
        tmp = buf.getFloat64(0);
        tmp *= 18014398509481984.0;    // 2^54
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
    if (MP_DIGIT_BIT != 26){
       return (new Bigfloat()).setNaN();
    }

    ret = new Bigfloat();

    // fill from right to left, high to low
    // set implicit bit because we have it explicit
    ret.mantissa = new Bigint(1);
    ret.mantissa.dlShiftInplace(1);

    // fill up high_mant with the upper bits of low. For 26 bit big-digits we
    // need five more to fill a big-digit

    high_mant = (high_mant << (MP_DIGIT_BIT-20)) 
              | ( low >>> (32-(MP_DIGIT_BIT-20)) );

    ret.mantissa.dp[0] = high_mant;

    // Make room for the next big-digit and fill; rinse and repeat
    ret.mantissa.dlShiftInplace(1);

    // Sometimes the programmer has some undeserved luck: 32 - (26-20) = 26
    // But the choice of 26 bits for a big-digit was made because 2x26 = 52
    // so it has nothing to do with luck.
    ret.mantissa.dp[0] =low & MP_MASK;
    ret.mantissa.used = ret.mantissa.dp.length;
    ret.mantissa.sign = (sign == 1)?MP_NEG:MP_ZPOS;
    ret.mantissa.clamp();
    ret.sign = ret.mantissa.sign;
    ret.exponent = -ret.precision + exponent;
    //ret.normalize();
    return ret;
};

// both function assume MP_DIGIT_BIT == 26
Bigfloat.prototype.toNumber = function(){
    var high, mid, low, ret, buf, tmp, exponent;
    if(this.exponent < -1022){
        return -Infinity;
    } else if(this.exponent > 1023){
        return  Infinity;
    } else  if(this.mantissa.isNaN()){
        return  Number.NaN;
    } else  if(this.isZero()){
        return (this.sign < 0)? -0 : 0;
    }

    // we have at least one big-digit
    high = this.mantissa.dp[this.mantissa.used -1];
    mid = 0;
    low = 0;
    // TODO: check for subnormals here
    if(this.mantissa.used >= 2){
        mid = this.mantissa.dp[this.mantissa.used -2];
    }
    if(this.mantissa.used >= 3){
         low = this.mantissa.dp[this.mantissa.used -3] >>> (MP_DIGIT_BIT -1);
    }
    // build a 64 bit ECMAScript Number (IEEE-754 double precision)
    buf = new DataView(new ArrayBuffer(8));
    // MSB of the high word is the sign
    tmp = (this.sign < 0)?0x80000000:0;
    // add bias to exponent
    exponent = this.exponent + 1022;
    // add exponent to high word
    tmp |= exponent << 20;
    // IEEE double has an implicit first bit, we have it explicit.
    high = high & ( (1 << (MP_DIGIT_BIT -1) ) -1 );
    // add the higher 20 bits to the high word
    tmp |= high >>> 5;
    // set high word
    buf.setUint32(0,tmp);
    // carry (lsb side five bits of highest big-digit)
    tmp = (high & 0x1f) << 27;
    if(mid != 0){
         // if we have some bits here, fill up low word
         tmp |= mid << 1;
    }
    if(low != 0){
         // we are not allowed to waste even a single bit!
         tmp |= low & 0x1;
    }
    buf.setUint32(4,tmp);
    ret = buf.getFloat64(0);
    tmp = Math.pow(2,this.precision);
    ret *= tmp;
    return ret;
};



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

        // Case should not matter, just for legibility
        if (s.charAt(0) == "I" && s.charAt(1) == "n" && s.charAt(1) ==
            "f") {
            return "Infinity";
        }

        if (s.charAt(0) == "N" && s.charAt(1) == "a" && s.charAt(1) ==
            "N") {
            return "NaN";
        }

        // unitary minus/plus comes before base marks (e.g.: "0x")
        if (s.charAt(0) == "-" || s.charAt(0) == "+") {
            sign = s.charAt(0);
            k = 1;
        }

        if (s.charAt(k) == "0") {
            if (s.charAt(1) == "x") {
                base = 16;
                k += 2;
            } else if (s.charAt(1) == "b") {
                base = 2;
                k += 2;
            }
            // no leading zeros allowed for octal numbers
            // to make things simpler
            else if (s.charAt(1) && s.charAt(1) != "0" && s.charAt(1) !=
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
                case "-":
                    if (is_expo_part == true) {
                        expo_sign = c;
                    } else {
                        return "Parse error: sign at wrong position ";
                    }
                    break;
                    // either this or ignore. Add "_" (underbars) like in Perl?
                default:
                    return "Parse error: unknown character = \"" + c +
                        "\"";

            }
        }
        if (str_number.length == 0) {
            return "Parse error: number has no digits";
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

        if (typeof arrayFromParseNumber === 'string') {
            // raise an error and...
            return "NaN";
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
                // Q =  numerator/denominator + R
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
                // and s = s - 1, then goto LOOP
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

        if (decimal_point < 0) {
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
                return the_number;
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
        // lShiftInplace() does nothing if exponent is zero;
        ret.lShiftInplace(exponent);
        decexpo = Math.floor((this.exponent + this.precision) /
            log210);
        signexpo = "";
    } else {
        // multiply by 10^(toDec(this.precision)) and divide by 2^exponent
        // the decimal point is at 10^(toDec(this.precision)) now.
        // don't check for a proper integer; it can't be known, could be just a
        // fraction rounded to an integer
        decexpo = Math.ceil((Math.abs(this.exponent) - this.precision) /
            log210);
        ret = ret.mul(ten.pow(decprec + decexpo));
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
        if (Math.abs(this.exponent) < this.precision) {
            signexpo = "";
        }
    }
    if (ret.isZero()) {
        ret = "00";
    } else {
        ret = ret.toString();
    }
    ret = sign + ret.slice(0, 1) + "." + ret.slice(1, decprec) + "E" +
        signexpo + Math.abs(decexpo).toString();
    return ret;
};



Bigfloat.prototype.setNaN = function(){
    this.mantissa.setNaN();
};
Bigfloat.prototype.isNaN = function(){
    this.mantissa.isNaN();
};

Bigfloat.prototype.setInf = function(){
    this.mantissa.setInf();
};
Bigfloat.prototype.isInf = function(){
    this.mantissa.isInf();
};

Bigfloat.prototype.isZero = function(){
  if( this.mantissa.isZero() == MP_YES &&
      this.exponent == 1 ){
      return MP_YES;
  }
  return MP_NO;
};

// eps = 1e-EPS
Bigfloat.prototype.isEPSZero = function(eps){
  if( this.mantissa.isZero() == MP_YES &&
      this.exponent == 1 ){
      return MP_YES;
  }

  // get precision

  // compare with exponent by de-biasing

 /*
      eps = 1e-80  (1e-80 = 1*2^(-80))
      precision = 100

      exponent = -170 -> no
      de-biased = -170 + 100 = 70 and 70 < 80 (bigger actually, bec. of neg. val.)

      exponent = -181 -> yes
      de-biased = -181 + 100 = 81 and 81 > 80

      problem with equality, need to check the whole number than:
      exponent = -180 -> y?
      de-biased = -180 + 100 = 80 and 80 == 80

  */


  return MP_NO;
};
// calls normalize() at the end, usable to change prec. temporary
Bigfloat.prototype.copy = function(){
  var ret = new Bigfloat();
  ret.sign = this.sign;
  ret.exponent = this.exponent;
  ret.precision = this.precision;
  ret.mantissa = this.mantissa.copy();
  ret.normalize();
  return ret;
};

Bigfloat.prototype.dup = function(){
  return this.copy();
};

Bigfloat.prototype.abs = function(){
  var ret = this.copy();
  ret.sign = MP_ZPOS;
  ret.mantissa.sign =  MP_ZPOS;
  return ret;
};

Bigfloat.prototype.neg = function(){
  var ret = this.copy();
  ret.sign = (this.sign == MP_ZPOS)?MP_NEG:MP_ZPOS;
  ret.mantissa.sign = ret.sign;
  return ret;
};

Bigfloat.prototype.exch = function(bf){
  // of not much use here
  return this.copy();
};


Bigfloat.prototype.normalize = function(){
  var cb, diff;
  var err;
  var c;

  // So one can set precision by way of normalizing
  if(this.precision != MPF_PRECISION && this.precision >= MPF_PRECISION_MIN){
    this.precision = MPF_PRECISION;
  } else {
    this.precision = MPF_PRECISION_MIN;
  }

  if(this.isZero()){
      return MP_OKAY;
  }

  cb = this.mantissa.highBit() + 1;

  if(cb > this.precision){
      diff    = cb - this.precision;
      this.exponent += diff;  
      if(!this.exponent.isInt()){
          this.setInf();
          this.sign = MP_ZPOS;
          return MPFE_OVERFLOW;
      }
      /* round it, add 1 after shift if diff-1'th bit is 1 */
      c = this.mantissa.dp[Math.floor(diff/MP_DIGIT_BIT)] & (1<<(diff%MP_DIGIT_BIT));
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
         diff    = this.precision - cb;
         this.exponent -= diff;
         if(!this.exponent.isInt()){
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


Bigfloat.prototype.cmp = function(bf){
   var za, zb, sa, sb;

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

Bigfloat.prototype.add = function(bf){
   var tmp, other;
   var diff;
   var ret;
  if(this.isZero()){
    tmp = bf.copy();
    tmp.normalize();
    return tmp;
  }
  if(bf.isZero()){
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

Bigfloat.prototype.sub = function(bf){
   var err;
   var tmp;
   var diff;
   var ret = new Bigfloat();

  if(this.isZero()){
    tmp = bf.neg();
    tmp.normalize();
    return tmp;
  }
  if(bf.isZero()){
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


Bigfloat.prototype.mul = function(bf){
   var ret = new Bigfloat();

   ret.mantissa = this.mantissa.mul(bf.mantissa);
   ret.exponent = this.exponent + bf.exponent;
   ret.sign = ret.mantissa.sign;
   ret.normalize();
   return ret;
};

Bigfloat.prototype.div = function(bf){
   var tmp;
   var ret;

   /* ensure b is not zero */
   if(bf.mantissa.isZero() == MP_YES){
      return MP_VAL;
   }
   // TODO: the rest of the IEEE-754 exceptions

   /* find 1/b */
   tmp = bf.inv();

   /* now multiply */
   ret = this.mul(tmp);
   return ret;
};

Bigfloat.prototype.inv = function() {
    var init, ret, x0, xn, hn, A, inval, prec, oldprec, one, nloops;

    // compute initial value x0 = 1/A
    inval = this.toNumber();
    console.log("inval = " + inval)
    inval = Math.abs(inval);
    inval = 1 / inval;
     console.log("inval = " + inval)
    // start with basic precision which is 2*double precision
    oldprec = this.precision;
    prec = 15;
    // oldprec must be equal or higher or there is a nasty bug somewhere
    if (oldprec != prec) {
        this.precision = prec;
    }
    // number of loops:
    // quadratic, so every round doubles the number of correct digits 
    // such a limit is necessary because the loop condition might never be true
    var precarr = computeGiantsteps(prec, oldprec, 2);
    nloops = 0;
    xn = inval.toBigfloat();
    // x0 = xn.copy();
    one = new Bigfloat(1);
    // low starting precision: low cost
    A = this.abs();
    // xn = 2*xn-A*xn^2 normally but here we do something different:
    // hn =  1-A*xn
    // x(n+1) = xn + xn*hn.
    do {
        setPrecision(prec);
        x0 = xn.copy();
        hn = one.sub(A.mul(xn));
        // we can check for hn being close enough to zero ( <eps ) here
        xn = xn.add(xn.mul(hn));
        prec = precarr[nloops];
        nloops++;
        if (nloops == precarr.length) {
            break;
        }
    } while (x0.cmp(xn) != MP_EQ);

    // we are probably (hopefuly) too high
    setPrecision(oldprec);
    xn.normalize();
    // set sign
    // xn.sign = this.sign
    // xn-mantissa.sign = this.sign
    return xn;
};












































