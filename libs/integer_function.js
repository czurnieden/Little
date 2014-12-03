/*
   Some assorted integer functions.
   Needs bignum.js to function properly.
*/
// Some cutoffs related to factorial computing
// YMMV, but that's also about the range where the largest
// multiplications reach Toom-Cook territory
var FACTORIAL_BORW_LOOP_CUTOFF = 500;
var FACTORIAL_BORW_PRIMORIAL_CUTOFF = 500;
var FACTORIAL_BORW_CUTOFF = 500;

// Euler numbers, cache related
var STATIC_EULER_ARRAY;
var STATIC_EULER_ARRAY_SIZE = 0;
var STATIC_EULER_ARRAY_PREFILL = 50;

// helper functions   
// find x in p^x <= n!
function prime_divisors(n, p) {
    var q, m;
    q = n;
    m = 0;
    if (p > n) {
        return 0;
    }
    if (p > Math.floor(n / 2)) {
        return 1;
    }
    while (q >= p) {
        q = Math.floor(q / p);
        m += q;
    }
    return m;
}

// calculated 100000! in about 8 minutes on my 1GHz Duron
function factorial(n) {
    // first fifty factorials
    var small_factorials = [
        [1],
        [1],
        [2],
        [6],
        [24],
        [120],
        [720],
        [5040],
        [40320],
        [362880],
        [3628800],
        [39916800],
        [9239552, 7],
        [53005312, 92],
        [3876864, 1299],
        [58152960, 19485],
        [58032128, 311773],
        [47022080, 5300155],
        [41091072, 28293938, 1],
        [42532864, 713921, 27],
        [45350912, 14278432, 540],
        [12845056, 31411630, 11344],
        [14155776, 19967224, 249578],
        [57147392, 56592972, 5740300],
        [29360128, 16054068, 3549492, 2],
        [62914560, 65807390, 21628441, 51],
        [25165824, 33270564, 25468579, 1334],
        [8388608, 25890006, 16563006, 36028],
        [33554432, 53831531, 61110994, 1008790],
        [33554432, 17610541, 27388385, 29254936],
        [0, 3240779, 36938838, 28000939, 405],
        [0, 36596064, 41192129, 23614833, 12973],
        [0, 66819424, 17162994, 41092005, 428120],
        [0, 57267904, 46670917, 54950898, 14556100],
        [0, 58219584, 22869388, 44233262, 39701480, 7],
        [0, 15530240, 17991631, 48893572, 19967159, 273],
        [0, 37747968, 61710579, 64231709, 587405, 10112],
        [0, 25136640, 63300647, 24885872, 22321426, 384256],
        [0, 40804864, 52806143, 31024948, 65229260, 14985996],
        [0, 21581824, 31870960, 33038399, 59033586, 62568966, 8],
        [0, 12439552, 31640957, 12397098, 4457942, 15190810, 366],
        [0, 52699136, 53851785, 50916087, 53015843, 34034246, 15381],
        [0, 51470336, 33925412, 41908127, 65088769, 54186467, 661404],
        [0, 50102272, 16323153, 32018282, 45333575, 35394350, 29101811],
        [0, 40009728, 63453278, 31536556, 26744976, 49241908, 34513102,
            19
        ],
        [0, 28508160, 33169663, 41395475, 22309365, 50535274, 44098853,
            897
        ],
        [0, 64815104, 15470308, 66539156, 41907223, 26347653, 59380206,
            42189
        ],
        [0, 24117248, 4377326, 39762891, 65389695, 56727821, 31677618,
            2025114
        ],
        [0, 40894464, 13162399, 2224606, 49978476, 28199852, 8699451,
            32121745, 1
        ],
        [0, 31457280, 54140204, 44121445, 15895833, 706493, 32319387,
            62583384, 73
        ]
    ];
    var ret;
    // The actual binary splitting algorithm
    // A bit more complicated by the lack of factors of two
    var fbinsplit2b = function(n, m) {
            var t1, t2, k;
            if (m <= (n + 1)) {
                return n.toBigint();
            }
            if (m == (n + 2)) {
                return (n * m).toBigint();
            }
            k = Math.floor((n + m) / 2);
            if ((k & 1) != 1) {
                k--;
            }
            t1 = fbinsplit2b(n, k);
            t2 = fbinsplit2b(k + 2, m);
            return t1.mul(t2);
        };
    // binary splitting, sieve out factors of two and feed
    // the actual splitting algorithm
    var fbinsplit2a = function(n, p, r) {
        if (n <= 2){
            return;
        }
        fbinsplit2a(Math.floor(n / 2), p, r);
        p[0] = p[0].mul(fbinsplit2b(Math.floor(n / 2) + 1 + (Math.floor(
            n / 2) & 1), n - 1 + (n & 1)));
        r[0] = r[0].mul(p[0]);
    };
    // binary splitting, base function
    var bin_split = function(n) {
        var p, r, shift;
        p = [new Bigint(1)];
        r = [new Bigint(1)];
        fbinsplit2a(n, p, r);
        shift = prime_divisors(n, 2);
        r[0].lShiftInplace(shift);
        return r[0];
    };
    // compute primorial with binary splitting
    var primorial__lowlevel = function(array, array_pointer, n, result) {
            var i, first_half, second_half;
            var tmp;

            if (n == 0) {
                result[0] = new Bigint(1);
                return MP_OKAY;
            }
            // Do the rest linearly. Faster for primorials at least,  but YMMV
            if (n <= 64) {
                result[0] = array[array_pointer].toBigint();
                for (i = 1; i < n; i++){
                    result[0] = result[0].mul(array[array_pointer + i].toBigint());
                }
                return MP_OKAY;
            }

            first_half = Math.floor(n / 2);
            second_half = n - first_half;
            primorial__lowlevel(array, array_pointer, second_half, result);
            tmp = [new Bigint(1)];
            primorial__lowlevel(array, array_pointer + second_half,
                first_half, tmp);
            result[0] = result[0].mul(tmp[0]);
            return MP_OKAY;
        };
    // Borwein trick
    var factorial_borwein = function(n) {
        var p_list, arr;
        var exp_list;
        var p, i, j, cut;
        var bit;
        var shift, e;
        var temp;
        var r;
        var buffer;
        var result;

        p_list = primesieve.primeRange(3, n);
        r = p_list.length;
        buffer = new ArrayBuffer(r * 4);
        exp_list = new Uint32Array(buffer);

        result = new Bigint(1);
        shift = prime_divisors(n, 2);

        cut = Math.floor(n / 2);

        for (p = 0; p < r; p++) {
            if (p_list[p] > cut) {
                break;
            }
            exp_list[p] = prime_divisors(n, p_list[p]);
        }

        bit = exp_list[0].highBit();
        if (n < FACTORIAL_BORW_LOOP_CUTOFF) {
            for (; bit >= 0; bit--) {
                result = result.sqr();
                for (i = 0; i < p; i++) {
                    if ((exp_list[i] & (1 << bit)) != 0) {
                        result = result.mul(p_list[i].toBigint());
                    }
                }
            }
        } else {
            // memory is abundant today, isn't it?
            buffer = new ArrayBuffer(r * 4);
            arr = new Uint32Array(buffer);
            for (; bit >= 0; bit--) {
                result = result.sqr();
                temp = [new Bigint(1)];
                for (i = 0, j = 0; i < p; i++) {
                    if ((exp_list[i] & (1 << bit)) != 0) {
                        /*
                          result = result.mul(p_list[i].toBigint());
                        */
                        arr[j++] = p_list[i];
                    }
                }
                primorial__lowlevel(arr, 0, j, temp);
                result = result.mul(temp[0]);
            }
        }
        if (n < FACTORIAL_BORW_PRIMORIAL_CUTOFF) {
            for (; p < r; p++) {
                result = result.mul(p_list[p].toBigint());
            }
        } else {
            temp = [new Bigint(1)];

            p_list = primesieve.primeRange(cut, n);

            primorial__lowlevel(p_list, 0, p_list.length, temp);

            result = result.mul(temp[0]);

        }
        result.lShiftInplace(shift);
        return result;
    };
    if(!n.isInt()) {
        // gamma function not yet implemented
        return (new Bigint()).setNaN();
    }
    if(n > 1<<26) {
        // Result would be larger than 1.497e49,6101,294
        // but more seriously: must be smaller than the base to work
        return (new Bigint()).setNaN();
    }
    if (n < 0) {
        // singularities at the negative integers, all the way down.
        return (new Bigint()).setInf();
    }
    ret = new Bigint();
    if (n < small_factorials.length) {
        ret.dp = small_factorials[n];
        ret.used = ret.dp.length;
        ret.clamp();
        return ret;
    }
    if (n < FACTORIAL_BORW_CUTOFF) {
        return bin_split(n);
    }
    return factorial_borwein(n);
};

