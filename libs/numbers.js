/*
  Functions for both numbers and complex numbers. If something is amiss that
  shouldn't be amiss it should be considered a bug (I probably just forgot to
  copy it into this file)

  May depend on some other files especially array_misc.js and math_misc.js

*/
if(typeof Little === 'undefined'){
    Little = {};
}

Number.LLONG_MAX =  9007199254740992; // 2^53
Number.INT_MAX   =  9007199254740992; // 2^53
Number.INT_MIN   = -9007199254740992; // -(2^53)
Number.BINT_MAX  =  0x7fffffff;       // data type for bool algebra

Little.PI   = Math.PI;
Little.PI_2 = Math.PI_2;
/* one ulp from +1 */
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

/* 1 ulp from zero */
Number.EPS = 9.3E-16;

/***************************** Reals *****************************************/



Number.prototype.dup = function(){
  var ret = this;
  return ret;
  //return (new Number(this));
};

Number.prototype.add = function(i){
  if(typeof i  === "number")
    return this + i;
  else if( i instanceof Complex)
    return this.toComplex().add(i);
  else return this + i;
};


Number.prototype.sub = function(i){
  if(typeof i  === "number")
    return this - i;
  else if( i instanceof Complex)
    return this.toComplex().sub(i);
  else return this - i;
};

Number.prototype.mul = function(i){
  if(typeof i  === "number")
    return this * i;
  else if( i instanceof Complex)
    return this.toComplex().mul(i);
  else return this * i;
};

Number.prototype.div = function(i){
  if(typeof i  === "number")
    return this / i;
  else if( i instanceof Complex)
    return this.toComplex().div(i);
  else return this / i;
};

Number.prototype.mod = function(i){
  if(typeof i  === "number")
    return this % i;
  else if( i instanceof Complex)
    return this.toComplex().mod(i);
  else return this % i;
};

Number.prototype.fmod = function(i){
  if(typeof i  === "number")
    return this % i;
  else if( i instanceof Complex)
    return this.toComplex().fmod(i);
  else return this % i;
};

Number.prototype.abs = function(){
  return Math.abs(this);
};

Number.prototype.conj = function(){
  return this;
};

Number.prototype.inv = function(){
  return 1/this;
};

Number.prototype.minus = function(){
  return -this;
};
Number.prototype.neg = function(){
  return -this;
};

Number.prototype.sqrt = function(){
  if(this >= 0)
    return Math.sqrt(this);
  else
    return this.toComplex().sqrt();
};

Number.prototype.log = function(){
  return Math.log(this);
};

Number.prototype.exp = function(){
    return Math.exp(this);
};

Number.prototype.pow = function(i){
  if(typeof i  === "number")
    return Math.pow(this,i);
  else if( i instanceof Complex)
    return this.toComplex().pow(i);
  else return Math.pow(this,i) ;
};


Number.prototype.sin = function(){
  return Math.sin(this);
};

Number.prototype.sinh = function(){
  return Math.sinh(this);
};

Number.prototype.cos = function(){
  return Math.cos(this);
};

Number.prototype.cosh = function(){
  return Math.cosh(this);
};

Number.prototype.tan = function(){
  return Math.tan(this);
};

Number.prototype.tanh = function(){
  return Math.tanh(this);
};

Number.prototype.asin = function(){
  return Math.asin(this);
};

Number.prototype.acos = function(){
  return Math.acos(this);
};

Number.prototype.atan = function(){
  return Math.atan(this);
};

Number.prototype.atan2 = function(b){
  if(typeof b  == 'number')
    return Math.atan2(this,b);
  else{
    return this.atan2general(b);
  }
};

Number.prototype.atan2general = function(x){
    var y = this;
    if(x.gt(0)){return (y.div(x)).atan();}
    if(x.lt(0)){
      if(y.ge(0)){return (y.div(x)).atan().add(Little.PI);}
      if(y.lt(0)){return (y.div(x)).atan().add(Little.PI);}
    }
    if(x.isZero()){
      if(y.gt(0)){return  Little.PI.div(2);}
      if(y.lt(0)){return  Little.PI.neg().div(2);}
      if(y.isZero()){return 0}
    }
    return undefined;  
};

Number.prototype.cot = function(){
  return Math.cot(this);
};

Number.prototype.coth = function(){
  return Math.coth(this);
};

Number.prototype.sec = function(){
  return Math.sec(this);
};

Number.prototype.sech = function(){
  return Math.sech(this);
};

Number.prototype.csc = function(){
  return Math.csc(this);
};

Number.prototype.asinh = function(){
  return Math.asinh(this);
};

Number.prototype.acosh = function(){
  return Math.acosh(this);
};

Number.prototype.atanh = function(){
  return Math.atanh(this);
};

Number.prototype.acsc = function(){
  return Math.acsc(this);
};

Number.prototype.acsch = function(){
  return Math.acsch(this);
};

Number.prototype.asec = function(){
  return Math.asec(this);
};

Number.prototype.asech = function(){
  return Math.asech(this);
};

Number.prototype.acot = function(){
  return Math.acot(this);
};

Number.prototype.acoth = function(){
  return Math.acoth(this);
};

Number.prototype.arg = function(){
  if(this == 0.0) return Number.NaN;
  if(this < 0.0) return Math.PI;
  return 0.0;
};


Number.prototype.gcd = function(i){
  if(typeof i  === "number")
    return this.GCD(i);
  else if( i instanceof Complex)
    return this.toComplex().gcd(i);
  else return this.GCD(i);
};

