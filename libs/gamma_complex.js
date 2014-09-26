/*
  Depends on a whole bunch of functions. numbers.js,   gamma_real.js and
  kroneckerdelta.js at least.
*/

if(typeof Little === 'undefined'){
  Little = {};
}

Little.bernoullitable /*[30]*/ = [
  1, 
  1/6,
 -1/30,
  1/42,
 -1/30,
  5/66,
 -691/2730,
  7/6,
 -3617/510,
  43867/798,
 -174611/330,
  854513/138,
 -236364091/2730,
  8553103/6,
 -23749461029/870,
  8615841276005/14322,
 -7709321041217/510,
  2577687858367/6,
  -26315271553053477373/1919190,
  2929993913841559/6,
 -261082718496449122051/13530,
  1520097643918070802691/1806,
 -27833269579301024235023/690,
  596451111593912163277961/282,
 -5609403368997817686249127547/46410,
  495057205241079648212477525/66,
 -801165718135489957347924991853/1590,
  29149963634884862421418123812691/798,
 -2479392929313226753685415739663229/870,
  84483613348880041862046775994036021/354,  -1215233140483755572040304994079820246041491/56786730
];

Little.lngamma_stirling = (function(){
  var precomp = [
	  new Complex( 1/12,0),
	  new Complex(-1/360,0),
	  new Complex( 1/1260,0),
	  new Complex(-1/1680,0),
	  new Complex( 1/1188,0),
	  new Complex(-691/360360,0),
	  new Complex( 1/156,0),
	  new Complex(-3617/122400,0),
	  new Complex( 43867/244188,0),
	  new Complex(-174611/125400,0),
	  new Complex( 77683/5796,0),
	  new Complex(-236364091/1506960,0),
	  new Complex( 657931/300,0),
	  new Complex(-3392780147/93960,0),
	  new Complex( 1723168255201/2492028,0),
	  new Complex(-7709321041217/505920,0),
          new Complex( 151628697551/396,0),
          new Complex(-26315271553053477373/2418179400,0),
          new Complex( 154210205991661/444,0),
          new Complex(-261082718496449122051/21106800,0),
          new Complex( 1520097643918070802691/3109932,0),
          new Complex(-2530297234481911294093/118680,0),
          new Complex( 25932657025822267968607/25380,0),
          new Complex(-5609403368997817686249127547/104700960,0),
          new Complex( 19802288209643185928499101/6468)
  ];
  return {
    lnstirling : function(z,n){
      var head, z2,  zz;
      var PI   = new Complex(Math.PI,0);
      var half = new Complex(1/2,0);
      var sum = new Complex();
      head = (z.sub(half) ).mul( z.log() ).sub(z).add( PI.add(PI).log().div(2) );
      sum = 0;
      zz = z.dup();
      z2 = z.mul(z);;
      for (var k = 0; k < n; k++) {
        sum = sum.add(precomp[k].div(zz));
        zz = zz.mul(z2);
      }
      return head.add(sum);
    },
    R : function(z,k){
      var a, b, ab, stirlingterm;
      var bernoulli = new Complex(Little.bernoullitable[k],0);
      var factor = new Complex(2 * k * (2 * k - 1),0);
      stirlingterm = bernoulli.div( z.pow(2 * k).mul(factor) );
      a = stirlingterm.abs();
      b = Math.cos(.5 * Math.pow(z.arg(), 2 * k) );
      ab = a / b;
      /* a/b might round to zero */
      if (Math.abs(ab) < Math.EPSILON) {
          return (Math.ONEEPSILON).digits();
      }
      return (1 / (a / b)).digits();
    }
  }
})();