/*
   Compute Euler numbers
   Algorithm is good but won't run sufficiently fast for
   values above about n = 500.
   Got E_1000 calulated in slightly over 2 minutes on
   an old 1GHz AMD-Duron. Not bad for such an old destrier.

   Brent, Richard P., and David Harvey. "Fast computation of Bernoulli, Tangent
   and Secant numbers." Computational and Analytical Mathematics. Springer New
   York, 2013. 127-142.

   Preprint: http://arxiv.org/abs/1108.0286
*/
function euler(N) {
    var n, e, k;
    var bheuler = function(limit) {
        var tmp;
        var j, k, N;
        var e;

        N = limit + 1;

        if (N < STATIC_EULER_ARRAY_SIZE) {
            //console.log("Cache hit:" + N);
            return MP_OKAY;
        }
        // calculate the first one hundred to fill the cache
        // because Euler numbers almost always come in hordes.
        if (STATIC_EULER_ARRAY_SIZE == 0 && N <
            STATIC_EULER_ARRAY_PREFILL) {
            N = STATIC_EULER_ARRAY_PREFILL;
        }
        /* For sake of simplicity */
        //euler_array = malloc(sizeof(mp_int)*N+2);
        STATIC_EULER_ARRAY = new Array(N + 2);
        STATIC_EULER_ARRAY[0] = new Bigint(1);
        for (k = 1; k <= N; k++) {
            STATIC_EULER_ARRAY[k] = STATIC_EULER_ARRAY[k - 1].mulInt(k);
        }
        STATIC_EULER_ARRAY[k] = new Bigint(0);

        for (k = 1; k < N; k++) {
            for (j = k + 1; j < N; j++) {
                /* euler_array[j] =  (j-k)*euler_array[j-1]  +   (j-k+1)*euler_array[j] */
                /* tmp  =  (j-k)*euler_array[j-1]  */
                tmp = STATIC_EULER_ARRAY[j - 1].mulInt(j - k);
                /* euler_array[j] =   (j-k+1)*euler_array[j] */
                STATIC_EULER_ARRAY[j] = STATIC_EULER_ARRAY[j].mulInt(j -
                    k + 1);

                /* euler_array[j] =   euler_array[j]  + tmp*/
                STATIC_EULER_ARRAY[j] = STATIC_EULER_ARRAY[j].add(tmp);
            }
        }
        for (k = 0; k < N; k++) {
            /* Even Euler numbers (if indexed by even n) are negative */
            if (k & 0x1) {
                STATIC_EULER_ARRAY[k].sign = MP_NEG;
            }
        }
        STATIC_EULER_ARRAY_SIZE = N;
        return MP_OKAY;
    };

    n = N;

    /* all odd Euler numbers are zero */
    if ((n & 0x1) && n != 1) {
        return new Bigint(0);
    }
    if ((e = bheuler(Math.floor(n / 2))) != MP_OKAY) {
        return e;
    }
    k = Math.floor(n / 2);
    return STATIC_EULER_ARRAY[k];
};