Number.prototype.lcm = function(i){
  if(typeof i  === "number")
    return this.LCM(i);
  else if( i instanceof Complex)
    return this.toComplex().lcm(i);
  else return this.LCM(i);
};

Number.prototype.max = function(i){
  if(typeof i  === "number")
    return Math.max(this,i);
  else if( i instanceof Complex)
    return this.toComplex().max(i);
  else return Math.max(this,i);
};

Number.prototype.min = function(i){
  if(typeof i  === "number")
    return Math.min(this,i);
  else if( i instanceof Complex)
    return this.toComplex().min(i);
  else return Math.min(this,i);
};


Number.prototype.gt = function(i){
  if(typeof i  === "number")
    return (this > i);
  else if( i instanceof Complex)
    return this.toComplex().gt(i);
  else return (this > i);
};

Number.prototype.ge = function(i){
  if(typeof i  === "number")
    return (this >= i);
  else if( i instanceof Complex)
    return this.toComplex().ge(i);
  else return (this >= i);
};

Number.prototype.lt = function(i){
  if(typeof i  === "number")
    return (this < i);
  else if( i instanceof Complex)
    return this.toComplex().lt(i);
  else return (this < i);
};

Number.prototype.le = function(i){
  if(typeof i  === "number")
    return (this <= i);
  else if( i instanceof Complex)
    return this.toComplex().le(i);
  else return (this <= i);
};


Number.prototype.equal = function(i){
  if(typeof i  === "number")
    return (this == i);
  else if( i instanceof Complex)
    return this.toComplex().equal(i);
  else return (this == i);
};

Number.prototype.strequal = function(i){
  if(typeof i  === "number")
    return (this === i);
  else if( i instanceof Complex)
    return this.toComplex().strequal(i);
  else return (this === i);
};

/* Some legacy code. More to come but not _that_ much*/
Number.prototype.isInf = function(){
  return (this == Number.POSITIVE_INFINITY)?true:false;
};
Number.prototype.isNInf = function(){
  return (this == Number.NEGATIVE_INFINITY)?true:false;
};


Number.prototype.isInfinity = function(){
  return (this == Number.NEGATIVE_INFINITY ||
          this == Number.POSITIVE_INFINITY )?true:false;
};

Number.prototype.isOk = function(){
  return ((!isNaN(this) && isFinite(this)))?true:false;
};
/* Should exist as a native function now, please check */
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

Number.prototype.isOdd = function(){
  if( !this.isInteger() ){
     return false;
  }
  return (this%2 == 1)?true:false;
};

Number.prototype.isEven = function(){
  if( !this.isInteger() ){
     return false;
  }
  return (this%2 == 0)?true:false;
};

Number.prototype.sign = function(){
  return ((this<0)?-1:1);
};
/* TODO: use modf instead */
Number.prototype.intp = function(){
  var sign = this.sign();
  return Math.floor(Math.abs(this))*sign;
};
Number.prototype.fracp = function(){
  var sign = this.sign();
  return (Math.abs(this) - Math.floor(Math.abs(this)))*sign;
};



Number.prototype.digits = function(){
  if(this == 0)return 1;
  return Math.floor(
          Math.log(Math.abs(this))
         *Math.LOG10E)+1;
};


Number.prototype.GCD = function(n){
  var x,y,g,temp;
  if(this.abs() > n.abs()){
    return n.GCD(this);
  }
  x = Math.abs(this);
  y = Math.abs(n);
  if(x == 0 && y != 0) return y;
  if(x != 0 && y == 0) return x;
  if(x == 0 && y == 0) return 0;
  if(x == y) return x;
  if(x == 1 || n == 1) return 1;
  if(x == 2){
    if(y.isOdd()) return 1;
    return 2;
  }
  /*
    More are possible, for example
    n&0x3 == 0 if n a is multiple of 4 (or zero)
    n&0x7 == 0 if n a is multiple of 8 (or zero)
    and so on (0xk is (2^i)-1) up to 
    0xffffffff ((2^32) -1)
    or
    0xffffffffffffffff ((2^64) -1)
    respectively (only 2^32-1 if javascript engine works according
    to standard)
    
    If a fast method to check for primality is available (e.g.: 
    a precomputed sieve which checks in O(1) if the prime is in the
    sieve) another shortcut is possible
      if(both are prime) return 1
   */
  /*
  // can't happen because of x<=y
  if(y == 2){
    if(x.isOdd()) return 1;
    return 2;
  }
  */
  g = 1;
  if(   x > Number.BINT_MAX
     || y > Number.BINT_MAX){
    while(x.isEven() && y.isEven()){
      x = Math.floor(x/2);
      y = Math.floor(y/2);
      g = Math.floor(g*2);
    }
    while(x != 0){
      while(x.isEven())x = Math.floor(x/2);
      while(y.isEven())y = Math.floor(y/2);
      temp =   Math.floor(Math.abs(x-y)/2);
      if(x>=y)x = temp;
      else y = temp;
    }
    return (g*y);    
  }
  else{
    while(!(x&1) && !(y&1)){
      x = x>>>1;y = y>>>1;
          g = g<<1;
    }
    while(x != 0){
      while(!(x&1))x >>>= 1;
      while(!(y&1))y >>>= 1;
      temp =   Math.abs(x-y)>>>1;
      if(x>=y)x = temp;
      else y = temp;
    }
    return (g*y);
  }
};
Number.prototype.gcd = function(n){
  return this.GCD(n);
};

Number.prototype.LCM = function(x){
  return (this.mul(x)).div(this.gcd(x));
};