function lngamma(z){
  var flag, eps = Math.EPSILON,decimal_digits,d37,d52,term_count,Z;
  var increasedby,tmp,tmp2,corr,ret; var LIMIT = 10;
  var PI = new Complex(Math.PI,0);
  /* Real line */
  if(z.Imag() == 0){
    /* integers */
    if( z.Real().abs().isInteger()){
      /* singularities (poles) */
      if(z <= 0){
        return Infinity;
      }
      if(z.Real()<18){
        small_factorial = [
          1,  1,  2,  6,  24,  120,  720,  5040,  40320,  362880,  3628800,
          39916800,  479001600,  6227020800,  87178291200,  1307674368000,
          20922789888000, 355687428096000
        ];
        return Math.log(small_factorial[z.Real() - 1]);
      } else if(z.Real()<Math.MAXFACTORIAL){
        return Math.log(Math.factorial(z.Real() -1));
      }
      else{
        /* We have a log(gamma) for arguments from the real line, have we not? */
        return lgamma(z);
      }
    } else { /* R\Z */
      /* negative real line */
      if(z.Real() < 0 ){ 
        /* reflection done with the gamma function for real arguments */
        ret = Math.log(Math.PI / Math.sin( Math.PI * z.re())) - lgamma(1 - z.Real())
        /* it is log(gamma) and im(log(even(-x))) = k\pi, therefore and from
           above, too: */
        if (z.abs() <= 1 / 2) {
          ret = ret.Real().sub(PI);
        } else if ( z.Real().abs().floor().isOdd() ) {
          ret = ret.Real().add( z.abs().ceil().mul(PI) );
        } else if ( z.Real().abs().floor().isEven() ) {
          /* < n+1/2 */
          if ( z.abs().floor().isEven() ) {
            ret = ret.Real().add(Math.ceil(z.abs() - 1 / 2 - 1).mul(PI));
          } else {
            ret = ret.Real().add(Math.ceil(z.abs() - 1 / 2 ).mul(PI));
          }
        }
        return ret;
      }
      /* positive real line */
      else {
        return lgamma(z);
      }
    } /* R\Z */

  } else { /* C\R*/
      flag = 0;
      /* Make it a positive im(z) */
      if (z.Imag() < 0) {
        z = z.conj();
        flag = 1;
      }
      /* Evaluate the number of terms needed */
      decimal_digits = 15; /* fixed here, only used for multiple precision */
      d37 = decimal_digits * .37;
      d52 = decimal_digits * .52;
      term_count = Math.ceil(d52);
      if (z.abs() >= d52  && z.Imag().abs() >= d37) {
        term_count = Math.ceil(d37);
      } 
      Z = z.dup();
      increasedby = 0;
      if(z.Real() < 0){
        var ONE = new Complex(1,0);
        if (z.Imag().abs() >= d37) {
          while ((ONE.sub(z)).abs() < d52 + 1 ) {
            z = z.decr();
            increasedby++;
          }
        } else {
          tmp = Little.lngamma_stirling.R(ONE.sub(z), term_count);
          tmp2 = tmp
          while (tmp2 < decimal_digits ) {
            z = z.decr();
            increasedby++;
            tmp2 = Little.lngamma_stirling.R(ONE.sub(z), term_count);
            if (tmp2 < tmp) {
              return new Error("lngamma(1): something happend that " +
                                                       "should not have happend");
            }
          }
        }
        corr = Math.ceil(z.Real() / 2 - 3 / 4 - Math.kroneckerdelta(z.Imag()) / 4);
        /* reflection */
        ret =  PI.div( ( PI.mul(z) ).sin()  ).log()
                .sub( Little.lngamma_stirling.lnstirling(ONE.sub(z),term_count) );
        /* deflate z */
        if (increasedby > 0) {
          for (k = 0; k < increasedby; k++) {
            ret = ret.add( (Z.add(k)).log() );
          }
        }
        /* Apply correction term */
        ret = ret.add( (2).mul( corr.mul(PI) ) );    
      } else { /* re(z) > 0 */

        if (z.Imag().abs() >= d37) {
          while (z.abs() < d52 + 1) {
            z = z.incr();
            increasedby++;
          }
        } else {
          tmp = Little.lngamma_stirling.R(z, term_count);
          tmp2 = tmp; var LIMIT = 10
          while (tmp2 < decimal_digits && LIMIT--) {
            z = z.incr();
            increasedby++;
            tmp2 = Little.lngamma_stirling.R(z, term_count);
            if (tmp2 < tmp) {
              return new Error("lngamma(1): something happend that " +
                                                       "should not have happend");
            }
          }
        }
        ret = Little.lngamma_stirling.lnstirling(z, term_count);
        /* deflate z */
        if (increasedby > 0) {
          for (k = 0; k < increasedby; k++) {
            ret = ret.sub( (Z.add(k)).log() );
          }
        }
     }
      /* Undo conjugate if one has been applied */
      if (flag == 1) {
        ret = ret.conj();
      }
      return ret;
  }/* C\R */
  return Number.NaN;
} /* function lngamma(z) */