function comb(n, k) {
    var d;
    var q;
    if (n < k) return 0;
    if (n == k || k == 0) return 1;
    if (k > n / 2) {
        k = n - k;
    }
    d = n.gcd(k);
    q = Math.floor(k / d);
    return (Math.floor(comb(n - 1, k - 1) / q)) * Math.floor(n / d);
}

function bigcomb(n, k) {
    var i, c;
    var temp;
    var e;

    if (n < k) {
        return new Bigint(0);
    }
    if (n == k) {
        return new Bigint(1);
    }
    /* That's over-simplified, e.g. comb(99,6) = 1120529256 is still
       smaller than 2^32.
       An upper limit would be (the magic number is 1/sqrt(2*pi))

       ulim = (0.398942280401430*pow(n,(n+.5 ))*pow((n-k),(k-n-.5 ))
                                                      /pow(p,(k + 0.5 )));

       Stanica, Pantelimon. "Good lower and upper bounds on binomial
       coefficients." Journal of Inequalities in Pure and Applied
       Mathematics 2.3 (2001): 30.
     */

    if (n < 35) {
        temp = comb(n, k);
        return temp.toBigint();

    }
    c = new Bigint(1);
    if (k > Math.abs(n / 2)) {
        k = n - k;
    }
    for (i = 1; i <= k; i++) {
        e = n - k + i;
        temp = e.toBigint();
        c = c.mul(temp);
        temp = i.toBigint();
        c = c.div(temp);
    }
    return c;
}