Number.prototype.lcm = function(n){
  return this.LCM(n);
};


Number.prototype.agm = function(b){
  var eps   = Number.EPS;
  if(b instanceof Complex){
    return this.toComplex().agm(b);
  }
  var delta = (a+b)*eps;
  while(Math.abs(b-a) > delta){
    var temp = a;
    a = (a+b)/2;
    b = Math.sqrt(temp*b);
  }
  return (a+b)/2;
};



/* float math rounded in the direction of zero */
Number.prototype.idiv_classic = function(quot){
  var p = this;
  var q = quot;

  return Math.floor(p/q);
}

/* Integer math, may not work everywhere */
Number.prototype.idiv = function(quot){
  var p = this|0;
  var q = quot|0;

  return (p/q)|0;
}

Number.prototype.divrem = function(b){
  var a = this;
  if(xtypeof(b) == "complex"){
    return a.toComplex().divrem(b);
  }
  return [Math.floor(a/b), Math.floor(a%b)];
};

Number.prototype.extgcd = function(b){
  var a = this;
  var x=0,y=1,ex=1,ey=0;
  var temp, qr;
  if(xtypeof(b) == "complex"){
    return a.toComplex().extgcd(b);
  }

  while(b != 0){
    qr = a.divrem(b);
    a  = b;
    b  = qr[1];

    temp = x;
    x    = ex - qr[0] * x;
    ex   = temp;
 
    temp = y;
    y    = ey - qr[0] * y;
    ey   = temp;
  }
 
  return [ex,ey,a];
};

Number.prototype.invmod = function(b){
  var a = this;
  var egcd;
  if(xtypeof(b) == "complex")
    return a.toComplex().invmod(b);
  egcd = a.extgcd(b)[0];
  if(a != 0)
    return (egcd + b) % b;
  return 0;
};

Number.prototype.isZero = function(eps){
  if(arguments.length > 0){
    return (Math.abs(this) < arguments[0])
  }
  return (this === 0);
};

Number.prototype.isReal = function(){
  return true;
};

Number.prototype.isImag = function(){
  return false;
};
Number.prototype.Real = function(){
 return this;
};
Number.prototype.Re = function(){
 return this;
};
Number.prototype.Imag = function(){
 return 0;
};
Number.prototype.Im = function(){
 return 0;
};

Number.prototype.roots = function(n){
  return this.toComplex().roots(n);
};

Number.prototype.clear = function(limit){
  var eps = limit||Number.EPS;
  if(this.abs()<eps) return 0;
  return this;
};

/* 
  Fills with zeros if necessary, this.toString(base) doesn't do that
  Integer only of course.
  It is quite usefull for debugging bitsets (bigints, bloomnfilter etc.)
*/
Number.prototype.toHex32 = function(uppercase){
  var t     = this;
  var lower = "0123456789abcdef";
  var upper = "0123456789ABCDEF";
  var rcase = uppercase||false;
  var ret   = "";

  rcase = (rcase)?upper:lower;
  if(t == 0){return "0";}  
  for(var i = 0;i<8;i++){
    ret = rcase.charAt((t&0xF)) + ret;
    t >>>= 4;
  }
  return ret;
};
Number.prototype.toHex16 = function(uppercase){
  var t     = this;
  var lower = "0123456789abcdef";
  var upper = "0123456789ABCDEF";
  var rcase = uppercase||false;
  var ret   = "";

  rcase = (rcase)?upper:lower;
  if(t == 0){return "0";}  
  for(var i = 0;i<4;i++){
    ret = rcase.charAt((t&0xF)) + ret;
    t >>>= 4;
  }
  return ret;
};
Number.prototype.toBin32 = function(){
  var t     = this;
  var ret   = "";
  for(var i = 0;i<32;i++){
    ret = ((t&0x1)?"1":"0") + ret;
    t >>>= 1;
  }
  return ret;
};
Number.prototype.toBin16 = function(){
  var t     = this;
  var ret   = "";
  for(var i = 0;i<16;i++){
    ret = ((t&0x1)?"1":"0") + ret;
    t >>>= 1;
  }
  return ret;
};

Number.prototype.incr = function(){
  //this++; return new Error("It is not possible to change 'this'" )
  return this+1;
}
Number.prototype.decr = function(){
  //this++; return new Error("It is not possible to change 'this'" )
  return this-1;
}

/***************************** Complex ***************************************/

/***************************** Complex numbers ********************************/
/* Simplified constructor, lacks everything */
function Complex(a,b){
  this.Re = (arguments.length > 0) ? a : 0 ;
  this.Im = (arguments.length > 1) ? b : 0 ;
}

Complex.prototype.Imag = function(){
  return this.Im ;
};
Complex.prototype.Real = function(){
  return this.Re ;
};

Complex.prototype.dup = function(){
  return new Complex( this.Re, this.Im );
};

Complex.prototype.toString = function(b){
  var r   = 0.0;
  var i   = 0.0;
  var ret = '';

  if(arguments.length == 1 && ((!b.isInteger()) || b<2 || b>36)){
    return undefined;
  }
  else{
    r = this.Re;
    i = this.Im.abs();
    ret += r.toString(b) + ' ';
    ret += (this.Im.lt(0))?'- ':'+ ';
    ret += i.toString(b) + 'i';
  }
  return ret;
};

Number.prototype.toComplex = function(i){
  var ret = new Complex();
  ret.Re = this;
  ret.Im = (arguments.length == 1)?i:0;
  return ret;
};

