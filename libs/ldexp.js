/*
   Port of the Posix ldexp(3) from the SunPro C-code
   Needs current ECMAScript 5.1 to work
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

function ldexp( /*double */ mantissa, /*int */ exponent)
{
    "use asm";
    var k = 0 >>> 0, hx = 0 >>> 0, lx = 0 >>> 0, sign = 0 | 0;
    var num, cdnum;

    cdnum = mantissa;

    num = new DataView(new ArrayBuffer(8));
    num.setFloat64(0, cdnum);

    hx = num.getUint32(0);
    lx = num.getUint32(4);

    /* Get the exponent of the mantissa */
    k = (hx & 0x7ff00000) >>> 20;
    /* Check for zero and a subnormal mantissa  */
    if (k === 0) {
	/* Mantissa is plus or minus zero */
	if ((lx | (hx & 0x7fffffff)) === 0) {
	    return cdnum;
	}
	/* normalize */
	/* One of the disadvantages of the Arraybuffer */
	var temp = num.getFloat64(0);
	temp *= 18014398509481984.0;	// 2^54
	num.setFloat64(0, temp);

	hx = num.getUint32(0);
	k = ((hx & 0x7ff00000) >>> 20) - 54;
    }
    /* Check for IEEE errors */
    /* NaN or Inf */
    if (k === 0x7ff) {
	return (2 * num.getFloat64(0));
    }
    k = k + exponent;
    /* Overflow */
    sign = (mantissa < 0) ? -1 : 1;
    if (k > 0x7fe) {
	return 1.0e+300 * sign;
    }
    if (exponent < -50000) {
	return 1.0e-300 * sign;
    }
    /* normal, set exponent, build double and return */
    if (k > 0) {
	hx = (hx & 0x800fffff) | (k << 20);
	num.setUint32(0, hx);
	return num.getFloat64(0);
    }
    /* Rest of errorhandling */
    if (k <= -54) {
	if (exponent > 50000) {
	    return 1.0e+300 * sign;
	}
	return 1.0e-300 * sign;
    }
    /* The case of the subnormal result */
    k += 54;
    hx = (hx & 0x800fffff) | (k << 20);
    num.setUint32(0, high);
    /*   2^(-54)  */
    return (num.getFloat64(0) * 5.55111512312578270212e-17);
}