function binomial(n, k) {
    /*  Idea shamelessly stolen from Calc.
         Hey, wait, I wrote that calc-script myself!
         Oh well, my age's starting to show, I'm afraid ;-)*/

    var prime_list;
    var pix = 0,
        prime, K, diff;
    var bst, c;
    var e;

    if (n < k) {
        return new Bigint(0);
    }
    if (n == k || k == 0) {
        return new Bigint(1);
    }
    if ((n - k) == 1 || k == 1) {
        return n.toBigint();
    }

    /* The function comb(n,k) is faster if k<<n (and v.v.), the exact cut-off
       has not been calculated yet but is quite large.*/
    if (k < Math.floor(n / 900) || (n - k) < Math.floor(n / 900)) {
        return bigcomb(n, k);
    }

    if (k > Math.floor(n / 2)) {
        k = n - k;
    }
    primesieve.fill(n);
    pix = primesieve.primePi(n);
    prime_list = new Array(pix);

    prime = 2;
    K = 0;
    do {
        diff = prime_divisors(n, prime) -
            (prime_divisors(n - k, prime) + prime_divisors(k, prime));
        if (diff != 0) {
            prime_list[K] = prime;
            prime_list[K + 1] = diff;
            K += 2;
        }
        prime = primesieve.nextPrime(prime + 1);
    } while (prime > 0 && prime <= k);
    do {
        diff = prime_divisors(n, prime) - prime_divisors(n - k, prime);
        if (diff != 0) {
            prime_list[K] = prime;
            prime_list[K + 1] = diff;
            K += 2;
        }
        prime = primesieve.nextPrime(prime + 1);
    } while (prime > 0 && prime <= n - k);
    // we might be done now (for {k, n-k} = {2,3}) 
    if(prime < 0){
        return compute_factored_factorial(prime_list,K -1,0);
    }
    do {
        prime_list[K] = prime;
        prime_list[K + 1] = prime_divisors(n, prime);
        prime = primesieve.nextPrime(prime + 1);
        K += 2;
    } while (prime > 0 && prime <= n);
    c = compute_factored_factorial(prime_list, K - 1, 0)
    return c;
}
// some more general functions to do arithmetic with factored integers
function factor_factorial(n, start) {
    var pix, prime, K, test_before, prime_list;
    var bst;
    var prime_divisors = function(n, p) {
        var q, m;
        q = n;
        m = 0;
        if (p > n) {
            return 0;
        }
        if (p > Math.floor(n / 2)) {
            return 1;
        }
        while (q >= p) {
            q = Math.floor(q / p);
            m += q;
        }
        return m;

    };
    /* To be able to handle negative values in subtraction and to be sure that
       n is positive*/
    if (!n.isInt()) {
        return MP_VAL;
    }

    primesieve.fill(n);

    if (start <= 2) {
        prime = 2;
    } else {
        if (!primesieve.isSmallPrime(start)) {
            start = primesive.nextPrime(start);
            //return MP_VAL;
        }
        prime = start;
    }
    if (prime > n) {
        return MP_VAL;
    }
    K = 0;
    pix = (primesieve.primePi(n) - primesieve.primePi(prime) + 1) * 2;

    prime_list = new Array(pix);
    do {
        prime_list[K] = prime;
        test_before = prime_divisors(n, prime);
        if (!test_before.isInt()) {
            return MP_VAL;
        }
        prime_list[K + 1] = test_before;
        prime = primesieve.nextPrime(prime + 1);
        K += 2;
    } while (prime > 0 && prime <= n);

    return prime_list;
}


var BN_MP_FACTORED_FACTORIAL_CUTOFF = 0x10000000;
/* Input is to be sorted as: prime,exponent,prime,exponent,... */
function compute_factored_factorial(f, f_length, stop) {
    var length, start, i, c;
    var shift = 0;
    var bit, k = 0,
        hb;
    var temp;
    var e;

    if (stop == 0) {
        length = f_length;
    } else {
        length = stop;
    }
    if (f[0] == 2 && f[1] > 0) {
        shift = f[1];
        if (length == 2) {
            c = new Bigint(1);
            c.lShiftInplace(f[1]);
            return c;
        }
    }
    start = 0;
    if (shift) {
        start += 2;
        k = 2;
    }
    bit = 0;
    for (; k < length; k += 2) {
        hb = f[k + 1].highBit();
        if (bit < hb) bit = hb;
    }
    /* just for safety reasons, y'know */
    if (bit > MP_DIGIT_MAX) {
        return MP_VAL;
    }
    c = new Bigint(1);

    if (f_length > BN_MP_FACTORED_FACTORIAL_CUTOFF) {
        for (; bit >= 0; bit--) {
            c = c.sqr();
            temp = new Bigint(1);
            for (i = start; i < length; i += 2) {
                if ((f[i + 1] & (1 << bit)) != 0) {
                    temp = temp.mulInt(f[i]);
                }
            }
            c = c.mul(temp);
        }
    } else {
        for (; bit >= 0; bit--) {
            c = c.sqr();

            for (i = start; i < length; i += 2) {
                if ((f[i + 1] & (1 << bit)) != 0) {
                    c = c.mulInt(f[i]);
                }
            }
        }
    }
    if (shift) {
        if (shift <= MP_DIGIT_MAX) {
            c.lShiftInplace(shift);
        } else {
            var multiplicator = 0;
            /*
               Dear future archeologist,
               does it make sense in your time?
            */
            while (shift >= MP_DIGIT_MAX) {
                shift >>= 1;
                multiplicator++;
            }
            c.lShiftInplace(shift);
            c.lShiftInplace(1 << multiplicator);
        }
    }
    return c;
}