/* Simplified example */
String.prototype.toComplex = function()
{
    var ret = new Complex();

    var re = parseFloat(this);
    var im = parseFloat(
      this.replace(/[+-]{0,1}[0-9]*[.]{0,1}[0-9]*[eE]{0,1}[+-]{0,1}[0-9]*/, '')
                       );
    if (isNaN(re)) {
	return Number.NaN;
    }
    ret.Re = re;
    if (isNaN(im)) {
	ret.Im = 0;
    } else {
	ret.Im = im;
    }
    if (isNaN(re) && isNaN(im)) {
	return Number.NaN;
    }
    return ret;
};

Complex.prototype.isInteger = function(){
  var a = this.Re;
  var b = this.Im;
  if(a.isInteger() && b.isInteger()){
    return true;
  }
  return false;
};

Complex.prototype.isGaussianInteger = function(){
  return this.isInteger();
};



Complex.prototype.isRe = function(){
  var b = this.Im;
  if(b.isZero()){
    return true;
  }
  return false;
};
Complex.prototype.isReal = function(){
  return this.isRe();
};

Complex.prototype.isIm = function(){
  var a = this.Re;
  if(a.isZero()){
    return true;
  }
  return false;
};
Complex.prototype.isImag = function(){
  return this.isIm();
};


Complex.prototype.isZero = function(eps){
  return (this.Re.isZero(eps) && this.Im.isZero(eps))?true:false;
};


Complex.prototype.equal = function(i,tol){
  var a = this.Re;
  var b = this.Im;

  if(typeof i == "number"){
    i = i.toComplex();
  }

  if(arguments.length == 2 && tol != 0.0){
    return (this.sub(i)).abs() <= Math.abs(tol);
  }
  if( a.equal(i.Re) && b.equal(i.Im) ){
    return true;
  }
  return false;
};
Complex.prototype.incr = function(){
  this.Re++;
  return this;
}
Complex.prototype.decr = function(){
  this.Re--;
  return this;
}

Complex.prototype.add = function(i){
  var a = this.Re;
  var b = this.Im;
  var c = 0;
  var d = 0;

  var ret = new Complex();

  if(typeof i == "number"){
    c = i;
  } else {
    c = i.Re;
    d = i.Im;
  }

  ret.Re = a.add(c);
  ret.Im = b.add(d);

  return ret;
};

Complex.prototype.sub = function(i){
  var a = this.Re;
  var b = this.Im;
  var c;
  var d;

  var ret = new Complex();

  if(typeof i == "number"){
    i = i.toComplex();
  }

  c = i.Re;
  d = i.Im;

  ret.Re = a.sub(c);
  ret.Im = b.sub(d);

  return ret;
};

Complex.prototype.mult = function(i){
  var a = this.Re;
  var b = this.Im;
  var c;
  var d;

  var ret = new Complex();

  if(typeof i == "number"){
    i = i.toComplex();
  }
  
  c = i.Re;
  d = i.Im;

  ret.Re = ( a.mul(c) ).sub( b.mul(d) );
  ret.Im = ( b.mul(c) ).add( a.mul(d) );

  return ret;
};
Complex.prototype.mul = function(i){
  return this.mult(i);
};

/* Alternative multiplication algorithm, Fortran style */
Complex.prototype.mult2 = function(i){
  var a = this.Re;
  var b = this.Im;
  var c = 0.0;
  var d = 0.0;
  
  var P = 0.0;

  var ac = 0.0;
  var bd = 0.0;

  var ret = new Complex(0,0);

  if( a.isZero() && b.isZero()){return 0.0;}

  if(typeof i == "number"){
    i = i.toComplex();
  }
  // and so on
  c = i.Re;
  d = i.Im;

  if( c.isZero() && d.isZero()){return 0.0;}

  P = (a.add(b)).mul(c.add(d));
  ac = a.mul(c);
  bd = b.mul(d);

  ret.Re = ac.sub(bd);
  ret.Im = P.sub(ac).sub(bd);
  
  return ret;
};


/* TODO: over/underflow */
Complex.prototype.div = function(i){
  var a = this.Re;
  var b = this.Im;
  var c;
  var d;

  var ret = new Complex();
  var zero = new Complex(0,0);

  if(a == 0 && b == 0){return zero}

  if(typeof i == "number"){
    i = i.toComplex();
  }

  c = i.Re;
  d = i.Im;

  if(c.isZero() && d.isZero()){return undefined;}

  ret.Re = ((a.mul(c)).add(b.mul(d))).div((c.mul(c)).add(d.mul(d)));
  ret.Im = ((b.mul(c)).sub(a.mul(d))).div((c.mul(c)).add(d.mul(d)));

  return ret;
};
/* Alternative. Safe from over/underflow but less exact */
Complex.prototype.div = function(i){
  var a = this.Re;
  var b = this.Im;
  var c = 0.0;
  var d = 0.0;
  
  var ratio = 0.0;

  var ret = new Complex(0,0);
  var one = new Complex(1,0);

  if(a.isZero() && b.isZero()){return 0.0;}

  if(typeof i == "number"){
    i = i.toComplex();
  }
  // and so on
  c = i.Re;
  d = i.Im;

  // this library is not fully IEEE 754 compliant
  if(c.isZero()&& d.isZero()){return Number.POSITIVE_INFINITY;}

  if( c.abs().ge(d.abs() ) ){
    ratio =  (one).div( c.add( d.mul(d.div(c)) ) );

    ret.Re =  ratio.mul(a.add(b.mul(d.div(c)) ) );
    ret.Im =  ratio.mul(b.sub(a.mul(d.div(c)) ) );

  }
  else{
    ratio =  one.div(c.mul(c.div(d)).add(d));

    ret.Re =  ratio.mul(a.mul(c,div(d)).add(b));
    ret.Im =  ratio.mul(b.mul(c.div(d)).sub(a));
  }

  return ret;
};




