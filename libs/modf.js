/*
   Port of the Posix modf(3) from the SunPro C-code
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

function modf(x)
{
    "use asm";
    var i0 = 0 | 0, i1 = 0 | 0, j0 = 0 | 0;
    var i = 0 >>> 0;
    var num = new DataView(new ArrayBuffer(8));
    num.setFloat64(0, x);
    i0 = num.getUint32(0);
    i1 = num.getUint32(4);
    j0 = ((i0 >>> 20) & 0x7ff) - 0x3ff;	/* exponent of x */

    if (j0 < 20) {		/* integer part in high x */
	if (j0 < 0) {		/* |x|<1 */
	    return[num.getFloat64(0), 0];
	} else {
	    i = (0x000fffff) >>> j0;
	    if (((i0 & i) | i1) === 0) {	/* x is integral */
		return[0.0, x];
	    } else {
		num.setUint32(0, i0 & (~i));
		num.setUint32(4, 0);
		return[x - num.getFloat64(0), num.getFloat64(0)];
	    }
	}
    } else if (j0 > 51) {	/* no fraction part */
	var temp = x * one;
	/* We must handle NaNs separately.  */
	if (j0 === 0x400 && ((i0 & 0xfffff) | i1))
	    return[x * 1.0, 0];
	return[x, 0];
    } else {			/* fraction part in low x */
	i = 0xffffffff >>> (j0 - 20);
	if ((i1 & i) === 0) {	/* x is integral */
	    return[num.getFloat64(0), 0];
	} else {
	    num.setUint32(0, i0);
	    num.setUint32(4, i1 & (~i));
	    return[x - num.getFloat64(0), num.getFloat64(0)];
	}
    }
}
