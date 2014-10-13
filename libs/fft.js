/*
   FFT multiplication and squaring for the biginteger library
*/


var MP_DIGIT_SIZE     = (1<<MP_DIGIT_BIT)
var MP_DIGIT_BIT_HALF = (MP_DIGIT_BIT>>1)
var MP_DIGIT_HALF     = (1<< MP_DIGIT_BIT_HALF )
var MP_DIGIT_MASK     = (MP_DIGIT_HALF-1)

/*
  The size of the L1-cache in bytes. The number here is that of the data cache
  part of an AMD Duron. The Linux kernel gives a lot of information e.g.:
    grep . /sys/devices/system/cpu/cpu0/cache/index*//*
  There is also lscpu(1) wich is easier to use.
  On Windows:
    http://msdn.microsoft.com/en-us/library/ms683194.aspx
    http://www.cpuid.com/softwares/cpu-z.htm
  Lack of access to a Mac leaves that part blank. The new MacOS is based on BSD,
  so 'dmesg' might work or
    cat /var/run/dmesg.boot | grep CPU
 */
if(typeof  L1_SIZE === 'undefined')
  var L1_SIZE = 65536;

var M_PI = 3.14159265358979323846264338327950288419716939937511
var TWOPI = (2.0 * M_PI);

/* base two integer logarithm */
function highbit( n){
  var r=0>>>0;
  var m=n>>>0;
  while (m >>>= 1) {
    r++;
  }
  return r;
}
function bi_to_fft(a,fa,b,fb,len){

   var length_a, length_b, length_needed, i,j, hb;

   /* Check of the multiplicands happens earlier */
   length_a = a.used;
   length_b = b.used;

   /* Digits get split in half, so twice the length is needed*/
   length_needed = ( length_a + length_b ) * 2 ;
   /* final length must be a power of two to keep the FFTs simple */
   hb = highbit( length_needed );
   /* check for the rare case that it is already a power of 2 */
   if(length_needed != 1<<hb){
     length_needed = 1<<(hb+1);
   }
   /* Send computed length back to caller */
   len[0] = length_needed;

   /* Put splitted digits in double-array, in the same order as in mp_int */
   for(i = 0,j=0;i<length_needed/2;i++,j+=2){
      if(i < length_a){
        fa[j]   = 1.0 *  (a.dp[i]                         & MP_DIGIT_MASK);
        fa[j+1] = 1.0 * ((a.dp[i] >>> MP_DIGIT_BIT_HALF ) & MP_DIGIT_MASK);
      }
      /* padding a */
      if(i >= length_a){
        fa[j]   = 0.0;
        fa[j+1] = 0.0;
      }
      if(i < length_b){
        fb[j]   = 1.0 *  (b.dp[i]                         & MP_DIGIT_MASK);
        fb[j+1] = 1.0 * ((b.dp[i] >>> MP_DIGIT_BIT_HALF ) & MP_DIGIT_MASK);
      }
      /* padding b */
      if(i >= length_b){
        fb[j]   = 0.0;
        fb[j+1] = 0.0;
      }
   }
}
/* same as dp_to_fft() for a single multiplicand for squaring */
function bi_to_fft_single(a, fa, len){
   var length_a,  length_needed, i,j, hb;
   length_a = a.used;
   length_needed = ( length_a * 2   )*2 ;
   hb = highbit(length_needed );
   if(length_needed != 1<<hb){
     length_needed = 1<<(hb+1);
   }
   len[0] = length_needed;

   for(i = 0,j=0;i<length_needed/2;i++,j+=2){
      if(i < length_a){
        fa[j]   = 1.0  (a.dp[i]                         & MP_DIGIT_MASK);
        fa[j+1] = 1.0 ((a.dp[i] >>> MP_DIGIT_BIT_HALF ) & MP_DIGIT_MASK);
      }
      if(i >= length_a){
        fa[j]   = 0.0;
        fa[j+1] = 0.0;
      }
   }
   return MP_OKAY;
}