Complex.prototype.mod = function(i){

  if(typeof i == "number"){
    i = i.toComplex();
  }

  if(!this.isInteger() || !i.isInteger()){
    return new Complex(Number.NaN,Number.NaN);
  }

  return this.fmod(i);
};


Complex.prototype.fmod = function(i){
  var quot;
  var rem;
  if(typeof i == "number"){
    i = i.toComplex();
  }
  quot = this.div(i);
  quot.Re = Math.round(quot.Re);
  quot.Im = Math.round(quot.Im)
  rem  = this.sub(quot.mult(i))
  return rem;
};

Complex.prototype.abs = function(){
  var a = this.Re;
  var b = this.Im;
  var c = 0.0;

  var ret = 0.0;

  if(a.isZero()){return (b).abs;}
  if(b.isZero()){return (a).abs;}
  if(a.isZero() && b.isZero()){return 0.0;}

  c = b.div(a);
  ret = ((1).add(c.mul(c))).sqrt().mul(a);

  return ret.abs();
};

Complex.prototype.conj = function(){
  var a = this.Re;
  var b = this.Im.neg();

  var ret = new Complex(a,b);

  return ret;
};

Complex.prototype.inv = function(){
  var a = this.Re;
  var b = this.Im;
  var c = this.abs();

  var ret = new Complex();
  
  ret.Re =  a.div(       (c.mul(c)) );
  ret.Im =  b.neg().div( (c.mul(c)) );

  return ret;
};

Complex.prototype.minus = function(){
  var a = this.Re.neg();
  var b = this.Im.neg();

  var ret = new Complex(a,b);

  return ret;
};
Complex.prototype.neg = function(){
  return this.minus();
};


Complex.prototype.sqrt = function(){
  var a = this.Re;
  var b = this.Im;
  var two = 2;
  var ret = new Complex();
 
  if(a.isZero() && b.isZero()){
    ret.Re = 0.0;
    ret.Im = 0.0;
  }
  else if(b.isZero()){
    if(a.ge(0)){
      ret.Re = a.sqrt();
      ret.Im = 0.0;
    }
    else{
      ret.Re = 0.0;
      ret.Im = a.abs().sqrt();
    }
  }
  else{
    var temp = 0.0;
    if(a.gt(0.0)){
      temp = ( (this.abs().add(a)).div(2) ).sqrt();
      ret.Re = temp;
      ret.Im = b.div(temp.mul(2));
    }
    else{
      temp = ((this.abs() - a).abs().div(2)).sqrt();
      ret.Im = (b.lt(0))?temp.neg():temp;
      ret.Re = b.div(ret.Im.mul(2));
    }
  }
  return ret;
};

Complex.prototype.log = function(){
  var a = this.Re;
  var b = this.Im;

  var ret = new Complex();

  if(a.isZero() && b.isZero()){
    ret.Re = Number.NEGATIVE_INFINITY;
    ret.Im = Number.NEGATIVE_INFINITY;
  }
  else if(b.isZero()){
    ret.Re = a.log();
    ret.Im = 0.0;
  }
  else{
    ret.Re = this.abs().log();
    //ret.Im = Math.atan2(b,a);
    ret.Im = b.atan2(a)
  }

  return ret;
};

Complex.prototype.exp = function(){
  var a = this.Re;
  var b = this.Im;

  var ret = new Complex();
  
  ret.Re = a.exp();
  ret.Im = b;

  ret = ret.pol2cart();

  return ret;
};


Complex.prototype.pow = function(y){
  var a = this.Re;
  var b = this.Im;

  var r;
  var t;

  var ret;
    // and so on
  if( typeof y == 'number'){
    ret = (new Complex(y,0)).mult(this.log());
    return ret.exp();
  }

  else if(y instanceof Complex){
     r   = this.abs().log();
     t   = b.atan2(a);
     ret = new Complex();

     ret.Re = ( (r.mul(y.Re)).sub(y.Im.mul(t)) ).exp();
     ret.Im = (y.Im.mul(r)).add(y.Re.mul(t));
  }
  else{
    ret = new Complex();
    ret.Re = Number.NaN;
    ret.Im = Number.NaN;
    return ret;
  }

  ret = ret.pol2cart();

  return ret;
};

Complex.prototype.cart2pol = function(){
  var a = this.Re;
  var b = this.Im;

  var ret = new Complex();

  ret.Re = this.abs();  // r
  ret.Im = b.atan2(a); // phi

  return ret;
};

Complex.prototype.pol2cart = function(){
  var r   = this.Re;
  var phi = this.Im;

  var ret = new Complex();

  ret.Re = r.mul( phi.cos() );
  ret.Im = r.mul( phi.sin() );

  return ret;
};


Complex.prototype.sin = function(){
  var a = this.Re;
  var b = this.Im;

  var ret = new Complex();
  
  ret.Re = (a.sin()).mul(b.cosh());
  ret.Im = (a.cos()).mul(b.sinh());

  return ret;
};

Complex.prototype.sinh = function(){
  var a = this.Re;
  var b = this.Im;

  var ret = new Complex();
  
  ret.Re = ( a.sinh() ).mul( b.cos() );
  ret.Im = ( a.cosh() ).mul( b.sin() );

  return ret;
};