function compute_signed_factored_factorials(f, f_length, do_division) {
    var start = 0,
        i, count = 0,
        neg_count = 0,
        k = 0,
        c, r, last_div;
    var shift = 0;
    var bit = 0,
        neg_bit = 0,
        hb = 0,
        neg_hb = 0,
        p;
    var temp;
    var e;

    if (arguments.length == 3) {
        last_div = do_division;
    } else {
        last_div = false;
    }

    if (f[0] == 2 && f[1] > 0) {
        shift = f[1];
        if (f_length == 2) {
            c = new Bigint(1);
            c.lShiftInplace(f[1]);
            return c;
        }
    }
    if (shift) {
        start += 2;
        k = 2;
    }
    /* 
      One simple thing to handle negative exponents is to keep them in a second
      array with absolute values of the exponents and divide at the end.
      Another alternative might be to return both arrays and let the user decide.
      No matter which way, we have to check and if there is at least one, divide.

      This is expensive and should be done inline instead but for now...
     */
    for (k = start; k < f_length; k += 2) {
        if (f[k + 1] < 0) {
            /* count how many to save some memory */
            count++;
        }
        /* Only primes up to 2^DIGIT_BIT because of mp_mul_d() */
        if (f[k] >= MP_DIGIT_MAX) {
            return MP_VAL;
        }
    }
    /* all are negative */
    //if(count && count == f_length/2){
    /* if the alternative with two outputs has been chosen just skip the
       computation of the polynomial with all positive exponents and set
       that return to 1 (one)
     */
    /* goto: negative_exponents; */

    /* The other alternative would compute 1/x that gives always 0 in integer
       divisions if x>1. But it would need exactly one exponent with zero which
       has been filtered out already. It is debatable now if that was a good
       decision.*/
    //return MP_OKAY;
    //}
    if (count) {
        p = new Array((count * 2) + 1);
    }

    for (k = start; k < f_length; k += 2) {
        /* won't branch if count == 0 */
        if (f[k + 1] < 0) {
            p[neg_count] = f[k];
            p[neg_count + 1] = abs(f[k + 1]);
            neg_count += 2;
            /* And while we are already here ... */
            neg_hb = Math.abs(f[k + 1]).highBit();
            if (neg_bit < neg_hb) neg_bit = neg_hb;
            /* This allows for some optimization, mainly w.r.t memory. Not done yet */
            f[k] = 1;
            /* Set to zero to let the main loop skip it */
            f[k + 1] = 0;
        } else {
            hb = f[k + 1].highBit();
            if (bit < hb) bit = hb;
        }
    }

    /* DIGIT_BIT can be as small as 8 */
    if (bit > MP_DIGIT_BIT || neg_bit > MP_DIGIT_BIT) {
        return MP_VAL;
    }
    /* Anything times zero is zero, so set the result to one in advance */
    c = new Bigint(1);

    /* Everything is in place, so let's start by computing with the positive
       exponents first */

    /* The other function mp_compute_factored_factorials() has a branch
       but the cases where it makes sense are quite rare. Feel free to add it
       yourself */
    for (; bit >= 0; bit--) {
        c = c.sqr();
        for (i = start; i < f_length; i += 2) {
            if ((f[i + 1] & (1 << bit)) != 0) {
                /* This is problematic if DIGIT_BIT is too small. checked above */
                c = c.mulInt(f[i]);
            }
        }
    }

    /* Compute c * 2^n if n!=0 */
    if (shift && shift > 0) {
        if (shift < MP_DIGIT_MAX) {
            c.lShiftInplace(shift);

        } else {
            return MP_VAL;
        }
    }

    /* None are negative*/
    if (count == 0) {
        /* Clean up */
        /* Nothing to clean up */
        return c;
    }

    /* Calculate with the negative eponents */
    temp = new Bigint(1);
    for (; neg_bit >= 0; neg_bit--) {
        temp = temp.sqr();
        /* The exponents of 2 have been stripped already so we start at zero.
           "count" counts only the occurences, the size itself is twice as large.
         */
        for (i = 0; i < count * 2; i += 2) {
            if ((p[i + 1] & (1 << neg_bit)) != 0) {
                temp = temp.mulInt(p[i]);
            }
        }
    }
    /* Compute c * 2^n if n!=0  for negative n*/
    if (shift && shift < 0) {
        /* check for overflow */
        if (shift <= -MP_DIGIT_MAX) {
            return MP_VAL;
        }
        shift = -shift;
        temp.lShiftInplace(shift);
    }

    if (last_div == true) {
        return c.divrem(temp);
    } else {
        return [c, temp];
    }
}

// reciprocal of a factorial
function negate_factored_factorials(input, l_input){
  var k, counter=0;
  var neg;
  var output,l_output

  output = new Array(l_input+1);

  for(k=0;k<l_input;k+=2){
    neg = input[k+1];
    if(Math.abs(neg) >= MP_DIGIT_MAX){
      return MP_VAL;
    }
    output[counter]   = input[k];
    output[counter+1] = -neg;
    counter += 2;
  }
  l_output = counter;
  return [output,l_output];
}