function fft_to_bi(fft_array, len){
    var new_length, i,j,e;
    var carry,temp;
    var a = new Bigint(0);

    /* Result cannot exceed length/2, hence add two */
    new_length = len;

    /* The FFT multiplication does no carry (it's one of the tricks of it) */
    carry = 0;
    for(i=0;i<len;i++){
      temp = carry;
      carry = 0;
      temp  += Math.round(fft_array[i]) >>> 0;
      if(temp >= MP_DIGIT_HALF){
        carry = Math.floor(temp / MP_DIGIT_HALF);
        temp  = temp & MP_DIGIT_MASK;
      }
      /* memory is still expensive, not a thing to waste easily */
      fft_array[i] = temp;
    }

    /* re-marry the digits */
    for(i=0,j=0;j<new_length;i++,j+=2){
      a.dp[i]   = (Math.round(fft_array[j+1]))& MP_DIGIT_MASK;
      a.dp[i] <<= MP_DIGIT_BIT_HALF;
      a.dp[i]  |= (Math.round(fft_array[j]))  & MP_DIGIT_MASK;
      /* and count them all */
      a.used++;
    }
    if(carry){
      a.dp[i] = carry;
      a.used++;
    }
    a.clamp();
    return a;
}

/*
  The iterative version of a Hartley transform, decimation in frequency.
  For the technical details see the excellent description in Jörg Arndt's book
  "Matters Computational" available for no cost at
    http://www.jjj.de/fxt/fxtbook.pdf
  See pages 515 ff.

  Optimizations used here:
    - hartley_shift (p. 516 f.) which avoids a large number of trig. comput.

  In the case of computationally very expensive or even non-existant
  trigonometric functions the calculation of the variables {c,s} can be replaced
  with two square roots which are easier to implement.
  The following pseudo-code calculates the numbers needed, although in reverse
  order:
    c = 0.0;s = 1.0;
    for(i=0;i<n;i++){
      s = sqrt((1.0 - c) / 2.0);
      c = sqrt((1.0 + c) / 2.0);
    }

   Also: the trig. values are always an ordered subset out of an ordered set of
   sizeof(unsigned long)*CHAR_BIT tuples if the length of the data is a power of
   two. That set can be pre-computed and needs
     sizeof(unsigned long)*CHAR_BIT*2 * sizeof(double)*CHAR_BIT
   bits of memory. With the current 64-bit implementations (64 bit integers and
   64 bit doubles) it's 8 kibi.
 */
