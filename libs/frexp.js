/*
   Port of the Posix frexp(3) from the SunPro C-code
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

function frexp(dnum)
{
    "use asm";
    var high = 0>>>0, tmp = 0>>>0, low = 0>>>0;
    var exp = 0|0;
    var num, cdnum;
    if (dnum === 0) {
	return dnum;
    }
    cdnum = dnum;
    /*  unsigned char * byte_string = (unsigned char *) & double_value; */
    num = new DataView(new ArrayBuffer(8));
    num.setFloat64(0, cdnum);
    /*
      typedef union
      {
         double cdnum;
         struct
         {
            u_int32_t high;
            u_int32_t low;
         } halves;
      } num;
    */
    high = num.getUint32(0);
    low  = num.getUint32(4);
    /* exponent = (high & 0x7ff00000) >> 20 */
    tmp = 0x7fffffff & high;
    /* errors (0, inf, nan) see IEEE-754 */
    if (tmp >= 0x7ff00000 || ((tmp | low) === 0)) {
	return cdnum;
    }
    /* See IEEE-754 for explanation of subnormal but
       the problem is easily resolved by up-sizing */
    if (tmp < 0x00100000) {	/* subnormal */
        /* One of the disadvantages of the Arraybuffer */
        var temp = num.getFloat64(0);
	temp *= 18014398509481984.0;	// 2^54
	num.setFloat64(0, temp);

	high = num.getUint32(0);
	tmp = high & 0x7fffffff;
        /* down-size to normal */
	exp = -54;
    }
    /* extract exponent and de-bias it */
    exp += (tmp >>> 20) - 1022;
    /* normalize mantissa  0.5 <= |dnum| < 1.0 */
    high = (high & 0x800fffff) | 0x3fe00000;
    num.setUint32(0, high);
    return [num.getFloat64(0), exp];
}