// multiply two factorials
function add_factored_factorials( summand_1,l_summand_1,
                                 summand_2,g l_summand_2){
  var k, counter=0,sum, l_sum;
  var max_length = Math.max(l_summand_1,l_summand_2);
  var min_length = Math.min(l_summand_1,l_summand_2);
  var s,p, s_1,s_2;
  /* For a more detailed comments see subtract_factored_factorials() */
  sum = new Array(max_length+1);

  for(k=0;k<min_length;k+=2){
    p = summand_1[k];
    /*s = summand_1[k+1] + summand_2[k+1];*/
    s_1 = summand_1[k+1];
    s_2 = summand_2[k+1];
    s = s_1 + s_2;
    sum[counter]   = p;
    sum[counter+1] = s;
    counter += 2;
  }
  if(l_summand_1 >= l_summand_2){
    for(;k<max_length;k+=2){
      p = summand_1[k];
      s = summand_1[k+1];
      sum[counter]   = p;
      sum[counter+1] = s;
      counter += 2;
    } 
  }
  else{
    for(;k<max_length;k+=2){
      p = summand_2[k];
      s = summand_2[k+1];
      sum[counter]   = p;
      sum[counter+1] = s;
      counter += 2;
    } 
  }
  l_sum = counter;
  return [sum, l_sum];
}



// divide two factorials (binom. etc.)
console.log(subtrahend.join(","))
  /* Loop over smaller chunk first */
  for(k=0;k<min_length;k+=2){
    /* both have same length, we can take the value of the prime from any */
    p = subtrahend[k];
    /*d = subtrahend[k+1] - minuend[k+1];*/
    d_1 = subtrahend[k+1];
    d_2 = minuend[k+1];
    d = d_1 - d_2;
    difference[counter]   = p;
    difference[counter+1] = d;
    counter += 2;
  }

  /* We need to find out which one is the smaller array and we have basically
     two ways to approach the problem:
       a) complicated and error-prone pointer juggling
       b) just two loops
     Here I have chosen b.
  */
  /* If both arrays have the same length we can just stop here */
  if(max_length == min_length){
    /* We made nothing dirty, so there's nothing to clean up here, let's just
       grab our stuff and run */
    l_difference = counter;
    return [difference, l_difference];
  }

  /* If the subtrahend is bigger we subtract zeros, so simply copy */
  if(l_subtrahend >= l_minuend ){
    for(k=min_length;k<max_length;k+=2){
      p = subtrahend[k];
      d = subtrahend[k+1];
      difference[counter]   = p;
      difference[counter+1] = d;
      counter += 2;
    }    
  }
  /* If the minuend is bigger we subtract from zeros, so negate before copy*/
  else{
    for(k=min_length;k<max_length;k+=2){
      p = minuend[k];
      d_1 = minuend[k+1];
      d = -d_1;
      difference[counter]   = p;
      difference[counter+1] = d;
      counter += 2;
    } 
  }
  l_difference = counter;
  return [difference, l_difference]; 
}