Complex.prototype.cos = function(){
  var a = this.Re;
  var b = this.Im;

  var ret = new Complex();
  
  ret.Re = ( a.cos()       ).mul( b.cosh() );
  ret.Im = ( a.sin().neg() ).mul( b.sinh() );

  return ret;
};

Complex.prototype.cosh = function(){
  var a = this.Re;
  var b = this.Im;

  var ret = new Complex();
  
  ret.Re = (a.cosh()).mul(b.cos())
  ret.Im = (a.sinh()).mul(b.sin())

  return ret;
};

Complex.prototype.tan = function(){
  return this.sin().div(this.cos());
};

Complex.prototype.tanh = function(){
  return this.sinh().div(this.cosh());
};

Complex.prototype.asin = function(){
  var i    = new Complex(0, 1);
  var negi = new Complex(0,-1);
  var one  = new Complex(1, 0);

  var sqrt = one.sub(this.pow(2)).sqrt();
  var ai   = this.mult(i);
  var log  = ai.add(sqrt).log();

  var ret;

  ret = negi.mult(log);

  return ret;
};

Complex.prototype.acos = function(){
  var i    = new Complex(0, 1);
  var pi2  = new Complex(Little.PI_2, 0);
  var one  = new Complex(1, 0);

  var sqrt = one.sub(this.pow(2)).sqrt();
  var ai   = this.mult(i);
  var log  = ai.add(sqrt).log();

  var ret;

  ret = pi2.add(i.mult(log));

  return ret;
};

Complex.prototype.atan = function(){
  var i    = new Complex(0, 1);
  var i2   = new Complex(0, 0.5);
  var one  = new Complex(1, 0);

  var logneg = one.sub(i.mult(this)).log();
  var logpos = one.add(i.mult(this)).log();

  var ret;

  ret = i2.mult(logneg.sub(logpos));

  return ret;
};

Complex.prototype.atan2 = function(b){
  return this.atan2general(b);
};

Complex.prototype.atan2general = function(x){
    var y = this;
    if(x.gt(0)){return (y.div(x)).atan();}
    if(x.lt(0)){
      if(y.ge(0)){return (y.div(x)).atan().add(Little.PI);}
      if(y.lt(0)){return (y.div(x)).atan().add(Little.PI);}
    }
    if(x.isZero()){
      if(y.gt(0)){return  Little.PI.div(2);}
      if(y.lt(0)){return  Little.PI.neg().div(2);}
      if(y.isZero()){return 0}
    }
    return undefined;  
};


Complex.prototype.cot = function(){
  var one = new Complex(1,0);
  return one.div(this.tan());
};

Complex.prototype.coth = function(){
  return this.cosh().div(this.sinh());
};

Complex.prototype.sec = function(){
  var one = new Complex(1,0);
  return one.div(this.cos());
};

Complex.prototype.sech = function(){
  var one = new Complex(1,0);
  return one.div(this.cosh());
};

Complex.prototype.csc = function(){
  var one = new Complex(1,0);
  return one.div(this.sin());
};

Complex.prototype.csch = function(){
  var one = new Complex(1,0);
  return one.div(this.sinh());
};

Complex.prototype.asinh = function(){
  var one  = new Complex(1, 0);
  var sqrt = this.add(one.add(this.pow(2)).sqrt());
  var ret;

  ret = sqrt.log();

  return ret;
};

Complex.prototype.acosh = function(){
  var one     = new Complex(1,0);
  var negsqrt = this.sub(one).sqrt();
  var possqrt = this.add(one).sqrt();
  var log     = this.add(negsqrt.mult(possqrt)).log();
 
  return log;
};


Complex.prototype.atanh = function(){
  var one    = new Complex(1  ,0);
  var half   = new Complex(0.5,0); 
  var neglog = one.sub(this).log();
  var poslog = one.add(this).log();
 
  var ret = half.mult(poslog.sub(neglog));

  return ret;
};

Complex.prototype.acsc = function(){
  var one    = new Complex(1  ,0);
  return one.div(this).asin();
};


Complex.prototype.acsch = function(){
  var one    = new Complex(1  ,0);
  return one.div(this).asinh();
};

Complex.prototype.asec = function(){
  var one    = new Complex(1  ,0);
  return one.div(this).acos();
};

Complex.prototype.asech = function(){
  var one    = new Complex(1  ,0);
  return one.div(this).acosh();
};

Complex.prototype.acot = function(){
  var pi2  = new Complex(Little.PI_2, 0);
  var one    = new Complex(1  ,0);
  return pi2.sub(this.atan());
};

Complex.prototype.acoth = function(){
  var one    = new Complex(1  ,0);
  return one.div(this).atanh();
};


Complex.prototype.arg = function(){
  var a = this.Re;
  var b = this.Im;
  
  return (b.atan2(a));
};
/* Gaussians only! */
Complex.prototype.gcd = function(i){
  var a  = this.Re;
  var b  = this.Im;

  if(typeof i == "number"){
    i = i.toComplex();
  }
  // and so on
  var ia = i.Re;
  var ib = i.Im;

  var normt = 0;
  var normi = 0;

  var one;
  var two;

  var mod;
  var zero = new Complex(0,0);

  if(!this.isInteger() || !i.isInteger()){
    return new Complex(Number.NaN,Number.NaN);
  }

  normt = this.abs();
  normi = i.abs();

  if(normt < normi){
    one = i;
    two = this;
  }
  else{
    one = this
    two = i;
  }

  while(true){
    mod = one.mod(two)
    if(mod.equal(zero)){return two;}
    one = two;
    two = mod;
  }
};