function fht_dif_iterative(x, n,offset, do_loop)
{
    var m=0>>>0,mh=0>>>0,mq=0>>>0;
    var i,j,k;
    var a,b,t, c,s, u,v,tmp;
    // a pointer to x in the original
    var dp;
    for (m=n; m > 1; m >>>= 1) {
        mh = m >>> 1;
        mq = mh >>> 1;
        t = M_PI / mh;
        a = Math.sin(0.5 * t);
        a *= 2.0 * a;
        b = Math.sin(t);
        for (i = 0; i < n; i += m) {
            dp = offset+i; // dp = x + i in original
            for (j = 0, k = mh; j < mh; ++j, ++k) {
                u = x[dp+j];
                v = x[dp+k];
                x[dp+j] = u + v;
                x[dp+k] = u - v;
            }
            dp += mh;
            c = 1.0;
            s = 0.0;
            for (j = 1, k = mh - 1; j < mq; ++j, --k) {
                tmp = c;
                c -= a * c + b * s;
                s -= a * s - b * tmp;
                u = x[dp+j];
                v = x[dp+k];
                x[dp+j] = u * c + v * s;
                x[dp+k] = u * s - v * c;
            }
        }
        if(!do_loop)break;
    }
    return;
}
/*
  The recursive version of a Hartley transform, decimation in frequency.
  The trick is a kind of binary splitting: recurse until length of array
  is short enough to fit into the L1-cache.
  Idea found in FFTW3 but it is way older:
    Singleton, R. C., "On Computing the Fast Fourier Transform," 
    Communications of the ACM 10:647, 1967
  Seeking for this citation online found the software "am" at
  https://www.cfa.harvard.edu/~spaine/am/ where the same method can be found
  in https://www.cfa.harvard.edu/~spaine/am/download/src/transform.c
  
  The contruction of the functions here have been slightly adapted to the
  functions in "am" from above to make the actual FFT function easier replacable
  with others e.g.: those in "src/transform.c". They are legible now, too.
*/
function fht_dif_rec(x, n,offset)
{
    var nh=0>>>0;;
    if (n == 1 )
        return;
    if (n < Math.floor(L1_SIZE / (2 * 8) ) ) { // 8 = sizeof(double)
        fht_dif_iterative(x, n, offset, true); 
        return;
    }
    fht_dif_iterative(x, n, offset,false);
    nh = n >>> 1;
    fht_dif_rec(x, nh,offset);
    fht_dif_rec(x , nh, nh+offset);
    return;
}
/* The iterative Hartley transform, decimation in time. Description above */
function fht_dit_iterative(x, n,offset, do_loop)
{
    var m=0>>>0, mh=0>>>0 ,mq=0>>>0;
    var i,j,k;
    var a,b,t, u,v, c,s, tmp;
    var dp;

    m = (do_loop)?2:n;
    for (; m <= n; m <<= 1) {
        mh = m >>> 1;
        mq = mh >>> 1;
        t = M_PI / mh;
        a = Math.sin(0.5 * t);
        a *= 2.0 * a;
        b = Math.sin(t);
        for (i = 0; i < n; i += m) {
            dp = offset+i + mh; // was dp = x + i + mh
            c = 1.0;
            s = 0.0;
            for (j = 1, k = mh - 1; j < mq; ++j, --k) {
                tmp = c;
                c -= a * c + b * s;
                s -= a * s - b * tmp;
                u = x[dp+j];
                v = x[dp+k];
                x[dp+j] = u * c + v * s;
                x[dp+k] = u * s - v * c;
            }
            dp -= mh;
            for (j = 0, k = mh; j < mh; ++j, ++k) {
                u = x[dp+j];
                v = x[dp+k];
                x[dp+j] = u + v;
                x[dp+k] = u - v;
            }
        }
    }
    return;
}
/* The binary splitting. Description above */
function fht_dit_rec(x, n,offset)
{
    var nh;

    if (n == 1)
        return;
    if (n < Math.floor(L1_SIZE / (2 *  8) ) ) { // 8 = sizeof(double)
        fht_dit_iterative(x,n,offset,true);
        return;
    }
    nh = n >>> 1;
    fht_dit_rec(x, nh,offset);
    fht_dit_rec(x, nh,nh+offset);
    fht_dit_iterative(x,n,offset,false);
    return;
} 
/*
  The FHT convolution from Jörg Arndt's book.
  The code looks a bit messy but only on the face of it. This method avoids
  the otherwise costly bit reversing (which is called "revbin" in J. Arndt's
  book).
*/
function fht_conv_core(f, g, n, v /*=0.0*/ )
{
    var nh, r, rm, k, km, tr, m;
    var xi, xj, yi, yj;
    if (v == 0.0)
	v = 1.0 / n;

    g[0] *= (v * f[0]);
    if (n >= 2)
	g[1] *= (v * f[1]);
    if (n < 4)
	return;
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
	for (m = (nh >>> 1); !((r ^= m) & m); m >>>= 1) {;
	}

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
}
/* FHT auto-convolution. Description above */
function fht_autoconv_core(f,n,v /*=0.0*/ )
{
    var nh, r, rm, k, km, tr, m;
    var xi, xj, xi2, xj2, xij;
    if (v == 0.0)
	v = 1.0 / n;

    f[0] *= (v * f[0]);
    if (n >= 2)
	f[1] *= (v * f[1]);
    if (n < 4)
	return;
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
	for (m = (nh >>> 1); !((r ^= m) & m); m >>>= 1) {;
	}
	xi = f[r];
	xj = f[rm];
	xi2 = xi * xi;
	xj2 = xj * xj;
	xij = (2 * xi * xj);
	f[r] = v * (xi2 + xij - xj2)

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
}
/* Public: FHT convolution */
function MP_fft(x, y,len){
  var n;
  n = len[0]; 
  if(n < 2) return MP_VAL;
  fht_dif_rec(x,n,0);
  fht_dif_rec(y,n,0);
 fht_conv_core(x, y,n, 0.0);
 fht_dit_rec(y, n,0),0;
  return MP_OKAY;
}
/* Public: FHT auto-convolution */
function MP_fft_sqr(x, len){
  var n;
  n = len;
  if(n < 2) return MP_VAL;
  fht_dif_rec(x,n,0);
  fht_autoconv_core(x,n, 0.0);
  fht_dit_rec(x, n,0);
  return MP_OKAY;
}

function fft_mul(a,b){
  var fa = [],fb=[],len = [];
  var c;
  // checks and balances

  bi_to_fft(a, fa, b, fb,len);
  MP_fft(fa, fb,len);

  c = fft_to_bi(fb,len);
  return c;
}


function fft_sqr(a){
  var fa = [], len = [];
  var c
  // checks and balances

  bi_to_fft_single(a, fa,len);
  MP_fft_sqr(fa, len);

  c = fft_to_bi(fa,len);
  return c;
}

 



