// exponentiate a factorial by an integer 
function power_factored_factorials(  input,
                                    l_input,
                                  multiplicator){

  var k, counter=0;

  var prod,p, p_1,p_2, product, l_product;
  var temp;

  product = new Array(l_input+1);

  p_2 = multiplicator;
  for(k=0;k<l_input;k+=2){
    p = input[k];
    /* Over/underflow possible! */
    /*prod = input[k+1] * multiplicator;*/
    p_1 = input[k+1];
    temp = p * p_1;
    prod = temp;
    product[counter]   = p;
    product[counter+1] = prod;
    counter += 2;
  }

  l_product = counter;
  return [product,counter];
}
// computes catalan(10000) in about 2,5 seconds on my good ol' 1GHz Duron
// a 6015 decimal digits long number.
function catalan(n) {
    var temp, c;
    if (n == 0 || n == 1) {
        return new Bigint(1);
    }
    /*  C(2^31) is already a very large number
        C(2^31) ~ 1.7593e1,292,913,972
        The number of digits follow loosely the size of n here, e.g.
        C(2^32)  ~ 1.9303e2,585,827,958
        C(2^64)  ~ 2.5891e11,106,046,577,046,714,235
        C(2^128) ~ 1.2728e204,870,398,877,478,727,500,024,218,500,206,465,342
     */
    if (n >= MP_INT_MAX) {
        return MP_VAL;
    }
    c = binomial(2 * n, n);
    temp = (n + 1).toBigint();
    c = c.div(temp);
    return c;
}
// timing is about the same as for the factorial
function doublefactorial(n) {
    var prime_list, c;
    var pix = 0,
        prime, K, diff;
    var temp;

    /* it is df(2n + 1) = (2*n)!/(n!*2^n) for odd n */
    if (n >= MP_INT_MAX >>> 1) {
        return MP_VAL;
    }
    // TODO: make a larger table out of it
    switch (n) {
        case -1:
        case 0:
            return new Bigint(1);
            break;
        case 2:
            return new Bigint(2);
            break;
        case 3:
            return new Bigint(3);
            break;
        case 4:
            return new Bigint(8);
            break;
        case 5:
            return new Bigint(15);
            break;
        case 6:
            return new Bigint(48);
            break;
            /* smallest DIGIT_BIT is 8 */
        case 7:
            return new Bigint(105);
            break;
        default:
            break;
    }

    if (n & 0x1) {
        n = (n + 1) / 2;
        primesieve.fill(2 * n + 1);

        pix = primesieve.primePi(2 * n + 1);

        prime_list = new Array(pix * 2);

        prime = 3;
        K = 0;
        do {
            diff = prime_divisors(2 * n, prime) - prime_divisors(n, prime);
            if (diff != 0) {
                prime_list[K] = prime;
                prime_list[K + 1] = diff;
                K += 2;
            }
            prime = primesieve.nextPrime(prime + 1);
        } while (prime > 0 && prime <= n);
        do {
            prime_list[K] = prime;
            prime_list[K + 1] = prime_divisors(2 * n, prime);
            K += 2;
            prime = primesieve.nextPrime(prime + 1);
        } while (prime > 0 && prime <= 2 * n);
        c = compute_factored_factorial(prime_list, K - 1, 0);
        return c;
    } else {
        /* Even n */
        n >>>= 1;
        c = factorial(n);
        c.lShiftInplace(n);
        return c;
    }
}
function fallingfactorial(n, k) {
    var prime_list, c;
    var pix = 0,
        prime, K, diff;

    if (n < k) {
        return new Bigint(0);
    }
    if (k == 0) {
        return new Bigint(1);
    }
    if (k == 1) {
        return n.toBigint();
    }
    if (k == n) {
        return factorial(n);
    }
    primesieve.fill(n);

    /* One could also count the number of primes in the already filled sieve */
    pix = primesieve.primePi(n);

    prime_list = new Array(pix * 2);
    prime = 2;
    K = 0;
    do {
        diff = prime_divisors(n, prime) - prime_divisors(n - k, prime);
        if (diff != 0) {
            prime_list[K] = prime;
            prime_list[K + 1] = diff;
            K += 2;
        }
        prime = primesieve.nextPrime(prime + 1);
    } while (prime > 0 && prime <= n - k);
    do {
        prime_list[K] = prime;
        prime_list[K + 1] = prime_divisors(n, prime);
        prime = primesieve.nextPrime(prime + 1);
        K += 2;
    } while (prime > 0 && prime <= n);

    c = compute_factored_factorial(prime_list, K - 1, 0);
    return c;
}

function risingfactorial(n, k) {
    var c, num, den, quot;
    num = factor_factorial(n + k - 1, 1);
    den = factor_factorial(n - 1, 1);
    quot = subtract_factored_factorials(num, num.length, den, den.length);
    c = compute_signed_factored_factorials(quot[0], quot[1], true);
    return c;
}

function subfactorial(n) {
    var k, temp1, temp2, ret;
    if (!n.isInt()) return MP_VAL;
    if (n < 0) {
        return MP_VAL;
    }
    if (n == 0) {
        return new Bigint(1);
    }
    if (n == 1) {
        return new Bigint(0);
    }
    if (n == 2) {
        return new Bigint(1);
    }
    temp1 = new Bigint(0);
    ret = new Bigint(1);
    for (k = 3; k <= n; k++) {
        temp2 = temp1;
        temp1 = ret;
        ret = temp1.add(temp2).mulInt(k - 1);
    }
    return ret;
}

var STATIC_STIRLING1_CACHE;
var STATIC_STIRLING1_CACHE_N = -1;
var STATIC_STIRLING1_CACHE_M = -1;

function stirling1(n, m) {
    var i, j, k;
    if (n < 0) return MP_VAL;
    if (m < 0) return MP_VAL;
    if (n < m) return 0;
    if (n == m) return 1;
    if (m == 0 || n == 0) return 0;
    if (STATIC_STIRLING1_CACHE_N >= n && STATIC_STIRLING1_CACHE_M >= m) {
        return STATIC_STIRLING1_CACHE[n][m];
    } else {
        STATIC_STIRLING1_CACHE = new Array(n + 1);
        for (i = 0; i < n + 1; i++) {
            STATIC_STIRLING1_CACHE[i] = new Array(m + 1);
            for (j = 0; j < m + 1; j++) {
                STATIC_STIRLING1_CACHE[i][j]= new Bigint(0);
            }
        }
        STATIC_STIRLING1_CACHE[0][0] = new Bigint(1);
        for (i = 1; i <= n; i++) {
            for (j = 1; j <= m; j++) {
                if (j <= i) {
                    STATIC_STIRLING1_CACHE[i][j] =
                        STATIC_STIRLING1_CACHE[i - 1][j - 1]
                    .sub(STATIC_STIRLING1_CACHE[i - 1][j].mulInt(i - 1));
                }
            }
        }
        STATIC_STIRLING1_CACHE_N = n;
        STATIC_STIRLING1_CACHE_M = m;

        return STATIC_STIRLING1_CACHE[n][m];
    }
}