Complex.prototype.lcm = function(i){
  if(!this.isInteger() || !i.isInteger()){
    return new Complex(Number.NaN,Number.NaN);
  }

  return this.mult(i).div(this.gcd(i));
};

Complex.prototype.max = function(i){
  var a = this.Re;

  if(i instanceof Complex){
    b = i.Re;
  }
  
  else if( !i.isNaN() ){
    b = i;
  }
  else{
   return undefined;
  }
  return ( ( (a.max(b)).equal(a) )?this:i );
};


Complex.prototype.min = function(i){
  var a = this.Re;

  if(i instanceof Complex){
    b = i.Re;
  }
  else if( !i.isNaN() ){
    b = i;
  }
  else{
   return undefined;
  }
  return ( ( (a.min(b)).equal(a))?this:i);
};

Complex.prototype.gt = function(i){
  var a = this.Re;

  if(i instanceof Complex){
    b = i.Re;
  }

  else if( !i.isNaN() ){
    b = i;
  }
  else{
   return undefined;
  }
  return ( a.gt(b) );
};

Complex.prototype.lt = function(i){
  var a = this.Re;

  if(i instanceof Complex){
    b = i.Re;
  }

  else if( !i.isNaN() ){
    b = i;
  }
  else{
   return undefined;
  }
  return ( a.lt(b) );
};


Complex.prototype.le = function(i){
  var a = this.Re;

  if(i instanceof Complex){
    b = i.Re;
    if(this.equal(i)){return true;}
  }

  else if( !i.isNaN() ){
    b = i;
  }
  else{
   return undefined;
  }
  return ( a.le(b) );
};

Complex.prototype.ge = function(i){
  var a = this.Re;

  if(i instanceof Complex){
    b = i.Re;
    if(this.equal(i)){return true;}
  }

  else if( !i.isNaN() ){
    b = i;
  }
  else{
   return undefined;
  }
  return (a.ge(b));
};

Complex.prototype.isNaN = function(){
  var a = this.Re;
  var b = this.Im;
  if( a.isNaN() || b.isNaN() ){
    return true;
  }
  return false;
};

/* Two shortcuts once needed*/
Complex.prototype.isInf = function(){
  if( this.Re.isInf() && this.Im.isInf() )
    return true;
  return false;
};
Complex.prototype.isNinf = function(){
  if( this.Re.isNInf() && this.Im.isNInf() )
    return true;
  return false;
};

/* 
  Complex infinity is at the north-pole of the Riemann-sphere. That means
  that both the real and the imaginary part must be infinite.
 */
Complex.prototype.isInfinity = function(){
  if( this.Re.isInfinite() && this.Im.isInfinite() )
    return true;
  return false;
};

/* From the Matrix code: set every value near zero to zero */
Complex.prototype.clear = function(limit){
  var ar  = this.Real().abs();
  var ai  = this.Imag().abs();
  var eps = limit||Number.EPS;
  
  var ret = new Complex(this.Real(),this.Imag());  
  
  if(!ar.isZero() && (ai.div(ar)).le(eps)){
    ret.Im = 0.0;
    return ret;
  }
  if(!ai.isZero() && (ar.div(ai)).le(eps)){
    ret.Re = 0.0;
  }
  return ret;
};

Complex.prototype.invmod = function(b){
  var a = this;
  var egcd = a.extgcd(b)[0];
  if(!a.isZero())
    return (egcd.add(b)).mod(b);
  return 0;
};

Complex.prototype.norm = function(){
  return (this.Re.mul(this.Re)).add(this.Im.mul(this.Im));
};


/*
   Chose the branch
*/

/*
  Calculates the complex number to the power of the complex number in
  y in branch k.   
  The principal branch is at k = 0
 */
Complex.prototype.Pow = function(y,k){
  if(arguments.length == 1)return this.pow(y);
  if(!k.isInteger()) return undefined;
  if(y.equal(0)) return 1;
  return (y.mul(z.Log(k))).exp();
};

/*
   Calculates the General logarithm base e of complex numbers in branch k.
   The principal branch is at k = 0.
 */
Complex.prototype.Log = function(k){
  var I = new Complex(0,1);
  if(arguments.length != 1)return this.log();
  if(!k.isInteger()) return undefined;
  return this.log().add( k.mul(2).mul(Math.PI).mul(I) );
};









































