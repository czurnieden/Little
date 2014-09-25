/*
   A PRNG with a longer sequence than Math.rand() (2^160 -1) and still fast.
   JSPerf says 94% slower (about 17 times slower) than Math.rand() on 
   Firefox v. 32
   
   Published by George Marsaglia, 13 May 2003 at com.lang.c
   http://groups.google.com/group/comp.lang.c/msg/e3c4ea1169e463ae

   Needs unsigned integer multiplication which can't be done by any
   tricks in Javascript only manually:
   
   Number.prototype.uimul32 = function(ui) {
    var this_high = (this >> 16) & 0xffff;
    var this_low  =  this        & 0xffff;
    var ui_high = (ui >> 16) & 0xffff;
    var ui_low  =  ui        & 0xffff;
    var prod_high = ((this_high * ui_low) + (this_low * ui_high)) & 0xffff;
    return ((prod_high << 16)>>>0) + (this_low * ui_low);
   }
   
   C-code to check:

#include <stdlib.h>
#include <stdio.h>
static unsigned long  x = 123456789;
static unsigned long  y = 362436069;
static unsigned long  z = 521288629;
static unsigned long  w = 88675123;
static unsigned long  v = 886756453;

unsigned long xorshift(void)
{
    unsigned long t;
    t = (x ^ (x >> 7));
    x = y;
    y = z;
    z = w;
    w = v;
    v = (v ^ (v << 6)) ^ (t ^ (t << 13));
    return (y + y + 1) * v;
}

int main(int argc , char **argv){
  int count = 0,i;
  if(argc > 1){
    count = atoi(argv[1]);
  } else {
    count = 1;
  }
  for(i=0;i<count;i++){
    printf("%08lX\n",xorshift());
  }
  return EXIT_SUCCESS;
}

First ten results with default seed should be
A085AA0E
6F94443C
01E9D1A2
FA82A7EF
231697AE
2DED6C3F
07BC54B1
563B0D24
C8443B05
946ACA4D
   
*/

if(typeof Little === 'undefined'){
    Little = {};
}
Little.marsaglia_x = 123456789>>>0;
Little.marsaglia_y = 362436069>>>0;
Little.marsaglia_z = 521288629>>>0;
Little.marsaglia_w = 88675123 >>>0;
Little.marsaglia_v = 886756453>>>0;

function seed_marsaglia(x, y, z, w, v)
{
    /* seed from time */
    if (arguments.length === 0) {
	var timenow = 0 >>> 0;
	if (typeof window.performance.now !== 'undefined') {
	    timenow = Math.floor(window.performance.now() * 100000) >>> 0;
	} else {
	    timenow = (Date.now()) >>> 0;
	}
	Little.marsaglia_x = 123456789 ^ timenow;
	Little.marsaglia_y = 362436069 ^ (Date.now());
	Little.marsaglia_z = 521288629 ^ (timenow + 123456789);
	Little.marsaglia_w = 88675123 ^ (timenow + 273452343);
	Little.marsaglia_v = 886756453 ^ (timenow + 934526918);
    }
    /* TODO: seeds must be different from zero */
    if (arguments.length >= 1) {
	Little.marsaglia_x = x;
	if (arguments.length >= 2) {
	    Little.marsaglia_y = y;
	    if (arguments.length >= 3) {
		Little.marsaglia_z = z;
		if (arguments.length >= 4) {
		    Little.marsaglia_w = w;
		    if (arguments.length >= 5) {
			Little.marsaglia_v = v;
		    }
		}
	    }
	}
    }
}

function rand_marsaglia()
{
    var t = 0 >>> 0;
    t = (Little.marsaglia_x ^ (Little.marsaglia_x >>> 7));
    Little.marsaglia_x = Little.marsaglia_y;
    Little.marsaglia_y = Little.marsaglia_z;
    Little.marsaglia_z = Little.marsaglia_w;
    Little.marsaglia_w = Little.marsaglia_v;
    Little.marsaglia_v =
	(Little.marsaglia_v ^ (Little.marsaglia_v << 6)) ^ (t ^ (t << 13));
    return (Little.marsaglia_y + Little.marsaglia_y + 1)
                             .uimul32( Little.marsaglia_v);
}