function free stirling1cache(){
    var i,j,l1,l2;
    l1 = STATIC_STIRLING1_CACHE.length;
    l2 = STATIC_STIRLING1_CACHE[0].length;
    for(i = 0; i< l1; i++){
        for(j = 0; j< l2; j++){
            STATIC_STIRLING1_CACHE[i][j].free();
            STATIC_STIRLING1_CACHE[i][j] = null;
        }
    }
    STATIC_STIRLING1_CACHE = null;
    STATIC_STIRLING1_CACHE_N = -1;
    STATIC_STIRLING1_CACHE_M = -1;
}

function stirling2(n, m) {
    var k, sum, t1, t2, sign;
    if (n < 0) return MP_VAL;
    if (m < 0) return MP_VAL;
    if (n < m) return new Bigint(0);
    if (n == 0 && n != m) return new Bigint(0);
    if (n == m) return new Bigint(1);
    if (m == 0) return new Bigint(0);
    if (m == 1) return new Bigint(1);
    if (m == 2) {
        // 2^(n-1)-1
        k = new Bigint(1);
        k.lShiftInplace(n - 1);
        k.decr();
        return k;
    }
    /*
      There are different methods to speed up alternating sums.
      This one does not use any of them.
     */
    sum = new Bigint(0);
    for (k = 0; k <= m; k++) {
        //sum += (-1)^(m-k)*binomial(m,k)*k^n;
        sign = ((m - k).isEven()) ? MP_ZPOS : MP_NEG;
        t1 = k.bigpow(n);
        t1.sign = sign;
        t2 = binomial(m, k);
        t1 = t1.mul(t2);
        sum = sum.add(t1);
    }
    return sum.div(factorial(m))
}

var STATIC_STIRLING2_CACHE;
var STATIC_STIRLING2_CACHE_N = -1;
var STATIC_STIRLING2_CACHE_M = -1;

function stirling2caching(n, m) {
    var nm, i, j;
    if (n < 0) return MP_VAL;
    if (m < 0) return MP_VAL;
    /* no shortcuts here */

    if (n < m) return new Bigint(0);
    if (n == 0 && n != m) return new Bigint(0);
    if (n == m) return new Bigint(1);
    if (m == 0) return new Bigint(0);
    if (m == 1) return new Bigint(1);
    if (m == 2) {
        // 2^(n-1)-1
        k = new Bigint(1);
        k.lShiftInplace(n - 1);
        k.decr();
        return k;
    }
    nm = n - m;

    if (STATIC_STIRLING2_CACHE_N >= n && STATIC_STIRLING2_CACHE_M >= m) {
        return STATIC_STIRLING2_CACHE[n][m];
    } else {
        STATIC_STIRLING2_CACHE = new Array(n + 1);
        for (i = 0; i < n + 1; i++) {
            STATIC_STIRLING2_CACHE[i] = new Array(m + 1);
            for (j = 0; j < m + 1; j++) {
                STATIC_STIRLING2_CACHE[i][j] = new Bigint(0);
            }
        }
        STATIC_STIRLING2_CACHE[0][0] = new Bigint(1);

        for (i = 1; i <= n; i++) {
            for (j = 1; j <= m; j++) {
                if (j <= i) {
                    STATIC_STIRLING2_CACHE[i][j] =
                        STATIC_STIRLING2_CACHE[i - 1][j - 1]
                        .add(STATIC_STIRLING2_CACHE[i - 1][j].mulInt(j));

                }
            }
        }
    }
    STATIC_STIRLING2_CACHE_N = n;
    STATIC_STIRLING2_CACHE_M = m;

    return STATIC_STIRLING2_CACHE[n][m];
}

function free stirling2cache(){
    var i,j,l1,l2;
    l1 = STATIC_STIRLING2_CACHE.length;
    l2 = STATIC_STIRLING2_CACHE[0].length;
    for(i = 0; i< l1; i++){
        for(j = 0; j< l2; j++){
            STATIC_STIRLING2_CACHE[i][j].free();
            STATIC_STIRLING2_CACHE[i][j] = null;
        }
    }
    STATIC_STIRLING2_CACHE = null;
    STATIC_STIRLING2_CACHE_N = -1;
    STATIC_STIRLING2_CACHE_M = -1;
}