/*
Bigint.prototype.DB 
	size of ono digit (dbits) (28 bit fixed for now)
Bigint.prototype.DM
	((1<<digit_size)-1 (   0x0fffffff)
Bigint.prototype.DV
	(1<<digit_size)        (0x10000000)
Bigint.prototype.FV
	2^52                   (4503599627370496)
Bigint.prototype.F1
	52 - digit_length      (24)
Bigint.prototype.F2 
	2*digit_length - 52    (4)
Bigint.prototype.copyTo bigint
	copy this to bigint
Bigint.prototype.fromInt integer
	set bigint from integer value with -DV <= x < DV
Bigint.prototype.fromString string radix
	set bigint from string with given radix
Bigint.prototype.clamp
	clamp of excess high words
  explained below but should be obvious
Bigint.prototype.dlShiftTo 
Bigint.prototype.drShiftTo 
Bigint.prototype.lShiftTo 
Bigint.prototype.rShiftTo 
Bigint.prototype.subTo 
Bigint.prototype.multiplyTo 
Bigint.prototype.squareTo 
Bigint.prototype.divRemTo 

Bigint.prototype.invDigit 
	returns "-1/this % 2^DB"

Bigint.prototype.isEven 
	true if this is even
Bigint.prototype.exp exponent
	this^exponent, exponent < 2^32,
Bigint.prototype.toStrfing radix
	return string in given radix
Bigint.prototype.negate
	change sign on copy
Bigint.prototype.abs 
Bigint.prototype.compareTo
	general function, see shortcuts listed below
Bigint.prototype.bitLength
	returns the length of the bigint in bits (ilog2)
Bigint.prototype.mod	bigint
	returns remainder of divison
Bigint.prototype.modPowInt exponent modulus
	this^exponent % modulus, 0 <= exponent < 2^32
Bigint.prototype.chunkSize mantissa
	return x such that. r^x < DV
Bigint.prototype.toRadix radix
	convert to radix string. General function see below for shortcuts
Bigint.prototype.fromRadix string radix
	convert from string with base radix. General function see below for shortcuts
Bigint.prototype.fromNumber 
	alternate constructor used for converting from PRNG output
Bigint.prototype.bitwiseTo bigint function bigint
	general function for bitwise operations, see below for shortcuts
Bigint.prototype.changeBit place function
	changes bit at place by function 
Bigint.prototype.addTo bigint
	this + bigint
Bigint.prototype.dMultiply integer
	this * integer this >= 0, 1 < integer < DV
Bigint.prototype.dAddOffset integer words
	this += integer <<  words, this >= 0
Bigint.prototype.multiplyLowerTo bigint integer
	return lower integer words of this*bigint
Bigint.prototype.multiplyUpperTo To bigint integer
	return higher integer words of this*bigint
Bigint.prototype.modInt integer
	this% integer, integer < 2^26
Bigint.prototype.millerRabin bigint
	Miller-Rabin pseudoprime test, see isProbablePrime
Bigint.prototype.clone
	deep copy
Bigint.prototype.intValue 
	return bigint as integer (takes lower two digits if available)
Bigint.prototype.byteValue
	return bigint as byte (lsb of first digit)
Bigint.prototype.shortValue
	return bigint as short (lsb of first digit)
Bigint.prototype.signum 
	returns 0 if this == 0, 1 if this > 0, NOT the sign!
Bigint.prototype.toByteArray
	bigint array to bigendian byte array
Bigint.prototype.equals bigint
	returns true for equality
Bigint.prototype.min bigint
	returns smaller bigint
Bigint.prototype.max bigint
	returns bigger bigint
Bigint.prototype.and bigint
	this & bigint
Bigint.prototype.or 
	this | bigint
Bigint.prototype.xor 
	this ^ bigint
Bigint.prototype.andNot 
	this | ~bigint
Bigint.prototype.not 
	~this
Bigint.prototype.shiftLeft integer
	shift left integer bits
Bigint.prototype.shiftRight integer
	shift right integer bits
Bigint.prototype.getLowestSetBit
	get the lowest set bit of this 
Bigint.prototype.bitCount
	number of bits set
Bigint.prototype.testBit place
	returns true if bit at place is set
Bigint.prototype.setBit place
	set bit at place
Bigint.prototype.clearBit place
	clear bit at place 
Bigint.prototype.flipBit plcae
	flip bit at place
Bigint.prototype.add bigint
	this + bigint
Bigint.prototype.subtract bigint
	this - bigint
Bigint.prototype.multiply bigint
	this * bigint
Bigint.prototype.divide bigint
	this / bigint
Bigint.prototype.remainder bigint
	this % bigint
Bigint.prototype.divideAndRemainder bigint
	returns [ this/a , this%a ]
Bigint.prototype.modPow exponent modulus
	this^exponent % modulus, 0 <= eexponent < 2^32
Bigint.prototype.modInverse modulus
	1/this % m
Bigint.prototype.pow exponent
	this ^ exponent, exponent < 2^26
Bigint.prototype.gcd bigint
	gcd(this,bigint)
Bigint.prototype.isProbablePrime
	runs Miller-Rabin probability test for this
Bigint.prototype.dlShift integer
	shift this integer words to the left
Bigint.prototype.drShift integer
	shift this integer words to the right
Bigint.prototype.mul bigint
	this * bigint
Bigint.prototype.karatsuba bigint
	this * bigint, internal function
Bigint.prototype.dup 
	deep copy
Bigint.prototype.mul bigint
	this * bigint (uses fast multiplication if available)
Bigint.prototype.divrem bigint
	returns [ this/bigint , this%bigint ]
Bigint.prototype.div bigint
	this / bigint
Bigint.prototype.rem bigint
	this % bigint
Bigint.prototype.equal bigint
	this == bigint 
Bigint.prototype.le bigint
	this <= bigint
Bigint.prototype.lt bigint
	this < bigint
Bigint.prototype.gt bigint
	this > bigint
Bigint.prototype.ge bigint
	this >= bigint
Bigint.prototype.sub bigint
	this - bigint
Bigint.prototype.isOdd 
	returns true if this is odd
Bigint.prototype.isZero 
	returns true if this is zero
Bigint.prototype.isInteger 
	returns true if this is an integer (needed elsewhere)
Bigint.prototype.sign
	returns sign of this
Bigint.prototype.digits 
	returns number of decimal digits
Bigint.prototype.LCM 
	returns lowest common multiplier
Bigint.prototype.lcm 

String.prototype.toBigint radix
	converts string to bigint see also: Bigint.prototype.toString 

*/


















