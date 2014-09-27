Math.EPSILON = (function (){
  var tmp1    = 1.0;
  var tmp2    = 0.0;
  var EPSILON = 0.0;
  do{
    EPSILON = tmp1;
    tmp1  /= 2;
    tmp2   = 1.0 + tmp1;
  }while (tmp2 > 1.0);
  return EPSILON;
})();

Math.ONEEPSILON = 1/Math.EPSILON;
if(typeof Little === 'undefined'){
  Little = {};
}

Number.prototype.digits = function(){
  if(this == 0)return 1;
  return Math.floor(
          Math.log(Math.abs(this))
         *Math.LOG10E)+1;
};

Number.prototype.isInfinity = function(){
  return (this == Number.NEGATIVE_INFINITY ||
          this == Number.POSITIVE_INFINITY )?true:false;
};

Number.prototype.isOk = function(){
  return ((!isNaN(this) && isFinite(this)))?true:false;
};
/* Should exist as a native function in FF32 now, please check */
Number.prototype.isInteger = function(){
  if(!this.isOk()){
    return false;
  }
  else{
    if(   this > -9007199254740992 
       && this <  9007199254740992 
       && Math.floor(this) == this )
      return true;
  }
  return false;
};
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
Little.lngamma_stirling_real = (function(){
  var precomp /* [25] */ = [
	   1/12,
	  -1/360,
	   1/1260,
	  -1/1680,
	   1/1188,
	  -691/360360,
	   1/156,
	  -3617/122400,
	   43867/244188,
	  -174611/125400,
	   77683/5796,
	  -236364091/1506960,
	   657931/300,
	  -3392780147/93960,
	   1723168255201/2492028,
	  -7709321041217/505920,
           151628697551/396,
          -26315271553053477373/2418179400,
           154210205991661/444,
          -261082718496449122051/21106800,
           1520097643918070802691/3109932,
          -2530297234481911294093/118680,
           25932657025822267968607/25380,
          -5609403368997817686249127547/104700960,
           19802288209643185928499101/6468
  ];
  return {
    lnstirling : function(z,n){
      var head, z2,  zz;
      var PI   = Math.PI;
      var half = 1/2;
      var sum = 0;
      head = (z - half) * Math.log(z) - z + (Math.log(2 * PI) / 2);
      sum = 0;
      zz = z;
      z2 = z*z;
      for (var k = 0; k < n; k++) {
        sum += precomp[k] / zz;
        zz *= z2;
      }
      return head + sum;
    },
    R : function(z,k){
      var a, b, ab, stirlingterm;
      var bernoulli = Little.bernoullitable[k];
      var factor = 2 * k * (2 * k - 1);
      stirlingterm = bernoulli / ( Math.pow(z,2 * k) * factor );
      a = Math.abs(stirlingterm);
      b = Math.cos(.5 * Math.pow(z, 2 * k) );
      ab = a / b;
      /* a/b might round to zero */
      if (Math.abs(ab) < Math.EPSILON) {
          return (Math.ONEEPSILON).digits();
      }
      return (1 / (a / b)).digits();
    }
  }
})();



function loggamma_real(z){
  var decimal_digits, term_count,increasedby,tmp,tmp2,Z ;

  decimal_digits = 16; /* fixed here, make use for multiple precision */
  d37 = decimal_digits * .37;
  d52 = decimal_digits * .52;
  term_count = Math.ceil(d52);
  Z = z;
  increasedby = 0;
  if(z < 0){
    if(z === 0 || z.isInteger()) return Infinity;
    tmp = Little.lngamma_stirling_real.R(1-z, term_count);
    tmp2 = tmp;
    while (tmp2 < decimal_digits ) {
      z--;
      increasedby++;
      tmp2 = Little.lngamma_stirling_real.R(1-z, term_count);
      if (tmp2 < tmp) {
        return new Error("lngamma(1): something happend that " +
                                                     "should not have happend");
      }
    }
    /* reflection */
    ret =   Math.log(Math.abs(Math.PI / Math.sin(Math.PI * z))) -
                 Little.lngamma_stirling_real.lnstirling(1-z,term_count);
    /* deflate z */
    if (increasedby > 0) {
      for (k = 0; k < increasedby; k++) {
        ret += Math.log(-z - k);
      }
    }
    return ret;
  } else {
    tmp = Little.lngamma_stirling_real.R(z, term_count);
    tmp2 = tmp;
    while (tmp2 < decimal_digits ) {
      z++;
      increasedby++;
      tmp2 = Little.lngamma_stirling_real.R(z, term_count);
      if (tmp2 < tmp) {
        return new Error("lngamma(1): something happend that " +
                                                    "should not have happend");
      }
    } 
    ret = Little.lngamma_stirling_real.lnstirling(z,term_count);
    if (increasedby > 0) {
      for (k = 0; k < increasedby; k++) {
        ret -= Math.log(Z + k);
      }
    }
    return ret;
  }
  /* Hic sunt dracones! */
}










